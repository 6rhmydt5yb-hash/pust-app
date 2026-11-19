import { getSessionsNewestFirst, getPbHistory, pbOverTime, sessionsPerWeek, firstContractionOverTime } from '../history.js';
import { buildLineChartSVG, buildBarChartSVG } from '../charts.js';
import { formatClock, formatDateTimeNo, TABLE_TYPE_LABELS, LEVEL_LABELS, openModal } from '../dom.js';

export async function mount(root, ctx) {
  const [sessions, pbHistory] = await Promise.all([getSessionsNewestFirst(), getPbHistory()]);
  const chronological = [...sessions].reverse();

  const pbChart = buildLineChartSVG(pbOverTime(pbHistory), { ariaLabel: 'PB over tid', emptyText: 'Ingen PB registrert ennå' });
  const weekChart = buildBarChartSVG(sessionsPerWeek(chronological), { ariaLabel: 'Økter per uke', emptyText: 'Ingen økter ennå' });
  const contractionChart = buildLineChartSVG(firstContractionOverTime(chronological), {
    ariaLabel: 'Første sammentrekning over tid',
    emptyText: 'Ingen registrert ennå',
  });

  root.innerHTML = `
    <div class="stack">
      <h1>Historikk</h1>

      <div class="card">
        <h2>PB over tid</h2>
        ${pbChart}
      </div>
      <div class="card">
        <h2>Økter per uke</h2>
        ${weekChart}
      </div>
      <div class="card">
        <h2>Første sammentrekning over tid</h2>
        ${contractionChart}
      </div>

      <h2>Alle økter</h2>
      <div class="stack" id="session-list">
        ${
          sessions.length
            ? sessions
                .map(
                  (s) => `
          <button class="card-link" data-id="${s.id}" type="button">
            <span>
              ${TABLE_TYPE_LABELS[s.tableType] || s.tableType}${s.tableLevel ? ' - ' + LEVEL_LABELS[s.tableLevel] : ''}<br/>
              <span class="small">${formatDateTimeNo(s.startedAt)}${s.aborted ? ' · avbrutt' : ''}</span>
            </span>
            <span class="card-link__chevron" aria-hidden="true">›</span>
          </button>
        `
                )
                .join('')
            : '<p class="small">Ingen økter registrert ennå.</p>'
        }
      </div>
    </div>
  `;

  root.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const session = sessions.find((s) => s.id === Number(btn.dataset.id));
      if (session) showDetail(session);
    });
  });

  function showDetail(session) {
    const rows = session.rounds
      .map((r, i) => {
        const planned = session.tableSnapshot[i];
        const plannedHold = planned ? (planned.hold != null ? planned.hold : planned.postContractionHold) : null;
        return `
        <tr>
          <td>${i + 1}</td>
          <td>${plannedHold != null ? formatClock(plannedHold) : '-'}</td>
          <td>${r.actualHold != null ? formatClock(r.actualHold) : '-'}</td>
          <td>${r.contractions ? r.contractions.length : 0}</td>
        </tr>
      `;
      })
      .join('');

    openModal(`
      <h2>${TABLE_TYPE_LABELS[session.tableType] || session.tableType}${session.tableLevel ? ' - ' + LEVEL_LABELS[session.tableLevel] : ''}</h2>
      <p class="small">${formatDateTimeNo(session.startedAt)}${session.aborted ? ' · avbrutt' : ' · fullført'}</p>
      <table class="round-table">
        <thead><tr><th>Runde</th><th>Planlagt</th><th>Faktisk</th><th>Sammentr.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }
}
