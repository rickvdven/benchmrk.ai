import type { Athlete, BenchmarkEntry, Station, StationMap } from './types';
import { STATIONS } from './types';

export interface Calibration {
  thresholdPaceSec: number;
  lthr: number;
  vo2max: number | null;
  compromisedRatio: number | null;
  stationTimes: Partial<StationMap<number>>;
  decaySec: number | null;
}

export const SEC_PER_BPM = 2.5;
export const MAX_STEP_SEC = 20;

/** Threshold estimate from a clean threshold test: correct the pace for heart rate above/below LTHR. */
export function thresholdFromTest(paceSec: number, avgHr: number, lthr: number) {
  const corr = Math.max(-15, Math.min(15, (avgHr - lthr) * SEC_PER_BPM));
  return Math.round(paceSec + corr);
}

export interface BenchmarkEffect {
  before: Calibration;
  after: Calibration;
  notes: string[]; // machine-readable keys
}

/** Apply one benchmark to a calibration. Pure. */
export function applyBenchmark(cal: Calibration, b: BenchmarkEntry): BenchmarkEffect {
  const before = { ...cal, stationTimes: { ...cal.stationTimes } };
  const after: Calibration = { ...cal, stationTimes: { ...cal.stationTimes } };
  const notes: string[] = [];

  if (b.newLthr && b.newLthr > 100 && b.newLthr < 230) {
    after.lthr = Math.round(b.newLthr);
    notes.push('lthr_override');
  }
  if (b.newVo2 && b.newVo2 > 20 && b.newVo2 < 95) after.vo2max = b.newVo2;

  if (b.newLtPaceSec && b.newLtPaceSec > 150 && b.newLtPaceSec < 600) {
    after.thresholdPaceSec = Math.round(b.newLtPaceSec);
    notes.push('garmin_override');
  } else if (b.number === 1 || b.number === 2) {
    let est = thresholdFromTest(b.paceSec, b.avgHr, after.lthr);
    if (b.avgHr > after.lthr + 1) notes.push('hr_above_lthr');
    const delta = est - cal.thresholdPaceSec;
    if (Math.abs(delta) > MAX_STEP_SEC) {
      est = cal.thresholdPaceSec + Math.sign(delta) * MAX_STEP_SEC;
      notes.push('step_capped');
    }
    after.thresholdPaceSec = est;
    notes.push(delta > 0 ? 'threshold_slower' : delta < 0 ? 'threshold_faster' : 'threshold_same');
  }

  if (b.number >= 3) {
    const runs = (b.runSplits ?? []).filter((x) => x > 0);
    const avgRun = runs.length ? runs.reduce((s, x) => s + x, 0) / runs.length : b.paceSec;
    if (avgRun > 0 && b.number !== 5) {
      // B3/B4 are run at prescribed (sub-race) volume; B5 is full race simulation
      const ratio = after.thresholdPaceSec / avgRun;
      if (ratio > 0.75 && ratio < 1) {
        after.compromisedRatio = Math.round(ratio * 1000) / 1000;
        notes.push('ratio_updated');
      }
    } else if (avgRun > 0) {
      const ratio = after.thresholdPaceSec / avgRun;
      if (ratio > 0.75 && ratio < 1) after.compromisedRatio = Math.round(ratio * 1000) / 1000;
    }
    if (runs.length >= 8) {
      after.decaySec = Math.round(runs[7] - (runs[0] + runs[1]) / 2);
    }
    // station splits only describe full race volume in B5 (and in B3/B4 we scale by prescribed volume)
    const vol = b.number === 5 ? 1 : 0.75;
    for (const s of STATIONS) {
      const v = b.stationSplits?.[s as Station];
      if (v && v > 0) after.stationTimes[s as Station] = Math.round(v / vol);
    }
    if (b.stationSplits && Object.keys(b.stationSplits).length) notes.push('stations_updated');
  }
  return { before, after, notes };
}

export function calibrationOf(a: Athlete): Calibration {
  return {
    thresholdPaceSec: a.thresholdPaceSec,
    lthr: a.lthr,
    vo2max: a.vo2max ?? null,
    compromisedRatio: a.compromisedRatio ?? null,
    stationTimes: { ...(a.stationTimes ?? {}) },
    decaySec: null,
  };
}

/** Rebuild the calibration from the intake baseline plus all remaining benchmarks (used after edit/delete). */
export function replay(baseline: Calibration, benchmarks: BenchmarkEntry[]): Calibration {
  return [...benchmarks]
    .sort((x, y) => x.date.localeCompare(y.date) || x.number - y.number)
    .reduce((cal, b) => applyBenchmark(cal, b).after, { ...baseline, stationTimes: { ...baseline.stationTimes } });
}
