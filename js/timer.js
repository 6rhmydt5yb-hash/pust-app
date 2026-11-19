// Øktmotor: ren tilstandsmaskin og klokke. Ingen DOM. Testbar med `node --test`.
//
// Nøkkelidé: motoren regner i et "simulert" tidsdomene, ikke i veggur-tid.
// simulert_delta = veggur_delta * speed. Alt som planlegges (hold/hvile fra
// tables.js) står alltid i ekte sekunder og endres aldri av speed — kun farten
// den simulerte klokken går med endres. Det som lagres (faktisk holdtid,
// tidspunkt for sammentrekninger osv.) leses alltid fra den simulerte klokken,
// så en økt kjørt med ?speed=20 fortsatt lagrer reelle, sammenlignbare
// sekundverdier.

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const PHASES = Object.freeze({
  IDLE: 'idle',
  PREPARE: 'prepare',
  HOLD: 'hold',
  REST: 'rest',
  DONE: 'done',
  ABORTED: 'aborted',
});

export const PREPARE_SEC = 5;

export function createClock({ now = defaultNow, speed = 1 } = {}) {
  let lastWall = now();
  let simulatedMs = 0;
  return {
    tick() {
      const currentWall = now();
      simulatedMs += (currentWall - lastWall) * speed;
      lastWall = currentWall;
      return simulatedMs;
    },
    resync() {
      lastWall = now();
    },
    get simulatedMs() {
      return simulatedMs;
    },
  };
}

class Emitter {
  constructor() {
    this._listeners = {};
  }
  on(event, fn) {
    (this._listeners[event] ||= []).push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    this._listeners[event] = (this._listeners[event] || []).filter((f) => f !== fn);
  }
  emit(event, payload) {
    for (const fn of this._listeners[event] || []) fn(payload);
  }
}

function freshRoundResult(roundIndex) {
  return {
    roundIndex,
    contractions: [],
    firstContractionAtMs: null,
    actualHold: null,
    actualRest: null,
    breathedEarly: false,
  };
}

/**
 * tableType: 'co2' | 'o2' | 'mix' | 'wonka' | 'custom'
 * rounds: for co2/o2/mix/custom: [{hold, rest}, ...] (sekunder)
 *         for wonka: [{postContractionHold, rest}, ...] (sekunder)
 */
export class SessionEngine extends Emitter {
  constructor({ tableType, rounds, now, speed = 1 }) {
    super();
    this.tableType = tableType;
    this.rounds = rounds;
    this.clock = createClock({ now, speed });
    this.phase = PHASES.IDLE;
    this.roundIndex = 0;
    this.paused = false;
    this.phaseStartMs = 0;
    this.wonkaTapped = false;
    this.wonkaPostTapStartMs = null;
    this.results = [];
    this._lastCountdownBeep = null;
    this._running = false;
  }

  isWonka() {
    return this.tableType === 'wonka';
  }

  start() {
    if (this.phase !== PHASES.IDLE) return;
    this._running = true;
    this.phase = PHASES.PREPARE;
    this.phaseStartMs = this.clock.simulatedMs;
    this.emit('phaseChange', { phase: this.phase, roundIndex: this.roundIndex });
  }

  pause() {
    if (this.paused || !this._running) return;
    this.paused = true;
    this.emit('paused', {});
  }

  resume() {
    if (!this.paused) return;
    this.clock.resync();
    this.paused = false;
    this.emit('resumed', {});
  }

  abort() {
    if (!this._running) return;
    this._running = false;
    this.phase = PHASES.ABORTED;
    this.emit('aborted', { results: this.results });
  }

  registerContraction() {
    if (this.phase !== PHASES.HOLD || this.paused) return;
    const atMs = this.clock.simulatedMs - this.phaseStartMs;
    const current = this._currentRoundResult();
    current.contractions.push(atMs);
    this.emit('contraction', { roundIndex: this.roundIndex, atMs });

    if (this.isWonka() && !this.wonkaTapped) {
      this.wonkaTapped = true;
      this.wonkaPostTapStartMs = this.clock.simulatedMs;
      current.firstContractionAtMs = atMs;
      this.emit('wonkaArmed', {
        roundIndex: this.roundIndex,
        postContractionHoldSec: this.rounds[this.roundIndex].postContractionHold,
      });
    }
  }

