import type { CoachingRules, Lang, Phase } from '../types';

/**
 * Every engine parameter that research can change, in one versioned object.
 * v1 (`v1.ts`) is the engine as it was before rule sets existed; a later version only lists what it changes.
 * Keys in changes are dotted paths into this object, e.g. `taper.volumeRaceWeek`.
 */
export interface RuleSet {
  version: number;
  /** Joe Friel run zones as fractions of LTHR */
  zones: {
    /** easy / long runs are capped at the top of Z2, recovery and shake-outs at the top of Z1 */
    table: { id: string; lo: number; hi: number | null }[];
  };
  /** run paces derived from the threshold pace (s/km) */
  pace: {
    easyFactor: number;
    longFactor: number;
    /** training race pace is never more than this many s/km faster than the projected race pace */
    raceVsProjectedMaxSec: number;
    /** clean threshold speed → race run speed */
    compromisedRatioSolo: number;
    compromisedRatioTeam: number;
  };
  /** weekly running volume and how it builds */
  volume: {
    /** starting km/week when the athlete gave none, by threshold pace (s/km): ≥ 330, ≥ 285, ≥ 240, faster */
    startKm: [number, number, number, number];
    /** share of the max weekly increase (coaching.maxWeeklyVolumeIncrease) used per week */
    rampShare: number;
    peakFactor: number;
    peakFactorStrength: number;
    deloadFactor: number;
    easyShare: number;
    longShare: number;
    longMinKm: number;
    longMaxKmWoman: number;
    longMaxKmMan: number;
    /** long run when a race-size protocol sim is in the same week */
    longHeavySimFactor: number;
  };
  /** sim build-up: run pace offsets per phase and distance */
  sim: {
    basePaceAddSec: number;
    thresholdPaceAddSec: number;
    compromisedEarlyAddSec: number;
    kmShort: number;
    kmCompromised: number;
    kmPeakFull: number;
  };
  /** compromised add-on at the end of a threshold run in weeks without a sim */
  compromised: {
    addonPhases: Phase[];
  };
  /** strength days in the taper */
  strength: {
    /** last heavy (half-volume) strength session at least this many days before the race; closer = light */
    lastHeavyMinDaysOut: number;
  };
  taper: {
    volumeWeek1: number;
    volumeRaceWeek: number;
    /** race-week easy run as share of the week volume */
    raceWeekEasyShare: number;
    /** sims, long runs and intervals within this many days of the race become easy runs */
    raceWeekEasyDays: number;
    /** last big sim at least this many days before the race */
    lastBigSimMinDaysOut: number;
  };
  /** tendon protection: slower ramp and lower ceiling with a running injury */
  tendon: {
    rampNow: number;
    rampRecent: number;
    peakCapNow: number;
    peakCapRecent: number;
  };
  returnToRun: {
    /** walk-run return lasts this many days after the return test */
    days: number;
    crossMinMinutes: number;
    crossMaxMinutes: number;
    crossThresholdReps: number;
    crossThresholdRepsTaper: number;
  };
  /** finish-time forecast and chance */
  prediction: {
    raceDayMarginSec: number;
    starFactor: Record<number, number>;
    womanMediumFactor: number;
    doublesStationFactor: number;
    injuryGainNow: number;
    injuryGainRecent: number;
    freqAerobic: Record<number, number>;
    freqAerobicFit2: number;
    freqStation: Record<number, number>;
  };
  /** the rules that were already admin-editable (table coaching_rules) */
  coaching: CoachingRules;
}

export type Localized = Record<Lang, string>;

/** One changed parameter in a rule-set version. */
export interface RuleChange {
  /** dotted path into RuleSet, e.g. 'taper.volumeRaceWeek' */
  key: string;
  before: unknown;
  after: unknown;
  /** knowledge_sources.slug (or a title prefix, like Session.sourceKey) */
  sourceIds: string[];
  why: Localized;
}

/** A rule-set version after v1: metadata plus only the differences with the version before it. */
export interface RuleSetVersion {
  version: number;
  date: string;
  title: Localized;
  changes: RuleChange[];
}
