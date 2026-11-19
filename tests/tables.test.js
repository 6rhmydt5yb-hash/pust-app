import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCO2Table,
  generateO2Table,
  generateMixTable,
  generateWonkaTable,
  validateCustomTable,
  LEVELS,
} from '../js/tables.js';
import { clampHold, clampRest, HOLD_CEILING_PCT, REST_FLOOR_SEC } from '../js/safety.js';

function allIntegers(rounds, ...fields) {
  return rounds.every((r) => fields.every((f) => Number.isInteger(r[f])));
}

describe('CO2-tabell', () => {
  it('pb=300, normal: fast hold 150s, hvile 120->15 i 8 runder', () => {
    const rounds = generateCO2Table(300, 'normal');
    assert.equal(rounds.length, 8);
    assert.ok(rounds.every((r) => r.hold === 150));
    assert.deepEqual(
      rounds.map((r) => r.rest),
      [120, 105, 90, 75, 60, 45, 30, 15]
    );
  });

  it('pb=300, lett: hold 120s; hard: hold 180s', () => {
    assert.equal(generateCO2Table(300, 'lett')[0].hold, 120);
    assert.equal(generateCO2Table(300, 'hard')[0].hold, 180);
  });

  it('pb=137 (oddetall): hold rundes til nærmeste hele sekund', () => {
    const rounds = generateCO2Table(137, 'normal');
    assert.equal(rounds[0].hold, 69); // Math.round(68.5) === 69
  });

  it('alle hvileverdier er >= 10s for alle nivåer, runde 8 er 15s', () => {
    for (const level of LEVELS) {
      const rounds = generateCO2Table(300, level);
      assert.ok(rounds.every((r) => r.rest >= REST_FLOOR_SEC));
      assert.equal(rounds[7].rest, 15);
    }
  });

  it('alle verdier er hele tall', () => {
    for (const level of LEVELS) {
      assert.ok(allIntegers(generateCO2Table(300, level), 'hold', 'rest'));
    }
  });
});

describe('O2-tabell', () => {
  it('pb=300, normal: hold stiger 120 -> 210, hvile fast 120', () => {
    const rounds = generateO2Table(300, 'normal');
    assert.equal(rounds[0].hold, 120);
    assert.equal(rounds[7].hold, 210);
    assert.equal(rounds[3].hold, 159);
    assert.ok(rounds.every((r) => r.rest === 120));
  });

  it('lett slutter på 180, hard slutter på 240', () => {
    assert.equal(generateO2Table(300, 'lett')[7].hold, 180);
    assert.equal(generateO2Table(300, 'hard')[7].hold, 240);
  });

  it('holder seg alltid under 85%-taket for alle nivåer og runder', () => {
    for (const level of LEVELS) {
      const rounds = generateO2Table(300, level);
      assert.ok(rounds.every((r) => r.hold <= Math.round(300 * HOLD_CEILING_PCT)));
    }
  });

  it('alle verdier er hele tall', () => {
    for (const level of LEVELS) {
      assert.ok(allIntegers(generateO2Table(300, level), 'hold', 'rest'));
    }
  });
});

describe('Mix-tabell', () => {
  it('pb=300, normal: hold 105 -> 180, hvile 120 -> 60', () => {
    const rounds = generateMixTable(300, 'normal');
    assert.equal(rounds[0].hold, 105);
    assert.equal(rounds[7].hold, 180);
    assert.equal(rounds[3].hold, 137);
    assert.equal(rounds[0].rest, 120);
    assert.equal(rounds[7].rest, 60);
    assert.equal(rounds[3].rest, 94);
  });

  it('lett og hard har egne, dokumenterte endepunkter', () => {
    const lett = generateMixTable(300, 'lett');
    assert.equal(lett[0].hold, 90);
    assert.equal(lett[7].hold, 150);
    assert.equal(lett[0].rest, 130);
    assert.equal(lett[7].rest, 70);

    const hard = generateMixTable(300, 'hard');
    assert.equal(hard[0].hold, 120);
    assert.equal(hard[7].hold, 195);
    assert.equal(hard[0].rest, 110);
    assert.equal(hard[7].rest, 50);
  });

  it('hold er ikke-synkende og hvile er ikke-stigende gjennom tabellen', () => {
    for (const level of LEVELS) {
      const rounds = generateMixTable(300, level);
      for (let i = 1; i < rounds.length; i++) {
        assert.ok(rounds[i].hold >= rounds[i - 1].hold);
        assert.ok(rounds[i].rest <= rounds[i - 1].rest);
      }
    }
  });

  it('alle verdier er hele tall', () => {
    for (const level of LEVELS) {
      assert.ok(allIntegers(generateMixTable(300, level), 'hold', 'rest'));
    }
  });
});