  endHoldEarly() {
    if (this.phase !== PHASES.HOLD) return;
    const actualHoldSec = Math.round((this.clock.simulatedMs - this.phaseStartMs) / 1000);
    const current = this._currentRoundResult();
    current.actualHold = actualHoldSec;
    current.breathedEarly = true;
    this._enterRest();
  }

  /** Kalles jevnlig (f.eks. fra requestAnimationFrame) av visningen. */
  tick() {
    if (!this._running || this.paused) return;
    this.clock.tick();
    const elapsed = this.clock.simulatedMs - this.phaseStartMs;

    if (this.phase === PHASES.PREPARE) {
      const remainingMs = PREPARE_SEC * 1000 - elapsed;
      this._maybeBeepCountdown(remainingMs);
      this.emit('tick', { phase: this.phase, remainingMs: Math.max(0, remainingMs), roundIndex: this.roundIndex });
      if (remainingMs <= 0) this._enterHold();
      return;
    }

    if (this.phase === PHASES.HOLD) {
      if (this.isWonka()) {
        this._tickWonkaHold(elapsed);
      } else {
        const plannedMs = this.rounds[this.roundIndex].hold * 1000;
        const remainingMs = plannedMs - elapsed;
        this.emit('tick', { phase: this.phase, remainingMs: Math.max(0, remainingMs), roundIndex: this.roundIndex });
        if (remainingMs <= 0) {
          const current = this._currentRoundResult();
          current.actualHold = this.rounds[this.roundIndex].hold;
          this._enterRest();
        }
      }
      return;
    }

    if (this.phase === PHASES.REST) {
      const plannedMs = this.rounds[this.roundIndex].rest * 1000;
      const remainingMs = plannedMs - elapsed;
      this._maybeBeepCountdown(remainingMs);
      this.emit('tick', { phase: this.phase, remainingMs: Math.max(0, remainingMs), roundIndex: this.roundIndex });
      if (remainingMs <= 0) {
        const current = this._currentRoundResult();
        current.actualRest = this.rounds[this.roundIndex].rest;
        this._advanceRound();
      }
    }
  }

  _tickWonkaHold(elapsed) {
    if (!this.wonkaTapped) {
      this.emit('tick', {
        phase: this.phase,
        elapsedMs: elapsed,
        roundIndex: this.roundIndex,
        wonkaWaiting: true,
      });
      return;
    }
    const plannedMs = this.rounds[this.roundIndex].postContractionHold * 1000;
    const sinceTapMs = this.clock.simulatedMs - this.wonkaPostTapStartMs;
    const remainingMs = plannedMs - sinceTapMs;
    this.emit('tick', {
      phase: this.phase,
      remainingMs: Math.max(0, remainingMs),
      roundIndex: this.roundIndex,
      wonkaWaiting: false,
    });
    if (remainingMs <= 0) {
      const current = this._currentRoundResult();
      current.actualHold = Math.round(elapsed / 1000);
      this._enterRest();
    }
  }

  _maybeBeepCountdown(remainingMs) {
    const secLeft = Math.ceil(remainingMs / 1000);
    if (secLeft <= 3 && secLeft >= 1 && secLeft !== this._lastCountdownBeep) {
      this._lastCountdownBeep = secLeft;
      this.emit('countdownBeep', { secondsLeft: secLeft });
    }
    if (remainingMs <= 0) this._lastCountdownBeep = null;
  }

  _currentRoundResult() {
    if (!this.results[this.roundIndex]) {
      this.results[this.roundIndex] = freshRoundResult(this.roundIndex);
    }
    return this.results[this.roundIndex];
  }

  _enterHold() {
    this.phase = PHASES.HOLD;
    this.phaseStartMs = this.clock.simulatedMs;
    this.wonkaTapped = false;
    this.wonkaPostTapStartMs = null;
    this._lastCountdownBeep = null;
    this.emit('phaseChange', { phase: this.phase, roundIndex: this.roundIndex });
  }

  _enterRest() {
    this.phase = PHASES.REST;
    this.phaseStartMs = this.clock.simulatedMs;
    this._lastCountdownBeep = null;
    this.emit('phaseChange', { phase: this.phase, roundIndex: this.roundIndex });
  }

  _advanceRound() {
    this.emit('roundComplete', { roundIndex: this.roundIndex, result: this.results[this.roundIndex] });
    this.roundIndex += 1;
    if (this.roundIndex >= this.rounds.length) {
      this._running = false;
      this.phase = PHASES.DONE;
      this.emit('complete', { results: this.results });
      return;
    }
    this._enterHold();
  }
}
