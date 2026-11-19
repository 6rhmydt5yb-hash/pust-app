// Web Audio-pip ved nedtelling og faseskifte. Feature-detektert: blir stille
// no-op der AudioContext mangler, kaster aldri videre. iOS krever at lyd låses
// opp fra et ekte, synkront brukertrykk - se unlockAudio().

let ctx = null;
let unlocked = false;

function getContext() {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Må kalles synkront fra et ekte brukertrykk (f.eks. "Start") for å låse opp lyd på iOS. */
export function unlockAudio() {
  if (unlocked) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (typeof navigator !== 'undefined' && navigator.audioSession) {
      try {
        navigator.audioSession.type = 'playback';
      } catch {
        // ikke støttet på denne enheten - helt greit
      }
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.01);
    unlocked = true;
  } catch {
    // Lyd er en tilleggsfunksjon og skal aldri kaste en feil videre.
  }
}

export function beep(enabled, { frequency = 880, durationMs = 120 } = {}) {
  if (!enabled) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain).connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    // stille feil
  }
}

export function countdownBeep(enabled, secondsLeft) {
  beep(enabled, { frequency: secondsLeft === 1 ? 1200 : 880, durationMs: 100 });
}

export function phaseChangeBeep(enabled) {
  beep(enabled, { frequency: 600, durationMs: 180 });
}
