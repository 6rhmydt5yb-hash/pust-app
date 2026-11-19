import { updateSettings } from '../settings.js';

export async function mount(root, ctx) {
  root.innerHTML = `
    <div class="stack">
      <div class="icon-circle" aria-hidden="true">🌬️</div>
      <h1 class="center">Velkommen til Pust</h1>
      <p class="subtitle center">Din egen app for pustestopp-trening. Les gjennom sikkerhetsinformasjonen før du fortsetter.</p>

      <div class="card">
        <h2>Sikkerhet først</h2>
        <ul>
          <li>Kun tørrtrening på land - sittende eller liggende.</li>
          <li>Øv <strong>aldri</strong> i vann, badekar eller dusj.</li>
          <li>Øv <strong>aldri</strong> mens du kjører, går eller står.</li>
          <li>Pustestopp kan gi svimmelhet eller besvimelse. Stopp øyeblikkelig ved ubehag eller svimmelhet.</li>
          <li>Ikke hyperventiler (pust raskt eller dypt) rett før et hold.</li>
          <li>Snakk med lege først dersom du har hjerte- eller lungesykdom, høyt blodtrykk, epilepsi, eller er gravid.</li>
          <li>Appen erstatter ikke opplæring hos en sertifisert fridykkerinstruktør.</li>
        </ul>
      </div>

      <label class="check-row card" for="confirm-safety" style="cursor:pointer;">
        <span>Jeg har lest og forstått sikkerhetsinformasjonen, og trener for egen risiko.</span>
        <span class="switch">
          <input type="checkbox" id="confirm-safety" />
          <span class="switch-track"></span>
        </span>
      </label>

      <div class="btn-block-group">
        <button class="btn btn-primary" id="continue-btn" disabled type="button">Fortsett</button>
        <button class="btn btn-ghost" id="guide-link" type="button">Les veiledningen først</button>
      </div>
    </div>
  `;

  const checkbox = root.querySelector('#confirm-safety');
  const continueBtn = root.querySelector('#continue-btn');
  checkbox.addEventListener('change', () => {
    continueBtn.disabled = !checkbox.checked;
  });
  continueBtn.addEventListener('click', async () => {
    await updateSettings({ safetyConfirmedAt: new Date().toISOString() });
    ctx.navigate('#/pb-test');
  });
  root.querySelector('#guide-link').addEventListener('click', () => {
    ctx.navigate('#/veiledning');
  });
}
