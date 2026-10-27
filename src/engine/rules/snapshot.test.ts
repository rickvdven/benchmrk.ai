import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateSeason, raceModel, zones, chanceBoosters, injuryImpact } from '../index';
import { fixtures, FIXTURE_TODAY } from './fixtures';

const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

// Rule set v1 must reproduce the engine exactly as it was before rule sets existed.
// These hashes were taken from the engine before the parameters moved into src/engine/rules/v1.ts.
describe('rule set v1 = engine before rule sets (snapshot)', () => {
  for (const f of fixtures()) {
    it(f.id, () => {
      const out = (['en', 'nl'] as const).map((lang) => {
        const opts = { lang, today: FIXTURE_TODAY, ...f.opts, ...(f.opts.lang ? {} : { lang }) };
        return {
          plan: generateSeason(f.profile, opts),
          model: raceModel(f.profile, FIXTURE_TODAY),
          zones: zones(f.profile.athlete.lthr, f.profile.athlete.maxHr),
          boost: chanceBoosters(f.profile, FIXTURE_TODAY),
          impact: injuryImpact(f.profile, FIXTURE_TODAY, opts),
        };
      });
      expect(hash(out)).toMatchSnapshot();
    });
  }
});
