import type { CoachingRules, Phase } from '../types';

/** One threshold-session recipe: n × d metres at (threshold pace + off seconds), rest in seconds. */
export interface Rx {
  n: number;
  d: number;
  off: number;
  rest: number;
}

/**
 * Everything in the engine that research can change. A rule set is a versioned snapshot of these values; the
 * plan of a member is always generated with the version that member has pinned (see ./index.ts).
 * Extends CoachingRules, the seven values an admin can still tune in Admin → Regels.
 */
export interface ForecastParams {
  /** share of the expected aerobic improvement at 1, 2 and 3 training days a week (4+ = 1) */
  freqAerobic: Record<'1' | '2' | '3', number>;
  /** the same at 2 days a week for an athlete who is already fit */
  freqAerobicFit2: number;
  /** share of the expected station improvement at 1, 2 and 3 training days a week */
  freqStation: Record<'1' | '2' | '3', number>;
  /** share of the expected aerobic gain that is left with a current or a recent running injury */
  injuryGain: { now: number; recent: number };
  /** cap on the station improvement per star rating (<=2, 3, >=4) and its weekly rate */
  stationGain: { capLow: number; capMid: number; capHigh: number; perWeek: number };
}

export interface RuleParams extends CoachingRules {
  /** inputs of the race forecast that depend on research */
  forecast: ForecastParams;
  /** heart-rate zones as a fraction of LTHR (Friel) and the caps used in session texts */
  zones: { z1CapPct: number; z2CapPct: number; defs: { id: string; lo: number; hi: number | null }[] };
  /** threshold sessions per phase and step, the deload week and the race week */
  threshold: { table: Record<Exclude<Phase, 'recovery'>, Rx[]>; deload: Rx; raceWeek: Rx };
  /** weekly running volume: ceiling vs. the start volume, how fast it builds, deload and taper weeks */
  volume: { peakFactor: number; peakFactorStrength: number; rampShare: number; deloadFactor: number; taperFactor: number; raceWeekFactor: number };
  /** long run: cap in km, share of the week's volume, reduction in a week with a race-size sim */
  longRun: { maxKmMan: number; maxKmWoman: number; weekShare: number; heavySimFactor: number };
  /** sim pace in s/km relative to the current run pace (base, threshold phase) or race pace (early compromised) */
  sim: { baseOffsetSec: number; thresholdOffsetSec: number; compromisedEarlyOffsetSec: number };
  /** taper timing: days before the race for the last big sim and the last heavy strength day; race week length */
  taper: { lastSimDays: number; lastStrengthDays: number; raceWeekDays: number };
}
