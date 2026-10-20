import { daysBetween } from './time';
import {
  DEFAULT_BASELINES,
  DOUBLES_STATION_FACTOR,
  compromisedRatio,
  roxzoneBudget,
  soloStationTime,
  stationGainPct,
  goalChance,
  statusOf,
  thresholdGain,
  type BaselineTable,
  type Status,
} from './raceModel';
import type { Athlete, Category, Station, StationMap } from './types';
import { STATIONS } from './types';

/** number of hand-over segments per station in doubles, and segment label */
export const SEGMENTS: Record<Station, { n: number; unit: string; size: number }> = {
  skierg: { n: 8, unit: 'm', size: 125 },
  sledPush: { n: 4, unit: 'm', size: 12.5 },
  sledPull: { n: 4, unit: 'm', size: 12.5 },
  burpees: { n: 8, unit: 'm', size: 10 },
  row: { n: 4, unit: 'm', size: 250 },
  farmers: { n: 4, unit: 'm', size: 50 },
  lunges: { n: 8, unit: 'm', size: 12.5 },
  wallballs: { n: 10, unit: 'reps', size: 10 },
};

export interface StationSplit {
  station: Station;
  aSec: number; // solo-equivalent time
  bSec: number;
  lead: 'A' | 'B' | 'even';
  aSegments: number;
  bSegments: number;
  teamSec: number;
}

export function splitStations(a: Athlete, b: Athlete, category: Category, base: BaselineTable = DEFAULT_BASELINES): StationSplit[] {
  return STATIONS.map((s) => {
    const ta = soloStationTime(a, category, s, base);
    const tb = soloStationTime(b, category, s, base);
    const diff = (tb - ta) / Math.min(ta, tb);
    const lead: StationSplit['lead'] = Math.abs(diff) < 0.06 ? 'even' : diff > 0 ? 'A' : 'B';
    const shareA = lead === 'even' ? 0.5 : lead === 'A' ? (Math.abs(diff) > 0.2 ? 0.7 : 0.6) : Math.abs(diff) > 0.2 ? 0.3 : 0.4;
    const seg = SEGMENTS[s];
    const aSegments = Math.round(seg.n * shareA);
    const bSegments = seg.n - aSegments;
    const sa = aSegments / seg.n;
    const teamSec = Math.round((sa * ta + (1 - sa) * tb) * DOUBLES_STATION_FACTOR);
    const finalLead: StationSplit['lead'] = aSegments === bSegments ? 'even' : aSegments > bSegments ? 'A' : 'B';
    return { station: s, aSec: ta, bSec: tb, lead: finalLead, aSegments, bSegments, teamSec };
  });
}

export interface TeamModel {
  pacer: 'A' | 'B';
  runPaceSec: number; // limited by the slower partner
  aRunPaceSec: number;
  bRunPaceSec: number;
  stationTotalSec: number;
  roxzoneSec: number;
  finishSec: number;
  projectedFinishSec: number;
  requiredRunPaceSec: number;
  pacerGapSecPerKm: number; // + = pacer too slow for the goal
  chance: number;
  status: Status;
  splits: StationSplit[];
}

export function teamModel(
  a: Athlete,
  b: Athlete,
  category: Category,
  goalSec: number,
  raceDate: string,
  today: string,
  base: BaselineTable = DEFAULT_BASELINES,
): TeamModel {
  const weeks = Math.max(0, Math.floor(daysBetween(today, raceDate) / 7));
  const pace = (x: Athlete, gain: boolean) => {
    const T = x.thresholdPaceSec - (gain ? thresholdGain(x.thresholdPaceSec, weeks) : 0);
    return Math.round(T / compromisedRatio(x, category));
  };
  const aRun = pace(a, false);
  const bRun = pace(b, false);
  const pacer: 'A' | 'B' = aRun >= bRun ? 'A' : 'B';
  const runPaceSec = Math.max(aRun, bRun);
  const splits = splitStations(a, b, category, base);
  const stationTotalSec = splits.reduce((n, x) => n + x.teamSec, 0);
  const slowerT = Math.max(a.thresholdPaceSec, b.thresholdPaceSec);
  const roxzoneSec = roxzoneBudget(slowerT, category);
  const finishSec = runPaceSec * 8 + stationTotalSec + roxzoneSec;

  const projRun = Math.max(pace(a, true), pace(b, true));
  const projStations = splits.reduce((n, x) => {
    const g = 1 - (stationGainPct(a.stationStars[x.station], weeks) + stationGainPct(b.stationStars[x.station], weeks)) / 2;
    return n + x.teamSec * g;
  }, 0);
  const projectedFinishSec = Math.round(projRun * 8 + projStations + roxzoneSec);
  const requiredRunPaceSec = Math.round((goalSec - projStations - roxzoneSec) / 8);
  const chance = goalChance(finishSec, projectedFinishSec, goalSec);
  return {
    pacer,
    runPaceSec,
    aRunPaceSec: aRun,
    bRunPaceSec: bRun,
    stationTotalSec,
    roxzoneSec,
    finishSec,
    projectedFinishSec,
    requiredRunPaceSec,
    pacerGapSecPerKm: projRun - requiredRunPaceSec,
    chance,
    status: statusOf(chance),
    splits,
  };
}

export type SplitMap = StationMap<StationSplit>;
