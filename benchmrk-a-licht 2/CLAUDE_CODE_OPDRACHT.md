# Opdracht voor Claude Code: Benchmrk naar design A (licht)

Zet deze map (`benchmrk-a-licht/`) in de root van het Benchmrk-project en geef Claude Code deze opdracht:

> Lees `benchmrk-a-licht/CLAUDE_CODE_OPDRACHT.md` en voer fase 1 en 2 uit. Stop na elke fase, laat zien wat er veranderd is, en wacht op mijn akkoord voor de volgende fase.

---

## Context

Benchmrk (app.benchmrk.ai) is een HYROX-trainingsapp: Vite + React + TypeScript + Tailwind, Supabase, engine in `src/engine`, deploy via Vercel CLI. Typecheck met `npx tsc -b`, tests met Vitest (51 engine-tests moeten groen blijven).

Rick heeft na een paar ontwerprondes gekozen voor **design A "Uitslagenlijst", lichte variant**. Het idee: de site oogt als een officiële uitslagenlijst of een tijdwaarnemingsbon, niet als een standaard AI/SaaS-template. Het doel is dat de app er minder "AI-gegenereerd" uitziet.

Referentiebestanden in deze map:
- `reference/landing-desktop.html`: volledige landingspagina, 1440 breed (open in een browser)
- `reference/landing-mobile-hero.html`: mobiele bovenkant, 390 breed
- `reference/stijlbasis.html`: kleuren, type en onderdelen
- `tokens.css`: alle ontwerpwaarden als CSS-variabelen, plus snippets voor Tailwind v3 en v4

De referentie-HTML is een **mockup met inline styles**. Neem de waarden en de opbouw over in de bestaande React-componenten en Tailwind-conventies van het project. Kopieer de mockup-HTML niet letterlijk.

## Harde regels

1. **Functionaliteit blijft identiek.** Raak `src/engine`, Supabase-calls, RLS, `server/`, `api/` en de rekenlogica niet aan. Het is alleen een visuele herziening.
2. **i18n blijft werken** (EN/NL/DE/ES/KO). Nieuwe of gewijzigde teksten gaan via het bestaande vertaalsysteem, in alle vijf talen. Duitse strings zijn lang, dus test de layout daarmee.
3. **Echte data, geen verzinsels.**
   - De "snelle check" en de voorbeeldatleten (Lisa, Mark, Rick & Tom) blijven live doorgerekend door de engine, net als nu.
   - Waar de mockup `[uit engine]` of `[…]` toont, vul je de echte engine-uitvoer in.
   - Geen nep-reviews of nep-testimonials.
   - De foto-placeholder blijft een placeholder, tot Rick eigen racefoto's levert.
