import { describe, expect, it } from 'vitest';
import {
  buildRuleSet,
  changesBetween,
  effectiveCoaching,
  generateSeason,
  getRule,
  previewPlanUpdate,
  ruleSet,
  seasonWithPins,
  versionOn,
  pinsOf,
  freezeLogged,
  V1,
  VERSIONS,
  LATEST_RULESET_VERSION,
  type RuleSetVersion,
  type RulePin,
  type Week,
} from '../index';
import { fixtures, FIXTURE_TODAY } from './fixtures';

const why = { nl: 'test', en: 'test', de: 'test', es: 'test', ko: 'test' };
/** A made-up version 2 that only exists in the tests. */
const TEST: RuleSetVersion[] = [
  {
    version: 2,
    date: '2026-11-12',
    title: { nl: 'Testupdate', en: 'Test update', de: 'Test', es: 'Test', ko: 'Test' },
    changes: [
      { key: 'volume.easyShare', before: 0.2, after: 0.25, sourceIds: ['Bosquet'], why },
      { key: 'sim.kmShort', before: 4, after: 5, sourceIds: [], why },
    ],
  },
];
const resolve = (v: number) => buildRuleSet(TEST, v);
const omen = fixtures()[0];
const flat = (w: Week[]) => w.flatMap((x) => x.sessions);

describe('rule sets', () => {
  it('v1 equals the engine defaults and resolves for any number', () => {
    expect(ruleSet(1)).toEqual(V1);
    expect(ruleSet(null).version).toBe(1);
    expect(ruleSet(999).version).toBe(LATEST_RULESET_VERSION);
  });

  it('same input + same version = exactly the same plan', () => {
    for (const f of fixtures()) {
      const opts = { lang: 'nl' as const, today: FIXTURE_TODAY, ...f.opts };
      const a = generateSeason({ ...f.profile, ruleSet: ruleSet(1) }, opts);
      const b = generateSeason({ ...f.profile, ruleSet: ruleSet(1) }, opts);
      expect(a).toEqual(b);
      // no rule set on the profile = v1
      expect(generateSeason(f.profile, opts)).toEqual(a);
    }
  });

  it('a version only changes the keys it lists, and changes the plan', () => {
    const v2 = resolve(2);
    expect(v2.version).toBe(2);
    expect(v2.volume.easyShare).toBe(0.25);
    expect({ ...v2, version: 1, volume: { ...v2.volume, easyShare: 0.2 }, sim: { ...v2.sim, kmShort: 4 } }).toEqual(V1);
    const opts = { today: FIXTURE_TODAY };
    expect(generateSeason({ ...omen.profile, ruleSet: v2 }, opts)).not.toEqual(generateSeason(omen.profile, opts));
    expect(() => buildRuleSet([{ ...TEST[0], changes: [{ key: 'volume.nope', before: 1, after: 2, sourceIds: [], why }] }], 2)).toThrow();
  });

  it('every shipped version lists `before` = the value in the version before it', () => {
    let prev = V1;
    for (const v of VERSIONS) {
      for (const c of v.changes) expect(getRule(prev, c.key), `${v.version} ${c.key}`).toEqual(c.before);
      for (const c of v.changes) for (const l of ['nl', 'en', 'de', 'es', 'ko'] as const) expect(c.why[l], `${v.version} ${c.key} ${l}`).toBeTruthy();
      prev = buildRuleSet(VERSIONS, v.version);
      expect(prev.version).toBe(v.version);
    }
  });

  it('changesBetween runs both ways', () => {
    expect(changesBetween(1, 2, TEST).map((c) => c.after)).toEqual([0.25, 5]);
    expect(changesBetween(2, 1, TEST).map((c) => c.after)).toEqual([4, 0.2]);
    expect(changesBetween(2, 2, TEST)).toEqual([]);
  });

  it('admin coaching_rules apply, except keys a later version changed', () => {
    const db = { ...V1.coaching, eliteMaxDecaySec: 15 };
    expect(effectiveCoaching(ruleSet(1), db).eliteMaxDecaySec).toBe(15);
    expect(effectiveCoaching(ruleSet(1), null)).toEqual(V1.coaching);
  });
});

