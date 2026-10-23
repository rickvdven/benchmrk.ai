# Update 5 voor Claude Code: pagina `/gym` voor gyms en personal trainers

Geef Claude Code deze opdracht:

> Lees `benchmrk-a-licht/CLAUDE_CODE_UPDATE_5_gympagina.md` en bouw de pagina `/gym` plus de verwijzingen op de homepage. Houd je aan de harde regels uit `benchmrk-a-licht/CLAUDE_CODE_OPDRACHT.md` (huisstijl A licht, geen emoji, lime nooit als tekstkleur). Werk op een eigen branch, open een PR en geef me de Vercel-previewlink. Niet mergen tot ik akkoord geef. Laat screenshots zien op 1440 en 390 breed, in NL en EN.

## Doel

Gym-eigenaren en personal trainers zien in één pagina wat Benchmrk voor hun leden doet, en vragen een gymaccount aan. De homepage blijft van de atleet. Gyms krijgen daar alleen een duidelijke verwijzing.

**Succes:** een aanvraag voor een gymaccount via `info@benchmrk.ai`.

## Bestanden

De video staat in `public/video/`:

- `benchmrk-gyms-nl.mp4` (80 s, Nederlandse voice-over)
- `benchmrk-gyms-nl-poster.jpg`
- `benchmrk-gyms-nl.vtt` (Nederlandse ondertitels)

## Route en techniek

- Nieuwe pagina `src/pages/Gym.tsx`, route `/gym` in `src/App.tsx`. Openbaar, geen login nodig.
- Zelfde header, footer en disclaimer als de homepage (`Landing.tsx`). Hergebruik de bestaande klassen en componenten: `bm-wrap`, `bm-kicker`, `bm-display`, `bm-h2`, `bm-btn-accent`, `bm-btn-outline`, `Wordmark`, `LangSwitch`.
- Teksten via een eigen locale-set (`src/locales/gym.<taal>.json` of in de landing-locales onder `gym.*`). NL en EN volledig, DE, ES en KO ook vertalen.
- De video is Nederlands. Toon de video alleen bij taal NL. Bij andere talen staat op die plek het posterbeeld met de regel "Demo video (Dutch, with subtitles)" en een knop die de video toch afspeelt.
- `document.title`: "Benchmrk voor gyms en personal trainers".
- Het commissiepercentage komt uit `app_settings.ambassador_commission_pct` (nu 20), net zoals de prijs uit `price_year_cents` komt. Niet hardcoderen.

## Opbouw van de pagina

### 1. Hero

- **Kicker:** VOOR GYMS EN PERSONAL TRAINERS
- **H1:** "Elk lid een eigen plan. Jouw opbouw."
- **Sub:** "Benchmrk maakt voor elk lid een verbeterplan op de eigen drempel, rond de eigen week. Jij bepaalt hoe de sims in je gym opbouwen. Jouw leden volgen jouw programma."
- **Knoppen:**
  - primair (`bm-btn-accent`): "Vraag een gymaccount aan" → `mailto:info@benchmrk.ai?subject=Gymaccount%20aanvragen`
  - secundair (link): "Bekijk de demo (80 s)" → `#demo`
- **Kleine regel eronder:** "Gratis voor gyms in de bèta · gymcode en eigen simprogramma's · Nederlands, English, Deutsch, Español, 한국어"

### 2. Demo-video (`id="demo"`)

Zelfde opmaak als de video op de homepage:

- `<video controls preload="none" playsInline>` op volle breedte (16:9), met de poster en de VTT als standaard ondertitelspoor (nl).
- **Kicker:** "Demo · 80 seconden". **Kop:** "Zo werkt het voor je gym".
- **Daaronder uitklapbaar:** "Lees de tekst van de video", met de tekst uit de VTT.

### 3. Drie stappen

Zelfde opmaak als "Drie stappen naar de startlijn" op de homepage.

| Stap | Kop | Tekst |
|---|---|---|
| 1 | Je gymaccount | Je krijgt een gymaccount met een eigen gymcode en uitnodigingslink. In "Mijn gym" stel je je materiaal en je simprogramma's in. |
| 2 | Leden starten via jouw link | Leden maken een account via jouw link en zijn meteen gekoppeld. Ze volgen jouw sim-opbouw en het materiaal van je gym. |
| 3 | Elk lid een eigen plan | Tempo's, hartslaggrenzen, racedatum en divisie blijven per lid. Het plan past zich aan wat ieder lid logt. |

### 4. Wat jij bepaalt, wat per lid blijft

Een tabel in de stijl van de bon of vergelijkingstabel op de homepage.

| Wat de gym bepaalt | Wat per lid blijft |
|---|---|
| De opbouw van de sim per blok weken | Drempeltempo en drempelhartslag |
| Het materiaal: HYROX-gym, gewone gym of thuis | Racedatum, divisie en doeltijd |
| Welk simprogramma je leden volgen | Aantal trainingsdagen per week |

