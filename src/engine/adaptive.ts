export interface LoggedSession {
  date: string;
  type: string;
  targetPaceSec?: number | null;
  hrCap?: number | null;
  actualPaceSec?: number | null;
  avgHr?: number | null;
  rpe?: number | null;
}

export type Adjustment =
  | { kind: 'slow_down'; sec: number; evidence: string[] }
  | { kind: 'speed_up'; sec: number; evidence: string[] }
  | { kind: 'deload'; evidence: string[] }
  | null;

/** Rolling check on the last 3 logged threshold sessions + last 7 days of RPE and morning stiffness. */
export function evaluate(logs: LoggedSession[], morning: Record<string, number>, today: string, ceiling = 4): Adjustment {
  const thr = logs
    .filter((l) => l.type === 'threshold' && l.actualPaceSec && l.targetPaceSec && l.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  if (thr.length >= 2) {
    const slow = thr.filter((l) => l.actualPaceSec! - l.targetPaceSec! > 5 && (!l.hrCap || (l.avgHr ?? 0) >= l.hrCap));
    if (slow.length >= 2) return { kind: 'slow_down', sec: 4, evidence: slow.map((l) => l.date) };
    const fast = thr.filter(
      (l) => l.targetPaceSec! - l.actualPaceSec! >= 3 && l.hrCap && (l.avgHr ?? 999) <= l.hrCap - 4 && (l.rpe ?? 10) <= 6,
    );
    if (fast.length >= 2) return { kind: 'speed_up', sec: 3, evidence: fast.map((l) => l.date) };
  }
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const since = weekAgo.toISOString().slice(0, 10);
  const recent = logs.filter((l) => l.date > since && l.date <= today && l.rpe);
  const avgRpe = recent.length ? recent.reduce((s, l) => s + (l.rpe ?? 0), 0) / recent.length : 0;
  const sore = Object.entries(morning).filter(([d, v]) => d > since && d <= today && v >= ceiling);
  if ((recent.length >= 3 && avgRpe >= 8.5) || sore.length >= 3) {
    return { kind: 'deload', evidence: [...recent.map((l) => l.date), ...sore.map(([d]) => d)] };
  }
  return null;
}

/** Key sessions of the last 6 weeks logged with a pace: how often the athlete hit the plan's target. */
export function executionOf(logs: LoggedSession[], today: string): import('./types').Execution | null {
  const since = new Date(today);
  since.setDate(since.getDate() - 42);
  const from = since.toISOString().slice(0, 10);
  const key = logs.filter(
    (l) => ['threshold', 'intervals', 'sim', 'long'].includes(l.type) && l.actualPaceSec && l.targetPaceSec && l.date > from && l.date <= today,
  );
  if (!key.length) return null;
  const hit = key.filter((l) => l.actualPaceSec! <= l.targetPaceSec! + 2).length;
  const miss = key.filter((l) => l.actualPaceSec! - l.targetPaceSec! > 5).length;
  return { n: key.length, hit, miss };
}
