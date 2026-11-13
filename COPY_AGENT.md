# Benchmrk copy agent: SEO- en AEO-content

Deze instructie is voor Claude Code in de cloudomgeving "Benchmrk", die toegang heeft tot de repo `rickvdven/benchmrk.ai`. Ze geldt voor de eerste batch en voor de wekelijkse ronde.

**Doel:** pagina's die Google én AI-antwoordmachines (ChatGPT, Perplexity, Google AI Overviews, Claude) vinden, citeren en laten doorklikken naar de snelle check en de bèta.

## Publiceren: altijd via een pull request

- Werk op een nieuwe branch, `content/<datum>-<onderwerp>`, en open een pull request naar `main`.
- Push nooit direct naar main. Een push naar main gaat meteen live via Vercel.
- Rick leest de PR, gebruikt de Vercel-preview om te controleren, en merget zelf.
- Zet in de PR-beschrijving per pagina:
  - de URL
  - de hoofdvraag
  - het antwoord in één zin
  - de gebruikte bronnen
  - een checklist met de punten uit "Controle per pagina" hieronder

## Stap 0: technisch fundament (eenmalig, eerste PR, vóór alle content)

Stand op 20 oktober 2026: benchmrk.ai is een client-side React-app. Elke URL, ook `/robots.txt` en `/sitemap.xml`, geeft dezelfde lege `index.html` terug, en de inhoud verschijnt pas via JavaScript. De meeste AI-crawlers voeren geen JavaScript uit en zien dus niets. Daarom eerst:

1. **Statische content-pagina's.** Content komt als Markdown/MDX in de repo, bijvoorbeeld `content/nl/<slug>.md` met frontmatter. Bij de build wordt elke pagina gerenderd tot volledige HTML (prerender of SSG, zoals vite-react-ssg of een eigen prerender-script).
   - Kop, antwoordblok, FAQ en bronnen moeten in de ruwe HTML staan.
   - Controleer dat met `curl -s https://<preview>/nl/gids/<slug> | grep "<h1"`.
2. **Routes:**
   - `/nl/gids/<slug>` voor artikelen
   - `/nl/<slug>` voor de website-pagina's
   - `/nl/gids` als overzicht
   - Vertalingen: `/en/guide/…`, `/de/ratgeber/…`, `/es/guia/…`, `/ko/guide/…` (zie `content/README.md`, sectie Talen)
3. **`robots.txt`** als echt tekstbestand:
   - Alles toestaan, inclusief GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended en Bingbot.
   - App-routes die niet geïndexeerd hoeven te worden uitsluiten (inloggen, plan, logboek, admin).
   - Verwijzen naar de sitemap.
4. **`sitemap.xml`** wordt bij elke build gegenereerd, met `lastmod` per pagina en hreflang-alternates zodra er vertalingen zijn.
5. **Per pagina:**
   - een unieke `<title>` van maximaal 60 tekens, een meta description van maximaal 155 tekens, een canonical en `og:`-tags
   - `lang="nl"`
   - JSON-LD:
     - `Article`, met auteur Rick van de Ven als `Person`, oprichter Benchmrk, Pro-atleet
     - `FAQPage`, met exact de zichtbare vragen
     - `BreadcrumbList`
   - op de homepage: `Organization` en `SoftwareApplication`
6. **Opmaak:** in de huidige huisstijl, design A licht. De tokens staan in `src/index.css`: ondergrond #EFEEEA, inkt #141413, lime #D4F046 alleen als vlak, Archivo en IBM Plex Mono.
7. **Snelle check:** elke pagina eindigt met een blok dat linkt naar de snelle check op de homepage (`/#check` of de bestaande anchor), met UTM `?utm_source=gids&utm_medium=organic&utm_content=<slug>`.
8. Een **`llms.txt`** mag, maar is niet nodig.

**Controle:** `npx tsc -b`, `npm test` en `npm run build` slagen, en `curl` op de preview toont de inhoud in de HTML.

## Opbouw van elke pagina (AEO)

1. **H1:** de vraag of het onderwerp, zoals mensen het zoeken: "Hoe train je compromised running voor HYROX?"
2. **Antwoordblok direct onder de H1:** 40 tot 90 woorden. Dit is het volledige antwoord, zonder aanloop, met minstens één concreet getal, tijd of tempo als dat er is.
3. **"In het kort":** 3 tot 5 bullets.
4. **H2's als vragen.** Elke sectie is zelfstandig te citeren: het eerste zinnetje is het antwoord, daarna de uitleg. Gebruik tabellen voor getallen en vergelijkingen.
5. **Praktijkblok:** een voorbeeldtraining of voorbeeldweek, in tabelvorm.
6. **"Zo doet Benchmrk het":** maximaal 80 woorden over hoe het plan dit toepast, alleen met functies uit de lijst hieronder. Daarna de snelle-check-CTA.
7. **FAQ:** 4 tot 6 vragen met antwoorden van 1 tot 3 zinnen, gelijk aan de FAQPage-JSON-LD.
8. **Bronnen:** een lijst met links naar de bronnen die je hebt geopend. Datum "Bijgewerkt op" bovenaan.
9. **Interne links:** minimaal 3 naar andere gidsen en 1 naar een website-pagina.
10. **Lengte:** artikelen 900 tot 1500 woorden, website-pagina's 600 tot 1000.

