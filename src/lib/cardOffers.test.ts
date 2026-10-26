import { describe, expect, it } from 'vitest';
import { calibrationOf, defaultSchedule, raceModel, type Athlete, type BenchmarkEntry, type Profile } from '../engine';
import { toAthlete, type ProfileRow } from '../data/mapping';
import { benchmarkPr, planWeek, predictionData, predictionDue, predictionSeries, progressDue, progressOffer } from './cardOffers';

const stars = { skierg: 3, sledPush: 3, sledPull: 3, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 3 };
const athlete: Athlete = { name: 'X', sex: 'man', lthr: 170, maxHr: 190, thresholdPaceSec: 285, archetype: 'hybrid', flags: { achilles: false, quad: false, back: false, shin: false }, stationStars: stars, stationTimes: {} };
const full: Profile = { athlete, category: 'solo_open', raceName: 'Amsterdam 2027', raceDate: '2027-02-20', goalSec: 4800, planStart: '2026-10-12', weekSchedule: defaultSchedule(5) };
const row = { ...athlete, baseline: calibrationOf(athlete), created_at: '2026-10-12T08:00:00Z' } as unknown as ProfileRow;
void toAthlete;
const bm = (n: 1 | 2 | 3 | 4 | 5, date: string, paceSec: number, avgHr: number): BenchmarkEntry => ({ id: `${n}-${date}`, number: n, date, paceSec, avgHr });

describe('which offer is due', () => {
  it('offers the first prediction only to people who just did the intake', () => {
    expect(predictionDue({ createdAt: '2026-10-24T08:00:00Z', today: '2026-10-26', seen: {} })).toBe(true);
    expect(predictionDue({ createdAt: '2026-10-24T08:00:00Z', today: '2026-10-26', seen: { pred: '2026-10-25' } })).toBe(false);
    expect(predictionDue({ createdAt: '2026-06-01T08:00:00Z', today: '2026-10-26', seen: {} })).toBe(false);
  });
  it('offers progress every 4 weeks, from week 5', () => {
    const planStart = '2026-10-12';
    expect(progressDue({ planStart, today: '2026-11-02', seen: {} })).toBe(false); // week 4
    expect(progressDue({ planStart, today: '2026-11-09', seen: {} })).toBe(true); // week 5
    expect(progressDue({ planStart, today: '2026-11-16', seen: { prog: '2026-11-09' } })).toBe(false);
    expect(progressDue({ planStart, today: '2026-12-07', seen: { prog: '2026-11-09' } })).toBe(true);
  });
  it('counts plan weeks from the plan start week', () => {
    expect(planWeek('2026-10-12', '2026-10-12')).toBe(1);
    expect(planWeek('2026-10-12', '2026-10-18')).toBe(1);
    expect(planWeek('2026-10-12', '2026-11-30')).toBe(8);
  });
});

describe('prediction card', () => {
  it('takes its numbers from the race model', () => {
    const m = raceModel(full, '2026-10-26');
    const d = predictionData(full, m, 'nl');
    expect(d).toMatchObject({ time: m.projected.finishSec, goal: 4800, chance: m.chance, runs: m.projected.runTotalSec, race: 'Amsterdam 2027' });
    expect(d.runs! + d.stations! + d.roxzone!).toBeLessThanOrEqual(d.time! + 1);
  });
});

describe('benchmark PR', () => {
  const faster = { before: calibrationOf(athlete), after: { ...calibrationOf(athlete), thresholdPaceSec: 279 } };
  it('is a record when the threshold got faster, with the prediction and chance before and after', () => {
    const pr = benchmarkPr({ full, effect: faster, n: 2, date: '2026-11-30', today: '2026-11-30', lang: 'nl', previousDate: '2026-11-09' })!;
    expect(pr.type).toBe('benchmark_pr');
    expect(pr.data).toMatchObject({ n: 2, week: 8, old: 285, new: 279 });
    expect(pr.data.chance_new!).toBeGreaterThanOrEqual(pr.data.chance_old!);
    expect(pr.weeksAgo).toBe(3);
  });
  it('is no record when the threshold stayed or got slower', () => {
    const same = { before: calibrationOf(athlete), after: calibrationOf(athlete) };
    const slower = { before: calibrationOf(athlete), after: { ...calibrationOf(athlete), thresholdPaceSec: 291 } };
    for (const effect of [same, slower]) expect(benchmarkPr({ full, effect, n: 1, date: '2026-11-02', today: '2026-11-02', lang: 'en' })).toBeNull();
  });
});

describe('progress card', () => {
  const benchmarks = [bm(1, '2026-11-02', 281, 168), bm(2, '2026-11-23', 279, 168)];
  it('has one point per plan week, starting at the intake calibration, ending at the live prediction', () => {
    const live = 4700;
    const series = predictionSeries({ full, baseline: calibrationOf(athlete), benchmarks, today: '2026-12-07', liveFinishSec: live });
    expect(series).toHaveLength(9);
    expect(series[series.length - 1]).toBe(live);
    expect(series[0]).toBe(raceModel(full, '2026-10-12').projected.finishSec);
    expect(series.every((s) => s > 600)).toBe(true);
  });
  it('is offered with the gain, and not without two points or without a gain', () => {
    const o = progressOffer({ full, row, benchmarks, today: '2026-12-07', lang: 'en', liveFinishSec: 4700 })!;
    expect(o.type).toBe('progress');
    expect(o.data.start! - o.data.time!).toBeGreaterThan(5);
    expect(o.data.week).toBe(9);
    expect(o.data.total).toBeGreaterThanOrEqual(9);
    expect(progressOffer({ full, row, benchmarks, today: '2026-10-14', lang: 'en', liveFinishSec: 4700 })).toBeNull(); // one point only
    const flat = progressOffer({ full, row, benchmarks: [], today: '2026-12-07', lang: 'en', liveFinishSec: raceModel(full, '2026-10-12').projected.finishSec + 30 });
    expect(flat).toBeNull(); // slower than the start: no card
  });
});
