export async function mount(root) {
  root.innerHTML = `
    <div class="stack">
      <h1>Sikkerhetsinformasjon</h1>
      <div class="card">
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
      <button type="button" class="btn btn-primary" id="close-safety">Lukk</button>
    </div>
  `;

  root.querySelector('#close-safety').addEventListener('click', () => history.back());
}
