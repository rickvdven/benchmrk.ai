# Regelsets

Alles in de engine wat door onderzoek kan veranderen staat in `RuleParams` (`params.ts`). Versie 1 (`v1.ts`) is het gedrag van vóór de regelsets; een test (`rules.test.ts` + `v1.snapshot.json`) bewaakt dat dat exact zo blijft.

## Een nieuwe versie toevoegen (bijvoorbeeld uit een VERWERK-opdracht)

1. Maak `v2.ts` met alleen de verschillen:
   ```ts
   import type { RuleSetDef } from './index';
   export const V2: RuleSetDef = {
     version: 2,
     date: '2026-11-12',
     title: { en: '…', nl: '…', de: '…', es: '…', ko: '…' },
     changes: [
       { key: 'taper.lastSimDays', before: 10, after: 14, sourceIds: ['<knowledge_sources.id>'], why: { en: '…', nl: '…', de: '…', es: '…', ko: '…' } },
     ],
   };
   ```
   `key` is een pad in `RuleParams` (cijfers indexeren arrays: `threshold.table.base.0.n`). `before` moet kloppen met de vorige versie, anders gooit de engine een fout.
2. Voeg `V2` toe aan `DEFS` in `index.ts`.
3. Voeg de bron toe in `knowledge_sources` (migratie) met `level`, `rule_keys` en `checked_at`.
4. Draai in Admin → Planupdates "Concept aanmaken", bekijk de preview en publiceer.

Leden die op een oudere versie zitten merken niets tot ze zelf "Toepassen" kiezen. Een parameter die nog niet in `RuleParams` staat (return-to-run, peesbescherming, de overige voorspellingsfactoren) kan hier worden toegevoegd: zet de waarde in `v1.ts` en lees hem in de engine uit `rules`.

De zeven waarden uit Admin → Coachingregels liggen bovenop de versie: een waarde die de beheerder heeft aangepast (anders dan de standaard) wint, anders beslist de versie (`withAdminRules`).
