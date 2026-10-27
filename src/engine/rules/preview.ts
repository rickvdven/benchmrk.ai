import type { PlanOptions } from '../plan';
import { effectiveThreshold, raceModel, type RaceModel } from '../raceModel';
import { currentProfile } from '../season';
import { sessionLoad } from '../extra';
import { addDays, mondayOf } from '../time';
import type { DayType, Profile, Session, Week } from '../types';
import { ruleSet } from './index';
import { freezeLogged, seasonWithPins, type LoggedDay, type RulePin } from './history';
import type { RuleSet } from './types';

/** What can differ between two versions of a day. */
export type DiffField = 'type' | 'title' | 'km' | 'pace' | 'hr' | 'rpe' | 'stations' | 'load' | 'description';

export interface DayDiff {
  date: string;
  before: Session | null;
  after: Session | null;
  /** fields that differ; empty = the day stays as it is */
  fields: DiffField[];
  /** logged / frozen days never change */
  frozen: boolean;
}

export interface WeekDiff {
  start: string;
  days: DayDiff[];
  changed: number;
  kmBefore: number;
  kmAfter: number;
  loadBefore: number;
  loadAfter: number;
  /** sessions per type after minus before (only types that differ) */
  typeDelta: Partial<Record<DayType | 'race', number>>;
}

export interface PlanPreview {
  fromVersion: number;
  toVersion: number;
  today: string;
  weeks: WeekDiff[];
  changedDays: number;
  model: { before: RaceModel; after: RaceModel };
  /** finish forecast or chance differs */
  forecastChanged: boolean;
}

export interface PreviewInput {
  /** full profile (all races) */
  profile: Profile;
  /** plan options as used for the member's own plan (rules, baselines, flare, places …) */
  opts: PlanOptions;
  /** the member's rule-set history; the last pin is the current version */
  pins: RulePin[];
  /** session_entries by date: logged days stay as they were */
  log?: Record<string, LoggedDay>;
  toVersion: number;
  today: string;
  days?: number;
  /** profile used for the forecast (current race, adherence, execution); defaults to currentProfile(profile, today) */
  forecast?: Profile;
  /** rule set per version (tests and admin previews of versions that are not in VERSIONS yet) */
  resolve?: (v: number) => RuleSet;
}

const km = (s: Session | null) => s?.km ?? 0;
const sameList = (a?: unknown[], b?: unknown[]) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

export function diffDay(a: Session | null, b: Session | null, T: number): DiffField[] {
  if (!a || !b) return a === b ? [] : ['type'];
  const out: DiffField[] = [];
  if (a.type !== b.type) out.push('type');
  if (a.title !== b.title) out.push('title');
  if (km(a) !== km(b)) out.push('km');
  if ((a.targetPaceSec ?? null) !== (b.targetPaceSec ?? null) || (a.targetPaceMaxSec ?? null) !== (b.targetPaceMaxSec ?? null)) out.push('pace');
  if ((a.hrCap ?? null) !== (b.hrCap ?? null)) out.push('hr');
  if ((a.rpe ?? null) !== (b.rpe ?? null)) out.push('rpe');
  if (!sameList(a.focusStations, b.focusStations)) out.push('stations');
  if (Math.round(sessionLoad(a, T)) !== Math.round(sessionLoad(b, T))) out.push('load');
  if ((a.description ?? '') !== (b.description ?? '') || (a.benchmark ?? null) !== (b.benchmark ?? null)) out.push('description');
  return out;
}

/**
 * Before/after of a plan update (or rollback) for one member: the plan from today with the current pins and with
 * `toVersion` pinned from today, same profile, log and options. Days before today and logged days never change.
 */
export function previewPlanUpdate(x: PreviewInput): PlanPreview {
  const resolve = x.resolve ?? ruleSet;
  const days = x.days ?? 28;
  const fromVersion = x.pins.length ? x.pins[x.pins.length - 1].version : 1;
  const pinsAfter: RulePin[] = [...x.pins, { from: x.today, version: x.toVersion }];
  const log = x.log ?? {};
  const before = freezeLogged(seasonWithPins(x.profile, x.opts, x.pins, resolve), log);
  const after = freezeLogged(seasonWithPins(x.profile, x.opts, pinsAfter, resolve), log);
  const flat = (w: Week[]) => new Map(w.flatMap((wk) => wk.sessions.map((s) => [s.date, s] as const)));
  const b = flat(before);
  const a = flat(after);
  const T = effectiveThreshold(x.profile);
  const end = addDays(x.today, days);

  const weeks: WeekDiff[] = [];
  for (let d = x.today; d < end; d = addDays(d, 1)) {
    const start = mondayOf(d);
    let wk = weeks[weeks.length - 1];
    if (!wk || wk.start !== start) {
      wk = { start, days: [], changed: 0, kmBefore: 0, kmAfter: 0, loadBefore: 0, loadAfter: 0, typeDelta: {} };
      weeks.push(wk);
    }
    const sb = b.get(d) ?? null;
    const sa = a.get(d) ?? null;
    const frozen = !!log[d]?.planned && (log[d].completed || !!(log[d].planned as { extra?: boolean }).extra || !!(log[d].planned as { alt?: boolean }).alt);
    const fields = frozen ? [] : diffDay(sb, sa, T);
    const shownAfter = frozen ? sb : sa;
    wk.days.push({ date: d, before: sb, after: shownAfter, fields, frozen });
    if (fields.length) wk.changed++;
    wk.kmBefore += km(sb);
    wk.kmAfter += km(shownAfter);
    wk.loadBefore += sb ? sessionLoad(sb, T) : 0;
    wk.loadAfter += shownAfter ? sessionLoad(shownAfter, T) : 0;
    if (sb?.type !== shownAfter?.type) {
      if (sb) wk.typeDelta[sb.type] = (wk.typeDelta[sb.type] ?? 0) - 1;
      if (shownAfter) wk.typeDelta[shownAfter.type] = (wk.typeDelta[shownAfter.type] ?? 0) + 1;
    }
  }
  for (const w of weeks) {
    w.loadBefore = Math.round(w.loadBefore);
    w.loadAfter = Math.round(w.loadAfter);
    for (const k of Object.keys(w.typeDelta) as (keyof WeekDiff['typeDelta'])[]) if (!w.typeDelta[k]) delete w.typeDelta[k];
  }

  const fp = x.forecast ?? currentProfile(x.profile, x.today);
  const mb = raceModel({ ...fp, ruleSet: resolve(fromVersion) }, x.today, x.opts.baselines);
  const ma = raceModel({ ...fp, ruleSet: resolve(x.toVersion) }, x.today, x.opts.baselines);
  return {
    fromVersion,
    toVersion: x.toVersion,
    today: x.today,
    weeks,
    changedDays: weeks.reduce((n, w) => n + w.changed, 0),
    model: { before: mb, after: ma },
    forecastChanged: mb.projected.finishSec !== ma.projected.finishSec || mb.chance !== ma.chance,
  };
}
