# Benchmrk – handleiding voor Claude Code

Benchmrk (voorheen RoxEngine) is een AI-trainingscoach voor HYROX. Hij maakt een schema op basis van je eigen drempelwaarden en raceprofiel, en stuurt dat bij op basis van wat je logt. Eigenaar: Rick van de Ven (Natuurlijk! B.V.). De productstatus staat in het Claude-project "Roxengine" (`claude/roxengine-2-beta.md`); de takenlijst staat in de app onder **Admin → Roadmap** (tabel `admin_todos`).

## Live
- App: https://app.benchmrk.ai (ook https://benchmrk.ai; www → apex). Oude URL: https://roxengine-beta.vercel.app
- Hosting: Vercel, team "NM", project `roxengine-beta`
- Database/auth: Supabase project `vvhntlqpjwkbrfodngdu` (Frankfurt)
- Mail: Resend, domein benchmrk.ai (afzender `noreply@benchmrk.ai`), ook gebruikt als SMTP voor Supabase Auth

## Stack
- Vite + React 18 + TypeScript + Tailwind, TanStack Query, react-router, sonner, lucide-react
- Supabase: RLS op alle tabellen, logica in SECURITY DEFINER RPC's
- Serverfuncties: `server/*.ts` → gebundeld naar `api/*.mjs` met `npm run build:api` (Vercel Functions). Cron: `/api/cron/daily` om 05:00 UTC
- AI: Claude via `ANTHROPIC_API_KEY` (notities lezen, whiteboard-scan); Gemini alleen voor TTS (admin)

## Commando's
```bash
npm install
npm run dev            # lokaal op http://localhost:5173 (heeft .env.local nodig, zie .env.example)
npx tsc -b --noEmit    # typecheck – gebruik -b, NIET -p . (dat checkt niets)
npx vitest run         # engine- en content-tests (ook: npm test)
npm run build:api      # na elke wijziging in server/ – api/*.mjs wordt gecommit
npm run build          # productie-build van de frontend + statische content (scripts/build-content.mjs)
npm run content:check  # alleen de content controleren
```
Deploy: Merge naar main = automatisch live via Vercel; elke andere branch krijgt een preview-URL. Database-wijzigingen: zet SQL klaar, Rick voert die uit in Supabase.

## Structuur
- `src/engine/` – pure trainingslogica, volledig getest (`engine.test.ts`):
  - `plan.ts` schema-generatie, taper, racedag-tekst · `season.ts` seizoen met A/B/C-races en divisie per race
  - `raceModel.ts` kansmodel (`goalChance`) · `adaptive.ts` uitvoering/compliance · `boost.ts` kansverhogers
  - `notes.ts` notities lezen · `injury.ts` + `rehab.ts` blessures en return-to-run
  - `places.ts` trainingsplekken en materiaal · `extra.ts` extra training met belastingsbudget
- `src/data/hooks.tsx` – data ophalen + `useCoach` (combineert profiel, logs en engine)
- `src/pages/` – Landing, Cockpit, Plan, Settings, Science, admin/* · `src/components/` – UI-onderdelen
- `src/lib/i18n.tsx` + `src/locales/*.json` – talen EN/NL/DE/ES/KO. Taal: `?lang=` > eigen keuze > IP-land (`/api/geo`) > browser
- `server/` – API-routes (notes, whiteboard, notify, tts, geo, unsubscribe, cron) · `server/_lib/` – mail, templates, Supabase-client
- `content/` – gidsen en website-pagina's in Markdown (zie `content/README.md`, instructie in `COPY_AGENT.md`); bij de build gerenderd tot statische HTML onder `/nl/…`, plus `sitemap.xml` en `robots.txt`
- `supabase/migrations/` – 001–019, alle toegepast. Nieuwe migratie = volgend nummer; toepassen via Supabase SQL-editor of Management API

## Afspraken
- Alle UI-teksten in 5 talen (minimaal EN + NL volledig; NL is de hoofdtaal van de gebruikers)
- Merk: "Benchmrk" in tekst, wordmark BENCH**MRK** (accentkleur `volt` #d4ff3a). Gebruik **geen** "ROX"/"HYROX" in merk- of productnamen (HYROX-merkrichtlijnen); "HYROX" alleen beschrijvend
- Wetenschappelijke claims horen bij een bron op `/science` (tabel met bronnen via migraties)
- Geen geheimen in de code. Sleutels staan in Vercel env vars en lokaal in `.env.local` (git-ignored)
- Na wijzigingen: typecheck + tests groen, `build:api` als server/ is aangepast
