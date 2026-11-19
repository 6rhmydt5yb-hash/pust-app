import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SessionEngine, PHASES, PREPARE_SEC } from '../js/timer.js';

function makeFakeClock(startMs = 0) {
  let t = startMs;
  return {
    now: () => t,
    advance(ms) {
      t += ms;
    },
  };
}

function advanceAndTick(engine, fake, totalMs, stepMs = 100) {
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    fake.advance(step);
    engine.tick();
    remaining -= step;
  }
}

describe('SessionEngine - vanlig tabell (CO2/O2/Mix-form), speed=1', () => {
  it('kjører prepare -> hold -> rest -> ferdig i riktig rekkefølge', () => {
    const fake = makeFakeClock();
    const engine = new SessionEngine({
      tableType: 'co2',
      rounds: [{ hold: 5, rest: 5 }],
      now: fake.now,
      speed: 1,
    });
    const phases = [];
    engine.on('phaseChange', ({ phase }) => phases.push(phase));
    let completed = null;
    engine.on('complete', (payload) => (completed = payload));

    engine.start();
    assert.equal(engine.phase, PHASES.PREPARE);

    advanceAndTick(engine, fake, PREPARE_SEC * 1000);
    assert.equal(engine.phase, PHASES.HOLD);

    advanceAndTick(engine, fake, 5000);
    assert.equal(engine.phase, PHASES.REST);
    assert.equal(engine.results[0].actualHold, 5);

    advanceAndTick(engine, fake, 5000);
    assert.equal(engine.phase, PHASES.DONE);
    assert.equal(engine.results[0].actualRest, 5);

    assert.deepEqual(phases, ['prepare', 'hold', 'rest']);
    assert.ok(completed);
  });
});

describe('SessionEngine - speed-modus (?speed=N)', () => {
  it('speed=10: fullfører 15s planlagt tid på 1.5s veggur-tid, og lagrer ekte sekunder', () => {
    const fake = makeFakeClock();
    const engine = new SessionEngine({
      tableType: 'co2',
      rounds: [{ hold: 5, rest: 5 }],
      now: fake.now,
      speed: 10,
    });
    engine.start();
    // Totalt simulert: prepare(5s) + hold(5s) + rest(5s) = 15s => 1500ms veggur ved speed=10
    advanceAndTick(engine, fake, 1500, 50);

    assert.equal(engine.phase, PHASES.DONE);
    assert.equal(engine.results[0].actualHold, 5, 'faktisk holdtid skal være ekte sekunder, ikke forkortet av speed');
    assert.equal(engine.results[0].actualRest, 5);
  });
});

describe('SessionEngine - sammentrekninger', () => {
  it('registrerer riktig forskjøvet tidspunkt midt i et hold', () => {
    const fake = makeFakeClock();
    const engine = new SessionEngine({
      tableType: 'co2',
      rounds: [{ hold: 5, rest: 5 }],
      now: fake.now,
      speed: 1,
    });
    engine.start();
    advanceAndTick(engine, fake, PREPARE_SEC * 1000);
    assert.equal(engine.phase, PHASES.HOLD);

    fake.advance(2000);
    engine.tick();
    engine.registerContraction();

    assert.equal(engine.results[0].contractions.length, 1);
    assert.equal(engine.results[0].contractions[0], 2000);
  });
});

describe('SessionEngine - "Pustet" (avslutt hold tidlig)', () => {
  it('setter faktisk holdtid til avrundet forløpt tid og går rett til hvile', () => {
    const fake = makeFakeClock();
    const engine = new SessionEngine({
      tableType: 'co2',
      rounds: [{ hold: 5, rest: 5 }],
      now: fake.now,
      speed: 1,
    });
    engine.start();
    advanceAndTick(engine, fake, PREPARE_SEC * 1000);

    fake.advance(1500);
    engine.tick();
    engine.endHoldEarly();

    assert.equal(engine.phase, PHASES.REST);
    assert.equal(engine.results[0].actualHold, 2); // Math.round(1.5) === 2
    assert.equal(engine.results[0].breathedEarly, true);
  });
});

describe('SessionEngine - pause', () => {
  it('pause hoper ikke opp simulert tid, resume fortsetter korrekt', () => {
    const fake = makeFakeClock();
    const engine = new SessionEngine({
      tableType: 'co2',
      rounds: [{ hold: 5, rest: 5 }],
      now: fake.now,
      speed: 1,
    });
    let lastTick = null;
    engine.on('tick', (payload) => (lastTick = payload));

    engine.start();
    advanceAndTick(engine, fake, PREPARE_SEC * 1000);
    assert.equal(engine.phase, PHASES.HOLD);

    engine.pause();
    fake.advance(2000);
    engine.tick(); // skal ikke gjøre noe siden motoren er pauset

    engine.resume();
    fake.advance(1000);
    engine.tick();

    assert.equal(lastTick.phase, PHASES.HOLD);
    assert.equal(lastTick.remainingMs, 4000); // kun det ene sekundet etter resume skal telle
  });
});

describe('SessionEngine - Wonka-tabell', () => {
  it('teller oppover før trykk, låser nedtelling ved første trykk, ignorerer senere trykk', () => {
    const fake = makeFakeClock();
    const engine = new SessionEngine({
      tableType: 'wonka',
      rounds: [{ postContractionHold: 5, rest: 3 }],
      now: fake.now,
      speed: 1,
    });
    let lastTick = null;
    engine.on('tick', (payload) => (lastTick = payload));

    engine.start();
    advanceAndTick(engine, fake, PREPARE_SEC * 1000);
    assert.equal(engine.phase, PHASES.HOLD);

    fake.advance(1200);
    engine.tick();
    assert.equal(lastTick.wonkaWaiting, true);
    assert.equal(lastTick.elapsedMs, 1200);

    engine.registerContraction(); // første trykk: starter nedtelling fra postContractionHold
    assert.equal(engine.results[0].firstContractionAtMs, 1200);

    fake.advance(2000);
    engine.tick();
    assert.equal(lastTick.wonkaWaiting, false);
    assert.equal(lastTick.remainingMs, 3000); // 5000 - 2000 siden trykk

    engine.registerContraction(); // andre trykk: skal kun logges, ikke re-arme nedtellingen
    assert.equal(engine.results[0].contractions.length, 2);

    advanceAndTick(engine, fake, 3000); // fullfører nedtellingen fra trykk (5000ms totalt siden trykk)
    assert.equal(engine.phase, PHASES.REST);
    assert.equal(engine.results[0].actualHold, 6); // round((1200 + 5000) / 1000) === 6
  });
});