Daaronder één regel: "Pas je je programma aan, dan rekenen de plannen van je leden direct mee."

### 5. Vier functies

Een raster van 4 kaarten, met kop, korte tekst en een schermafbeelding uit de app (als die er al is) of zonder beeld.

1. **Eigen simprogramma's.** Rondes en per blok weken het percentage van de racekilometer en het stationvolume. Tot 20 programma's per gym.
2. **Ook thuis.** Traint een lid thuis, dan krijgt het vervangende oefeningen voor de stations. Zelfde doel, ander materiaal.
3. **Groepsles en whiteboard.** Leden loggen je WOD met een foto van het whiteboard; de app leest het bord uit. Een WOD met RPE 8 of hoger telt als zware dag.
4. **Doubles.** Teamvoorspelling en een verdeling van de beurten per station tussen de partners.

### 6. Personal trainers

Een donker vlak (`#141413`, tekst `#EFEEEA`), zoals het blok "Echt resultaat" op de homepage.

- **Kop:** "Personal trainer? Jij coacht, Benchmrk rekent."
- **Tekst:** "Benchmrk is gratis voor jezelf. Je krijgt {pct} % commissie op elk betaald lidmaatschap van de atleten die je meebrengt, elk jaar dat ze verlengen. Aanmeldingen worden handmatig goedgekeurd; uitbetaling per kwartaal op factuur."
- **Knop:** "Meld je aan als ambassadeur" → `/invite` (na inloggen staat daar het formulier). Niet ingelogd: eerst naar `/auth?mode=signup`.

### 7. Wetenschap

Eén regel met link: "Elke trainingsregel is onderbouwd met bronnen die je leden zelf kunnen nalezen →" naar `/science`.

### 8. Veelgestelde vragen

Een uitklaplijst.

- **Wat kost Benchmrk voor mijn gym?** Een gymaccount is gratis in de bèta. Je leden betalen zelf hun lidmaatschap (de prijs uit `price_year_cents`, nu €30 per jaar in de bèta).
- **Krijgen al mijn leden hetzelfde schema?** Nee. De sim-opbouw is gelijk, maar tempo's, hartslaggrenzen, racedatum en divisie zijn per lid.
- **Hoe koppelen leden zich aan mijn gym?** Via jouw uitnodigingslink, of met de gymcode bij Instellingen. Ze kunnen de gym ook weer verlaten.
- **Wat staat er in een simprogramma?** Het aantal rondes en per blok weken het percentage van de racekilometer en het stationvolume. Het laatste blok eindigt in de week voor de raceweek.
- **Kunnen leden zonder gym trainen?** Ja. Dan volgen ze de standaardopbouw van Benchmrk of een eigen opbouw.

### 9. Afsluiter

- **Kop:** "Laat je leden trainen naar hun doeltijd."
- **Knop:** "Vraag een gymaccount aan" (dezelfde mailto als in de hero).
- **Daaronder:** "Of mail ons: info@benchmrk.ai".

## Verwijzingen op de homepage

1. **Navigatie:** een link "Voor gyms" naar `/gym`, na "Wetenschap".
2. **Onder de atletenvideo** (sectie `#video`): één regel "Coach je een groep? Bekijk de demo voor gyms en PT's →" naar `/gym#demo`. Klein, in `text-muted` met een onderstreepte link. Alleen bij NL, net als de video.
3. **Sectie "Versterkt wat je al doet":** de link "Benchmrk voor gyms" (`fit.gym.link`) gaat naar `/gym` in plaats van `/nl/voor-gyms`.

## Contentpagina `/nl/voor-gyms` bijwerken

Deze SEO-pagina blijft bestaan, maar bevat verouderde zinnen. Pas `content/nl/voor-gyms.md` aan:

- "In de bèta zet Benchmrk de gym met code, materiaal en sjabloon voor je klaar" → gyms beheren hun gym en simprogramma's zelf in "Mijn gym".
- Leden koppelen via de uitnodigingslink of de gymcode.
- Voeg in "Zo doet Benchmrk het" een link toe naar `/gym`: "Bekijk de demo en vraag een gymaccount aan".
- Werk `updated` bij. `npm run content:check` moet slagen.

## CLAUDE.md

Daar staat dat migratie 020 nog moet worden uitgevoerd, maar die is al toegepast: de tabel `gym_managers` en de RPC's werken op productie. Pas die regel aan.

## Niet doen

- Geen klantlogo's, testimonials of verzonnen aantallen gyms of leden.
- Geen prijs in de video of in afbeeldingen. Prijzen alleen als tekst uit `app_settings`.
- HYROX alleen beschrijvend. Footer met "Benchmrk is niet verbonden aan HYROX."
- Niet mergen zonder akkoord van Rick.

## Controle

- Typecheck, tests en build slagen.
- `/gym` werkt zonder login, op 1440 en 390 breed.
- Video speelt af met ondertitels.
- Alle vijf talen tonen tekst zonder ontbrekende keys.
- De links vanaf de homepage en `/nl/voor-gyms` werken.
