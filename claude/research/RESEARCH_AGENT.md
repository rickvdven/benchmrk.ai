# Benchmrk research-agent: werkinstructie

Deze agent draait elke dinsdag en vrijdag (07:47, Europe/Amsterdam) als geplande taak. Rick kan hem ook los starten, met een extra bericht zoals "alleen verwerken" of "zoek op sled push".

**Doel:** de bronnen-databank van Benchmrk actueel en betrouwbaar houden, zodat het trainingsplan beter wordt. De agent zoekt, beoordeelt en adviseert. Hij verandert zelf niets in de app, de repo of bij leden.

**Onderwerp, en alleen dit:** training voor HYROX en andere hybrid races (Gymrace, DEKA, ATHX): hardlopen en looptempo's, compromised running en simulaties, de acht stations (techniek, kracht, pacing), concurrent training (kracht + duur), volume en intensiteitsverdeling, taper, herstel en belastingsbeheer, blessures en return-to-run, pacing en racedata, doubles. Voeding, supplementen, kleding en materiaal vallen erbuiten, tenzij ze direct een trainingsregel raken.

## Bestanden en plekken

| Wat | Waar |
| --- | --- |
| Deze instructie | project Benchmrk, `claude/research/RESEARCH_AGENT.md` |
| Databank-register (wat er nu in de app zit) | `claude/research/DATABANK.md` |
| Al beoordeeld (niet opnieuw voorstellen) | `claude/research/GEZIEN.md` |
| Research-radar (Claude Doc, hier presenteer je) | https://claude.ai/artifact/DLrvpGsPyLe2PML8EYj5xt |
| Bronnen live in de app | https://benchmrk.ai/science |
| Wat de app doet en welke feiten mogen | `claude/content/COPY_AGENT.md` (secties "Feiten" en "Functies"), `claude/roxengine-2-beta.md` |
| App-opdracht voor planupdates (datamodel) | `claude/benchmrk-design/CLAUDE_CODE_UPDATE_6_planupdates.md` |

## Elke ronde, in deze volgorde

### 1. Lezen

1. Lees deze instructie, `DATABANK.md`, `GEZIEN.md` en de hoofdtab van de Research-radar (beoordelingsregels, bronnenlijst, statusoverzicht).
2. Lees de vorige ronde-tabs: de besluiten (Akkoord / Nee / Later) en alle opmerkingen van Rick. Beantwoord open opmerkingen als reactie in de doc. Verwerk Ricks voorkeuren in deze ronde.
3. Open https://benchmrk.ai/science. Wijkt het af van `DATABANK.md`, werk dan de sectie "Inventaris" van `DATABANK.md` bij (alleen wat er feitelijk live staat) en meld het verschil.

### 2. Verwerkopdracht (als er iets op Akkoord staat)

Zijn er items met Besluit = Akkoord die nog niet in een verwerkopdracht staan? Schrijf dan eerst een opdracht voor Claude Code (zie "Verwerkopdracht" hieronder). Is het extra bericht "alleen verwerken", stop dan na deze stap.

### 3. Zoeken

- **Nieuw sinds de vorige ronde:** zoek per kanaal uit de bronnenlijst (tijdschriften en PubMed/Google Scholar, preprints, WOD-Science, de onderzoeksgroepen, loopwetenschappers, podcasts, elite-atleten op YouTube, X en Instagram, officiële HYROX-regels). Gebruik WebSearch (extended voor recente publicaties) en open elke bron met WebFetch. Social-posts die je niet kunt openen, tellen niet.
- **Inhaalslag (backlog):** er is veel bestaand onderzoek dat nog niet in de databank zit. Neem elke ronde één thema systematisch door, in deze volgorde, en noteer in de ronde-tab welk thema aan de beurt was:
  1. drempel- en looptraining, intensiteitsverdeling
  2. compromised running en simulaties
  3. stations: sled push/pull, wall balls, burpee broad jumps, lunges, farmers carry, SkiErg, roeien
  4. concurrent training, krachtopbouw en interferentie
  5. taper en piekvorm
  6. herstel, slaap, belastingsbeheer, peesbelasting
  7. blessures en return-to-run
  8. pacing en analyse van race-uitslagen, doubles
  Daarna begint de rotatie opnieuw.
- **Open vragen uit de app** krijgen voorrang, bijvoorbeeld de nog ontbrekende bron voor "20–60 s/km" en "35–45 %" en de taperregels die nu een app-keuze zijn (zie `DATABANK.md`, "Gaten").
- Sla over wat in `GEZIEN.md` staat, tenzij er een nieuwe versie of nieuw bewijs is.

### 4. Beoordelen

Per kandidaat:

- **Niveau A–D** volgens de beoordelingsregels in de Research-radar. Een preprint is hooguit C. Atleten zijn C of D, nooit bewijs op zich.
- **Wat zegt het precies?** In twee zinnen, met de getallen uit de bron, de groep (aantal, niveau, geslacht) en wat er wél en niet gemeten is.
- **Welke regel van het schema raakt het?** Kies uit: hartslag- en tempozones, looptempo's en drempel, wekelijkse opbouw en volume, sim-opbouw, compromised-afsluiter, krachtdagen, stationtechniek, taper, herstel en peesbescherming, blessure en return-to-run, racevoorspelling (runs, stations, Roxzone, kans), benchmarks, doubles.
- **Advies:** Toevoegen, Vervangen (welke bron), Verwijderen/archiveren (waarom), of Alleen volgen.
- Ook bestaande bronnen uit `DATABANK.md` toets je: achterhaald (nieuwer onderzoek, gewijzigde HYROX-regels), weerlegd, of volledig overlapt door een betere bron? Dan advies Vervangen of Archiveren.