describe('Wonka-tabell', () => {
  it('6 runder for alle nivåer, med riktige tall per nivå', () => {
    const expected = {
      lett: { postContractionHold: 20, rest: 15 },
      normal: { postContractionHold: 30, rest: 10 },
      hard: { postContractionHold: 40, rest: 10 },
    };
    for (const level of LEVELS) {
      const rounds = generateWonkaTable(level);
      assert.equal(rounds.length, 6);
      assert.ok(rounds.every((r) => r.postContractionHold === expected[level].postContractionHold));
      assert.ok(rounds.every((r) => r.rest === expected[level].rest));
    }
  });

  it('alle verdier er hele tall', () => {
    for (const level of LEVELS) {
      const rounds = generateWonkaTable(level);
      assert.ok(rounds.every((r) => Number.isInteger(r.postContractionHold) && Number.isInteger(r.rest)));
    }
  });
});

describe('Egendefinert tabell', () => {
  it('runde innenfor grensene forblir uendret', () => {
    const result = validateCustomTable({ name: 'Test', rounds: [{ hold: 60, rest: 30 }] }, 300);
    assert.deepEqual(result.rounds, [{ hold: 60, rest: 30 }]);
    assert.equal(result.adjusted, false);
  });

  it('for høy holdtid klemmes til 85%-taket og flagges', () => {
    const result = validateCustomTable({ name: 'Test', rounds: [{ hold: 300, rest: 5 }] }, 300);
    assert.equal(result.rounds[0].hold, 255); // round(300*0.85)
    assert.equal(result.rounds[0].rest, 10);
    assert.equal(result.adjusted, true);
  });

  it('kun for kort hvile klemmes, hold rører ikke ved taket', () => {
    const result = validateCustomTable({ name: 'Test', rounds: [{ hold: 100, rest: 5 }] }, 300);
    assert.equal(result.rounds[0].hold, 100);
    assert.equal(result.rounds[0].rest, 10);
    assert.equal(result.adjusted, true);
  });
});

describe('Sikkerhetsklemmer (safety.js)', () => {
  it('clampRest håndhever gulvet på 10s', () => {
    assert.equal(clampRest(5), 10);
    assert.equal(clampRest(10), 10);
    assert.equal(clampRest(15), 15);
  });

  it('clampHold håndhever taket på 85% av PB', () => {
    assert.equal(clampHold(300, 400), 255);
    assert.equal(clampHold(300, 100), 100);
  });
});

describe('Gjennomgående sikkerhetssjekk for alle generatorer', () => {
  const pbs = [60, 90, 150, 300, 600];

  it('hold <= 85% av PB, hvile >= 10s, og alle verdier er hele tall', () => {
    for (const pb of pbs) {
      const ceiling = Math.round(pb * HOLD_CEILING_PCT);
      for (const level of LEVELS) {
        for (const rounds of [
          generateCO2Table(pb, level),
          generateO2Table(pb, level),
          generateMixTable(pb, level),
        ]) {
          for (const r of rounds) {
            assert.ok(r.hold <= ceiling, `hold ${r.hold} > tak ${ceiling} (pb=${pb}, nivå=${level})`);
            assert.ok(r.rest >= REST_FLOOR_SEC, `rest ${r.rest} < gulv (pb=${pb}, nivå=${level})`);
            assert.ok(Number.isInteger(r.hold) && Number.isInteger(r.rest));
          }
        }
        for (const r of generateWonkaTable(level)) {
          assert.ok(r.postContractionHold <= 60);
          assert.ok(r.rest >= REST_FLOOR_SEC);
        }
      }
    }
  });
});
