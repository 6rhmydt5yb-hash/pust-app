import { generateTable, LEVELS } from '../tables.js';
import { clampHold, clampRest, clampAbsoluteHold } from '../safety.js';
import { LEVEL_LABELS, TABLE_TYPE_LABELS, formatClock } from '../dom.js';
import { setPendingSession } from '../sessionBridge.js';
import { unlockSpeech } from '../speech.js';
import { unlockAudio } from '../audio.js';

export async function mount(root, ctx) {
  const [type, levelParam] = ctx.params;
  let level = LEVELS.includes(levelParam) ? levelParam : 'normal';
  const pbSeconds = ctx.settings.pb ? ctx.settings.pb.seconds : 0;

  if (!pbSeconds) {
    root.innerHTML = `
      <div class="stack">
        <p>Du må registrere en PB før du kan se denne tabellen.</p>
        <button class="btn btn-primary" id="go-settings" type="button">Gå til innstillinger</button>
      </div>
    `;
    root.querySelector('#go-settings').addEventListener('click', () => ctx.navigate('#/innstillinger'));
    return;
  }

  let rounds = generateTable(type, level, pbSeconds);
  let editing = false;
  const isWonka = type === 'wonka';

  function render() {
    root.innerHTML = `
      <div class="stack">
        <h1>${TABLE_TYPE_LABELS[type]}</h1>
        <div class="level-picker">
          ${LEVELS.map((l) => `<button type="button" data-level="${l}" class="${l === level ? 'active' : ''}">${LEVEL_LABELS[l]}</button>`).join('')}
        </div>

        <div class="card">
          <table class="round-table">
            <thead>
              <tr>
                <th>Runde</th>
                <th>${isWonka ? 'Hold etter trykk' : 'Hold'}</th>
                <th>Hvile</th>
              </tr>
            </thead>
            <tbody>
              ${rounds
                .map(
                  (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${
                    editing
                      ? `<input type="number" min="0" class="edit-hold" data-i="${i}" value="${isWonka ? r.postContractionHold : r.hold}" style="width:64px;" />`
                      : formatClock(isWonka ? r.postContractionHold : r.hold)
                  }</td>
                  <td>${
                    editing
                      ? `<input type="number" min="0" class="edit-rest" data-i="${i}" value="${r.rest}" style="width:64px;" />`
                      : formatClock(r.rest)
                  }</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        ${isWonka ? '<p class="small">Du trykker selv når du kjenner første sammentrekning - da starter nedtellingen for resten av holdet.</p>' : ''}

        <div class="btn-block-group">
          <button type="button" class="btn btn-secondary" id="toggle-edit">${editing ? 'Lagre endringer' : 'Rediger tabellen'}</button>
          <button type="button" class="btn btn-primary" id="start-session">Start økt</button>
        </div>
      </div>
    `;

    root.querySelectorAll('[data-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        level = btn.dataset.level;
        rounds = generateTable(type, level, pbSeconds);
        editing = false;
        render();
      });
    });

    root.querySelector('#toggle-edit').addEventListener('click', () => {
      if (editing) {
        const holdInputs = root.querySelectorAll('.edit-hold');
        const restInputs = root.querySelectorAll('.edit-rest');
        let adjusted = false;
        holdInputs.forEach((input) => {
          const i = Number(input.dataset.i);
          const raw = Number(input.value) || 0;
          const clamped = isWonka ? clampAbsoluteHold(raw) : clampHold(pbSeconds, raw);
          if (clamped !== raw) adjusted = true;
          if (isWonka) rounds[i].postContractionHold = clamped;
          else rounds[i].hold = clamped;
        });
        restInputs.forEach((input) => {
          const i = Number(input.dataset.i);
          const raw = Number(input.value) || 0;
          const clamped = clampRest(raw);
          if (clamped !== raw) adjusted = true;
          rounds[i].rest = clamped;
        });
        if (adjusted) {
          window.alert('Noen verdier ble justert for å holde seg innenfor sikkerhetsgrensene (maks 85 % av PB for hold, minst 10 sek hvile).');
        }
      }
      editing = !editing;
      render();
    });

    root.querySelector('#start-session').addEventListener('click', () => {
      unlockSpeech();
      unlockAudio();
      setPendingSession({
        tableType: type,
        tableLevel: level,
        rounds: rounds.map((r) => ({ ...r })),
        pbAtStart: pbSeconds,
        sourceLabel: `${TABLE_TYPE_LABELS[type]} - ${LEVEL_LABELS[level]}`,
      });
      ctx.navigate('#/okt');
    });
  }

  render();
}
