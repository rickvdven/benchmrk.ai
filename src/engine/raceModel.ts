import { daysBetween } from './time';
import type { Athlete, Category, Profile, Sex, Station, StationMap, Execution } from './types';
import { STATIONS } from './types';
import { injuryProfile } from './injury';
import { rulesOf, V1, type RuleSet } from './rules';

export const isDoubles = (c: Category) => c.startsWith('doubles');
export const isPro = (c: Category) => c.endsWith('_pro');
export const isRelay = (c: Category) => c.startsWith('relay');

/** Station weights per division (sled weights include the sled). Source: HYROX rulebook as summarised by Red Bull. */
export function stationWeights(category: Category, sex: Sex) {
  const pro = isPro(category);
  const heavy = (sex === 'man' && !pro) || (sex === 'woman' && pro);
  if (sex === 'man' && pro) return { sledPush: 202, sledPull: 153, farmers: 32, lunges: 30, wallball: 9 };
  if (category === 'doubles_mixed') return { sledPush: 152, sledPull: 103, farmers: 24, lunges: 20, wallball: 6 };
  if (heavy) return { sledPush: 152, sledPull: 103, farmers: 24, lunges: 20, wallball: 6 };
  return { sledPush: 102, sledPull: 78, farmers: 16, lunges: 10, wallball: 4 };
}

/** Mid-pack ("3 stars") solo station times in seconds per weight class. Editable by admin (station_baselines). */
export type BaselineTable = Record<'light' | 'medium' | 'heavy', StationMap<number>>;
export const DEFAULT_BASELINES: BaselineTable = {
  // open women
  light: { skierg: 300, sledPush: 200, sledPull: 280, burpees: 340, row: 300, farmers: 115, lunges: 280, wallballs: 390 },
  // open men / pro women / mixed
  medium: { skierg: 270, sledPush: 180, sledPull: 255, burpees: 300, row: 280, farmers: 100, lunges: 255, wallballs: 330 },
  // pro men
  heavy: { skierg: 270, sledPush: 235, sledPull: 310, burpees: 300, row: 280, farmers: 110, lunges: 300, wallballs: 380 },
};

export function weightClass(category: Category, sex: Sex): 'light' | 'medium' | 'heavy' {
  const w = stationWeights(category, sex);
  return w.sledPush >= 202 ? 'heavy' : w.sledPush >= 152 ? 'medium' : 'light';
}

/** Factor applied to the mid-pack baseline for a 1–5 star self rating. */
export const STAR_FACTOR: Record<number, number> = V1.prediction.starFactor;

export const DOUBLES_STATION_FACTOR = V1.prediction.doublesStationFactor; // alternating work: each segment done fresher
export const DOUBLES_RUN_RATIO = V1.pace.compromisedRatioTeam;

export function soloStationTime(a: Athlete, category: Category, s: Station, base: BaselineTable = DEFAULT_BASELINES, rs: RuleSet = V1) {
  const known = a.stationTimes?.[s];
  if (known && known > 0) return known;
  const cls = weightClass(category, a.sex);
  const b = base[cls][s];
  // women lifting the "medium" class (Pro women, mixed doubles) are slower than the men the baseline describes
  const sexFactor = a.sex === 'woman' && cls !== 'light' ? rs.prediction.womanMediumFactor : 1;
  return Math.round(b * sexFactor * (rs.prediction.starFactor[a.stationStars?.[s] ?? 3] ?? 1));
}

/** Clean threshold speed -> race run speed ratio. Personal value from benchmarks wins. */
export function compromisedRatio(a: Athlete, category: Category, rs: RuleSet = V1) {
  if (a.compromisedRatio && a.compromisedRatio > 0.75 && a.compromisedRatio < 1) {
    return isDoubles(category) ? Math.min(0.97, a.compromisedRatio + 0.06) : a.compromisedRatio;
  }
  let r = isDoubles(category) || isRelay(category) ? rs.pace.compromisedRatioTeam : rs.pace.compromisedRatioSolo;
  if (a.archetype === 'fast_runner') r -= 0.01; // loses more after heavy stations
  if (a.archetype === 'diesel') r += 0.01;
  if (a.archetype === 'strength') r += 0.015; // stations cost them less, so runs suffer less after them
  if (isPro(category)) r -= 0.01;
  return r;
}

/** Total Roxzone (8 transitions + lap overhead) in seconds, scaled with fitness. */
export function roxzoneBudget(thresholdPaceSec: number, category: Category) {
  const solo = Math.max(200, Math.min(600, 200 + (thresholdPaceSec - 220) * 2.2));
  return Math.round(isDoubles(category) ? solo * 1.1 : solo);
}

