import type { CoachingRules, Lang } from '../types';
import { DEFAULT_RULES } from '../types';
import type { RuleParams } from './params';
import { V1_PARAMS } from './v1';

export type { RuleParams, Rx } from './params';
export { V1_PARAMS } from './v1';

/** One change in a rule set: which value, from what to what, why, and the sources (knowledge_sources.id) behind it. */
export interface RuleChange {
  /** dotted path into RuleParams, numbers index arrays: 'taper.lastSimDays', 'threshold.table.base.0.n' */
  key: string;
  before: unknown;
  after: unknown;
  sourceIds: string[];
  why: Record<Lang, string>;
}

/** A published (or draft) version. Only the differences from the previous version are listed; version 1 is the base. */
export interface RuleSetDef {
  version: number;
  /** ISO date the version was written */
  date: string;
  title: Record<Lang, string>;
  changes: RuleChange[];
}

export interface RuleSet extends RuleSetDef {
  params: RuleParams;
}

const same = (t: string): Record<Lang, string> => ({ en: t, nl: t, de: t, es: t, ko: t });

/** Rule set definitions, oldest first. A new version = a new file `vN.ts` exporting a RuleSetDef, added here. */
const DEFS: RuleSetDef[] = [{ version: 1, date: '2026-10-26', title: same('Start: the engine as it was'), changes: [] }];


export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function getPath(o: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => (acc == null ? undefined : (acc as Record<string, unknown>)[k]), o);
}

export function setPath(o: unknown, key: string, value: unknown) {
  const parts = key.split('.');
  const last = parts.pop()!;
  const parent = parts.reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], o) as Record<string, unknown>;
  if (parent == null || !(last in parent)) throw new Error(`rule key does not exist: ${key}`);
  parent[last] = value;
}

/** Applies a version's changes on top of the previous params. Throws when `before` does not match: a stale change list. */
export function applyChanges(params: RuleParams, changes: RuleChange[]): RuleParams {
  const next = clone(params);
  for (const c of changes) {
    const cur = getPath(next, c.key);
    if (JSON.stringify(cur) !== JSON.stringify(c.before)) throw new Error(`rule change ${c.key}: before ${JSON.stringify(c.before)} does not match ${JSON.stringify(cur)}`);
    setPath(next, c.key, c.after);
  }
  return next;
}

const cache = new Map<number, RuleSet>();

function build(version: number): RuleSet {
  let params = clone(V1_PARAMS);
  let last = DEFS[0];
  for (const d of DEFS) {
    if (d.version > version) break;
    if (d.version > 1) params = applyChanges(params, d.changes);
    last = d;
  }
  return { ...last, params };
}

/** The rule set for a version. A version this build does not know yet resolves to the newest one it does know. */
export function ruleSet(version: number | null | undefined): RuleSet {
  const v = Math.max(1, Math.floor(version ?? 1));
  const known = [...DEFS].reverse().find((d) => d.version <= v)?.version ?? 1;
  let rs = cache.get(known);
  if (!rs) {
    rs = build(known);
    cache.set(known, rs);
  }
  return rs;
}

export const ruleSetVersions = () => DEFS.map((d) => d.version);
export const latestRuleSetVersion = () => DEFS[DEFS.length - 1].version;
export const ruleSetDef = (version: number) => DEFS.find((d) => d.version === version) ?? null;

/** Tests and the preview harness add a version here; the app registers its versions in DEFS above. */
export function registerRuleSet(def: RuleSetDef) {
  const i = DEFS.findIndex((d) => d.version === def.version);
  if (i >= 0) DEFS[i] = def;
  else DEFS.push(def);
  DEFS.sort((a, b) => a.version - b.version);
  cache.clear();
}
export function unregisterRuleSet(version: number) {
  const i = DEFS.findIndex((d) => d.version === version && version > 1);
  if (i >= 0) DEFS.splice(i, 1);
  cache.clear();
}

const LEGACY_KEYS = Object.keys(DEFAULT_RULES) as (keyof CoachingRules)[];

/**
 * The seven values an admin can tune in Admin → Regels sit on top of the pinned version: a value the admin changed
 * (different from the version-1 default) wins, otherwise the pinned version decides.
 */
export function withAdminRules(rs: RuleSet, admin: CoachingRules | undefined): RuleParams {
  if (!admin) return rs.params;
  const p = clone(rs.params);
  for (const k of LEGACY_KEYS) if (admin[k] !== DEFAULT_RULES[k]) p[k] = admin[k];
  return p;
}
