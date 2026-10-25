# Content: gidsen en website-pagina's

Statische pagina's voor Google en AI-antwoordmachines. De instructie voor de schrijfagent staat in `COPY_AGENT.md`.

## Waar
| Bestand | URL |
|---|---|
| `content/nl/<slug>.md` | `/nl/<slug>` (website-pagina) |
| `content/nl/gids/<slug>.md` | `/nl/gids/<slug>` (gids) |
| `content/<taal>/<slug>.md` | `/<taal>/<slug>` (website-pagina) |
| `content/<taal>/<gidsmap>/<slug>.md` | `/<taal>/<gidsmap>/<slug>` (gids) |
| (automatisch) | `/<taal>/<gidsmap>` overzicht, `/sitemap.xml`, `/robots.txt` |

## Talen
NL is de brontaal. Elke NL-pagina heeft een vertaling in EN, DE, ES en KO.

| Taal | Map | Gidsmap | Voorbeeld |
|---|---|---|---|
| NL | `content/nl/` | `gids` | `/nl/gids/hyrox-taper` |
| EN | `content/en/` | `guide` | `/en/guide/hyrox-taper` |
| DE | `content/de/` | `ratgeber` | `/de/ratgeber/hyrox-tapering` |
| ES | `content/es/` | `guia` | `/es/guia/taper-hyrox` |
| KO | `content/ko/` | `guide` | `/ko/guide/hyrox-taper` |

- Een vertaling krijgt een eigen slug op basis van hoe mensen in die taal zoeken, en `translationOf: <NL-sleutel>` in de frontmatter
  (de NL-sleutel is het pad binnen `content/nl` zonder `.md`, bv. `gids/hyrox-taper` of `hyrox-trainingsschema`).
- De NL-pagina's hoeven niet aangepast te worden: de build koppelt de groep zelf en zet hreflang (incl. `x-default` = NL) in de
  `<head>` en de sitemap, plus een zichtbare taalkiezer in de footer.
- Een vertaling voegt niets toe en laat niets weg: zelfde getallen, tabellen, FAQ-vragen en bronnen. Het sjabloon waarschuwt als dat niet zo is.
- De kop "Zo doet Benchmrk het" heet per taal anders; de vaste tekst staat in `scripts/locales.mjs` (`benchmrkTitle`), net als de
  sjabloonteksten (CTA, disclaimer, labels). Woordlimieten gelden voor NL; Koreaans schaalt met 0,6.
- De CTA stuurt naar `/?utm_…&lang=<taal>#check`, zodat de app in dezelfde taal opent.

`npm run build` draait na `vite build` het script `scripts/build-content.mjs`. Dat controleert alle pagina's
(fouten stoppen de build) en schrijft volledige HTML naar `dist/`, zodat kop, antwoord, FAQ en bronnen
zonder JavaScript leesbaar zijn. Alleen controleren: `npm run content:check`.

## Frontmatter
```yaml
---
title: Hoe taper je de laatste twee weken voor HYROX?   # H1, de zoekvraag
seoTitle: HYROX taper: zo pak je de laatste 2 weken aan  # <title>, max 60 tekens
description: …                                          # meta description, max 155 tekens
breadcrumb: Taper                                       # optioneel, korte naam in het kruimelpad
order: 1                                                # optioneel, volgorde in het overzicht
published: 2026-10-20                                   # optioneel, standaard = updated
updated: 2026-10-20                                     # "Bijgewerkt op" en lastmod in de sitemap
answer: >-                                              # antwoordblok, 40–90 woorden, met een getal
  …
summary:                                                # "In het kort", 3–5 bullets
  - …
faq:                                                    # 4–6 vragen; komt 1-op-1 in de FAQPage-JSON-LD
  - q: …
    a: …                                                # 1–3 zinnen, platte tekst
sources:                                                # bronnen die je echt hebt geopend
  - title: …
    url: https://…
    accessed: 2026-10-20                                # peildatum
    note: …                                             # optioneel
translationOf: gids/hyrox-taper                         # alleen in vertalingen: de NL-pagina waar dit een vertaling van is
---
```

## Body (Markdown)
- Alleen H2's (`## Vraag?`) en dieper; de H1 komt uit `title`.
- Minimaal één tabel (praktijkblok), een sectie `## Zo doet Benchmrk het` (max 80 woorden).
  De snelle-check-CTA met UTM wordt direct na die sectie ingevoegd.
- Interne links als absoluut pad: minimaal 3 naar andere gidsen (`/nl/gids/…`) en 1 naar een website-pagina (`/nl/…`).
- FAQ, bronnen, auteur, datum, JSON-LD (Article, FAQPage, BreadcrumbList) en de disclaimer
  "Benchmrk is niet verbonden aan HYROX." voegt het sjabloon zelf toe.