**Toon:** jij-vorm, direct, nuchter, getallen boven bijvoeglijke naamwoorden. Korte zinnen. Geen uitroeptekens, geen "ultieme gids".

## Eerste batch: 20 pagina's in het Nederlands

Verdeel ze over drie of vier PR's van 5 tot 7 pagina's, zodat Rick ze kan reviewen. Begin met de website-pagina's.

### Website-pagina's (6)

| # | URL | Hoofdvraag | Verplicht |
|---|---|---|---|
| 1 | /nl/hyrox-trainingsschema | Hoe ziet een goed HYROX-trainingsschema eruit? | 16-wekenopbouw, drempel, benchmarks, taper |
| 2 | /nl/hyrox-tijd-voorspellen | Hoe voorspel je je HYROX-eindtijd? | Engine-voorbeeld (zie Feiten), runs, stations en Roxzone, link naar de snelle check |
| 3 | /nl/compromised-running | Wat is compromised running en hoe train je het? | Brandt 2025 correct weergegeven, sim en compromised-afsluiter |
| 4 | /nl/hyrox-trainen-zonder-hyrox-gym | Kun je voor HYROX trainen zonder HYROX-gym of thuis? | Vervangende oefeningen, WOD-dag, whiteboard-scan |
| 5 | /nl/voor-gyms | Hoe gebruik je Benchmrk als gym of personal trainer? | Gymcode, eigen sim-sjablonen, leden volgen materiaal van de gym |
| 6 | /nl/hyrox-doubles-trainen | Hoe train je voor HYROX Doubles? | Teamvoorspelling, verdeling per station, gedeelde sim-dag |

### Gidsen (14)

| # | URL `/nl/gids/…` | Hoofdvraag |
|---|---|---|
| 7 | hoe-lang-trainen-voor-hyrox | Hoeveel weken moet je trainen voor een HYROX-race? |
| 8 | hoe-vaak-trainen-per-week | Hoe vaak per week moet je trainen voor HYROX? |
| 9 | hyrox-taper | Hoe taper je de laatste twee weken voor HYROX? |
| 10 | drempeltempo-bepalen | Hoe bepaal je je drempeltempo en drempelhartslag? |
| 11 | runs-pacen | Hoe snel moet je je runs lopen voor je doeltijd? |
| 12 | hyrox-sim-opbouwen | Hoe bouw je een HYROX-simulatietraining op? |
| 13 | roxzone-tijd-winnen | Hoe win je tijd in de Roxzone? |
| 14 | sled-push-sneller | Hoe word je sneller op de sled push? |
| 15 | sled-pull-techniek | Wat is de beste techniek voor de sled pull? |
| 16 | wall-balls-zonder-stil-te-vallen | Hoe kom je door de wall balls zonder stil te vallen? |
| 17 | burpee-broad-jumps | Hoe word je efficiënter op burpee broad jumps? |
| 18 | skierg-en-roeien | Hoe pace je de SkiErg en de roeier in HYROX? |
| 19 | open-of-pro | Wat is het verschil tussen HYROX Open en Pro (gewichten per divisie)? |
| 20 | terug-naar-hardlopen-na-blessure | Hoe bouw je hardlopen weer op na een blessure, richting een race? |

Algemene feiten over de race, zoals stationafstanden, gewichten per divisie en de opbouw (8 × 1 km en 8 stations), haal je **uit de officiële HYROX-regels of -site**. Open die bron, link haar, en zet de peildatum erbij.

## Wekelijkse ronde (na de eerste batch)

- **3 nieuwe pagina's per week** in het Nederlands, in één PR.

### Doelgroep (besluit Rick, 11 november 2026)

Nieuwe pagina's schrijf je voor iemand die al minstens één race heeft gedaan, een concrete doeltijd heeft, 2 tot 6 keer per week traint en geen coach heeft. Bij de mannen (Open en Pro) gaat het om tijden van ruwweg 1:05 tot 1:25, met het zwaartepunt rond 1:10 tot 1:15. Bij de vrouwen ligt de vergelijkbare groep eerder rond 1:20 tot 1:30. Die bandbreedtes zijn schattingen, dus zet ze niet als feit op een pagina. Het hoofdvoorbeeld is 1:15. Wie langzamer is, leest mee.

