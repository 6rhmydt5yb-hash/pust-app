import { TABLE_TYPE_LABELS, escapeHtml, formatClock } from '../dom.js';
import { dbGetAll, STORES } from '../db.js';

export async function mount(root, ctx) {
  const customTables = await dbGetAll(STORES.CUSTOM_TABLES);
  const hasPB = !!ctx.settings.pb;

  root.innerHTML = `
    <div class="stack">
      <h1>Hei!</h1>
      <p class="subtitle">${hasPB ? `Din PB: <strong>${formatClock(ctx.settings.pb.seconds)}</strong>` : 'Du har ikke registrert en PB ennå.'}</p>

      ${!hasPB ? '<div class="banner banner-warning"><span aria-hidden="true">⚠️</span><span>Du må registrere en PB før du kan starte en tabell. <a href="#/innstillinger">Gå til innstillinger</a>.</span></div>' : ''}

      <h2>Standardtabeller</h2>
      <div class="stack">
        ${['co2', 'o2', 'mix', 'wonka']
          .map(
            (type) => `
          <button class="card-link" data-type="${type}" type="button">
            <span>${TABLE_TYPE_LABELS[type]}</span>
            <span class="card-link__chevron" aria-hidden="true">›</span>
          </button>
        `
          )
          .join('')}
      </div>

      <h2>Avslapningspust</h2>
      <button class="card-link" id="relax-link" type="button">
        <span>Styrt pust (4-4-8)</span>
        <span class="card-link__chevron" aria-hidden="true">›</span>
      </button>

      <h2>Egendefinerte tabeller</h2>
      <div class="stack">
        ${
          customTables
            .map(
              (t) => `
          <button class="card-link" data-custom="${t.id}" type="button">
            <span>${escapeHtml(t.name)}</span>
            <span class="card-link__chevron" aria-hidden="true">›</span>
          </button>
        `
            )
            .join('') || '<p class="small">Du har ingen egendefinerte tabeller ennå.</p>'
        }
        <button class="btn btn-secondary" id="new-custom" type="button">+ Lag egendefinert tabell</button>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!hasPB) {
        window.alert('Registrer PB i innstillinger først.');
        return;
      }
      ctx.navigate(`#/tabell/${btn.dataset.type}/${ctx.settings.defaultLevel}`);
    });
  });
  root.querySelector('#relax-link').addEventListener('click', () => ctx.navigate('#/avslapning'));
  root.querySelectorAll('[data-custom]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.navigate(`#/tabell/custom/${btn.dataset.custom}`));
  });
  root.querySelector('#new-custom').addEventListener('click', () => {
    if (!hasPB) {
      window.alert('Registrer PB i innstillinger først.');
      return;
    }
    ctx.navigate('#/tabell/custom/ny');
  });
}
