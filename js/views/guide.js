import { updateSettings } from '../settings.js';

export async function mount(root, ctx) {
  const onboarding = !ctx.settings.onboardingComplete;
  root.innerHTML = `
    <div class="stack">
      <h1 class="center">Slik virker Pust</h1>

      <div class="card">
        <h2>Tabeller</h2>
        <p>Velg mellom CO2-, O2-, Wonka- og Mix-tabeller, eller lag din egen. Alle lages ut fra din PB og kan forhåndsvises og redigeres før du starter.</p>
      </div>

      <div class="card">
        <h2>Under en økt</h2>
        <p><strong>HOLD</strong> betyr at du holder pusten, <strong>PUST</strong> betyr at du puster fritt og hviler. Trykk hvor som helst på skjermen under et hold for å registrere en sammentrekning. Bruk «Pustet»-knappen hvis du må avslutte et hold tidligere enn planlagt.</p>
      </div>

      <div class="card">
        <h2>Historikk</h2>
        <p>Alle økter lagres lokalt på enheten din, med grafer for PB over tid, antall økter per uke og når første sammentrekning kommer.</p>
      </div>

      <div class="card">
        <h2>Påminnelser og sikkerhetskopi</h2>
        <p>Du kan lage en kalenderpåminnelse for faste treningstider, og ta sikkerhetskopi av all data som en fil du kan lagre selv.</p>
      </div>

      <button type="button" class="btn btn-primary" id="guide-done">${onboarding ? 'Fullfør og kom i gang' : 'Lukk'}</button>
    </div>
  `;

  root.querySelector('#guide-done').addEventListener('click', async () => {
    if (onboarding) {
      await updateSettings({ onboardingComplete: true, guideSeenAt: new Date().toISOString() });
      ctx.navigate('#/tabeller');
    } else {
      await updateSettings({ guideSeenAt: new Date().toISOString() });
      history.back();
    }
  });
}
