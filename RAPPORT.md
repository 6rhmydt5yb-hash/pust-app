# Pust - sluttrapport

## Lenke

**https://6rhmydt5yb-hash.github.io/pust-app/**

Koden ligger åpent på GitHub: https://github.com/6rhmydt5yb-hash/pust-app

## Installer på iPhone (3 steg)

1. Åpne lenken over i **Safari** på iPhonen din (må være Safari, ikke Chrome
   eller en annen nettleser).
2. Trykk på **Del**-knappen (firkant med pil opp) nederst i Safari.
3. Velg **«Legg til på Hjem-skjerm»** og trykk «Legg til».

Appen åpner seg nå som en egen app fra hjemskjermen, uten adressefelt, og
fungerer offline etter første besøk.

## Hva appen kan

- **Sikkerhetsskjerm** som må bekreftes før du kommer videre, PB-test
  (stoppeklokke eller skriv inn selv), og en kort veiledning.
- **Fem tabelltyper**, alle laget ut fra din PB og med tre nivåer
  (Lett/Normal/Hard): CO2, O2, Wonka, Mix, og egendefinerte tabeller du lager
  og lagrer selv. Alle kan forhåndsvises og redigeres før du starter.
- **Avslapningspust**: styrt 4-4-8-pust i 2-10 minutter.
- **Øktskjerm** med stor nedtelling, HOLD/PUST i egne farger, rundeteller,
  norsk tale, lydpip ved 3-2-1 og faseskifte (begge kan slås av), trykk hvor
  som helst for å registrere en sammentrekning, «Pustet»-knapp for å avslutte
  et hold tidlig, pause og avbryt, og en oppsummering med PB-varsling.
- **Historikk** med alle økter og egne grafer (ingen biblioteker): PB over
  tid, økter per uke, og når første sammentrekning kommer (Wonka-tabellen).
- **Påminnelser**: last ned en kalenderfil (.ics) med gjentakende hendelse og
  varsel - appen forklarer selv hvorfor den ikke kan sette opp varsler helt på
  egen hånd.
- **Sikkerhetskopi**: eksporter all data som én JSON-fil, importer den tilbake
  (med bekreftelse før noe overskrives), og en påminnelse hvis det er over 30
  dager siden siste eksport.
- **Innstillinger**: lyd/tale av/på, standardnivå, oppdater PB, veiledning,
  sikkerhetsinformasjon, og nullstilling av all data (krever dobbel
  bekreftelse).
- Virker **100 % offline** etter første besøk. All data lagres kun lokalt på
  enheten din - ingenting sendes til noen server.

## Hva som er testet, og hvordan

1. **27 automatiske enhetstester** (`node --test tests/*.test.js`, alle
   bestått) dekker all tabellmatematikk for alle fem tabelltyper og nivåer,
   sikkerhetsgrensene (maks 85 % av PB, minst 10 sek hvile), at alle tall blir
   hele sekunder, og øktmotorens tilstandsmaskin - inkludert at `?speed=N`
   (kun en testparameter, ikke en ekte funksjon) lagrer ekte sekunder selv når
   klokken går raskere, at pause ikke teller tid, og Wonka-tabellens
   trykk-for-å-starte-nedtelling-logikk.
2. **Manuell gjennomgang i et ekte nettleserpanel** (390×844, iPhone-mål) via
   en lokal server: hele førstegangsflyten, alle fem tabelltyper (inkludert en
   full CO2-økt kjørt med 20× testhastighet), sammentrekningsregistrering,
   «Pustet»-knappen, avbryt-bekreftelse, historikk med grafer og øktdetaljer,
   avslapningspust, alle innstillinger, kalenderpåminnelse (innholdet i
   .ics-filen sjekket direkte), og dobbel bekreftelse ved nullstilling.
   Jeg fant og rettet én feil underveis (meny/header som ikke skjulte seg
   riktig på enkelte skjermer) og testet på nytt etterpå.
3. **Eksport/import** ble sjekket ved å eksportere data, importere den samme
   filen tilbake, og sammenligne - resultatet var identisk.
4. **Offline-sjekk** ble gjort to ganger: én gang lokalt (stoppet serveren og
   lastet siden på nytt), og én gang på **den publiserte adressen** -  jeg
   bekreftet at alle 38 filene (inkludert manifest, service worker og alle
   ikoner) faktisk ligger i nettleserens cache under `/pust-app/`-stien.
5. Konsollen ble sjekket for feil gjennom hele testingen - ingen feil dukket
   opp.

**Viktig:** Nettleserpanelet jeg testet i er ikke Safari på en ekte iPhone.
Alt over er reelt testet, men du bør selv gjøre en rask sjekk på telefonen din
før du stoler fullt på appen:

### Sjekkliste for deg på ekte iPhone

- [ ] Installer via Del → Legg til på Hjem-skjerm, og åpne appen derfra.
- [ ] Gjennomfør sikkerhetsskjerm, PB-test og veiledning.
- [ ] Start en kort økt (f.eks. lag en egendefinert tabell med 10 sek hold)
      og sjekk at norsk tale faktisk høres.
- [ ] Sjekk at lydpipene høres, også med lydløs-bryteren på siden av telefonen
      slått på.
- [ ] Trykk på skjermen under et hold og se at sammentrekningen dukker opp i
      historikken etterpå.
- [ ] Skru på flymodus og sjekk at appen fortsatt åpner seg og virker.
- [ ] Eksporter en sikkerhetskopi og sjekk at filen dukker opp i Filer-appen.

## Begrensninger

- Ingen pulsmåler/oksymeter-støtte (Safari har ikke Web Bluetooth), ingen
  Apple Helse-integrasjon, og ingen skylagring/synkronisering mellom enheter -
  dette var bevisst utelatt fra oppdraget.
- En PWA kan ikke planlegge egne push-varsler på iPhone - derfor brukes en
  nedlastet kalenderfil i stedet.
- Alle data lagres kun på denne ene enheten/i denne ene nettleseren. Bytter du
  telefon, må du eksportere og importere sikkerhetskopien selv.

**Husk å ta sikkerhetskopi jevnlig** (Innstillinger → Sikkerhetskopi) - uten
den er historikken din borte hvis du sletter appen eller bytter enhet.

## Forslag til neste steg (bygges ikke nå)

1. En «treningsplan»-funksjon som foreslår hvilken tabell og hvilket nivå du
   bør kjøre neste gang, basert på historikken din.
2. Mulighet for å dele en enkelt økt eller en graf som bilde, f.eks. for å
   vise fremgang til en treningspartner.
3. Flerspråklig støtte (engelsk) for appen, i tillegg til bokmål.
