// Wake Lock API - holder skjermen våken under en aktiv økt. Feature-detektert:
// blir stille no-op der det ikke støttes (bl.a. eldre iOS Safari).

let sentinel = null;

export function isWakeLockSupported() {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export async function requestWakeLock() {
  if (!isWakeLockSupported()) return false;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
    return true;
  } catch {
    sentinel = null;
    return false;
  }
}

export async function releaseWakeLock() {
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    // allerede frigjort
  }
  sentinel = null;
}

export function hasActiveWakeLock() {
  return sentinel !== null;
}
