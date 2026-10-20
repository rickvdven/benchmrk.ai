import { DEFAULT_BASELINES, goalChance, raceModel, trainingDays, type BaselineTable, type RaceModel } from './raceModel';
import type { Profile, Station } from './types';

export type BoostKind = 'day' | 'pace' | 'station' | 'roxzone' | 'goal';
export interface Boost {
  kind: BoostKind;
  chance: number; // chance after this change
  station?: Station;
  goalSec?: number;
  seconds?: number; // time won (station / roxzone)
}

/**
 * Concrete levers that raise the chance to hit the goal, each re-computed with the same race model.
 * `today` is the chance if the race were today (no training gains) – shows what the plan itself adds.
 */
export function chanceBoosters(p: Profile, today: string, base: BaselineTable = DEFAULT_BASELINES, m: RaceModel = raceModel(p, today, base)) {
  const out: Boost[] = [];
  const fin = m.projected.finishSec;
  const cur = m.current.finishSec;
  const o = { adherence: p.adherence, execution: p.execution };
  const chanceAt = (projected: number, goal = m.goalSec) => goalChance(cur, projected, goal, o);
  // 1. one more training day (when < 4)
  const days = trainingDays(p);
  const sched = p.weekSchedule ?? [];
  const restIdx = sched.indexOf('rest');
  if (sched.length && days < 4 && restIdx >= 0) {
    const ws = [...sched];
    ws[restIdx] = 'auto';
    out.push({ kind: 'day', chance: raceModel({ ...p, weekSchedule: ws }, today, base).chance });
  }
  // 2. threshold 5 s/km faster than expected (hit the threshold sessions, re-test)
  out.push({ kind: 'pace', chance: raceModel({ ...p, paceAdjustSec: (p.paceAdjustSec ?? 0) - 5 }, today, base).chance });
  // 3. weakest station 8 % faster (extra technique + strength on it)
  const st = m.weakestStations[0];
  if (st) {
    const s = Math.round(m.projected.stations[st] * 0.08);
    out.push({ kind: 'station', station: st, seconds: s, chance: chanceAt(fin - s) });
  }
  // 4. 30 s faster through the Roxzone (practised transitions, no walking)
  out.push({ kind: 'roxzone', seconds: 30, chance: chanceAt(fin - 30) });
  const levers = out.filter((b) => b.chance > m.chance).sort((a, b) => b.chance - a.chance);
  // 5. a more fitting goal (≥ 85 %) when the current one is a stretch
  let goal: Boost | null = null;
  if (m.chance < 60) {
    for (let g = Math.ceil(m.goalSec / 30) * 30 + 30; g <= m.goalSec + 45 * 60; g += 30) {
      const c = chanceAt(fin, g);
      if (c >= 85) {
        goal = { kind: 'goal', goalSec: g, chance: c };
        break;
      }
    }
  }
  // all levers together (extra day excluded: that's a schedule choice, not a training result)
  const paced = raceModel({ ...p, paceAdjustSec: (p.paceAdjustSec ?? 0) - 5 }, today, base).projected.finishSec;
  const won = out.filter((b) => b.kind === 'station' || b.kind === 'roxzone').reduce((n, b) => n + (b.seconds ?? 0), 0);
  const allFinish = paced - won;
  const all = { finishSec: allFinish, chance: chanceAt(allFinish) };
  return { now: goalChance(cur, cur, m.goalSec), levers, goal, all, adherence: p.adherence ?? null, execution: p.execution ?? null, neededSec: cur - m.goalSec, expectedSec: cur - fin, currentSec: cur };
}
