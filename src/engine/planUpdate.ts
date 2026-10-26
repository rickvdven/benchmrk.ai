import type { BaselineTable } from './raceModel';
import { DEFAULT_BASELINES, goalChance, raceModel } from './raceModel';
import { addDays } from './time';
import { generateSeason } from './season';
import { ruleSet, withAdminRules, type RuleSet } from './rules';
import type { PlanOptions } from './plan';
import type { DayType, Profile, Session, Week } from './types';

/** From this date (inclusive) the plan follows this rule set. The first entry covers all earlier dates. */
export interface RuleEra {
  from: string;
  ruleSet: RuleSet;
}

export const ERA_START = '0000-00-00';

/** The versions of a member (user_plan_versions rows, oldest first) as eras. The pinned version always rules the last era. */
export function erasFromVersions(versions: { rule_set_version: number; effective_from: string }[] | null | undefined, pin: number): RuleEra[] {
  if (!versions?.length) return [{ from: ERA_START, ruleSet: ruleSet(pin) }];
  const eras = versions.map((v) => ({ from: v.effective_from, ruleSet: ruleSet(v.rule_set_version) }));
  const last = versions[versions.length - 1];
  if (last.rule_set_version !== pin) eras.push({ from: last.effective_from, ruleSet: ruleSet(pin) });
  eras[0] = { ...eras[0], from: ERA_START };
  return eras;
}

/**
 * The plan with the history of the member's pinned versions: every day follows the rule set that was pinned on that
 * day, so applying (or rolling back) an update changes today and later, never the days behind you.
 */
export function generateVersionedSeason(p: Profile, opts: PlanOptions, eras: RuleEra[]): Week[] {
  const list = eras.length ? [...eras].sort((a, b) => a.from.localeCompare(b.from)) : [{ from: ERA_START, ruleSet: ruleSet(1) }];
  const plans = list.map((e) => generateSeason(p, { ...opts, ruleSet: e.ruleSet }));
  const last = plans.length - 1;
  if (last === 0) return plans[0];
  const byDate = plans.map((pl) => new Map(pl.flatMap((w) => w.sessions.map((s) => [s.date, s] as const))));
  const eraAt = (date: string) => {
    let i = 0;
    for (let k = 0; k < list.length; k++) if (list[k].from <= date) i = k;
    return i;
  };
  return plans[last].map((w) => ({ ...w, sessions: w.sessions.map((s) => (eraAt(s.date) === last ? s : (byDate[eraAt(s.date)].get(s.date) ?? s))) }));
}

export type DiffField = 'type' | 'km' | 'pace' | 'hrCap' | 'focus' | 'title' | 'details';
const FIELD_ORDER: DiffField[] = ['type', 'title', 'km', 'pace', 'hrCap', 'focus', 'details'];

/** What the member needs to see of a session: enough to show old vs new without the whole description. */
export interface SessionBrief {
  type: Session['type'];
  title: string;
  km: number | null;
  paceSec: number | null;
  hrCap: number | null;
  focus: string[];
  /** station / sim content differs although title, km and pace do not */
  description: string;
}

const brief = (s: Session | undefined): SessionBrief | null =>
  s ? { type: s.type, title: s.title, km: s.km ?? null, paceSec: s.targetPaceSec ?? null, hrCap: s.hrCap ?? null, focus: s.focusStations ?? [], description: s.description } : null;

export interface DayDiff {
  date: string;
  before: SessionBrief | null;
  after: SessionBrief | null;
  fields: DiffField[];
}

export interface WeekDiff {
  /** Monday of the week */
  start: string;
  /** plan week number (1-based) */
  index: number;
  days: DayDiff[];
  /** change in running km over the whole week and in the number of sessions per type */
  summary: { km: number; types: Partial<Record<DayType, number>> };
}

export interface ForecastDiff {
  beforeSec: number;
  afterSec: number;
  chanceBefore: number;
  chanceAfter: number;
}

export interface PlanDiff {
  from: string;
  to: string;
  weeks: WeekDiff[];
  changedDays: number;
  forecast: ForecastDiff | null;
}

