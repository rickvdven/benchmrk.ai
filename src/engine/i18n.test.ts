import { describe, expect, it } from 'vitest';
import { defaultSchedule, generatePlan, weekMilestone, type Profile } from './index';
const P: Profile = {
  athlete: { name: 'X', sex: 'man', lthr: 170, maxHr: 190, thresholdPaceSec: 300, archetype: 'hybrid', flags: { achilles: true, quad: false, back: false, shin: false },
    stationStars: { skierg: 3, sledPush: 2, sledPull: 2, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 3 }, stationTimes: {} },
  category: 'doubles_open', raceName: 'R', raceDate: '2027-02-20', goalSec: 5100, planStart: '2026-10-12', weekSchedule: defaultSchedule(5),
};
describe.each(['de', 'es', 'ko'] as const)('plan in %s', (lang) => {
  it('has no unfilled placeholders and is translated', () => {
    const weeks = generatePlan(P, { lang });
    const text = weeks.flatMap((w) => w.sessions).map((s) => s.title + s.description + (s.benchmarkText ?? '')).join('\n');
    expect(text).not.toMatch(/\{[a-z]+\}/);
    const ms = weeks.map((w) => weekMilestone(w, P, lang)).filter(Boolean).join('\n');
    expect(ms).not.toMatch(/\{[a-z]+\}/);
    expect(text).not.toContain('Easy run');
  });
});

describe('strength archetype', () => {
  it('gets maintenance strength, aerobic emphasis and its own tip', () => {
    const p = { ...P, category: 'solo_open' as const, athlete: { ...P.athlete, archetype: 'strength' as const } };
    const s = generatePlan(p, { lang: 'nl' }).flatMap((w) => w.sessions);
    expect(s.find((x) => x.type === 'strength')!.description).toContain('Onderhoudsdosis');
    expect(s.find((x) => x.type === 'easy')!.description).toContain('loopmotor');
    expect(s.find((x) => x.type === 'threshold')!.tip).toContain('Krachtatleet');
  });
});
