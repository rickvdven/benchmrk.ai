# Social posts inplannen (update 9)

De social agent maakt concepten; Rick keurt ze goed in **Admin → Social**; Benchmrk plaatst ze op het geplande tijdstip op Instagram en/of de Facebookpagina. **Niets gaat live zonder goedkeuring van een admin.**

## Onderdelen
- `supabase/migrations/024_social_posts.sql`: tabel `social_posts`, privé bucket `social-media` (alleen JPEG en MP4, max. 50 MB), admin-functies `social_update`, `social_approve`, `social_set_status` (elk in `admin_audit_log`), `social_claim` voor de publisher en een rate limit voor de agent.
- `supabase/manual/social_cron.sql`: pg_cron + pg_net, elke 5 minuten `POST /api/social/publish`. Zelf uitvoeren met het echte `SOCIAL_CRON_SECRET`; **niet** committen met de echte waarde.
- `server/social/agent.ts` → `/api/social/agent`: alleen concepten (upload-url, create, list, cancel). Instructie voor de agent: `SOCIAL_AGENT_INPLANNEN.md`.
- `server/social/publish.ts` → `/api/social/publish`: plaatst goedgekeurde posts (cron of admin via "Nu plaatsen").
- `server/social/admin.ts` → `/api/social/admin`: koppelingsstatus, quotum en "Koppeling testen" (alleen admin).
- `server/_lib/meta.ts`: Graph API-versie (`GRAPH_VERSION`), `appsecret_proof` bij elke aanroep, en het wegfilteren van tokens uit foutteksten.
- Dagelijkse controle van het token (`/debug_token`) in `/api/cron/daily`; bij een probleem een mail naar info@benchmrk.ai.

## In gebruik nemen
1. Migratie `024_social_posts.sql` in de Supabase SQL Editor.
2. Vercel → Settings → Environment Variables (Sensitive): `META_SYSTEM_USER_TOKEN`, `META_APP_SECRET`, `SOCIAL_AGENT_TOKEN`, `SOCIAL_CRON_SECRET` (twee lange willekeurige strings, bijv. `openssl rand -hex 32`). `META_PAGE_ID` en `META_IG_USER_ID` mogen eerst leeg.
3. Deploy, open Admin → Social → **Koppeling testen**, zet de getoonde ID's in `META_PAGE_ID` en `META_IG_USER_ID`, deploy opnieuw. De kopregel moet "Instagram en Facebook gekoppeld" tonen.
4. `supabase/manual/social_cron.sql` met het echte `SOCIAL_CRON_SECRET` in de SQL Editor.
5. Testpost: één beeld, alleen Instagram, 20 minuten vooruit; goedkeuren; controleren; daarna zelf verwijderen in Instagram. Dan één carrousel en één reel.

## Werkwijze per week
De agent zet de posts van een week in één keer klaar (via de API of als pakket). In Admin → Social staat bovenaan "X concepten in deze week wachten op je goedkeuring" met de knop **Alle X goedkeuren**; elke post wordt los goedgekeurd en gelogd, en op zijn eigen tijdstip geplaatst. Concepten waarvan het tijdstip al voorbij is, slaat die knop over.

## Statussen
`draft` → (Goedkeuren) `approved` → (cron, tijdstip bereikt) `processing` → `published`.
Een fout: poging + 1, terug naar `approved` met tijdstip +10 min; na 3 pogingen `failed` + mail. Een platform dat al gelukt is wordt niet opnieuw geplaatst. Een reel die bij Meta nog verwerkt wordt blijft `processing`; de volgende ronde kijkt opnieuw.

## Tokens roteren
- Agent: vervang `SOCIAL_AGENT_TOKEN` in Vercel en geef de agent het nieuwe token.
- Cron: vervang `SOCIAL_CRON_SECRET` in Vercel én voer `social_cron.sql` opnieuw uit met de nieuwe waarde.
- Meta: vervang `META_SYSTEM_USER_TOKEN`; "Koppeling testen" laat zien of het werkt.
