// Ren tabellmatematikk. Ingen DOM, ingen IndexedDB — gjør denne filen testbar
// direkte med `node --test` uten noen avhengigheter.

import { clampHold, clampRest, clampAbsoluteHold, HOLD_CEILING_PCT, REST_FLOOR_SEC } from './safety.js';

export const TABLE_TYPES = ['co2', 'o2', 'wonka', 'mix'];
export const LEVELS = ['lett', 'normal', 'hard'];

// --- CO2-tabell: fast hold, hvile synker 2:00 -> 15s over 8 runder ---
const CO2_HOLD_PCT = { lett: 0.4, normal: 0.5, hard: 0.6 };

export function generateCO2Table(pbSeconds, level) {
  const pct = CO2_HOLD_PCT[level];
  const hold = clampHold(pbSeconds, pct * pbSeconds);
  const rounds = [];
  for (let i = 1; i <= 8; i++) {
    const rawRest = 120 - (i - 1) * 15;
    rounds.push({ hold, rest: clampRest(rawRest) });
  }
  return rounds;
}

// --- O2-tabell: fast hvile 2:00, hold stiger 40% -> nivåets sluttprosent ---
const O2_END_PCT = { lett: 0.6, normal: 0.7, hard: 0.8 };
const O2_START_PCT = 0.4;

export function generateO2Table(pbSeconds, level) {
  const endPct = O2_END_PCT[level];
  const rounds = [];
  for (let i = 1; i <= 8; i++) {
    const t = (i - 1) / 7;
    const pct = O2_START_PCT + (endPct - O2_START_PCT) * t;
    rounds.push({ hold: clampHold(pbSeconds, pct * pbSeconds), rest: clampRest(120) });
  }
  return rounds;
}

// --- Mix-tabell: hold stiger og hvile synker samtidig over 8 runder ---
// Oppdraget ga kun tall for ett nivå (hold 35->60 %, hvile 2:00->1:00).
// Lett/Hard er egne, dokumenterte valg (se BESLUTNINGER.md) skalert i samme ånd
// som avstanden mellom nivåene i CO2- og O2-tabellene.
const MIX_PARAMS = {
  lett: { holdStart: 0.3, holdEnd: 0.5, restStart: 130, restEnd: 70 },
  normal: { holdStart: 0.35, holdEnd: 0.6, restStart: 120, restEnd: 60 },
  hard: { holdStart: 0.4, holdEnd: 0.65, restStart: 110, restEnd: 50 },
};

export function generateMixTable(pbSeconds, level) {
  const { holdStart, holdEnd, restStart, restEnd } = MIX_PARAMS[level];
  const rounds = [];
  for (let i = 1; i <= 8; i++) {
    const t = (i - 1) / 7;
    const pct = holdStart + (holdEnd - holdStart) * t;
    const rawRest = restStart + (restEnd - restStart) * t;
    rounds.push({ hold: clampHold(pbSeconds, pct * pbSeconds), rest: clampRest(rawRest) });
  }
  return rounds;
}

// --- Wonka-tabell: ikke PB-prosentbasert. Brukeren trykker ved første
// sammentrekning og holder et fast antall sekunder til. ---
// Oppdraget ga kun tall for ett nivå (30 s etter trykk, ~10 s hvile).
// Lett/Hard er egne, dokumenterte valg (se BESLUTNINGER.md).
const WONKA_PARAMS = {
  lett: { postContractionHold: 20, rest: 15 },
  normal: { postContractionHold: 30, rest: 10 },
  hard: { postContractionHold: 40, rest: 10 },
};

export function generateWonkaTable(level) {
  const { postContractionHold, rest } = WONKA_PARAMS[level];
  const clampedHold = clampAbsoluteHold(postContractionHold);
  const clampedRest = clampRest(rest);
  const rounds = [];
  for (let i = 1; i <= 6; i++) {
    rounds.push({ postContractionHold: clampedHold, rest: clampedRest });
  }
  return rounds;
}

// --- Egendefinert tabell: frie runder, men alltid kjørt gjennom sikkerhetsklempene ---
export function validateCustomTable(table, pbSeconds) {
  const ceiling = pbSeconds * HOLD_CEILING_PCT;
  let adjusted = false;
  const rounds = (table.rounds || []).map((r) => {
    if (r.hold > ceiling) adjusted = true;
    if (r.rest < REST_FLOOR_SEC) adjusted = true;
    return { hold: clampHold(pbSeconds, r.hold), rest: clampRest(r.rest) };
  });
  return { name: table.name || '', rounds, adjusted };
}

// --- Avslapningspust: styrt pust (4-4-8), 2-10 minutter ---
export const RELAX_PATTERN = { inhale: 4, hold: 4, exhale: 8 };

export function buildRelaxSession(durationMinutes) {
  const minutes = Math.max(2, Math.min(10, Math.round(durationMinutes)));
  return { pattern: RELAX_PATTERN, durationSeconds: minutes * 60 };
}

// --- Samlet oppslag ---
export function generateTable(type, level, pbSeconds) {
  switch (type) {
    case 'co2':
      return generateCO2Table(pbSeconds, level);
    case 'o2':
      return generateO2Table(pbSeconds, level);
    case 'mix':
      return generateMixTable(pbSeconds, level);
    case 'wonka':
      return generateWonkaTable(level);
    default:
      throw new Error(`Ukjent tabelltype: ${type}`);
  }
}