/** Expected threshold gain in s/km over the remaining weeks: diminishing, lower for faster athletes, capped. */
export function thresholdGain(thresholdPaceSec: number, weeks: number) {
  const w = Math.max(0, Math.min(weeks, 24));
  const g0 = thresholdPaceSec >= 330 ? 0.9 : thresholdPaceSec >= 285 ? 0.7 : thresholdPaceSec >= 240 ? 0.5 : 0.35;
  const cap = thresholdPaceSec >= 285 ? 15 : thresholdPaceSec >= 240 ? 10 : 6;
  return Math.min(cap, g0 * w * (1 - w / 60));
}

export function stationGainPct(stars: number, weeks: number) {
  const cap = stars <= 2 ? 0.1 : stars === 3 ? 0.06 : 0.03;
  return Math.min(cap, 0.006 * Math.max(0, weeks));
}


/** Probability (2–98%) that the athlete finishes at or under goal, given the projected time. */
/**
 * Chance to hit the goal on a normal race day (Roxzone included) if you train as planned.
 * Not a race-day lottery: the question is whether the improvement you need fits what this plan can realistically
 * produce in the weeks left. needed ≤ expected gain → ~90–97 %; needing far more than the plan can deliver → low.
 * The log then moves it: skipped sessions shrink the expected gain, hitting (or missing) the target paces of the
 * key sessions pushes the chance up (or down).
 */
export const RACE_DAY_MARGIN_SEC = V1.prediction.raceDayMarginSec;
export function goalChance(currentSec: number, projectedSec: number, goalSec: number, o: { adherence?: number | null; execution?: Execution | null; marginSec?: number } = {}) {
  const adherence = o.adherence == null ? 1 : Math.max(0.4, Math.min(1, o.adherence / 0.9));
  const expected = Math.max(0, currentSec - projectedSec) * adherence;
  const needed = currentSec - goalSec;
  const r = needed <= 0 ? 0 : needed / (expected + (o.marginSec ?? RACE_DAY_MARGIN_SEC));
  let c = 97 / (1 + Math.exp(4.5 * (r - 1.6)));
  const e = o.execution;
  if (e && e.n >= 2) {
    const w = Math.min(1, e.n / 6);
    // proof from training lifts a realistic goal towards ~93 %, but can't make a physiologically huge gap small
    const ceiling = c + (93 - c) * Math.max(0, Math.min(1, (2.5 - r) / 0.9));
    c += w * ((e.hit / e.n) * Math.max(0, ceiling - c) - (e.miss / e.n) * 0.5 * c);
  }
  return Math.round(Math.max(2, Math.min(97, c)));
}

/** @deprecated kept for callers that only know a projected time: assumes no expected gain beyond it. */
export function successChance(projectedSec: number, goalSec: number) {
  return goalChance(projectedSec, projectedSec, goalSec);
}

export type Status = 'on_track' | 'realistic' | 'ambitious' | 'out_of_reach';
export const statusOf = (chance: number): Status =>
  chance >= 85 ? 'on_track' : chance >= 60 ? 'realistic' : chance >= 25 ? 'ambitious' : 'out_of_reach';
export const chanceTone = (c: number) => (c >= 85 ? 'text-good' : c >= 60 ? 'text-volt' : c >= 25 ? 'text-warn' : 'text-bad');

export interface RaceBreakdown {
  runPaceSec: number;
  runTotalSec: number;
  stations: StationMap<number>;
  stationTotalSec: number;
  roxzoneSec: number;
  finishSec: number;
}

export interface RaceModel {
  weeksLeft: number;
  current: RaceBreakdown;
  projected: RaceBreakdown;
  goalSec: number;
  requiredRunPaceSec: number;
  runGapSecPerKm: number; // + = slower than needed
  chance: number;
  status: Status;
  weakestStations: Station[];
}

function breakdown(a: Athlete, category: Category, thresholdSec: number, weeks: number, base: BaselineTable, gains: boolean, gainFactor = 1, rs: RuleSet = V1): RaceBreakdown {
  const doubles = isDoubles(category);
  const runPaceSec = Math.round(thresholdSec / compromisedRatio(a, category, rs));
  const stations = {} as StationMap<number>;
  for (const s of STATIONS) {
    let t = soloStationTime(a, category, s, base, rs);
    if (gains) t *= 1 - stationGainPct(a.stationStars?.[s] ?? 3, weeks) * gainFactor;
    if (doubles) t *= rs.prediction.doublesStationFactor;
    stations[s] = Math.round(t);
  }
  const stationTotalSec = STATIONS.reduce((n, s) => n + stations[s], 0);
  const roxzoneSec = roxzoneBudget(thresholdSec, category);
  const runTotalSec = runPaceSec * 8;
  return { runPaceSec, runTotalSec, stations, stationTotalSec, roxzoneSec, finishSec: runTotalSec + stationTotalSec + roxzoneSec };
}