describe('pins: apply and roll back', () => {
  const today = FIXTURE_TODAY;
  const opts = { lang: 'nl' as const, today };
  const start: RulePin[] = [{ from: null, version: 1 }];
  const applied: RulePin[] = [...start, { from: today, version: 2 }];
  const rolledBack: RulePin[] = [...applied, { from: today, version: 1 }];

  it('versionOn and pinsOf', () => {
    expect(versionOn(applied, '2026-11-15')).toBe(1);
    expect(versionOn(applied, today)).toBe(2);
    expect(versionOn(rolledBack, today)).toBe(1);
    expect(pinsOf([], 3)).toEqual([{ from: null, version: 3 }]);
    expect(pinsOf([{ version_no: 2, rule_set_version: 2, effective_from: today }, { version_no: 1, rule_set_version: 1, effective_from: '2026-10-01' }], 2)).toEqual([
      { from: null, version: 1 },
      { from: today, version: 2 },
    ]);
  });

  it('apply changes only today and later; past days stay exactly the same', () => {
    const before = flat(seasonWithPins(omen.profile, opts, start, resolve));
    const after = flat(seasonWithPins(omen.profile, opts, applied, resolve));
    expect(after.filter((s) => s.date < today)).toEqual(before.filter((s) => s.date < today));
    expect(after.filter((s) => s.date >= today)).not.toEqual(before.filter((s) => s.date >= today));
  });

  it('apply, then roll back, gives exactly the original future plan', () => {
    const original = seasonWithPins(omen.profile, opts, start, resolve);
    const back = seasonWithPins(omen.profile, opts, rolledBack, resolve);
    expect(back).toEqual(original);
  });

  it('logged sessions are never touched', () => {
    const plan = flat(seasonWithPins(omen.profile, opts, start, resolve));
    const easy = plan.find((s) => s.date >= today && s.type === 'easy')!;
    const log = { [easy.date]: { completed: true, planned: easy as unknown as Record<string, unknown> } };
    const after = flat(freezeLogged(seasonWithPins(omen.profile, opts, applied, resolve), log));
    const kept = after.find((s) => s.date === easy.date)!;
    expect({ ...kept, frozen: undefined }).toEqual({ ...easy, frozen: undefined });
    const p = previewPlanUpdate({ profile: omen.profile, opts, pins: start, log, toVersion: 2, today, resolve });
    const day = p.weeks.flatMap((w) => w.days).find((d) => d.date === easy.date)!;
    expect(day.frozen).toBe(true);
    expect(day.fields).toEqual([]);
  });
});

describe('previewPlanUpdate', () => {
  const today = FIXTURE_TODAY;
  const opts = { lang: 'en' as const, today };
  const pins: RulePin[] = [{ from: null, version: 1 }];

  it('finds nothing when the version stays the same', () => {
    const p = previewPlanUpdate({ profile: omen.profile, opts, pins, toVersion: 1, today, resolve });
    expect(p.changedDays).toBe(0);
    expect(p.forecastChanged).toBe(false);
    expect(p.weeks.flatMap((w) => w.days)).toHaveLength(28);
  });

  it('finds only real differences', () => {
    const p = previewPlanUpdate({ profile: omen.profile, opts, pins, toVersion: 2, today, resolve });
    expect(p.changedDays).toBeGreaterThan(0);
    for (const d of p.weeks.flatMap((w) => w.days)) {
      expect(d.date >= today).toBe(true);
      if (!d.fields.length) {
        expect(d.after).toEqual(d.before);
        continue;
      }
      // the test version only touches easy-run volume and the short sim distance
      expect(['easy', 'sim']).toContain(d.before!.type);
      expect(d.fields).toContain('km');
      expect(JSON.stringify(d.after)).not.toBe(JSON.stringify(d.before));
    }
    // easy runs got longer → more km in at least one week, never fewer
    expect(p.weeks.some((w) => w.kmAfter > w.kmBefore)).toBe(true);
    expect(p.weeks.every((w) => w.kmAfter >= w.kmBefore)).toBe(true);
  });

  it('reports a forecast change only when the forecast rules change', () => {
    const fc: RuleSetVersion[] = [{ ...TEST[0], changes: [{ key: 'prediction.raceDayMarginSec', before: 30, after: 60, sourceIds: [], why }] }];
    const ambitious = { ...omen.profile, goalSec: 74 * 60 };
    const p = previewPlanUpdate({ profile: ambitious, opts, pins, toVersion: 2, today, resolve: (v) => buildRuleSet(fc, v) });
    expect(p.changedDays).toBe(0);
    expect(p.model.after.chance).not.toBe(p.model.before.chance);
    expect(p.forecastChanged).toBe(true);
    expect(previewPlanUpdate({ profile: omen.profile, opts, pins, toVersion: 2, today, resolve }).forecastChanged).toBe(false);
  });
});
