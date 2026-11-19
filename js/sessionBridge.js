// Enkel in-memory "postkasse" for å sende øktkonfig og -resultat mellom views
// uten å stappe det inn i URL-hashen.

let pendingSession = null;
let lastResult = null;

export function setPendingSession(config) {
  pendingSession = config;
}

export function takePendingSession() {
  const s = pendingSession;
  pendingSession = null;
  return s;
}

export function setLastResult(result) {
  lastResult = result;
}

export function takeLastResult() {
  const r = lastResult;
  lastResult = null;
  return r;
}
