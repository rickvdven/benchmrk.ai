import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyChanges,
  defaultSchedule,
  generatePlan,
  generateSeason,
  generateVersionedSeason,
  latestRuleSetVersion,
  previewPlanUpdate,
  registerRuleSet,
  ruleSet,
  snapshotOf,
  unregisterRuleSet,
  V1_PARAMS,
  withAdminRules,
  zones,
  DEFAULT_RULES,
  type Athlete,
  type Profile,
  type RuleChange,
  type RuleSetDef,
} from '../index';
import SNAPSHOT from './v1.snapshot.json';

const stars = { skierg: 3, sledPush: 3, sledPull: 3, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 3 };
const athlete = (o: Partial<Athlete>): Athlete => ({ name: 'X', sex: 'man', lthr: 170, maxHr: 190, thresholdPaceSec: 300, archetype: 'hybrid', flags: { achilles: false, quad: false, back: false, shin: false }, stationStars: stars, stationTimes: {}, ...o });
const profile = (o: Partial<Profile>, a: Partial<Athlete> = {}): Profile => ({ athlete: athlete(a), category: 'solo_open', raceName: 'Test', raceDate: '2027-02-20', goalSec: 5100, planStart: '2026-10-12', weekSchedule: defaultSchedule(5), ...o });
const CASES: Record<string, Profile> = {
  a: profile({}),
  b: profile({ category: 'solo_pro', raceDate: '2027-01-09', goalSec: 4200 }, { thresholdPaceSec: 235, archetype: 'fast_runner', flags: { achilles: true, quad: false, back: false, shin: false } }),
  c: profile({ raceDate: '2027-06-12', weekSchedule: defaultSchedule(3) }, { sex: 'woman', archetype: 'strength', weeklyKm: 20 } as never),
  d: profile({ raceDate: '2026-12-05', weekSchedule: defaultSchedule(7) }, { thresholdPaceSec: 340 }),
  e: profile({ raceDate: '2027-03-06', weekSchedule: defaultSchedule(6) }, { flags: { achilles: false, quad: false, back: true, shin: true, injuries: { shin: 'now' } } as never }),
};
const TODAY = '2026-11-02';
const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 24);
const why = (t: string) => ({ en: t, nl: t, de: t, es: t, ko: t });

/** A made-up version for the tests: it is never registered in the app. */
const change = (key: string, before: unknown, after: unknown): RuleChange => ({ key, before, after, sourceIds: [], why: why('test') });
const V2: RuleSetDef = {
  version: 2,
  date: '2026-11-12',
  title: why('Test update'),
  changes: [
    change('taper.lastSimDays', 10, 14),
    change('zones.z2CapPct', 0.89, 0.87),
    change('volume.taperFactor', 0.65, 0.6),
    change('threshold.table.base.0.n', 5, 4),
    change('forecast.freqAerobic.3', 0.85, 0.8),
  ],
};
const withV2 = () => registerRuleSet(V2);
afterEach(() => unregisterRuleSet(2));

describe('rule sets', () => {
  it('version 1 is exactly the engine as it was: the same input gives the same plan (snapshot)', () => {
    const got: Record<string, string> = {};
    for (const [k, p] of Object.entries(CASES))
      for (const lang of ['en', 'nl'] as const) {
        got[`${k}-${lang}-plan`] = sha(generatePlan(p, { lang, today: TODAY }));
        got[`${k}-${lang}-season`] = sha(generateSeason(p, { lang, today: TODAY, flare: { '2026-11-03': 6 } }));
      }
    got.zones = sha(zones(170, 190));
    expect(got).toEqual(SNAPSHOT);
  });
  it('generating twice with the same version gives exactly the same plan', () => {
    withV2();
    const p = CASES.a;
    expect(generateSeason(p, { lang: 'nl', today: TODAY, ruleSet: ruleSet(2) })).toEqual(generateSeason(p, { lang: 'nl', today: TODAY, ruleSet: ruleSet(2) }));
  });
  it('applies a version as differences on the previous one and refuses a stale change list', () => {
    withV2();
    const rs = ruleSet(2);
    expect(rs.params.taper.lastSimDays).toBe(14);
    expect(rs.params.threshold.table.base[0].n).toBe(4);
    expect(rs.params.threshold.table.base[1]).toEqual(V1_PARAMS.threshold.table.base[1]);
    expect(V1_PARAMS.taper.lastSimDays).toBe(10);
    expect(() => applyChanges(V1_PARAMS, [change('taper.lastSimDays', 9, 14)])).toThrow(/does not match/);
    expect(() => applyChanges(V1_PARAMS, [change('taper.nothing', undefined, 1)])).toThrow();
  });
  it('resolves a version this build does not know to the newest one it knows', () => {
    expect(ruleSet(99).version).toBe(latestRuleSetVersion());
    expect(ruleSet(null).version).toBe(1);
  });
  it('lets an admin value from Admin → Regels win over the pinned version, and otherwise follows the version', () => {
    withV2();
    registerRuleSet({ ...V2, changes: [...V2.changes, change('thresholdCapPctLthr', 1, 0.98)] });
    expect(withAdminRules(ruleSet(2), { ...DEFAULT_RULES }).thresholdCapPctLthr).toBe(0.98);
    expect(withAdminRules(ruleSet(2), { ...DEFAULT_RULES, thresholdCapPctLthr: 0.95 }).thresholdCapPctLthr).toBe(0.95);
  });
  it('a new version really changes the plan, and only where its rules apply', () => {
    withV2();
    const p = CASES.a;
    const v1 = generateSeason(p, { lang: 'nl', today: TODAY }).flatMap((w) => w.sessions);
    const v2 = generateSeason(p, { lang: 'nl', today: TODAY, ruleSet: ruleSet(2) }).flatMap((w) => w.sessions);
    expect(v2.length).toBe(v1.length);
    const changed = v2.filter((s, i) => JSON.stringify(s) !== JSON.stringify(v1[i]));
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.length).toBeLessThan(v1.length);
    expect(v2.find((s) => s.type === 'easy' && s.hrCap)!.hrCap).toBeLessThan(v1.find((s) => s.type === 'easy' && s.hrCap)!.hrCap!);
  });
});

