// Sikkerhetsgrenser som HÅNDHEVES i all tabellgenerering og -redigering.
// Disse tallene skal aldri overstyres fra brukergrensesnittet.

export const HOLD_CEILING_PCT = 0.85; // aldri hold over 85 % av personlig rekord (PB)
export const REST_FLOOR_SEC = 10; // aldri hvile under 10 sekunder

/**
 * Klemmer en ønsket holdtid til aldri å overstige HOLD_CEILING_PCT av PB.
 * Runder til nærmeste hele sekund.
 */
export function clampHold(pbSeconds, rawSeconds) {
  const ceiling = pbSeconds * HOLD_CEILING_PCT;
  const bounded = Math.max(0, Math.min(ceiling, rawSeconds));
  return Math.round(bounded);
}

/**
 * Klemmer en ønsket hviletid til aldri å gå under REST_FLOOR_SEC.
 * Runder til nærmeste hele sekund.
 */
export function clampRest(rawSeconds) {
  return Math.max(REST_FLOOR_SEC, Math.round(rawSeconds));
}

/**
 * Klemmer en fast absolutt holdtid (brukt av Wonka-tabellen, som ikke er
 * PB-prosentbasert) til et hardkodet øvre tak, uavhengig av nivå.
 */
export const WONKA_ABSOLUTE_HOLD_CEILING_SEC = 60;

export function clampAbsoluteHold(rawSeconds) {
  const bounded = Math.max(0, Math.min(WONKA_ABSOLUTE_HOLD_CEILING_SEC, rawSeconds));
  return Math.round(bounded);
}