export function weakestStations(a: Athlete, category: Category, base: BaselineTable = DEFAULT_BASELINES, n = 2, rs: RuleSet = V1): Station[] {
  const cls = weightClass(category, a.sex);
  return [...STATIONS]
    .map((s) => ({ s, r: soloStationTime(a, category, s, base, rs) / base[cls][s] }))
    .sort((x, y) => y.r - x.r)
    .slice(0, n)
    .map((x) => x.s);
}

/** Training days per week (rest and recovery not counted; "coach decides" counts). */
export function trainingDays(p: Profile) {
  return (p.weekSchedule ?? []).filter((d) => d !== 'rest' && d !== 'recovery').length;
}

/**
 * Share of the improvement expected at 4+ sessions/week (sessions keep their length, so fewer days = less volume).
 * Derived from: Montero & Lundby 2017 (responders 1–5 d/wk: 31/60/71/100/100 %), Lenk et al. 2025 (1× HIIT/wk ≈ +1 % VO2max
 * vs ~+7 % at 2–3×), Wenger & Bell 1986 (VO2max > 50 needs ≥ 3 d/wk), ACSM 1998 (< 2 d/wk not meaningful, plateau > 3),
 * Fox 1975 / Tripp 2025 (2 vs 4 d/wk similar when volume is matched). Stations: Grgic et al. 2018 effect sizes 0.74/0.82/0.93/1.08.
 * 1 day/week is the least studied → treat as extrapolation.
 */
export const FREQ_AEROBIC: Record<number, number> = V1.prediction.freqAerobic;
export const FREQ_AEROBIC_FIT2 = V1.prediction.freqAerobicFit2; // 2 d/wk for already fit athletes (VO2max > 50 / threshold < 4:00/km)
export const FREQ_STATION: Record<number, number> = V1.prediction.freqStation;

export function frequencyGainFactor(p: Profile): { aerobic: number; station: number } {
  if (!p.weekSchedule?.length) return { aerobic: 1, station: 1 };
  const n = trainingDays(p);
  if (n >= 4) return { aerobic: 1, station: 1 };
  if (n <= 0) return { aerobic: 0, station: 0 };
  const fit = (p.athlete.vo2max ?? 0) > 50 || p.athlete.thresholdPaceSec < 240;
  const f = rulesOf(p).prediction;
  return { aerobic: n === 2 && fit ? f.freqAerobicFit2 : f.freqAerobic[n], station: f.freqStation[n] };
}

export function injuryGainFactor(a: Athlete, rs: RuleSet = V1) {
  const r = injuryProfile(a.flags).runLoad;
  return r === 'now' ? rs.prediction.injuryGainNow : r === 'recent' ? rs.prediction.injuryGainRecent : 1;
}

export function effectiveThreshold(p: Profile) {
  return p.athlete.thresholdPaceSec + (p.paceAdjustSec ?? 0);
}

export function raceModel(p: Profile, today: string, base: BaselineTable = DEFAULT_BASELINES): RaceModel {
  const a = p.athlete;
  const rs = rulesOf(p);
  const T = effectiveThreshold(p);
  const weeksLeft = Math.max(0, Math.floor(daysBetween(today, p.raceDate) / 7));
  const current = breakdown(a, p.category, T, weeksLeft, base, false, 1, rs);
  // a current / recent running injury means less running → less aerobic gain by race day
  // fewer training days per week → less expected improvement
  const freq = frequencyGainFactor(p);
  const projected = breakdown(a, p.category, T - thresholdGain(T, weeksLeft) * injuryGainFactor(a, rs) * freq.aerobic, weeksLeft, base, true, freq.station, rs);
  const requiredRunPaceSec = Math.round((p.goalSec - projected.stationTotalSec - projected.roxzoneSec) / 8);
  const chance = goalChance(current.finishSec, projected.finishSec, p.goalSec, { adherence: p.adherence, execution: p.execution, marginSec: rs.prediction.raceDayMarginSec });
  return {
    weeksLeft,
    current,
    projected,
    goalSec: p.goalSec,
    requiredRunPaceSec,
    runGapSecPerKm: projected.runPaceSec - requiredRunPaceSec,
    chance,
    status: statusOf(chance),
    weakestStations: weakestStations(a, p.category, base, 2, rs),
  };
}

/** Race pace used for training targets: the goal run pace, but never more than 12 s/km (v1) faster than projected. */
export function trainingRacePace(m: RaceModel, rs: RuleSet = V1) {
  return Math.max(m.requiredRunPaceSec, m.projected.runPaceSec - rs.pace.raceVsProjectedMaxSec);
}
