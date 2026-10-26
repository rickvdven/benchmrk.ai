# Claude Code-opdracht 6: planupdates met voor/na en terugdraaien

Voor Claude Code in de repo `rickvdven/benchmrk.ai`. Eenmalige bouwopdracht. Daarna komen nieuwe inzichten uit de Research-radar als kleine verwerkopdrachten (`claude/research/opdrachten/VERWERK_*.md`) die op dit fundament leunen.

**Doel:** als de bronnen-databank verandert, verandert het schema van een lid nooit stilletjes. Het lid ziet wat er verandert en waarom, met een voor/na van zijn eigen komende weken, kiest zelf, en kan altijd terug.

## Werkwijze

- Lees eerst `CLAUDE.md`, `src/engine` (vooral `raceModel.ts`, `adaptive.ts`, `boost.ts`, `extra.ts`, `rehab.ts`), de migraties 014, 017 en 019 (bronnen op /science) en hoe het plan nu wordt opgeslagen en gegenereerd. Hergebruik wat er al is; bouw niets dubbel.
- Branch `feature/planupdates`, één PR naar main. Niet mergen. Migraties als SQL in de PR (nieuwe nummers na de hoogste bestaande); Rick plakt ze in de Supabase SQL Editor.
- Zet in de PR-beschrijving eerst een kort plan van de aanpak op basis van wat je in de code vond, en wijk alleen af van onderstaande als de code daar een goede reden voor geeft (en schrijf die reden op).

## 1. Regelversies in de engine

- Alle parameters die door onderzoek kunnen veranderen, komen in één **regelset** met een versienummer: zones, looptempo-afleiding, opbouw en volume, sim-opbouw, compromised-afsluiter, krachtdagen, taper, peesbescherming, return-to-run, voorspellingsfactoren. Begin met versie `1` = exact het huidige gedrag.
- Regelsets staan als getypte bestanden in de repo (bijvoorbeeld `src/engine/rules/v1.ts`, `v2.ts`), zodat elke wijziging in een PR zichtbaar en getest is. Een nieuwe versie bevat alleen de verschillen ten opzichte van de vorige plus metadata: datum, titel, en per wijziging `{ key, before, after, sourceIds[], why: {nl,en,de,es,ko} }`.
- Elk lid heeft een vastgepinde `rule_set_version`. De engine genereert het plan altijd met de gepinde versie. Nieuwe leden krijgen de nieuwste gepubliceerde versie.
- Test: dezelfde invoer + dezelfde versie = exact hetzelfde plan (snapshot-test).

## 2. Database (migratie)

- **Bronnen:** breid de bestaande bronnentabel uit (of maak `research_sources` als die er niet is) met `level` (A/B/C/D), `status` (active/archived), `archived_at`, `archived_reason`, `replaced_by`, `checked_at` (peildatum) en `rule_keys text[]`. Archiveren, nooit wissen.
- **`plan_updates`**: `id`, `rule_set_version`, `title`, `summary jsonb` (per taal), `changes jsonb`, `status` (draft/published), `published_at`.
- **`user_plan_versions`**: `id`, `user_id`, `version_no` (oplopend per lid), `rule_set_version`, `plan_snapshot jsonb` (het toekomstige deel van het plan op dat moment), `reason` (start/update/rollback), `plan_update_id`, `created_at`.
- **`user_plan_update_choices`**: `user_id`, `plan_update_id`, `choice` (applied/dismissed/rolled_back), `at`.
- RLS: leden lezen en schrijven alleen hun eigen rijen; `plan_updates` alleen lezen als `published`; admin mag alles.
- Bij de migratie krijgt elk bestaand lid versie 1 als startversie in `user_plan_versions`.

## 3. Voor/na-preview

- Een functie `previewPlanUpdate(user, fromVersion, toVersion, days = 28)` genereert vanaf vandaag twee plannen (huidige pin en nieuwe versie) met dezelfde invoer en logboek, en geeft een diff per dag: trainingstype, duur, afstand, tempo of zone, stationvolume, belasting. Plus de racevoorspelling en de kans op het doel vóór en na, als de voorspelling verandert.
- Gelogde trainingen en dagen in het verleden veranderen nooit.

## 4. Wat het lid ziet

- **Melding** op het dashboard als er een gepubliceerde planupdate is die het lid nog niet heeft gekozen: "Nieuw: Planupdate 12 nov. Bekijk wat er verandert."
- **Pagina `/plan/update/:id`:**
  - per wijziging: wat verandert, waarom (de `why`-tekst) en de bron als link naar /science
  - de voor/na van de eigen komende 4 weken: per week een tabel, alleen gewijzigde dagen gemarkeerd (oud doorgestreept, nieuw ernaast), en een samenvattingsregel per week (bijvoorbeeld "−4 km, +1 drempelblok")
  - de voorspelling en kans voor/na, als die verandert
  - knoppen **Toepassen** en **Niet nu**. Niet nu laat het schema gelijk; de update blijft terug te vinden.
- **Toepassen:** sla eerst een snapshot op in `user_plan_versions` (huidige versie), zet de pin op de nieuwe versie, genereer het plan vanaf vandaag opnieuw, sla de nieuwe versie op en registreer de keuze.
- **Instellingen → Planhistorie:** lijst van alle versies (datum, reden, regelsetversie, titel van de update). Bij elke versie **Zet terug**: toont eerst dezelfde voor/na-preview, maakt bij bevestigen een nieuwe versie met reden "rollback" en de oude regelset. Terugdraaien kan altijd, naar elke eerdere versie, ook meerdere keren.
- Alle teksten in NL, EN, DE, ES en KO, in de huisstijl (A licht).

## 5. Admin

- **Admin → Planupdates:** concepten bekijken, de preview draaien voor drie demo-atleten (Open Men 1:20, Open Women 1:35, Pro Men 1:10) en een gekozen bestaand lid, en publiceren (alleen admin). Publiceren zet `status = published`; er gaat geen mail uit, tenzij Rick dat later aanzet.
- Een concept ontstaat uit de regelset-metadata (bijvoorbeeld een seed bij de deploy of een knop "Concept aanmaken uit regelset vN").

## 6. /science

- Toon per bron het niveau en de regels die ze onderbouwt.
- Gearchiveerde bronnen staan onderaan onder "Gearchiveerd", met datum, reden en vervangende bron.
- Bij elke planupdate een korte changelog-regel: "Planupdate 12 nov: taper aangepast op basis van …".

## Controle

- `npx tsc -b`, `npm test`, `npm run build` slagen.
- Nieuwe tests: zelfde versie = zelfde plan; Toepassen en daarna Zet terug geeft exact het oorspronkelijke toekomstige plan; verleden en logboek blijven onaangeraakt; de diff vindt alleen echte verschillen; RLS: lid A ziet geen versies van lid B.
- In de PR: screenshots van de melding, de voor/na-pagina en de planhistorie op 1440 en 390 breed.

## Niet doen

- Nooit een plan van een lid wijzigen zonder dat het lid Toepassen of Zet terug kiest.
- Geen bronnen wissen; alleen archiveren.
- Geen claims buiten de bronnen; HYROX alleen beschrijvend; "Benchmrk is niet verbonden aan HYROX" blijft staan.
- Niet mergen of deployen zonder akkoord van Rick.
