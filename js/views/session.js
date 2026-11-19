import { SessionEngine, PHASES } from '../timer.js';
import { formatClock, confirmModal } from '../dom.js';
import { speak } from '../speech.js';
import { countdownBeep, phaseChangeBeep } from '../audio.js';
import { requestWakeLock, releaseWakeLock } from '../wakelock.js';
import { takePendingSession, setLastResult } from '../sessionBridge.js';
import { saveSession, recordPB } from '../history.js';

export async function mount(root, ctx) {
  const pending = takePendingSession();
  if (!pending) {
    ctx.navigate('#/tabeller');
    return;
  }

  const engine = new SessionEngine({
    tableType: pending.tableType,
    rounds: pending.rounds,
    speed: ctx.speed,
  });

  let rafId = null;
  const startedAtIso = new Date().toISOString();

  root.innerHTML = `
    <div class="session-screen" data-phase="prepare" id="session-screen">
      <div class="contraction-flash" id="contraction-flash"></div>
      <div class="session-screen__top">
        <div class="small">${pending.sourceLabel}</div>
        <button class="btn-ghost" id="pause-btn" type="button" aria-label="Pause">⏸</button>
      </div>
      <div>
        <div class="session-screen__phase-label" id="phase-label">Gjør deg klar</div>
        <div class="session-screen__clock" id="clock">0:05</div>
        <div class="session-screen__round" id="round-label"></div>
        <div class="session-screen__hint" id="hint"></div>
      </div>
      <div class="session-screen__actions">
        <button class="btn btn-secondary" id="breathed-btn" type="button" hidden>Pustet</button>
        <button class="btn btn-ghost" id="abort-btn" type="button">Avbryt økt</button>
      </div>
    </div>
  `;

  const screenEl = root.querySelector('#session-screen');
  const phaseLabelEl = root.querySelector('#phase-label');
  const clockEl = root.querySelector('#clock');
  const roundLabelEl = root.querySelector('#round-label');
  const hintEl = root.querySelector('#hint');
  const flashEl = root.querySelector('#contraction-flash');
  const breathedBtn = root.querySelector('#breathed-btn');
  const pauseBtn = root.querySelector('#pause-btn');
  const abortBtn = root.querySelector('#abort-btn');

  const roundTotal = pending.rounds.length;

  engine.on('phaseChange', ({ phase, roundIndex }) => {
    screenEl.dataset.phase = phase;
    roundLabelEl.textContent = `Runde ${roundIndex + 1} av ${roundTotal}`;
    breathedBtn.hidden = phase !== PHASES.HOLD;
    if (phase === PHASES.PREPARE) {
      phaseLabelEl.textContent = 'Gjør deg klar';
      hintEl.textContent = '';
      speak('Gjør deg klar', ctx.settings.speechEnabled);
    } else if (phase === PHASES.HOLD) {
      phaseLabelEl.textContent = 'HOLD';
      hintEl.textContent = engine.isWonka()
        ? 'Trykk når du kjenner første sammentrekning'
        : 'Trykk hvor som helst for å registrere en sammentrekning';
      speak('Hold', ctx.settings.speechEnabled);
      phaseChangeBeep(ctx.settings.audioEnabled);
    } else if (phase === PHASES.REST) {
      phaseLabelEl.textContent = 'PUST';
      hintEl.textContent = 'Pust fritt og hvil';
      speak('Pust', ctx.settings.speechEnabled);
      phaseChangeBeep(ctx.settings.audioEnabled);
    }
  });

  engine.on('tick', (payload) => {
    if (payload.wonkaWaiting) {
      clockEl.textContent = formatClock(payload.elapsedMs / 1000);
    } else {
      clockEl.textContent = formatClock(payload.remainingMs / 1000);
    }
  });

  engine.on('countdownBeep', ({ secondsLeft }) => {
    countdownBeep(ctx.settings.audioEnabled, secondsLeft);
    speak(String(secondsLeft), ctx.settings.speechEnabled);
  });

  engine.on('wonkaArmed', () => {
    hintEl.textContent = 'Nedtellingen for resten av holdet er i gang';
  });

  engine.on('contraction', () => {
    flashEl.classList.remove('flash');
    void flashEl.offsetWidth;
    flashEl.classList.add('flash');
  });

  engine.on('complete', async ({ results }) => {
    await releaseWakeLock();
    await finishSession(results, false);
  });

  engine.on('aborted', async ({ results }) => {
    await releaseWakeLock();
    await finishSession(results, true);
  });

  async function finishSession(results, wasAborted) {
    const bestActualHold = results.reduce((max, r) => Math.max(max, r.actualHold || 0), 0);
    const session = {
      tableType: pending.tableType,
      tableLevel: pending.tableLevel,
      tableSnapshot: pending.rounds,
      startedAt: startedAtIso,
      endedAt: new Date().toISOString(),
      completed: !wasAborted,
      aborted: wasAborted,
      pbAtStart: pending.pbAtStart,
      newPbSeconds: null,
      rounds: results,
    };

    let newPb = false;
    if (bestActualHold > 0 && bestActualHold > (pending.pbAtStart || 0)) {
      session.newPbSeconds = bestActualHold;
      newPb = true;
    }

    const savedId = await saveSession(session);
    if (newPb) {
      await recordPB(bestActualHold, 'session', savedId);
    }

    setLastResult({ ...session, id: savedId, newPb });
    ctx.navigate(wasAborted ? '#/tabeller' : '#/oppsummering');
  }

  function loop() {
    engine.tick();
    rafId = requestAnimationFrame(loop);
  }

  screenEl.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    engine.registerContraction();
  });

  breathedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    engine.endHoldEarly();
  });

  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (engine.paused) {
      engine.resume();
      pauseBtn.textContent = '⏸';
    } else {
      engine.pause();
      pauseBtn.textContent = '▶';
    }
  });

  abortBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await confirmModal({
      title: 'Avbryte økten?',
      body: 'Fremgangen lagres, men økten merkes som avbrutt.',
      confirmLabel: 'Avbryt økt',
      danger: true,
    });
    if (ok) engine.abort();
  });

  requestWakeLock();
  engine.start();
  loop();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    releaseWakeLock();
  };
}
