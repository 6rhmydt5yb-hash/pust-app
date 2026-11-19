import { buildRelaxSession } from '../tables.js';
import { createClock } from '../timer.js';
import { speak, unlockSpeech } from '../speech.js';
import { beep, unlockAudio } from '../audio.js';
import { formatClock } from '../dom.js';

const PHASE_NAMES = ['Pust inn', 'Hold', 'Pust ut'];

export async function mount(root, ctx) {
  let minutes = 5;
  let running = false;
  let rafId = null;
  let clock = null;
  let session = null;
  let phaseIndex = 0;
  let phaseStartMs = 0;

  function render() {
    root.innerHTML = `
      <div class="stack">
        <h1 class="center">Avslapningspust</h1>
        <p class="subtitle center">Et rolig 4-4-8-mønster: pust inn i 4 sekunder, hold i 4, pust ut i 8.</p>

        <div class="card">
          <div class="field">
            <label for="relax-minutes">Varighet (minutter)</label>
            <input type="number" id="relax-minutes" min="2" max="10" value="${minutes}" />
          </div>
        </div>

        <div class="card center" id="relax-display" hidden>
          <div class="small" id="relax-phase-label">Pust inn</div>
          <div class="session-screen__clock" style="font-size:3rem;" id="relax-clock">0:00</div>
          <div class="small" id="relax-remaining"></div>
        </div>

        <button type="button" class="btn btn-primary" id="relax-toggle">Start</button>
      </div>
    `;

    root.querySelector('#relax-minutes').addEventListener('input', (e) => {
      minutes = Math.max(2, Math.min(10, Number(e.target.value) || 2));
    });

    root.querySelector('#relax-toggle').addEventListener('click', () => {
      if (!running) startRelax();
      else stopRelax();
    });
  }

  function startRelax() {
    unlockSpeech();
    unlockAudio();
    session = buildRelaxSession(minutes);
    clock = createClock({ speed: ctx.speed });
    phaseIndex = 0;
    phaseStartMs = 0;
    running = true;
    root.querySelector('#relax-display').hidden = false;
    root.querySelector('#relax-toggle').textContent = 'Avslutt';
    announcePhase();
    loop();
  }

  function announcePhase() {
    const label = PHASE_NAMES[phaseIndex];
    root.querySelector('#relax-phase-label').textContent = label;
    speak(label, ctx.settings.speechEnabled);
    beep(ctx.settings.audioEnabled, { frequency: 500 });
  }

  function loop() {
    if (!running) return;
    const simMs = clock.tick();
    const remainingTotalMs = session.durationSeconds * 1000 - simMs;
    if (remainingTotalMs <= 0) {
      finishRelax();
      return;
    }
    const phaseDurations = [session.pattern.inhale, session.pattern.hold, session.pattern.exhale];
    const phaseMs = phaseDurations[phaseIndex] * 1000;
    const phaseElapsed = simMs - phaseStartMs;
    const phaseRemaining = phaseMs - phaseElapsed;

    root.querySelector('#relax-clock').textContent = formatClock(Math.max(0, phaseRemaining) / 1000);
    root.querySelector('#relax-remaining').textContent = `Totalt igjen: ${formatClock(remainingTotalMs / 1000)}`;

    if (phaseRemaining <= 0) {
      phaseIndex = (phaseIndex + 1) % 3;
      phaseStartMs = simMs;
      announcePhase();
    }

    rafId = requestAnimationFrame(loop);
  }

  function stopRelax() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    const toggle = root.querySelector('#relax-toggle');
    if (toggle) toggle.textContent = 'Start';
    const display = root.querySelector('#relax-display');
    if (display) display.hidden = true;
  }

  function finishRelax() {
    stopRelax();
    window.alert('Avslapningsøkten er ferdig. Bra jobbet!');
  }

  render();

  return () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  };
}
