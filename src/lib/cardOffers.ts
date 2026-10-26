// When the app offers a shareable card, and what goes on it. Pure functions, so every rule can be tested.
import {
  addDays,
  calibrationOf,
  currentProfile,
  daysBetween,
  mondayOf,
  raceModel,
  replay,
  type BaselineTable,
  type BenchmarkEffect,
  type BenchmarkEntry,
  type Calibration,
  type Profile,
  type RaceModel,
} from '../engine';
import { toAthlete, type ProfileRow } from '../data/mapping';
import type { CardData, CardType } from './cards';

/** What the offer dialog needs: the card type, its numbers and the numbers for the offer texts. */
export interface OfferSpec {
  type: CardType;
  /** Card numbers; the server adds the nickname and the division. */
  data: Omit<CardData, 'nickname' | 'division'>;
  /** Whole weeks between this and the previous benchmark, for the caption "four weeks ago". */
  weeksAgo?: number;
  /** Stored in `seen` once the offer was shown, so it does not come back. */
  seenKey?: { pred?: true; prog?: string; pr?: string };
}

export interface SeenOffers {
  pred?: string;
  prog?: string;
  pr?: string[];
}
export const seenKey = (uid: string) => `rox:cards:${uid}`;
export function readSeen(uid: string): SeenOffers {
  try {
    return JSON.parse(localStorage.getItem(seenKey(uid)) ?? '{}') as SeenOffers;
  } catch {
    return {};
  }
}
export function markSeen(uid: string, patch: SeenOffers) {
  try {
    const cur = readSeen(uid);
    localStorage.setItem(seenKey(uid), JSON.stringify({ ...cur, ...patch, pr: [...(cur.pr ?? []), ...(patch.pr ?? [])] }));
  } catch {
    /* storage blocked: the offer may show again, which is harmless */
  }
}

const withCalibration = (p: Profile, c: Calibration): Profile => ({
  ...p,
  athlete: { ...p.athlete, thresholdPaceSec: c.thresholdPaceSec, lthr: c.lthr, vo2max: c.vo2max, compromisedRatio: c.compromisedRatio, stationTimes: c.stationTimes },
});

/** The numbers of a race prediction card. */
export function predictionData(p: Profile, m: RaceModel, lang: string): OfferSpec['data'] {
  return {
    v: 1,
    lang,
    time: m.projected.finishSec,
    goal: p.goalSec,
    chance: m.chance,
    runs: m.projected.runTotalSec,
    stations: m.projected.stationTotalSec,
    roxzone: m.projected.roxzoneSec,
    race: p.raceName ? p.raceName.slice(0, 40) : undefined,
    weeks: m.weeksLeft,
  };
}

/** Whole plan weeks from the plan start to a date: week 1 is the plan start week. */
export const planWeek = (planStart: string, date: string) => Math.max(1, Math.floor(daysBetween(mondayOf(planStart), date) / 7) + 1);

/**
 * A benchmark counts as a personal record when it made the threshold pace faster. The card shows the threshold pace
 * before and after, and the prediction and chance with the old and the new pace.
 */
export function benchmarkPr(args: {
  full: Profile;
  effect: Pick<BenchmarkEffect, 'before' | 'after'>;
  n: number;
  date: string;
  today: string;
  lang: string;
  base?: BaselineTable;
  previousDate?: string | null;
}): OfferSpec | null {
  const { before, after } = args.effect;
  if (!(after.thresholdPaceSec < before.thresholdPaceSec)) return null;
  const cur = currentProfile(args.full, args.today);
  const model = (pace: number) => raceModel({ ...cur, athlete: { ...cur.athlete, thresholdPaceSec: pace } }, args.today, args.base);
  const mOld = model(before.thresholdPaceSec);
  const mNew = model(after.thresholdPaceSec);
  return {
    type: 'benchmark_pr',
    data: {
      v: 1,
      lang: args.lang,
      n: args.n,
      week: planWeek(args.full.planStart, args.date),
      old: before.thresholdPaceSec,
      new: after.thresholdPaceSec,
      time: mNew.projected.finishSec,
      goal: cur.goalSec,
      chance_old: mOld.chance,
      chance_new: mNew.chance,
    },
    weeksAgo: args.previousDate ? daysBetween(args.previousDate, args.date) / 7 : undefined,
  };
}

/**
 * Predicted finish per plan week since week 1: each week uses the calibration as it was that week (the intake baseline
 * plus the benchmarks up to then) and the weeks that were left. The last point is the live prediction.
 */
export function predictionSeries(args: { full: Profile; baseline: Calibration; benchmarks: BenchmarkEntry[]; today: string; liveFinishSec?: number; base?: BaselineTable }): number[] {
  const start = mondayOf(args.full.planStart);
  const weeks = Math.min(60, Math.floor(daysBetween(start, args.today) / 7) + 1);
  const out: number[] = [];
  for (let k = 0; k < weeks; k++) {
    const d = addDays(start, k * 7);
    const cal = replay(args.baseline, args.benchmarks.filter((b) => b.date <= d));
    out.push(raceModel(withCalibration(currentProfile(args.full, d), cal), d, args.base).projected.finishSec);
  }
  if (out.length && args.liveFinishSec) out[out.length - 1] = args.liveFinishSec;
  return out;
}

/** The "progress since the start" card, or null when there are fewer than two measurement points or no gain. */
export function progressOffer(args: { full: Profile; row: ProfileRow; benchmarks: BenchmarkEntry[]; today: string; lang: string; liveFinishSec: number; base?: BaselineTable }): OfferSpec | null {
  const baseline = (args.row.baseline as Calibration | null) ?? calibrationOf(toAthlete(args.row));
  const series = predictionSeries({ full: args.full, baseline, benchmarks: args.benchmarks, today: args.today, liveFinishSec: args.liveFinishSec, base: args.base });
  if (series.length < 2) return null;
  const start = series[0];
  const time = series[series.length - 1];
  if (start - time < 5) return null;
  const week = series.length;
  const cur = currentProfile(args.full, args.today);
  const total = Math.max(week, Math.floor(daysBetween(mondayOf(args.full.planStart), cur.raceDate) / 7) + 1);
  return { type: 'progress', data: { v: 1, lang: args.lang, week, total, start, time, goal: cur.goalSec, series } };
}

/** Offer a progress card every 4 weeks, from week 5 on. */
export function progressDue(args: { planStart: string; today: string; seen: SeenOffers }): boolean {
  if (daysBetween(mondayOf(args.planStart), args.today) < 28) return false;
  return !args.seen.prog || daysBetween(args.seen.prog, args.today) >= 28;
}

/** The first-prediction offer is for people who just did the intake, not for existing accounts. */
export function predictionDue(args: { createdAt: string; today: string; seen: SeenOffers }): boolean {
  return !args.seen.pred && daysBetween(args.createdAt.slice(0, 10), args.today) <= 7;
}
