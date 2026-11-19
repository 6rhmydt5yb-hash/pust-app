import { exportData, downloadJSON, parseImportFile, countRecords, importData, daysSinceLastExport } from '../backup.js';
import { confirmModal, formatDateTimeNo } from '../dom.js';

export async function mount(root, ctx) {
  const daysSince = daysSinceLastExport(ctx.settings.lastExportAt);
  const showReminder = daysSince > 30;

  root.innerHTML = `
    <div class="stack">
      <h1>Sikkerhetskopi</h1>
      <p class="subtitle">All data lagres kun lokalt på denne enheten. Ta jevnlig sikkerhetskopi slik at du ikke mister historikken din.</p>

      <div class="banner banner-warning" id="export-reminder-banner" ${showReminder ? '' : 'hidden'}>
        <span aria-hidden="true">⚠️</span>
        <span>${ctx.settings.lastExportAt ? `Det er over 30 dager siden siste eksport (${formatDateTimeNo(ctx.settings.lastExportAt)}).` : 'Du har aldri eksportert en sikkerhetskopi.'} Vurder å eksportere nå.</span>
      </div>

      <div class="card">
        <h2>Eksporter</h2>
        <p class="small">Lager en fil (.json) du kan lagre i Filer-appen, e-post til deg selv, eller på en skytjeneste.</p>
        <button type="button" class="btn btn-primary" id="export-btn">Eksporter sikkerhetskopi</button>
      </div>

      <div class="card">
        <h2>Importer</h2>
        <p class="small">Overskriver all nåværende data med innholdet i filen. Du blir bedt om å bekrefte først.</p>
        <input type="file" accept="application/json,.json" id="import-input" />
      </div>
    </div>
  `;

  root.querySelector('#export-btn').addEventListener('click', async () => {
    const data = await exportData();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJSON(`pust-sikkerhetskopi-${stamp}.json`, data);
    const banner = root.querySelector('#export-reminder-banner');
    if (banner) banner.hidden = true;
    window.alert('Sikkerhetskopien er lastet ned.');
  });

  root.querySelector('#import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let data;
    try {
      data = parseImportFile(text);
    } catch (err) {
      window.alert(err.message);
      e.target.value = '';
      return;
    }
    const counts = countRecords(data);
    const ok = await confirmModal({
      title: 'Importere sikkerhetskopi?',
      body: `Dette erstatter all nåværende data med: ${counts.sessions} økter, ${counts.customTables} egendefinerte tabeller, ${counts.pbHistory} PB-registreringer. Dette kan ikke angres.`,
      confirmLabel: 'Importer og overskriv',
      danger: true,
    });
    e.target.value = '';
    if (!ok) return;
    await importData(data);
    window.alert('Importen er fullført.');
    ctx.navigate('#/tabeller');
  });
}
