import { updateSettings } from '../settings.js';
import { buildReminderICS, downloadICS } from '../ics.js';
import { DAY_LABELS, DAY_ORDER } from '../dom.js';

export async function mount(root, ctx) {
  const days = new Set(ctx.settings.reminderPrefs.days || []);
  let time = ctx.settings.reminderPrefs.time || '19:00';

  function render() {
    root.innerHTML = `
      <div class="stack">
        <h1>Påminnelser</h1>
        <div class="banner">
          <span aria-hidden="true">ℹ️</span>
          <span>Pust er en nettapp (PWA) og kan ikke planlegge varsler selv på iPhone. Last ned en kalenderpåminnelse i stedet - den dukker opp i Kalender-appen din på valgte dager.</span>
        </div>

        <div class="card">
          <div class="field">
            <label>Hvilke dager?</label>
            <div class="daypicker">
              ${DAY_ORDER.map((d) => `<button type="button" data-day="${d}" class="${days.has(d) ? 'active' : ''}">${DAY_LABELS[d]}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label for="reminder-time">Klokkeslett</label>
            <input type="time" id="reminder-time" value="${time}" />
          </div>
        </div>

        <button type="button" class="btn btn-primary" id="download-ics">Last ned kalenderpåminnelse</button>
      </div>
    `;

    root.querySelectorAll('[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.day;
        if (days.has(d)) days.delete(d);
        else days.add(d);
        render();
      });
    });

    root.querySelector('#reminder-time').addEventListener('input', (e) => {
      time = e.target.value;
    });

    root.querySelector('#download-ics').addEventListener('click', async () => {
      if (!days.size) {
        window.alert('Velg minst én dag.');
        return;
      }
      const dayList = DAY_ORDER.filter((d) => days.has(d));
      await updateSettings({ reminderPrefs: { days: dayList, time } });
      const ics = buildReminderICS({ days: dayList, time });
      downloadICS('pust-paminnelse.ics', ics);
    });
  }

  render();
}
