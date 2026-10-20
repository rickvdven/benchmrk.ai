import {
  DEFAULT_BASELINES,
  DEFAULT_RULES,
  STATIONS,
  defaultSchedule,
  mondayOf,
  todayISO,
  type Athlete,
  type BaselineTable,
  type BenchmarkEntry,
  type Category,
  type CoachingRules,
  type DayType,
  type Profile,
  type RaceEvent,
  type SimProtocol,
  type StationMap,
} from '../engine';

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  onboarded: boolean;
  lang: import('../engine').Lang;
  units: 'metric' | 'imperial';
  sex: 'woman' | 'man' | null;
  birth_year: number | null;
  weight_kg: number | null;
  category: Category | null;
  race_name: string | null;
  race_date: string | null;
  race_tz: string | null;
  goal_sec: number | null;
  plan_start: string | null;
  archetype: Athlete['archetype'] | null;
  lthr: number | null;
  max_hr: number | null;
  rest_hr: number | null;
  threshold_pace_sec: number | null;
  vo2max: number | null;
  pr5k_sec: number | null;
  weekly_km: number | null;
  flags: Athlete['flags'];
  station_stars: StationMap<number>;
  station_times: Partial<StationMap<number>>;
  compromised_ratio: number | null;
  decay_sec: number | null;
  week_schedule: DayType[] | null;
  season?: RaceEvent[] | null;
  equipment?: 'hyrox' | 'gym' | 'home' | null;
  places?: import('../engine').Place[] | null;
  place_by_dow?: (string | null)[] | null;
  sim_protocol?: SimProtocol | null;
  disclaimer_accepted_at?: string | null;
  pace_adjust_sec: number;
  baseline: Record<string, unknown> | null;
  team_id: string | null;
  email_prefs?: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface EntryRow {
  id?: string;
  user_id: string;
  date: string;
  completed: boolean;
  planned: Record<string, unknown> | null;
  actual_pace_sec: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  rpe: number | null;
  notes: string | null;
  wod: { description?: string; work?: string; photo?: string | null } | null;
  notes_ai?: (import('../engine').NoteSignals & { hash?: string }) | null;
  place?: string | null;
  updated_at?: string;
}

export interface BenchmarkRow {
  id: string;
  user_id: string;
  number: 1 | 2 | 3 | 4 | 5;
  date: string;
  pace_sec: number;
  avg_hr: number;
  rpe: number | null;
  new_lt_pace_sec: number | null;
  new_lthr: number | null;
  new_vo2: number | null;
  station_splits: Partial<StationMap<number>> | null;
  run_splits: number[] | null;
  effect: Record<string, unknown> | null;
  created_at?: string;
}

export interface TeamRow {
  id: string;
  code: string;
  race_name: string | null;
  race_date: string | null;
  goal_sec: number | null;
  captain_id: string | null;
  athlete_1: string | null;
  athlete_2: string | null;
  shared_sim_dow: number | null;
}

export function isComplete(r: ProfileRow | null | undefined): r is ProfileRow {
  return !!r && r.onboarded && !!r.category && !!r.race_date && !!r.goal_sec && !!r.lthr && !!r.max_hr && !!r.threshold_pace_sec && !!r.sex;
}

export function toAthlete(r: ProfileRow): Athlete {
  return {
    name: r.display_name ?? '',
    sex: r.sex ?? 'man',
    birthYear: r.birth_year,
    weightKg: r.weight_kg,
    lthr: r.lthr ?? 170,
    maxHr: r.max_hr ?? 190,
    restHr: r.rest_hr,
    thresholdPaceSec: r.threshold_pace_sec ?? 300,
    vo2max: r.vo2max,
    pr5kSec: r.pr5k_sec,
    weeklyKm: r.weekly_km,
    archetype: r.archetype ?? 'hybrid',
    flags: r.flags ?? { achilles: false, quad: false, back: false, shin: false },
    stationStars: { ...Object.fromEntries(STATIONS.map((s) => [s, 3])), ...(r.station_stars ?? {}) } as StationMap<number>,
    stationTimes: r.station_times ?? {},
    compromisedRatio: r.compromised_ratio,
  };
}

export function toProfile(r: ProfileRow): Profile {
  return {
    athlete: toAthlete(r),
    category: r.category ?? 'solo_open',
    raceName: r.race_name ?? 'HYROX',
    raceDate: r.race_date ?? todayISO(),
    goalSec: r.goal_sec ?? 5400,
    planStart: r.plan_start ?? mondayOf(todayISO()),
    weekSchedule: r.week_schedule?.length === 7 ? r.week_schedule : defaultSchedule(5),
    paceAdjustSec: r.pace_adjust_sec ?? 0,
    season: Array.isArray(r.season) ? r.season : [],
    equipment: r.equipment ?? 'gym',
    places: Array.isArray(r.places) ? r.places : [],
    placeByDow: Array.isArray(r.place_by_dow) ? r.place_by_dow : [],
    simProtocol: r.sim_protocol ?? null,
  };
}

export function toBenchmark(b: BenchmarkRow): BenchmarkEntry {
  return {
    id: b.id,
    number: b.number,
    date: b.date,
    paceSec: b.pace_sec,
    avgHr: b.avg_hr,
    rpe: b.rpe ?? undefined,
    newLtPaceSec: b.new_lt_pace_sec,
    newLthr: b.new_lthr,
    newVo2: b.new_vo2,
    stationSplits: b.station_splits ?? undefined,
    runSplits: b.run_splits ?? undefined,
  };
}

export function rulesFrom(rows: { rule_key: string; value: number }[] | undefined): CoachingRules {
  const m = Object.fromEntries((rows ?? []).map((r) => [r.rule_key, Number(r.value)]));
  return {
    thresholdCapPctLthr: m.threshold_cap_pct_lthr ?? DEFAULT_RULES.thresholdCapPctLthr,
    achillesStiffnessCeiling: m.achilles_stiffness_ceiling ?? DEFAULT_RULES.achillesStiffnessCeiling,
    maxWeeklyVolumeIncrease: m.max_weekly_volume_increase ?? DEFAULT_RULES.maxWeeklyVolumeIncrease,
    skiShiftM: m.ski_shift_m ?? DEFAULT_RULES.skiShiftM,
    sledShiftM: m.sled_shift_m ?? DEFAULT_RULES.sledShiftM,
    wallBallSet: m.wall_ball_set ?? DEFAULT_RULES.wallBallSet,
    eliteMaxDecaySec: m.elite_max_decay_sec ?? DEFAULT_RULES.eliteMaxDecaySec,
  };
}

export function baselinesFrom(rows: { weight_class: string; station: string; seconds: number }[] | undefined): BaselineTable {
  const out: BaselineTable = JSON.parse(JSON.stringify(DEFAULT_BASELINES));
  for (const r of rows ?? []) {
    const cls = r.weight_class as keyof BaselineTable;
    if (out[cls] && (STATIONS as readonly string[]).includes(r.station)) (out[cls] as Record<string, number>)[r.station] = r.seconds;
  }
  return out;
}
