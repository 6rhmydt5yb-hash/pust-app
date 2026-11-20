import { validateCustomTable } from '../tables.js';
import { dbGet, dbPut, dbDelete, STORES } from '../db.js';
import { escapeHtml, confirmModal } from '../dom.js';
import { setPendingSession } from '../sessionBridge.js';
import { unlockSpeech } from '../speech.js';
import { unlockAudio } from '../audio.js';

function blankRound() {
  return { hold: 60, rest: 60 };
}

export async function mount(root, ctx) {
  const [, idParam] = ctx.params; // params[0] === 'custom'
  const isNew = idParam === 'ny';
  const pbSeconds = ctx.settings.pb ? ctx.settings.pb.seconds : 0;
  const pbForClamp = pbSeconds || Number.MAX_SAFE_INTEGER;

  let table = isNew
    ? { name: '', rounds: [blankRound(), blankRound(), blankRound()] }
    : await dbGet(STORES.CUSTOM_TABLES, Number(idParam));

  if (!table) {
    root.innerHTML = '<p>Fant ikke tabellen.</p>';
    return;
  }

  function render() {
    root.innerHTML = `
      <div class="stack">
        <h1>${isNew ? 'Ny egendefinert tabell' : 'Rediger tabell'}</h1>

        <div class="field">
          <label for="table-name">Navn</label>
          <input type="text" id="table-name" value="${escapeHtml(table.name)}" placeholder="F.eks. Min tabell" />
        </div>

        <div class="card">
          <table class="round-table">
            <thead>
              <tr><th>Runde</th><th>Hold (sek)</th><th>Hvile (sek)</th><th></th></tr>
            </thead>
            <tbody>
              ${table.rounds
                .map(
                  (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><input type="number" min="0" class="edit-hold" data-i="${i}" value="${r.hold}" style="width:64px;" /></td>
                  <td><input type="number" min="0" class="edit-rest" data-i="${i}" value="${r.rest}" style="width:64px;" /></td>
                  <td><button type="button" class="btn-ghost remove-round" data-i="${i}" aria-label="Fjern runde ${i + 1}" ${table.rounds.length <= 1 ? 'disabled' : ''}>✕</button></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <button type="button" class="btn btn-secondary" id="add-round" style="margin-top:12px;">+ Legg til runde</button>
        </div>

        ${pbSeconds ? '' : '<div class="banner banner-warning"><span aria-hidden="true">⚠️</span><span>Du har ikke registrert PB, så sikkerhetstaket for hold kan ikke regnes ut ennå. Registrer PB i innstillinger for trygg bruk.</span></div>'}

        <div class="btn-block-group">
          <button type="button" class="btn btn-primary" id="save-table">Lagre</button>
          ${!isNew ? '<button type="button" class="btn btn-secondary" id="start-session">Start økt</button>' : ''}
          ${!isNew ? '<button type="button" class="btn btn-danger" id="delete-table">Slett tabell</button>' : ''}
        </div>
      </div>
    `;

    root.querySelector('#table-name').addEventListener('input', (e) => {
      table.name = e.target.value;
    });
    root.querySelectorAll('.edit-hold').forEach((input) => {
      input.addEventListener('input', (e) => {
        table.rounds[Number(e.target.dataset.i)].hold = Number(e.target.value) || 0;
      });
    });
    root.querySelectorAll('.edit-rest').forEach((input) => {
      input.addEventListener('input', (e) => {
        table.rounds[Number(e.target.dataset.i)].rest = Number(e.target.value) || 0;
      });
    });
    root.querySelectorAll('.remove-round').forEach((btn) => {
      btn.addEventListener('click', () => {
        table.rounds.splice(Number(btn.dataset.i), 1);
        render();
      });
    });
    root.querySelector('#add-round').addEventListener('click', () => {
      table.rounds.push(blankRound());
      render();
    });

    root.querySelector('#save-table').addEventListener('click', async () => {
      if (!table.name.trim()) {
        window.alert('Gi tabellen et navn.');
        return;
      }
      const validated = validateCustomTable(table, pbForClamp);
      if (validated.adjusted) {
        window.alert('Noen verdier ble justert for å holde seg innenfor sikkerhetsgrensene.');
      }
      const toSave = {
        name: validated.name,
        rounds: validated.rounds,
        createdAt: table.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!isNew) toSave.id = table.id;
      await dbPut(STORES.CUSTOM_TABLES, toSave);
      ctx.navigate('#/tabeller');
    });

    if (!isNew) {
      root.querySelector('#start-session').addEventListener('click', () => {
        const validated = validateCustomTable(table, pbForClamp);
        unlockSpeech();
        unlockAudio();
        setPendingSession({
          tableType: 'custom',
          tableLevel: null,
          rounds: validated.rounds,
          pbAtStart: pbSeconds,
          sourceLabel: `Egendefinert: ${table.name}`,
        });
        ctx.navigate('#/okt');
      });

      root.querySelector('#delete-table').addEventListener('click', async () => {
        const ok = await confirmModal({
          title: 'Slette tabellen?',
          body: `«${escapeHtml(table.name)}» blir slettet permanent.`,
          confirmLabel: 'Slett',
          danger: true,
        });
        if (ok) {
          await dbDelete(STORES.CUSTOM_TABLES, table.id);
          ctx.navigate('#/tabeller');
        }
      });
    }
  }

  render();
}
