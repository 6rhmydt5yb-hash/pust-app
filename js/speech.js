// Norsk tale via speechSynthesis, med fallback-kjede nb-NO -> no -> da -> sv -> en.
// iOS krever at lyd/tale låses opp fra et ekte, synkront brukertrykk - se unlockSpeech().

const PREFERRED_LANGS = ['nb-NO', 'no', 'da', 'sv', 'en'];

let unlocked = false;
let cachedVoice = null;
let voicesReady = false;

function supported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice() {
  if (!supported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const lang of PREFERRED_LANGS) {
    const match = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (match) return match;
  }
  return voices[0] || null;
}

function ensureVoicesLoaded() {
  if (!supported() || voicesReady) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    voicesReady = true;
    cachedVoice = pickVoice();
    return;
  }
  window.speechSynthesis.addEventListener(
    'voiceschanged',
    () => {
      voicesReady = true;
      cachedVoice = pickVoice();
    },
    { once: true }
  );
}

export function initSpeech() {
  ensureVoicesLoaded();
}

/** Må kalles synkront fra et ekte brukertrykk (f.eks. "Start") for å låse opp tale på iOS. */
export function unlockSpeech() {
  if (unlocked || !supported()) return;
  try {
    const utter = new SpeechSynthesisUtterance('');
    utter.volume = 0;
    window.speechSynthesis.speak(utter);
    unlocked = true;
  } catch {
    // Tale er en tilleggsfunksjon og skal aldri kaste en feil videre.
  }
}

export function speak(text, enabled) {
  if (!enabled || !supported()) return;
  ensureVoicesLoaded();
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'nb-NO';
    if (cachedVoice) utter.voice = cachedVoice;
    window.speechSynthesis.speak(utter);
  } catch {
    // stille feil
  }
}
