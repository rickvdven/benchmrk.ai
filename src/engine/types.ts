export type Lang = 'en' | 'nl' | 'de' | 'es' | 'ko';
export type Sex = 'woman' | 'man';
export type Format = 'solo' | 'doubles' | 'relay';
export type Level = 'open' | 'pro';
/** e.g. solo_open, solo_pro, doubles_open, doubles_pro, doubles_mixed, relay_open */
export type Category =
  | 'solo_open'
  | 'solo_pro'
  | 'doubles_open'
  | 'doubles_pro'
  | 'doubles_mixed'
  | 'relay_open';
export type Archetype = 'fast_runner' | 'hybrid' | 'diesel' | 'strength';

export const STATIONS = [
  'skierg',
  'sledPush',
  'sledPull',
  'burpees',
  'row',
  'farmers',
  'lunges',
  'wallballs',
] as const;
export type Station = (typeof STATIONS)[number];
export type StationMap<T> = Record<Station, T>;

export type DayType =
  | 'threshold'
  | 'intervals'
  | 'easy'
  | 'long'
  | 'sim'
  | 'strength'
  | 'wod'
  | 'recovery'
  | 'rest'
  /** "coach decides": the athlete can train, Benchmrk picks the session */
  | 'auto';

export interface Flags {
  achilles: boolean;
  quad: boolean;
  back: boolean;
  shin: boolean;
  /** detailed injury map (area -> now | recent | past); legacy booleans above stay in sync */
  injuries?: Partial<Record<'achilles' | 'plantar' | 'shin' | 'knee' | 'hamstring' | 'hip' | 'back' | 'shoulder' | 'wrist', 'now' | 'recent' | 'past'>>;
  /** date (YYYY-MM-DD) an area became a current injury */
  injurySince?: Partial<Record<string, string>>;
  /** date the athlete passed the return test (walk-run progression starts here) */
  returnSince?: string | null;
  note?: string;
}

export interface Athlete {
  name: string;
  sex: Sex;
  birthYear?: number | null;
  weightKg?: number | null;
  lthr: number;
  maxHr: number;
  restHr?: number | null;
  thresholdPaceSec: number;
  vo2max?: number | null;
  pr5kSec?: number | null;
  weeklyKm?: number | null;
  archetype: Archetype;
  flags: Flags;
  stationStars: StationMap<number>;
  /** best known station times in seconds (from intake PRs or benchmarks) */
  stationTimes: Partial<StationMap<number>>;
  /** personal compromised ratio (clean threshold speed -> race run speed), from benchmarks */
  compromisedRatio?: number | null;
}

export interface Profile {
  athlete: Athlete;
  category: Category;
  raceName: string;
  raceDate: string; // YYYY-MM-DD
  goalSec: number;
  /** Monday the plan started (YYYY-MM-DD). Fixed at onboarding so history stays stable. */
  planStart: string;
  /** 7 entries, Monday..Sunday */
  weekSchedule: DayType[];
  /** seconds/km added to threshold by the adaptive loop (negative = faster) */
  paceAdjustSec?: number;
  /** where the athlete trains — drives station substitutions in sims and strength */
  equipment?: 'hyrox' | 'gym' | 'home';
  /** the gym's own sim build-up (null = Benchmrk default) */
  simProtocol?: import('./simProtocol').SimProtocol | null;
  /** other races in the season; the main race above is always an A race */
  season?: RaceEvent[];
  /** places where the athlete trains, and the default place per weekday (Mon..Sun, place id or null) */
  places?: import('./places').Place[];
  placeByDow?: (string | null)[];
  /** runtime only: share of planned sessions done (0–1), from the log */
  adherence?: number | null;
  /** runtime only: key sessions logged against their target pace */
  execution?: Execution | null;
  /** runtime only: the member's pinned rule set (src/engine/rules); missing = v1 */
  ruleSet?: import('./rules/types').RuleSet;
}

/** Key sessions (threshold, intervals, sim, long) with pace logged vs. the target of the plan. */
export interface Execution {
  n: number;
  hit: number; // at or faster than target
  miss: number; // more than 5 s/km slower
}

/** A = goal race (full build + taper), B = important (mini-taper), C = training race (counts as a hard sim). */
export type RacePriority = 'A' | 'B' | 'C';
export interface RaceEvent {
  id: string;
  name: string;
  date: string;
  goalSec: number | null;
  priority: RacePriority;
  /** division for this race; defaults to the profile's division */
  category?: Category;
  /** doubles team for this race (teams.id) */
  teamId?: string | null;
}

export interface CoachingRules {
  thresholdCapPctLthr: number; // 1.0
  achillesStiffnessCeiling: number; // morning score >= this triggers guard
  maxWeeklyVolumeIncrease: number; // 0.1
  skiShiftM: number;
  sledShiftM: number;
  wallBallSet: number;
  eliteMaxDecaySec: number;
}

export const DEFAULT_RULES: CoachingRules = {
  thresholdCapPctLthr: 1.0,
  achillesStiffnessCeiling: 4,
  maxWeeklyVolumeIncrease: 0.1,
  skiShiftM: 125,
  sledShiftM: 12.5,
  wallBallSet: 10,
  eliteMaxDecaySec: 12,
};

export interface Session {
  id: string; // date
  date: string;
  dow: number; // 0 = Monday
  type: DayType | 'race';
  title: string;
  description: string;
  targetPaceSec?: number | null;
  targetPaceMaxSec?: number | null;
  hrCap?: number | null;
  rpe?: string | null;
  warmup?: string;
  benchmark?: 1 | 2 | 3 | 4 | 5 | null;
  benchmarkText?: string;
  guard?: boolean;
  deload?: boolean;
  tip?: string;
  focusStations?: Station[];
  /** injury mode: running replaced by cross-training */
  cross?: boolean;
  /** where this session is done (place name) and whether it was chosen for this day only */
  placeName?: string;
  placeChosen?: boolean;
  /** knowledge-base source for this session (title prefix), e.g. 'Bosquet' for taper sessions */
  sourceKey?: string;
  km?: number;
  sharedTeamDay?: boolean;
  /** added by the athlete on a rest/recovery day */
  extra?: boolean;
  /** extra session focus */
  extraFocus?: 'cardio' | 'strength' | 'mobility';
  /** replaces the planned session (e.g. gym closed) */
  alt?: boolean;
  /** title of the session it replaces */
  altOf?: string;
}

export type Phase = 'base' | 'threshold' | 'compromised' | 'peak' | 'taper' | 'prep' | 'recovery';

export interface Week {
  index: number; // 1-based
  start: string;
  phase: Phase;
  phaseWeek: number; // 1-based within phase
  phaseLen: number;
  deload: boolean;
  sessions: Session[];
}

export interface BenchmarkEntry {
  id: string;
  number: 1 | 2 | 3 | 4 | 5;
  date: string;
  paceSec: number;
  avgHr: number;
  rpe?: number;
  newLtPaceSec?: number | null;
  newLthr?: number | null;
  newVo2?: number | null;
  stationSplits?: Partial<StationMap<number>>;
  runSplits?: number[];
}
