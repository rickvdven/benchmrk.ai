import type { CoachingRules, Profile } from '../types';
import type { RuleChange, RuleSet, RuleSetVersion } from './types';
import { V1 } from './v1';
import { VERSIONS } from './versions';

export * from './types';
export { V1 } from './v1';
export { VERSIONS } from './versions';

/** Value at a dotted path, e.g. getRule(rs, 'taper.volumeRaceWeek'). */
export function getRule(rs: RuleSet, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), rs);
}

function setRule(rs: RuleSet, key: string, value: unknown) {
  const parts = key.split('.');
  let o = rs as unknown as Record<string, unknown>;
  for (const k of parts.slice(0, -1)) {
    if (typeof o[k] !== 'object' || o[k] === null) throw new Error(`Unknown rule key: ${key}`);
    o = o[k] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (!(last in o)) throw new Error(`Unknown rule key: ${key}`);
  o[last] = structuredClone(value);
}

function deepFreeze<T>(x: T): T {
  if (x && typeof x === 'object') {
    for (const v of Object.values(x)) deepFreeze(v);
    Object.freeze(x);
  }
  return x;
}

/** Builds a rule set from a base and a list of versions (exported for tests and previews of unreleased versions). */
export function buildRuleSet(versions: RuleSetVersion[], version: number, base: RuleSet = V1): RuleSet {
  const rs = structuredClone(base) as RuleSet;
  for (const v of versions) {
    if (v.version > version) break;
    for (const c of v.changes) setRule(rs, c.key, c.after);
    rs.version = v.version;
  }
  return deepFreeze(rs);
}

export const LATEST_RULESET_VERSION = VERSIONS.length ? VERSIONS[VERSIONS.length - 1].version : 1;

const cache = new Map<number, RuleSet>([[1, deepFreeze(structuredClone(V1))]]);
/** The rule set for a version number. Unknown or missing numbers fall back to the nearest known version (never newer than asked). */
export function ruleSet(version: number | null | undefined): RuleSet {
  const v = Math.max(1, Math.min(LATEST_RULESET_VERSION, Math.floor(version ?? 1)));
  let rs = cache.get(v);
  if (!rs) {
    rs = buildRuleSet(VERSIONS, v);
    cache.set(v, rs);
  }
  return rs;
}

/** Rule set of a profile: the pinned one, or v1 (the engine before rule sets) when none is attached. */
export const rulesOf = (p: Pick<Profile, 'ruleSet'> | null | undefined): RuleSet => p?.ruleSet ?? cache.get(1)!;

/** Metadata of one version (v1 has none). */
export const versionMeta = (version: number, versions: RuleSetVersion[] = VERSIONS) => versions.find((v) => v.version === version) ?? null;

/** All changes between two versions, in either direction (a rollback lists them reversed: before ↔ after). */
export function changesBetween(from: number, to: number, versions: RuleSetVersion[] = VERSIONS): RuleChange[] {
  if (from === to) return [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const list = versions.filter((v) => v.version > lo && v.version <= hi).flatMap((v) => v.changes);
  return to > from ? list : [...list].reverse().map((c) => ({ ...c, before: c.after, after: c.before }));
}

/** coaching.* keys a version changed since v1. */
function coachingKeysSinceV1(version: number): (keyof CoachingRules)[] {
  return [
    ...new Set(
      VERSIONS.filter((v) => v.version <= version)
        .flatMap((v) => v.changes)
        .filter((c) => c.key.startsWith('coaching.'))
        .map((c) => c.key.slice('coaching.'.length) as keyof CoachingRules),
    ),
  ];
}

/**
 * Coaching rules in force: the admin-editable values from the database (coaching_rules), except keys a rule-set
 * version after v1 changed – those follow the member's pinned version, so a research change never reaches a plan silently.
 */
export function effectiveCoaching(rs: RuleSet, db?: CoachingRules | null): CoachingRules {
  if (!db) return rs.coaching;
  const out = { ...db };
  for (const k of coachingKeysSinceV1(rs.version)) (out as Record<string, number>)[k] = rs.coaching[k];
  return out;
}
