# Update 3 voor Claude Code: sectie "Werkt het? Hier zijn de cijfers."

Geef Claude Code deze opdracht:

> Lees `benchmrk-a-licht/CLAUDE_CODE_UPDATE_3.md` en vervang de sectie met de drie voorbeeldatleten. Houd je aan de harde regels uit `CLAUDE_CODE_OPDRACHT.md`. Laat daarna screenshots zien op 1440 en 390, in NL en DE, met elke atleet een keer geselecteerd.

Referentie: `reference/sectie-bewijs-atleten.html`. Dat is een statische weergave met Lisa geselecteerd.

## Doel

Bezoekers moeten zien dat het echt werkt. Daarvoor heeft de sectie twee lagen: eerst één **echt resultaat**, daarna een **interactieve analyse** die laat zien wat de engine doet.

## Blok 1: echt resultaat (donker vlak)

- Een donker vlak (`#141413`, tekst `#EFEEEA`) over de hele contentbreedte.
- **Links:**
  - Het mono label "ECHT RESULTAAT · DE OPRICHTER".
  - De zin: "Rick bouwde Benchmrk voor zijn eigen training: van 1:19 naar 1:14 in Pro, met beperkte trainingsmogelijkheden."
  - Daaronder: "Volgende doel: 1:09. Zijn plan rekent elke week mee."
- **Rechts:**
  - "1:19" doorgestreept en gedempt, dan "1:14" heel groot in mono, met een lime chip "−5 min".
  - Daaronder een tijdlijn van 1:19 via "nu 1:14" naar "doel 1:09". Het deel tot nu is lime, met een lime markering bij nu.
- Het label "de oprichter" blijft staan. Het moet duidelijk zijn dat dit Rick zelf is, geen klantreview.

## Blok 2: "Kies een atleet. Zie waar de minuten lekken."

- **Links:** een tablijst met drie knoppen (Lisa, Mark, Rick & Tom). Elke knop toont de naam, de divisie, en "doel … · drempel …" in mono.
  - De geselecteerde knop is inkt-gevuld; de andere zijn wit met een `--bm-line`-rand.
  - Gebruik echte tab-semantiek: `role="tablist"`/`tab`/`tabpanel`, `aria-selected` en pijltjestoetsen.
  - Onder de tabs staat de omlijnde knop "Reken je eigen race door ↑", die naar de snelle check in de hero scrollt.
- **Rechts:** een **analysebon**, in dezelfde stijl als de bon in de hero (wit, met gestippelde scheidingen).
  - **Kop:** "ANALYSE · NAAM", met rechts de divisie en het aantal weken tot de race.
  - **Drie getallen:** "Nu verwacht", "Doel" en "Kans als je het plan volgt". De kans staat op een lime vlak.
  - **"Waar de minuten lekken":** de twee of drie stations met het meeste tijdverlies, elk met een balk en een tijd.
  - **"PLAN"-chip:** daarnaast de focuszin van de engine.

## Data: alles uit de engine

- Gebruik dezelfde engine-aanroepen als de huidige voorbeeldsectie. Niets wordt hardcoded behalve de invoerprofielen.
- De referentie toont Lisa met de waarden die nu op de site staan: Open Women, drempel 5:05/km, doel 1:25:00, verwacht 1:26:31, kans 83%, sled pull 5:22, sled push 3:50.
- Voor Mark en Rick & Tom staan in de referentie `[engine]`-placeholders; vul die met echte engine-uitvoer.
- **"Waar de minuten lekken":**
  - Sorteer de stations op **tijdverlies ten opzichte van de referentie** die de engine gebruikt (middenmoot of doelsplit).
  - De balklengte is dat verlies, relatief aan het grootste verlies van die atleet.
  - Toon rechts de stationtijd en, als de engine het levert, het verlies (bijvoorbeeld "5:22 · +0:48").
- Bij Rick & Tom (Doubles) toont de focuszin de verdeling per station tussen de partners, als de engine die levert.
- De kleine tekst rechtsboven blijft: "Live doorgerekend met dezelfde engine als je plan. De profielen zijn voorbeelden."

## Mobiel

- Het donkere vlak stapelt: eerst tekst, dan cijfers.
- De tabs worden een horizontale rij met drie knoppen (scrollbaar als het niet past), met de bon eronder.
- In "Waar de minuten lekken" wordt de stationkolom smaller (110px).

## Niet doen

- Geen andere resultaten of percentages verzinnen dan Ricks eigen 1:19 → 1:14 → doel 1:09.
- Geen testimonial-citaten.
