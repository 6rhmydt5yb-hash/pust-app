import { recordPB } from '../history.js';
import { formatClock } from '../dom.js';

export async function mount(root, ctx) {
  root.innerHTML = `
    <div class="stack">
      <h1 class="center">Finn din personlige rekord (PB)</h1>
      <p class="subtitle center">Hvor lenge klarer du å holde pusten i ro, sittende eller liggende? Dette brukes til å lage trygge treningstabeller for deg.</p>

      <div class="level-picker" role="tablist">
        <button type="button" class="active" data-tab="manual">Skriv inn selv</button>
        <button type="button" data-tab="stopwatch">Stoppeklokke</button>
      </div>

      <div id="tab-manual" class="card">
        <div class="row">
          <div class="field">
            <label for="pb-minutes">Minutter</label>
            <input type="number" id="pb-minutes" min="0" max="20" value="2" inputmode="numeric" />
          </div>
          <div class="field">
            <label for="pb-seconds">Sekunder</label>
            <input type="number" id="pb-seconds" min="0" max="59" value="0" inputmode="numeric" />
          </div>
        </div>
      </div>

      <div id="tab-stopwatch" class="card center" hidden>
        <div class="session-screen__clock" id="stopwatch-clock" style="font-size:3rem;">0:00</div>
        <div class="btn-block-group">
          <button type="button" class="btn btn-primary" id="stopwatch-toggle">Start</button>
        </div>
      </div>

      <div class="banner banner-warning">
        <span aria-hidden="true">⚠️</span>
        <span>Ikke press deg. Stopp ved første tegn til ubehag eller svimmelhet - et forsiktig anslag er helt greit nå. Du kan oppdatere PB senere i innstillinger.</span>
      </div>

      <button type="button" class="btn btn-primary" id="save-pb">Lagre og fortsett</button>
    </div>
  `;

  const manualTab = root.querySelector('#tab-manual');
  const stopwatchTab = root.querySelector('#tab-stopwatch');
  const tabButtons = root.querySelectorAll('[data-tab]');
  let mode = 'manual';
  let stopwatchSeconds = 0;
  let running = false;
  let startPerf = 0;
  let rafId = null;

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
      manualTab.hidden = mode !== 'manual';
      stopwatchTab.hidden = mode !== 'stopwatch';
    });
  });

  const clockEl = root.querySelector('#stopwatch-clock');
  const toggleBtn = root.querySelector('#stopwatch-toggle');

  function tickStopwatch() {
    const elapsed = (performance.now() - startPerf) / 1000;
    clockEl.textContent = formatClock(elapsed);
    rafId = requestAnimationFrame(tickStopwatch);
  }

  toggleBtn.addEventListener('click', () => {
    if (!running) {
      running = true;
      startPerf = performance.now();
      toggleBtn.textContent = 'Stopp';
      toggleBtn.classList.remove('btn-primary');
      toggleBtn.classList.add('btn-danger');
      rafId = requestAnimationFrame(tickStopwatch);
    } else {
      running = false;
      cancelAnimationFrame(rafId);
      stopwatchSeconds = Math.round((performance.now() - startPerf) / 1000);
      clockEl.textContent = formatClock(stopwatchSeconds);
      toggleBtn.textContent = 'Start på nytt';
      toggleBtn.classList.remove('btn-danger');
      toggleBtn.classList.add('btn-primary');
    }
  });

  root.querySelector('#save-pb').addEventListener('click', async () => {
    let seconds;
    if (mode === 'manual') {
      const min = Number(root.querySelector('#pb-minutes').value) || 0;
      const sec = Number(root.querySelector('#pb-seconds').value) || 0;
      seconds = min * 60 + sec;
    } else {
      seconds = stopwatchSeconds;
    }
    if (!seconds || seconds < 5) {
      window.alert('Skriv inn eller mål en holdtid på minst 5 sekunder.');
      return;
    }
    await recordPB(seconds, mode === 'manual' ? 'manual' : 'stopwatch');
    ctx.navigate('#/veiledning');
  });

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}
