# Instructie voor de social agent: posts in de wachtrij van Benchmrk zetten

Werkt pas als update 9 live staat en Rick je het agent-token heeft gegeven. Tot die tijd lever je een **pakket** (zip) op dat Rick importeert in Admin → Social → Pakket importeren.

## Wat je mag

- Concepten maken, bijwerken en annuleren zolang ze concept zijn.
- Je mag **nooit** iets goedkeuren of plaatsen. Rick keurt elke post goed in Admin → Social.

## Bestanden klaarmaken

- Beelden als **JPEG** (kwaliteit 90, sRGB), max. 8 MB. Instagram accepteert geen PNG: zet je renders om.
- Carrousel: 2–10 beelden, allemaal dezelfde verhouding (4:5, 1080 × 1350, of 1:1).
- Reel: MP4 (H.264, AAC), 9:16, 1080 × 1920, max. 50 MB en max. 90 s. Optioneel een cover als JPEG.
- Bijschrift: max. 2.200 tekens en max. 30 hashtags. Neem het uit het captions-bestand van die week.

## Per post (met de API)

Basis-URL: `https://app.benchmrk.ai/api/social/agent`, header `Authorization: Bearer <token>`. Bewaar het token alleen in je eigen `.tokens`-bestand (chmod 600); toon het nooit in de chat.

1. Per bestand: `{"action":"upload-url","postKey":"<source-id>","n":1,"mime":"image/jpeg"}` → je krijgt `upload_url` en `path`. Upload het bestand met `PUT` naar `upload_url` (header `Content-Type` gelijk aan de mime). Voor de cover van een reel: zelfde verzoek met `"cover":true` → `posts/<source-id>/cover.jpg`. Maximaal 60 verzoeken per minuut.
2. Daarna: 
   ```json
   {"action":"create","source":"w5b-2-rekensom","format":"carousel","platforms":["instagram","facebook"],
    "caption":"…","media":[{"path":"posts/w5b-2-rekensom/1.jpg","kind":"image"}, …],
    "scheduled_at":"2026-11-17T18:30:00+01:00"}
   ```
   Tijden in Europe/Amsterdam met offset, minstens 15 minuten vooruit. Zelfde `source` opnieuw = het concept bijwerken (alleen zolang het een concept is). Bij een fout krijg je `400` met `error` en `details` (bijv. `carousel_count`, `caption_length`, `hashtags`, `time_too_soon`, `missing_files`).
   Annuleren kan alleen een concept: `{"action":"cancel","id":"<id>"}`.
3. Controleer met `{"action":"list"}` dat de post als `draft` staat, en meld Rick welke posts klaarstaan (bron, tijdstip, formaat).

## Pakket (zonder API)

Zip per week met per post een map `<source-id>/` met `post.json` (zelfde velden als `create`, met bestandsnamen in plaats van paths) en de bestanden `1.jpg`, `2.jpg`, … of `reel.mp4` en `cover.jpg`.