- **Geen nieuwe basispagina's** over regels, gewichten of "hoe vaak trainen". Die staan er al. Verversen mag wel.
- Schrijf als een trainingsmaat op hetzelfde niveau: minder uitleg, meer getallen. Denk aan tempo's per kilometer, splits en seconden per station.

### Wat je per ronde maakt

1. **Onderwerp van de week (verplicht).** Eén gids over het onderwerp voor de week die volgende maandag begint. De social agent van Benchmrk gebruikt hetzelfde onderwerp voor de Instagram-posts van die week. De onderzoekspost op donderdag linkt naar deze gids zodra hij live staat.
   - Kies een onderwerp op het niveau van de doelgroep dat nog niet als hoofdonderwerp van een gids bestaat. Voorbeelden:
     - waar de laatste minuten tussen 1:20 en 1:15 zitten
     - tempoverlies tussen run 1 en run 8
     - drempelintervallen voor HYROX
     - sim-tempo per fase van je opbouw
     - pacing van de stations bij een doeltijd van 1:15
     - seconden in de Roxzone bij een doeltijd van 1:15 (een andere invalshoek dan `roxzone-tijd-winnen`)
   - Bouw de gids rond minstens één studie die je zelf hebt geopend, met de groep (aantal mensen, niveau, echte of gesimuleerde race) en de beperking in gewone taal. Haal studies uit `/science` (`research/`) of zoek ze zelf.
   - Zet het onderwerp in `content/WEEKONDERWERP.md` (zie hieronder).
2. **Racehaak.** Valt er binnen 8 weken een race in Nederland of België waar nog geen voorbereidingsgids voor is? Maak die dan, met datum en stad uit de officiële kalender. Schrijf hem voor de doelgroep: wat er in de laatste weken nog te winnen is bij een doeltijd van 1:15.
3. **Vrije keuze.** Een zoekvraag die nog niet gedekt is, of een onderwerp van /science, op het niveau van de doelgroep. Zoekvragen vind je in Google "Mensen vragen ook", op Reddit r/hyrox en op forums. Is er geen racehaak, maak dan twee pagina's in deze categorie.

### `content/WEEKONDERWERP.md`

Het onderwerp van de week is de koppeling met de social agent. Die leest dit bestand op maandag van de nieuwste open PR-branch `content/…`, of anders van main. Voeg per ronde bovenaan de tabel één rij toe:

| Week (maandag) | Onderwerp | Hoofdvraag | Gids (NL) | Studie(s) | PR |
|---|---|---|---|---|---|
| 2026-11-23 | Tempoverlies run 1 → run 8 | Hoeveel tempo verlies je tussen run 1 en run 8? | `/nl/gids/<slug>` | Auteur e.a. (jaar), Tijdschrift, link | #nr |

- Gebruik bij Studie(s) dezelfde studie die in de gids staat. Zo kan de social agent hem openen en dezelfde getallen gebruiken.
- Herhaal geen onderwerp dat al in de tabel staat.

### Verversen

- **Elke ronde ook:** één bestaande pagina verversen. Controleer de feiten opnieuw, werk "Bijgewerkt op" bij en voeg een nieuwe vraag aan de FAQ toe.
- **Vertalen (besluit Rick, 22 oktober 2026):** alle NL-pagina's staan ook in EN, DE, ES en KO, met hreflang. Elke nieuwe of ververste NL-pagina krijgt in dezelfde ronde ook die vier vertalingen (zelfde PR of een tweede PR met prefix `content/`).
  - Vertaal niet woord voor woord. Schrijf de H1 zoals mensen in die taal zoeken, geef de pagina een eigen slug en voeg `translationOf` toe (zie `content/README.md`).
  - Een vertaling voegt niets toe en laat niets weg: zelfde getallen, tabellen, FAQ-vragen en bronnen. `npm run content:check` waarschuwt bij afwijkingen; los die op.
  - Verversen van een NL-pagina betekent ook de vier vertalingen bijwerken (feiten, "Bijgewerkt op", nieuwe FAQ-vraag).
- **Logboek:** houd `content/LOG.md` bij met per ronde de datum, de pagina's en de PR-link.

## Feiten die gebruikt mogen worden

**Ricks resultaat**

- Rick (oprichter, Pro Men): van 1:19 naar 1:14 met beperkte trainingsmogelijkheden. Volgende doel 1:09.

**Voorbeeld uit de engine** (altijd labelen als "voorbeeld")