function fieldsOf(a: SessionBrief | null, b: SessionBrief | null): DiffField[] {
  if (!a || !b) return a || b ? ['type'] : [];
  const out: DiffField[] = [];
  if (a.type !== b.type) out.push('type');
  if (a.title !== b.title) out.push('title');
  if (a.km !== b.km) out.push('km');
  if (a.paceSec !== b.paceSec) out.push('pace');
  if (a.hrCap !== b.hrCap) out.push('hrCap');
  if (a.focus.join() !== b.focus.join()) out.push('focus');
  if (!out.length && a.description !== b.description) out.push('details');
  return out.sort((x, y) => FIELD_ORDER.indexOf(x) - FIELD_ORDER.indexOf(y));
}

/**
 * Before/after of the coming `days` days: the plan with the member's current history of versions against the same plan
 * with `next` from today on. Same profile, same log, same baselines; only the rule set differs. Past days are not in it.
 */
export function previewPlanUpdate(p: Profile, opts: PlanOptions & { today: string }, eras: RuleEra[], next: RuleSet, days = 28): PlanDiff {
  const today = opts.today;
  const until = addDays(today, days);
  const cur = generateVersionedSeason(p, opts, eras);
  const nxt = generateVersionedSeason(p, opts, [...eras.filter((e) => e.from < today), { from: today, ruleSet: next }]);
  const nByDate = new Map(nxt.flatMap((w) => w.sessions.map((s) => [s.date, s] as const)));
  const weeks: WeekDiff[] = [];
  for (const w of cur) {
    const inRange = w.sessions.filter((s) => s.date >= today && s.date < until);
    if (!inRange.length) continue;
    const days: DayDiff[] = [];
    let km = 0;
    const types: Partial<Record<DayType, number>> = {};
    for (const s of inRange) {
      const b = brief(s);
      const a = brief(nByDate.get(s.date));
      const fields = fieldsOf(b, a);
      km += (a?.km ?? 0) - (b?.km ?? 0);
      if (b && a && b.type !== a.type) {
        types[b.type as DayType] = (types[b.type as DayType] ?? 0) - 1;
        types[a.type as DayType] = (types[a.type as DayType] ?? 0) + 1;
      }
      if (fields.length) days.push({ date: s.date, before: b, after: a, fields });
    }
    if (days.length) weeks.push({ start: w.start, index: w.index, days, summary: { km: Math.round(km), types } });
  }
  return { from: today, to: until, weeks, changedDays: weeks.reduce((n, w) => n + w.days.length, 0), forecast: forecastDiff(p, opts, eras, next) };
}

function forecastDiff(p: Profile, opts: PlanOptions & { today: string }, eras: RuleEra[], next: RuleSet): ForecastDiff | null {
  const base: BaselineTable = opts.baselines ?? DEFAULT_BASELINES;
  const curSet = eras.length ? [...eras].sort((a, b) => a.from.localeCompare(b.from))[eras.length - 1].ruleSet : ruleSet(1);
  const f = (rs: RuleSet) => withAdminRules(rs, opts.rules).forecast;
  const a = raceModel(p, opts.today, base, f(curSet));
  const b = raceModel(p, opts.today, base, f(next));
  const chance = (m: typeof a) => goalChance(m.current.finishSec, m.projected.finishSec, p.goalSec, { adherence: p.adherence, execution: p.execution });
  if (a.projected.finishSec === b.projected.finishSec && chance(a) === chance(b)) return null;
  return { beforeSec: a.projected.finishSec, afterSec: b.projected.finishSec, chanceBefore: chance(a), chanceAfter: chance(b) };
}

/** The future part of a plan, compact enough to store with a version (no long descriptions). */
export interface PlanSnapshotDay {
  date: string;
  type: Session['type'];
  title: string;
  km: number | null;
  paceSec: number | null;
  hrCap: number | null;
}
export function snapshotOf(weeks: Week[], today: string): PlanSnapshotDay[] {
  return weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.date >= today)
    .map((s) => ({ date: s.date, type: s.type, title: s.title, km: s.km ?? null, paceSec: s.targetPaceSec ?? null, hrCap: s.hrCap ?? null }));
}
