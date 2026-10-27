import type { PlanOptions } from '../plan';
import { generateSeason } from '../season';
import type { Profile, Session, Week } from '../types';
import { ruleSet } from './index';
import type { RuleSet } from './types';

/** From `from` (YYYY-MM-DD, inclusive) on, the plan follows rule-set `version`. `from: null` = from the start of the plan. */
export interface RulePin {
  from: string | null;
  version: number;
}

/** Pins from the member's plan versions (oldest first). Without rows the profile's pinned version counts from the start. */
export function pinsOf(rows: { version_no: number; rule_set_version: number; effective_from: string | null }[] | null | undefined, pinned: number): RulePin[] {
  const sorted = [...(rows ?? [])].sort((a, b) => a.version_no - b.version_no);
  if (!sorted.length) return [{ from: null, version: pinned }];
  return sorted.map((r, i) => ({ from: i === 0 ? null : r.effective_from, version: r.rule_set_version }));
}

/** Rule-set version that governs a date: the last pin that starts on or before it. */
export function versionOn(pins: RulePin[], date: string): number {
  let v = pins[0]?.version ?? 1;
  for (const p of pins) if (p.from === null || p.from <= date) v = p.version;
  return v;
}

/** A logged day as stored in session_entries (only what the overlay needs). */
export interface LoggedDay {
  completed: boolean;
  planned: Record<string, unknown> | null;
}

/** Done, extra and replaced sessions show their frozen snapshot, so history is never rewritten. */
export function freezeLogged(weeks: Week[], byDate: Record<string, LoggedDay>): Week[] {
  return weeks.map((w) => ({
    ...w,
    sessions: w.sessions.map((s) => {
      const e = byDate[s.date];
      if (e?.planned && (e.completed || (e.planned as { extra?: boolean }).extra || (e.planned as { alt?: boolean }).alt))
        return { ...(e.planned as unknown as Session), id: s.id, date: s.date, dow: s.dow, frozen: !!e.completed } as Session & { frozen?: boolean };
      return s;
    }),
  }));
}

/**
 * The season plan when the member switched rule sets over time: each day follows the version that was pinned on that
 * date, so applying (or rolling back) an update only changes today and later. Weeks and phases follow the latest pin.
 */
export function seasonWithPins(p: Profile, opts: PlanOptions, pins: RulePin[], resolve: (v: number) => RuleSet = ruleSet): Week[] {
  const current = pins.length ? pins[pins.length - 1].version : (p.ruleSet?.version ?? 1);
  const plan = generateSeason({ ...p, ruleSet: resolve(current) }, opts);
  const others = [...new Set(pins.map((x) => x.version))].filter((v) => v !== current);
  if (!others.length) return plan;
  const byVersion = new Map<number, Map<string, Session>>();
  for (const v of others) {
    byVersion.set(v, new Map(generateSeason({ ...p, ruleSet: resolve(v) }, opts).flatMap((w) => w.sessions.map((s) => [s.date, s] as const))));
  }
  return plan.map((w) => ({
    ...w,
    sessions: w.sessions.map((s) => {
      const v = versionOn(pins, s.date);
      return v === current ? s : (byVersion.get(v)?.get(s.date) ?? s);
    }),
  }));
}

/** One day of a stored plan version (user_plan_versions.plan_snapshot): only what the history needs to show. */
export interface SnapshotDay {
  date: string;
  type: Session['type'];
  title: string;
  km?: number;
  pace?: number;
  hr?: number;
}

/** The future part of a plan (today and later), compact, for user_plan_versions.plan_snapshot. */
export function planSnapshot(weeks: Week[], today: string): SnapshotDay[] {
  return weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.date >= today)
    .map((s) => ({
      date: s.date,
      type: s.type,
      title: s.title,
      ...(s.km != null ? { km: s.km } : {}),
      ...(s.targetPaceSec != null ? { pace: s.targetPaceSec } : {}),
      ...(s.hrCap != null ? { hr: s.hrCap } : {}),
    }));
}