4. **Geen emoji** in de UI (de huidige 🚀 en ⚡ gaan eruit). Iconen komen uit de bestaande iconenset of zijn eenvoudige SVG's.
5. **Lime (#D4F046) is nooit een tekstkleur** op een lichte achtergrond. Gebruik het alleen als vlak: primaire knoppen, de MRK-markering in het woordmerk, highlights. Tekst erop is #141413.
6. **Toegankelijkheid:** contrast minimaal 4.5:1 (de tokens zijn daarop gekozen), echte `<button>`/`<a>`, labels bij invoer, zichtbare focus.
7. Werk op een aparte git-branch als die er is; commit per fase.

## Fase 1: basis (tokens, type, globale stijl)

1. Bepaal of het project Tailwind v3 of v4 gebruikt en zet de tokens uit `tokens.css` op de juiste plek (CSS-variabelen + Tailwind theme).
2. Laad de lettertypes **Archivo** (variabel, met width-as) en **IBM Plex Mono**. Bij voorkeur self-hosted via `@fontsource-variable/archivo` en `@fontsource/ibm-plex-mono`. Verwijder Geist als die nergens meer nodig is.
3. Globale stijl: ondergrond `#EFEEEA`, tekst `#141413`, body 17px/1.55, selectie in lime, focus-ring in inkt.
4. Is de app nu donker (dark mode of een vaste donkere achtergrond), zet hem dan op licht. Laat een eventuele dark-mode-toggle voorlopig staan, maar maak licht de standaard.
5. **Controle:** `npx tsc -b`, `npm test` en `npm run build` slagen. Maak screenshots van de landingspagina en twee app-schermen.

## Fase 2: landingspagina (route `/` voor niet-ingelogde bezoekers)

Bouw de huidige landingspagina om naar `reference/landing-desktop.html`. Houd de huidige secties en teksten aan waar ze inhoudelijk overeenkomen. Wat verandert:

| Onderdeel | Ontwerp |
|---|---|
| Nav | Woordmerk `BENCH` + `MRK` (MRK in een lime blokje), links (Hoe het werkt, Voorbeelden, Prijs, Wetenschap), taalkeuze, en "Inloggen" als omlijnde knop. Haarlijn eronder. |
| Hero links | Kop in Archivo 800, `font-stretch: 72%`, uppercase, `clamp(56px, 8vw, 104px)`, regelhoogte 0.92. Eén kleur, geen deel van de kop in lime. Daaronder de lead in `--bm-ink-2`, een lime knop "Start gratis intake" en de tekstlink "Zo werkt het". Geen badge-pil met emoji erboven. |
| Hero rechts: snelle check | Een witte **uitslagenbon** (`--bm-surface`, radius 2px, `--bm-shadow-paper`, licht gedraaid met `rotate(0.6deg)`). Kop "SNELLE CHECK", invoer met alleen een onderlijn, gestippelde scheidingslijnen, en tijden in IBM Plex Mono. Het blok verwacht toont de tijd groot (34px), de balk runs/stations/Roxzone in drie grijstinten met een doelmarkering, en een zwarte knop "Bouw mijn volledige plan →". Blijft gekoppeld aan de bestaande calculatorlogica. |
| Foto-strook | Placeholder (diagonale arcering op `--bm-surface-2`) tot er echte foto's zijn. |
| "Waarom plannen falen" | Geen kaarten met iconen. Drie kolommen met een 1.5px inktlijn erboven, een mono nummer (01/02/03), een kop van 22px en tekst. |
| Voorbeeldatleten | Een **uitslagentabel**: kolommen Atleet, Divisie, Drempel, Doel, Verwacht, Kans, Grootste verlies. Mono cijfers, haarlijnen tussen de rijen, en een 1.5px inktlijn onder de kop. Alle rijen live uit de engine. Daaronder de focuszin met een lime highlight op het label. |
| Stappen | Kop links. Rechts een lijst met mono tijdslabels (5 min / dag 1 / elke wk). |
| Vergelijking | Tabel in dezelfde stijl. De Benchmrk-kolom is vet. |
| Prijs | "€30" heel groot (Archivo condensed, ~160px), "per jaar" eronder, rechts een lijst met haarlijnen, en een lime knop. |
| Footer | Haarlijn erboven, disclaimer en de link naar Wetenschap & bronnen. |

Op mobiel (390) stapelen de kolommen, tabellen scrollen horizontaal in hun eigen kader, en knoppen zijn minimaal 44px hoog. Zie `reference/landing-mobile-hero.html`.

**Controle:** screenshots op 1440 en 390 naast de referentie leggen, in NL en DE. Lighthouse-toegankelijkheidsscore minimaal 95.

## Fase 3 (pas na akkoord van Rick): app-schermen

Pas de stijl toe op de ingelogde app. Dezelfde regels, toegepast op schermen waar mensen iets doen:
- Kaarten worden witte vlakken (`--bm-surface`) met een 1px `--bm-line`-rand of `--bm-shadow-paper`. Geen gekleurde gloed, geen gradients.
- Alle tijden, tempo's, splits, zones en percentages in IBM Plex Mono met tabulaire cijfers.
- Primaire actie per scherm: een lime knop. Secundair: een omlijnde knop.
- Grafieken: segmentkleuren uit de tokens. Waar blauw/oranje/groen nu iets betekent, de kleuren alleen veranderen als de betekenis duidelijk blijft (legenda en lichtheidsverschil).
- Werk scherm voor scherm. Begin met dashboard/plan, dan kansmodel/radar, dan instellingen. Laat na elk scherm screenshots zien.

## Niet doen

- Geen nieuwe features, routes of copy-claims toevoegen.
- Niet deployen. Rick deployt zelf met de Vercel CLI na controle.
- Geen afhankelijkheden toevoegen buiten de twee fontpakketten.