- Open Men, drempeltempo 4:45/km, 16 weken, doel 1:20:00.
- Verwacht 1:18:41: runs 42:24, stations 30:52, Roxzone 5:25.
- Kans 96 %. Benodigd looptempo 5:28/km, huidig 5:18/km.

**Voorbeeldprofiel bij doeltijd 1:15** (stand 11 november 2026; altijd labelen als "voorbeeldprofiel", nooit als echte atleet)

- Open Men, doel 1:15:00, drempeltempo 4:25/km, drempelhartslag 168, 35 km per week, 5 trainingsdagen.
- Kans 70 %, verwacht 1:16:42, "als je vandaag zou racen" 1:19:17.
- Dit is het profiel uit de social-serie "Route naar 1:15". Andere getallen uit de engine bereken je zelf met de snelle check op benchmrk.ai (`/#check`). Noem dan de invoer en de peildatum.

**Onderzoek: Brandt et al. (2025), Frontiers in Physiology, doi:10.3389/fphys.2025.1519240**

- Meer dan 60 % van de racetijd ging op aan hardlopen (11 recreatieve atleten, gesimuleerde race).
- VO₂max hing het sterkst samen met de eindtijd, daarna trainingsvolume en vetpercentage. Grijpkracht en spiermassa niet.
- Lactaat en RPE waren het hoogst op de stations, met de top bij de wall balls.
- Lopen onder vermoeidheid noemen de onderzoekers belangrijk, maar ze hebben het **niet gemeten**. Compromised running is dus onze keuze op basis van het onderzoek. Schrijf nooit dat het bewezen de grootste factor is.

**Andere bronnen in de app**

- Hartslagzones als % van de drempelhartslag (Joe Friel).
- WOD-Science (Gommaar D'Hulst).
- Officiële gewichten per divisie.
- Taper: 2 weken (ongeveer 65 % → 40 % volume), laatste sim 10 tot 14 dagen voor de race, zware kracht 7 tot 10 dagen ervoor. Dat zijn de regels van de app, geen claims uit een studie.

**Functies van Benchmrk**

- Voorspelling per run, station en Roxzone, en de kans op je doeltijd (onder 60 % stelt de app een passender doel voor).
- Vijf benchmarks die herkalibreren.
- Een plan dat zich aanpast aan wat je logt (tempo, hartslag, RPE). Peesbescherming maakt impactdagen low-impact.
- Doubles met teamvoorspelling.
- Gymcode en eigen sim-sjablonen.
- WOD-dag en whiteboard-scan.
- Vervangende oefeningen zonder HYROX-materiaal.
- Compromised-afsluiter na de drempelloop als er geen sim-dag is.
- Blessure en return-to-run.
- Seizoen met A/B/C-races.
- Talen NL/EN/DE/ES/KO.
- Bèta: start gratis, daarna €30 per jaar.

Alles wat je daarnaast nodig hebt, zoek je op. Open de bron, link haar en noteer de peildatum. Kun je iets niet met een bron onderbouwen, laat het dan weg.

## Nooit doen

- **Geen verzonnen data**: geen verzonnen gemiddelde tijden, percentages, gebruikersaantallen, reviews, testimonials of quotes.
- **Geen medisch advies als zekerheid.** Zet bij blessures een korte verwijzing naar een fysiotherapeut of arts.
- **HYROX** alleen beschrijvend gebruiken ("trainen voor HYROX", "HYROX-race"). Nooit in een domeinnaam, logo of merknaam, en geen officiële logo's of beelden. Zet in de footer van de gidsen: "Benchmrk is niet verbonden aan HYROX."
- **Geen massaproductie** van bijna gelijke pagina's (bijvoorbeeld 40 doeltijdpagina's met alleen een ander getal). Elke pagina beantwoordt een eigen vraag met eigen inhoud.
- **Niet mergen of naar main pushen.** Niets buiten de repo publiceren.

## Controle per pagina (in de PR-checklist)

- [ ] Het antwoordblok beantwoordt de H1-vraag volledig in 40 tot 90 woorden.
- [ ] Elk getal heeft een bron, of hoort bij Ricks resultaat of het gelabelde engine-voorbeeld.
- [ ] De FAQ is gelijk aan de JSON-LD, en de JSON-LD is valide.
- [ ] De inhoud staat in de ruwe HTML (curl-check).
- [ ] Er zijn 3 interne links, de CTA met UTM, en de disclaimer "niet verbonden aan HYROX".
- [ ] Geen claims buiten de functielijst.
- [ ] De NL-pagina heeft een `topic` (zie `scripts/topics.mjs`) en, als er een sterk getal in staat, een `stat` voor de kaart in het overzicht.
