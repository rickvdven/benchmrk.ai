# Planupdates: regelsets, voor/na en terugdraaien

Een wijziging in de bronnen verandert het schema van een lid nooit stilletjes. Elk lid is vastgepind op een **regelset** (`profiles.rule_set_version`). Een gepubliceerde **planupdate** biedt een nieuwere regelset aan: het lid ziet een voor/na van de eigen komende 4 weken en kiest **Toepassen** of **Niet nu**. Elke wissel wordt een **planversie** (`user_plan_versions`) en is altijd terug te zetten.

## Waar zit wat
- `src/engine/rules/v1.ts`: regelset 1, exact de engine van vóór de regelsets. Nooit aanpassen.
- `src/engine/rules/versions.ts`: alle latere versies, alleen de verschillen plus metadata.
- `src/engine/rules/history.ts`: pins per datum (`seasonWithPins`): elke dag volgt de versie die op die datum gold, dus verleden en logboek veranderen nooit.
- `src/engine/rules/preview.ts`: `previewPlanUpdate()`, de diff per dag en week plus voorspelling en kans voor/na.
- `supabase/migrations/022_plan_updates.sql`: tabellen, RLS en de RPC's `plan_apply_update`, `plan_rollback`, `plan_dismiss_update` en `plan_record_snapshot`.
- UI: cockpit-melding, `/plan/update/:id`, Instellingen → Planhistorie (`/plan/history/:id`), Admin → Planupdates, en /science (niveau, regels, archief, changelog).

## Een nieuwe regelset toevoegen (VERWERK-opdracht)
1. Zet in `versions.ts` een nieuw object met het volgende versienummer, `date`, `title` in 5 talen en per wijziging `{ key, before, after, sourceIds, why }`.
   - `key` is een pad in `RuleSet`, bijvoorbeeld `taper.volumeRaceWeek`. `before` moet gelijk zijn aan de waarde in de vorige versie; de test controleert dat.
   - `sourceIds` verwijzen naar `knowledge_sources.slug` (of het begin van de titel). Zet de bron eerst in een migratie met `slug`, `level`, `checked_at` en `rule_keys`.
   - `why` in NL, EN, DE, ES en KO.
2. Ontbreekt een parameter nog in `RuleSet`? Voeg hem toe aan `types.ts` en `v1.ts` met de huidige waarde, en laat de engine hem uit `rulesOf(p)` lezen. De snapshot-test (`snapshot.test.ts`) bewaakt dat v1 gelijk blijft.
3. `npx tsc -b`, `npm test`, `npm run build:api` (de serverfuncties bundelen de engine) en `npm run test:db`.
4. Na de deploy: Admin → Planupdates → "Create draft from rule set vN", preview bekijken voor de demo-atleten en een echt lid, en publiceren. Er gaat geen mail uit.

## Coachregels uit de database
`coaching_rules` (Admin → Coachingregels) blijft werken voor iedereen, behalve voor sleutels die een latere regelset heeft veranderd: die volgen de vastgepinde versie van het lid. Een wijziging op basis van onderzoek hoort in een regelset, niet in die tabel.

## Screenshots
De screenshots in deze map zijn gemaakt met een gemockte Supabase en een **demo-regelset v2** (duurlopen 20 → 24 % van het weekvolume, korte sims 4 → 5 km). Die versie staat niet in de repo.
