# Update 2 voor Claude Code: feedback Rick op de landingspagina

Geef Claude Code deze opdracht:

> Lees `benchmrk-a-licht/CLAUDE_CODE_UPDATE_2.md` en voer de vier punten uit op de landingspagina. Houd je aan de harde regels uit `CLAUDE_CODE_OPDRACHT.md`. Laat daarna screenshots zien op 1440, 1280 en 390 breed, in NL en DE.

De bijgewerkte referentie staat in `reference/landing-desktop.html` (open hem in een browser). De afbeelding staat in `benchmrk-app-benchmark-log.png`.

## 1. Hero-kop kleiner, hero past in het scherm

- De h1 is nu te groot, waardoor de snelle check en de lead buiten beeld vallen.
- Nieuwe maat: `font-size: clamp(44px, 5.2vw, 76px)`, `line-height: 0.94`, `max-width: 14ch`. Font-stretch blijft 72%, uppercase blijft.
- Padding boven de hero naar 48px.
- **Check:** op 1440×900 en 1280×800 moeten de kop, de lead, de knop "Start gratis intake" en de hele snelle-checkbon tot en met de knop "Bouw mijn volledige plan" zichtbaar zijn zonder te scrollen. Lukt dat niet, maak dan de bon compacter (minder verticale padding) voordat je de kop nog kleiner maakt.
- Controleer ook de Duitse kop. Die is langer, dus `text-wrap: balance` mag.

## 2. Foto-placeholder vervangen door de app-afbeelding

- Verwijder de gearceerde foto-placeholder.
- Zet op die plek de sectie **"Log je Benchmark. Zie je tijd schuiven."**:
  - Links staan de kop (dezelfde koppenstijl als de andere secties), één alinea en een kleine mono tabel met drie regels: voorspelling 1:18:41 → 1:17:55, kans op 1:20:00 96% → 98%, drempeltempo 4:45 → 4:43/km. Daaronder het bijschrift "Voorbeeldwaarden in een illustratie van de app."
  - Rechts staat `benchmrk-app-benchmark-log.png`, met 400px maximale breedte.
- Zet de afbeelding in `public/` (of in de assets-map van het project). Geef hem `alt`-tekst, `loading="lazy"` en `width`/`height` om layout-verschuiving te voorkomen. De PNG is 1000×1800 met een transparante achtergrond; maak er gerust ook een WebP van.
- De teksten gaan via i18n, in alle 5 talen. De cijfers in de illustratie zelf blijven Nederlands; dat is acceptabel als illustratie.

## 3. Vergelijkingsblok uitlichten

- Kop: "Benchmrk vs. de alternatieven", met rechts een korte toelichting.
- De tabel staat in een **wit kader**: `--bm-surface`, 1px `--bm-line`-rand, `--bm-shadow-paper`, radius 2px, horizontaal scrollbaar op mobiel.
- De **Benchmrk-kolom is uitgelicht**:
  - De kop is een lime vlak met "BENCH MRK" in inkt (font-weight 800).
  - De cellen hebben een lichte lime-tint als achtergrond (`#F6FADF`) en een 2px inktrand links, rechts en onder. Zo leest de kolom als één geheel.
- "Ja" wordt een vinkje (een inline SVG van 18px, met `aria-label="ja"`), "nee" wordt een gedempt streepje (met `aria-label="nee"`). "Deels" blijft tekst.
- De prijsrij staat in mono. De Benchmrk-prijs is vet en iets groter.

## 4. Prijsblok: nieuwe opzet als prijsbon

Het idee: de prijs krijgt dezelfde uitslagenbon-vorm als de snelle check in de hero. Zo voelt hij als een bonnetje met alles wat je krijgt, niet als een SaaS-prijskaart.

- **Links:**
  - De kop "Minder dan één startbewijs." en daaronder de zin "Tijdens de bèta betaal je €30 voor een heel jaar. Je ziet eerst je voorspelling, daarna beslis je."
  - Een lijst in drie stappen met mono labels: `gratis` Intake van 5 minuten · `gratis` Je voorspelling en je kans op je doel · `€30` Het volledige plan, een jaar lang.
- **Rechts, de prijsbon:**
  - Een witte bon, licht gedraaid (`rotate(-0.5deg)`), met de kop "BÈTA-LIDMAATSCHAP · 1 seizoen".
  - Daaronder gestippelde regels met "incl.":
    - Plan tot de racedag, dag voor dag
    - 5 Benchmarks + herkalibratie
    - Voorspelling + kans op je doel
    - Doubles: team en splits
    - Taper en racedagplan
  - Dan een inktlijn en "Totaal per jaar" met **€30** groot (Archivo condensed, 72px), met daaronder "= €2,50 per maand".
  - Dan de lime knop "Start gratis intake →" en de kleine regel over de vriendenkorting zoals die nu op de site staat.
  - Bovenaan de bon staat een kleine stempel "BÈTAPRIJS": omlijnd, gedraaid en `aria-hidden`.
- **Regels:**
  - Neem alleen functies op die echt in de app zitten. Ontbreekt er één, haal die regel dan weg in plaats van hem te laten staan.
  - Verzin geen doorgestreepte "normale prijs" en geen garantie.