describe('plan updates: preview, apply, roll back', () => {
  const opts = { lang: 'nl' as const, today: TODAY };
  const p = CASES.a;
  const eras = [{ from: '0000-00-00', ruleSet: ruleSet(1) }];

  it('the preview finds only real differences', () => {
    withV2();
    const same = previewPlanUpdate(p, opts, eras, ruleSet(1));
    expect(same.changedDays).toBe(0);
    expect(same.weeks).toEqual([]);
    expect(same.forecast).toBeNull();
    const diff = previewPlanUpdate(p, opts, eras, ruleSet(2));
    const cur = generateVersionedSeason(p, opts, eras).flatMap((w) => w.sessions);
    const nxt = generateVersionedSeason(p, opts, [{ from: '0000-00-00', ruleSet: ruleSet(1) }, { from: TODAY, ruleSet: ruleSet(2) }]).flatMap((w) => w.sessions);
    const until = '2026-11-30';
    const real = cur.filter((s, i) => s.date >= TODAY && s.date < until && JSON.stringify(s) !== JSON.stringify(nxt[i])).map((s) => s.date);
    expect(diff.weeks.flatMap((w) => w.days.map((d) => d.date))).toEqual(real);
    for (const w of diff.weeks) for (const d of w.days) expect(d.fields.length).toBeGreaterThan(0);
    expect(diff.weeks.every((w) => w.start >= '2026-10-26')).toBe(true);
    expect(diff.changedDays).toBeGreaterThan(0);
  });
  it('the forecast diff only appears when the forecast factors change', () => {
    withV2();
    const three = profile({ weekSchedule: defaultSchedule(3) });
    expect(previewPlanUpdate(three, opts, eras, ruleSet(2)).forecast).not.toBeNull();
    expect(previewPlanUpdate(p, opts, eras, ruleSet(2)).forecast).toBeNull(); // 5 days: factor 1 in both versions
  });
  it('apply and then roll back gives exactly the original future plan; the past is never touched', () => {
    withV2();
    const original = generateVersionedSeason(p, opts, eras);
    const applied = [...eras, { from: TODAY, ruleSet: ruleSet(2) }];
    const afterApply = generateVersionedSeason(p, opts, applied);
    // days before today are identical, from today on something differs
    const past = (w: typeof original) => w.flatMap((x) => x.sessions).filter((s) => s.date < TODAY);
    expect(past(afterApply)).toEqual(past(original));
    expect(JSON.stringify(afterApply)).not.toEqual(JSON.stringify(original));
    // roll back on the same day: a new era with version 1 again
    const rolled = [...applied, { from: TODAY, ruleSet: ruleSet(1) }];
    const afterRollback = generateVersionedSeason(p, opts, rolled);
    expect(snapshotOf(afterRollback, TODAY)).toEqual(snapshotOf(original, TODAY));
    expect(afterRollback).toEqual(original);
  });
  it('a rollback on a later day keeps the days in between as they were under the update', () => {
    withV2();
    const applied = [...eras, { from: TODAY, ruleSet: ruleSet(2) }];
    const later = '2026-11-16';
    const rolled = [...applied, { from: later, ruleSet: ruleSet(1) }];
    const o = { ...opts, today: later };
    const a = generateVersionedSeason(p, o, applied).flatMap((w) => w.sessions);
    const r = generateVersionedSeason(p, o, rolled).flatMap((w) => w.sessions);
    expect(r.filter((s) => s.date < later)).toEqual(a.filter((s) => s.date < later));
    const v1 = generateVersionedSeason(p, o, eras).flatMap((w) => w.sessions);
    expect(r.filter((s) => s.date >= later)).toEqual(v1.filter((s) => s.date >= later));
  });
});
