import { updateSettings } from '../settings.js';
import { recordPB } from '../history.js';
import { clearAllStores } from '../db.js';
import { confirmModal, formatClock, LEVEL_LABELS } from '../dom.js';
import { LEVELS } from '../tables.js';

export async function mount(root, ctx) {
  let settings = ctx.settings;

  function render() {
    root.innerHTML = `
      <div class="stack">
        <h1>Innstillinger</h1>

        <div class="card">
          <h2>Personlig rekord (PB)</h2>
          <p>${settings.pb ? formatClock(settings.pb.seconds) : 'Ikke registrert'}</p>
          <button type="button" class="btn btn-secondary" id="edit-pb">Oppdater PB</button>
        </div>

        <div class="card">
          <h2>Standardnivå</h2>
          <div class="level-picker">
            ${LEVELS.map((l) => `<button type="button" data-level="${l}" class="${l === settings.defaultLevel ? 'active' : ''}">${LEVEL_LABELS[l]}</button>`).join('')}
          </div>
        </div>

        <div class="card">
          <h2>Lyd og tale</h2>
          <label class="check-row" for="toggle-speech">
            <span>Norsk tale under økter</span>
            <span class="switch"><input type="checkbox" id="toggle-speech" ${settings.speechEnabled ? 'checked' : ''} /><span class="switch-track"></span></span>
          </label>
          <label class="check-row" for="toggle-audio">
            <span>Lydpip ved nedtelling</span>
            <span class="switch"><input type="checkbox" id="toggle-audio" ${settings.audioEnabled ? 'checked' : ''} /><span class="switch-track"></span></span>
          </label>
        </div>

        <h2>Mer</h2>
        <div class="stack">
          <button class="card-link" id="link-guide" type="button"><span>Veiledning</span><span class="card-link__chevron" aria-hidden="true">›</span></button>
          <button class="card-link" id="link-safety" type="button"><span>Sikkerhetsinformasjon</span><span class="card-link__chevron" aria-hidden="true">›</span></button>
          <button class="card-link" id="link-reminders" type="button"><span>Påminnelser</span><span class="card-link__chevron" aria-hidden="true">›</span></button>
          <button class="card-link" id="link-backup" type="button"><span>Sikkerhetskopi</span><span class="card-link__chevron" aria-hidden="true">›</span></button>
        </div>

        <div class="card">
          <h2>Faresone</h2>
          <button type="button" class="btn btn-danger" id="reset-all">Nullstill all data</button>
        </div>
      </div>
    `;

    root.querySelectorAll('[data-level]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        settings = await updateSettings({ defaultLevel: btn.dataset.level });
        render();
      });
    });

    root.querySelector('#toggle-speech').addEventListener('change', async (e) => {
      settings = await updateSettings({ speechEnabled: e.target.checked });
    });
    root.querySelector('#toggle-audio').addEventListener('change', async (e) => {
      settings = await updateSettings({ audioEnabled: e.target.checked });
    });

    root.querySelector('#edit-pb').addEventListener('click', async () => {
      const current = settings.pb ? settings.pb.seconds : 0;
      const input = window.prompt('Skriv inn ny PB i sekunder:', String(current || ''));
      if (input === null) return;
      const seconds = Number(input);
      if (!seconds || seconds < 5) {
        window.alert('Ugyldig verdi. Skriv et tall på minst 5 (sekunder).');
        return;
      }
      await recordPB(seconds, 'manual');
      settings = { ...settings, pb: { seconds, setAt: new Date().toISOString() } };
      render();
    });

    root.querySelector('#link-guide').addEventListener('click', () => ctx.navigate('#/veiledning'));
    root.querySelector('#link-safety').addEventListener('click', () => ctx.navigate('#/sikkerhet-info'));
    root.querySelector('#link-reminders').addEventListener('click', () => ctx.navigate('#/paminnelser'));
    root.querySelector('#link-backup').addEventListener('click', () => ctx.navigate('#/sikkerhetskopi'));

    root.querySelector('#reset-all').addEventListener('click', async () => {
      const first = await confirmModal({
        title: 'Nullstille all data?',
        body: 'Dette sletter alle tabeller, økter og innstillinger permanent.',
        confirmLabel: 'Fortsett',
        danger: true,
      });
      if (!first) return;
      const second = await confirmModal({
        title: 'Er du helt sikker?',
        body: 'Dette kan ikke angres. All data forsvinner for godt.',
        confirmLabel: 'Ja, slett alt',
        danger: true,
      });
      if (!second) return;
      await clearAllStores();
      window.location.reload();
    });
  }

  render();
}
