# Content: gidsen en website-pagina's

Statische pagina's voor Google en AI-antwoordmachines. De instructie voor de schrijfagent staat in `COPY_AGENT.md`.

## Waar
| Bestand | URL |
|---|---|
| `content/nl/<slug>.md` | `/nl/<slug>` (website-pagina) |
| `content/nl/gids/<slug>.md` | `/nl/gids/<slug>` (gids) |
| (automatisch) | `/nl/gids` overzicht, `/sitemap.xml`, `/robots.txt` |

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
alternates:                                             # later: vertalingen voor hreflang
  en: /en/guide/…
---
```

## Body (Markdown)
- Alleen H2's (`## Vraag?`) en dieper; de H1 komt uit `title`.
- Minimaal één tabel (praktijkblok), een sectie `## Zo doet Benchmrk het` (max 80 woorden).
  De snelle-check-CTA met UTM wordt direct na die sectie ingevoegd.
- Interne links als absoluut pad: minimaal 3 naar andere gidsen (`/nl/gids/…`) en 1 naar een website-pagina (`/nl/…`).
- FAQ, bronnen, auteur, datum, JSON-LD (Article, FAQPage, BreadcrumbList) en de disclaimer
  "Benchmrk is niet verbonden aan HYROX." voegt het sjabloon zelf toe.
