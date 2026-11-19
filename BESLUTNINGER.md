# Beslutninger

Dette er en logg over tekniske og designmessige valg jeg har tatt uten å spørre,
slik oppdraget ba om. Hver linje har en kort begrunnelse.

## Teknisk grunnlag

- **Ingen rammeverk, ingen byggesteg.** Ren HTML/CSS/JS med ES-moduler, slik
  oppdraget ba om. `package.json` inneholder kun `{"type":"module"}` - ingen
  avhengigheter - så Nodes innebygde testløper (`node --test`) kan lese
  ES-modulene uten noe å installere.
- **IndexedDB-database `pust-db`** med fire «stores»: `settings`, `pbHistory`,
  `customTables`, `sessions`. Valgt over `localStorage` fordi data er strukturert
  og kan bli ganske stor over tid (hver økt lagrer alle rundedetaljer).
- **Systemfont** (ingen eksterne skrifter) for å holde appen 100 % offline-trygg
  og rask, uten avhengighet til Google Fonts e.l.
- **Alle stier er relative** (ingen ledende skråstrek) i HTML, manifest og
  service worker, slik at appen virker uendret enten den kjøres fra roten eller
  under `/pust-app/` på GitHub Pages.

## Tabeller - tall som ikke var spesifisert i oppdraget

Oppdraget ga eksakte tall for ett nivå på Mix- og Wonka-tabellen, men ba om tre
nivåer (Lett/Normal/Hard) på alle tabeller. Jeg har laget Lett/Hard selv, skalert
i samme ånd som avstanden mellom nivåene i CO2- og O2-tabellene:

- **Mix** (Normal er oppdragets egne tall: hold 35→60 %, hvile 2:00→1:00):
  - Lett: hold 30→50 %, hvile 2:10→1:10
  - Hard: hold 40→65 %, hvile 1:50→0:50
- **Wonka** (Normal er oppdragets egne tall: 30 sek etter trykk, ~10 sek hvile):
  - Lett: 20 sek etter trykk, 15 sek hvile
  - Hard: 40 sek etter trykk, 10 sek hvile
  - Wonka er ikke PB-prosentbasert (tiden før trykk er ukjent på forhånd), så i
    stedet for 85 %-taket har jeg lagt et hardkodet sikkerhetstak på maks 60
    sekunder etter trykk, uansett nivå.

Alle disse tallene kjøres likevel gjennom de samme sikkerhetsklempene
(`clampHold`/`clampRest`/`clampAbsoluteHold`) som resten av appen.

## Øktmotor

- **5 sekunders forberedelsesfase** («Gjør deg klar») før runde 1, med
  3‑2‑1-nedtelling i de siste sekundene av både denne fasen og hver hvilefase.
  Tallet 5 er mitt eget valg - nok tid til å innta posisjon, ikke så mye at det
  føles tregt.
- **Hvile etter siste runde er med**, akkurat som de åtte planlagte
  hvileverdiene tilsier - det fungerer som nedtrapping/recovery før
  oppsummeringen, i stedet for å avslutte brått rett etter siste hold.
- **`?speed=N`** klemmes til mellom 1 og 50 og vises aldri i
  brukergrensesnittet. Det endrer kun farten den interne klokken går med -
  planlagte og lagrede tider er alltid ekte sekunder (se `js/timer.js`).
- **Timeren er tidsstempelbasert** (`performance.now()`), ikke tikk-basert,
  slik du ba om - den viser riktig gjenstående tid selv etter at skjermen har
  vært av eller nettleseren har vært i bakgrunnen en stund.
- **Fargevalg for faser:** HOLD er varm rød/oransje, PUST/hvile og
  forberedelse er rolig turkis - valgt for tydelig kontrast, med tekstetiketter
  («HOLD»/«PUST») i tillegg til farge, ikke farge alene.

## iOS-spesifikt (etter dine tillegg til planen)

- **Tale og lyd låses opp** med en lydløs ytring/tone inni klikk-handleren til
  hver «Start»-knapp (tabellforhåndsvisning, egendefinert tabell,
  avslapningspust), siden iOS krever at dette skjer synkront fra et ekte
  brukertrykk.
- **`navigator.audioSession.type = "playback"`** settes i samme opplåsing der
  nettleseren støtter det, slik at lydpip spilles selv med lydløs-bryteren på.

## Avslapningspust

- Avslapningsøkter lagres **ikke** i `sessions`-tabellen. De har ingen PB,
  runder eller sammentrekninger, og ville ikke passet naturlig inn i
  historikk-grafene (som er PB- og sammentrekningsbaserte). Appen holder
  dermed historikk-modellen enkel og fokusert på apnø-treningen.

## Påminnelser (.ics)

- Kalenderhendelsen genereres med en **UTC-basert** `DTSTART` beregnet fra
  klokkeslettet og tidssonen på enheten i det øyeblikket filen lastes ned
  (ikke en full `VTIMEZONE`-blokk). Dette er en bevisst forenkling - hendelsen
  blir riktig med én gang, men følger ikke automatisk med hvis du endrer
  tidssone permanent. Det dekker behovet godt for en fast ukentlig påminnelse.

## Ikoner

- Ikonene er en enkel, egen geometrisk design (sirkel med «bølge»-ringer i
  appens turkise aksentfarge på mørk bakgrunn) - ikke hentet fra eller
  inspirert av noen eksisterende app sin logo. Ingen gjennomsiktighet, slik at
  iOS sin egen hjørneavrunding ikke klipper noe viktig.
- Produsert uten eksterne verktøy: SVG-design → skjermbilde i et nettleserpanel
  → skalert presist ned til 180/192/512 px med macOS sitt innebygde
  `sips`-verktøy.

## Testing

- **Playwright er droppet** (ingen `tests/e2e.spec.js`) - vi har ingen `npm` i
  byggemiljøet, og du ba uttrykkelig om å ikke ha ubrukt kode i prosjektet.
  Enhetstestene (`tests/*.test.js`, 27 tester) dekker all tabellmatematikk og
  øktmotorens tilstandsmaskin og kjøres med `node --test tests/*.test.js`.
  Ende-til-ende-testingen er gjort manuelt i et ekte nettleserpanel - se
  RAPPORT.md for hva som ble sjekket.
