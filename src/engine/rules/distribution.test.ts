import { describe, expect, it } from 'vitest';
import { analyzeSession, generateSeason, type LoggedSession } from '../index';
import { fixtures, FIXTURE_TODAY } from './fixtures';

// Research round 2026-11-12 (Rosenblat 2025, Oliveira 2024): whether the hard part of a week is threshold or Z5 should
// not matter. The 80/20 check counts sessions as hard (threshold, intervals, sim, race or RPE ≥ 7) and warns above 50 %;
// threshold and intervals already count the same. These tests pin that down.
const omen = fixtures()[0];
const weeks = generateSeason(omen.profile, { lang: 'en', today: FIXTURE_TODAY });
const day = weeks.flatMap((w) => w.sessions).find((s) => s.date === FIXTURE_TODAY)!;

function distEffect(types: string[]) {
  const logs: LoggedSession[] = types.map((type, i) => ({ date: `2026-11-${String(10 + i).padStart(2, '0')}`, type, rpe: type === 'easy' ? 3 : 8 }));
  const r = analyzeSession(
    { date: '2026-11-16', planned: { ...day, type: 'easy' }, rpe: 3, avgHr: 140 },
    { profile: omen.profile, weeks, logs, morning: {}, today: FIXTURE_TODAY, ceiling: 4, adjust: null, weakest: [], lang: 'en' },
  );
  return r.effects.find((e) => e.text.startsWith('Last 7 days'))!;
}

describe('80/20 check: threshold and Z5 count the same', () => {
  it('a week with mostly easy sessions and one threshold run gives no warning', () => {
    expect(distEffect(['easy', 'easy', 'easy', 'easy', 'threshold']).tone).toBe('info');
  });
  it('the same week with intervals instead of threshold gives the same result', () => {
    const thr = distEffect(['easy', 'easy', 'easy', 'easy', 'threshold']);
    const z5 = distEffect(['easy', 'easy', 'easy', 'easy', 'intervals']);
    expect(z5.tone).toBe(thr.tone);
    expect(z5.text).toBe(thr.text);
  });
  it('a week where most sessions are hard does warn, whatever the hard sessions are', () => {
    expect(distEffect(['easy', 'threshold', 'threshold', 'intervals']).tone).toBe('warn');
    expect(distEffect(['easy', 'intervals', 'intervals', 'intervals']).tone).toBe('warn');
  });
});
