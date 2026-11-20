import { takeLastResult } from '../sessionBridge.js';
import { formatClock, TABLE_TYPE_LABELS, LEVEL_LABELS } from '../dom.js';

export async function mount(root, ctx) {
  const result = takeLastResult();
  if (!result) {
    ctx.navigate('#/tabeller');
    return;
  }

  const totalContractions = result.rounds.reduce((sum, r) => sum + (r.contractions ? r.contractions.length : 0), 0);

  root.innerHTML = `
    <div class="stack">
      ${
        result.newPb
          ? `
        <div class="card center" style="border-color: var(--accent);">
          <div class="icon-circle" aria-hidden="true">🏆</div>
          <h1>Ny personlig rekord!</h1>
          <p>${formatClock(result.newPbSeconds)}</p>
        </div>
      `
          : `<h1 class="center">${result.aborted ? 'Økt avbrutt' : 'Økt fullført'}</h1>`
      }

      <div class="card">
        <p><strong>${TABLE_TYPE_LABELS[result.tableType] || result.tableType}</strong>${result.tableLevel ? ` - ${LEVEL_LABELS[result.tableLevel]}` : ''}</p>
        <p class="small">Antall sammentrekninger registrert: ${totalContractions}</p>
      </div>

      <div class="card">
        <table class="round-table">
          <thead>
            <tr><th>Runde</th><th>Planlagt hold</th><th>Faktisk hold</th><th>Sammentr.</th></tr>
          </thead>
          <tbody>
            ${result.rounds
              .map((r, i) => {
                const planned = result.tableSnapshot[i];
                const plannedHold = planned ? (planned.hold != null ? planned.hold : planned.postContractionHold) : null;
                return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${plannedHold != null ? formatClock(plannedHold) : '-'}</td>
                  <td>${r.actualHold != null ? formatClock(r.actualHold) : '-'}${r.breathedEarly ? ' (pustet)' : ''}</td>
                  <td>${r.contractions ? r.contractions.length : 0}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="btn-block-group">
        <button class="btn btn-primary" id="to-history" type="button">Se i historikk</button>
        <button class="btn btn-secondary" id="to-home" type="button">Tilbake til tabeller</button>
      </div>
    </div>
  `;

  root.querySelector('#to-history').addEventListener('click', () => ctx.navigate('#/historikk'));
  root.querySelector('#to-home').addEventListener('click', () => ctx.navigate('#/tabeller'));
}