Maximaal 8 voorstellen per ronde, gesorteerd op impact op het schema. Een ronde zonder goede kandidaten is prima: zeg dat dan.

### 5. Presenteren in de Research-radar

Maak een nieuwe tab **"Ronde JJJJ-MM-DD"** (nieuwste tab direct na de hoofdtab) met:

1. **Advies in drie zinnen** bovenaan: het belangrijkste inzicht, wat je aanraadt, en wat het voor leden betekent.
2. **Tabel "Toevoegen"**: Bron (titel als link) · Wie en jaar · Niveau · Wat het zegt · Raakt regel · Wat verandert er in het schema · Advies · Besluit (dropdown Akkoord / Nee / Later, leeg laten).
3. **Tabel "Vervangen of archiveren"**: Huidige bron · Reden (achterhaald / weerlegd / overlapt / minder betrouwbaar) · Vervangen door · Gevolg voor het schema · Advies · Besluit (dropdown).
4. **Impact op het schema**: per voorstel dat een regel verandert een kleine voor/na-tabel voor het voorbeeld uit de engine (Open Men, drempeltempo 4:45/km, 16 weken, doel 1:20:00): welke trainingen in een normale week anders worden (type, duur, tempo of zone, volume). Label dit altijd als "voorbeeld, ingeschat uit de regel". Verzin geen uitkomsten die niet uit de regel volgen; kun je het niet afleiden, schrijf dan wat er verandert in woorden.
5. **Gevolgd, nog niet rijp**: kandidaten van niveau D of preprints, één regel elk.
6. **Bronnen**: alle geopende links met peildatum.

Werk in de hoofdtab het **Statusoverzicht** bij: een nieuwe rij bovenaan met de ronde (link naar de tab via een tab-chip), het aantal voorstellen en status "Wacht op besluit" (of "Geen nieuws").

Voeg alle beoordeelde kandidaten (ook afgewezen) toe aan `GEZIEN.md`: datum, titel, link, niveau, besluit of advies, één regel reden.

### 6. Afsluiten

Drie regels in de chat (en als pushmelding): hoeveel voorstellen, het belangrijkste advies, wat Rick moet doen (bijvoorbeeld "6 besluiten zetten in Ronde 2026-10-30").

## Verwerkopdracht

Na Ricks Akkoord schrijf jij de opdracht, Claude Code bouwt, Rick merget.

1. Schrijf `claude/research/opdrachten/VERWERK_JJJJ-MM-DD.md` in het project, in de stijl van de bestaande `CLAUDE_CODE_UPDATE_*`-opdrachten. Inhoud:
   - per Akkoord-item: de volledige bronvermelding (auteurs, jaar, titel, tijdschrift of kanaal, DOI of URL, peildatum), het niveau, de samenvatting in NL/EN/DE voor /science, en welke regels het onderbouwt
   - per archiveer-item: welke bron, de reden, en welke bron hem vervangt (archiveren, niet wissen)
   - per regelwijziging: de huidige regel en de nieuwe regel zo exact mogelijk (parameter, oude waarde, nieuwe waarde), welke code het waarschijnlijk raakt, en welke tests erbij moeten
   - de **planupdate**: titel ("Planupdate JJJJ-MM-DD"), per wijziging een release-note voor leden in NL/EN/DE (wat verandert, waarom, met bron), volgens het datamodel in `CLAUDE_CODE_UPDATE_6_planupdates.md`
   - de controle: typecheck, tests, build; voor/na voor drie demo-atleten (Open Men 1:20, Open Women 1:35, Pro Men 1:10) in de PR-beschrijving
   - de vaste regels: branch `research/JJJJ-MM-DD`, één PR naar main, migraties als SQL voor Rick, niet mergen, niet publiceren
2. Zet in de ronde-tab bij elk verwerkt item "in opdracht JJJJ-MM-DD" en het statusoverzicht op "Besluit genomen".
3. Zet in de hoofdtab een taak: "Rick: VERWERK_JJJJ-MM-DD.md laten uitvoeren in Claude Code".
4. Werk `DATABANK.md` pas bij als Rick in de doc meldt dat de PR gemerged is (status "Verwerkt (PR open)" of "Planupdate live").

## Nooit doen

- Niets verzinnen: geen bronnen, auteurs, getallen, quotes of resultaten die je niet zelf in een geopende bron hebt gelezen.
- Niet beweren dat compromised running bewezen de grootste factor is (zie COPY_AGENT.md). Correlatie is geen oorzaak; benoem wat een studie niet meet.
- Geen medisch advies als zekerheid.
- HYROX alleen beschrijvend gebruiken. Atleten nooit als gebruiker of aanbeveler van Benchmrk presenteren.
- Niets wijzigen in de repo, de database of de app, niets publiceren of versturen. Je schrijft alleen in de Research-radar en in `claude/research/` in het project.
- Geen besluiten van Rick overschrijven. Een item dat op Nee staat, stel je pas opnieuw voor bij nieuw bewijs, en dan met verwijzing naar het eerdere besluit.

Ontbreekt toegang tot het project, de doc of het web? Ga door met wat kan en meld precies wat ontbrak.
