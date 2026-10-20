import { describe, expect, it } from 'vitest';
import {
  allocatePhases,
  applyBenchmark,
  calibrationOf,
  compliance,
  defaultSchedule,
  evaluate,
  generatePlan,
  parseRaceTime,
  raceModel,
  replay,
  teamModel,
  zones,
  type Athlete,
  type Profile,
} from './index';

const stars = (o: Partial<Athlete['stationStars']> = {}) => ({
  skierg: 3, sledPush: 3, sledPull: 3, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 3, ...o,
});
const athlete = (o: Partial<Athlete>): Athlete => ({
  name: 'X', sex: 'man', lthr: 170, maxHr: 190, thresholdPaceSec: 300, archetype: 'hybrid',
  flags: { achilles: false, quad: false, back: false, shin: false }, stationStars: stars(), stationTimes: {}, ...o,
});
const profile = (o: Partial<Profile>, a: Partial<Athlete> = {}): Profile => ({
  athlete: athlete(a), category: 'solo_open', raceName: 'Test', raceDate: '2027-02-20', goalSec: 5100,
  planStart: '2026-10-12', weekSchedule: defaultSchedule(5), ...o,
});

const LISA = profile({ goalSec: 5100 }, { name: 'Lisa', sex: 'woman', lthr: 172, maxHr: 188, thresholdPaceSec: 305,
  stationStars: stars({ skierg: 4, sledPush: 2, sledPull: 2, row: 4, wallballs: 2 }) });
const MARK = profile({ category: 'solo_pro', raceDate: '2027-01-09', goalSec: 4200 }, { name: 'Mark', lthr: 178, maxHr: 186,
  thresholdPaceSec: 235, archetype: 'fast_runner', flags: { achilles: true, quad: false, back: false, shin: false },
  stationStars: stars({ sledPush: 2, sledPull: 2, lunges: 2 }) });

describe('race time parsing (P0-1)', () => {
  it('accepts h:mm, h:mm:ss, mm:ss', () => {
    expect(parseRaceTime('1:25')).toBe(5100);
    expect(parseRaceTime('1:25:00')).toBe(5100);
    expect(parseRaceTime('85:00')).toBe(5100);
    expect(parseRaceTime('1:10:00')).toBe(4200);
  });
  it('rejects nonsense', () => {
    expect(parseRaceTime('0:05')).toBeNull();
    expect(parseRaceTime('abc')).toBeNull();
    expect(parseRaceTime('5:00:00')).toBeNull();
  });
});

describe('solo vs doubles (P0-2)', () => {
  it('solo plan never mentions a partner and sims use solo pace', () => {
    const plan = generatePlan(LISA, { today: '2026-10-14' });
    const text = plan.flatMap((w) => w.sessions).map((s) => s.title + s.description).join(' ');
    expect(text.toLowerCase()).not.toContain('partner');
    expect(text.toLowerCase()).not.toContain('doubles');
  });
  it('doubles plan uses shift instructions', () => {
    const p = profile({ category: 'doubles_open', goalSec: 3720, raceDate: '2027-01-31' }, { thresholdPaceSec: 245, lthr: 176 });
    const sims = generatePlan(p).flatMap((w) => w.sessions).filter((s) => s.type === 'sim');
    expect(sims[0].description).toContain('125');
  });
});

describe('race model (P0-3, P0-4)', () => {
  it('one required run pace; finish = runs + stations + roxzone', () => {
    const m = raceModel(LISA, '2026-10-14');
    const b = m.projected;
    expect(b.finishSec).toBe(b.runTotalSec + b.stationTotalSec + b.roxzoneSec);
    expect(m.requiredRunPaceSec).toBe(Math.round((5100 - b.stationTotalSec - b.roxzoneSec) / 8));
  });
  it('Lisa 1:25 is not "on track" with 2-star sleds and a 5:05 threshold', () => {
    const m = raceModel(LISA, '2026-10-14');
    expect(m.projected.finishSec).toBeGreaterThan(5100);
    expect(m.chance).toBeLessThan(85);
    expect(m.status).not.toBe('on_track');
  });
  it('chance = feasibility with this plan, moved by the log', async () => {
    const { goalChance } = await import('./raceModel');
    // needed ≤ expected gain → high
    expect(goalChance(5460, 5190, 5250)).toBeGreaterThanOrEqual(90);
    // impossible gap stays low, even when the plan's paces are hit
    expect(goalChance(6500, 6250, 3180, { execution: { n: 6, hit: 6, miss: 0 } })).toBeLessThan(10);
    // a realistic stretch goal: hitting the paces lifts it, missing them and skipping sessions drops it
    const base = goalChance(5460, 5190, 5100);
    expect(goalChance(5460, 5190, 5100, { execution: { n: 6, hit: 6, miss: 0 } })).toBeGreaterThanOrEqual(90);
    expect(goalChance(5460, 5190, 5100, { execution: { n: 6, hit: 1, miss: 4 } })).toBeLessThan(base);
    expect(goalChance(5460, 5190, 5100, { adherence: 0.6 })).toBeLessThan(base - 20);
  });
  it('Mark Pro Solo is predicted well above 1:02', () => {
    const m = raceModel(MARK, '2026-10-14');
    expect(m.projected.finishSec).toBeGreaterThan(65 * 60);
  });
  it('station stars change the prediction', () => {
    const weak = raceModel(profile({}, { stationStars: stars({ sledPush: 2 }) }), '2026-10-14').current.finishSec;
    const strong = raceModel(profile({}, { stationStars: stars({ sledPush: 5 }) }), '2026-10-14').current.finishSec;
    expect(strong).toBeLessThan(weak);
  });
  it('benchmark station splits feed the prediction', () => {
    const before = raceModel(LISA, '2026-10-14').current.stationTotalSec;
    const cal = applyBenchmark(calibrationOf(LISA.athlete), {
      id: 'b', number: 3, date: '2026-10-14', paceSec: 365, avgHr: 168,
      stationSplits: { skierg: 310, sledPush: 270, sledPull: 400, burpees: 450, row: 300, farmers: 160, lunges: 390, wallballs: 510 },
    }).after;
    const after = raceModel({ ...LISA, athlete: { ...LISA.athlete, stationTimes: cal.stationTimes } }, '2026-10-14').current.stationTotalSec;
    expect(after).toBeGreaterThan(before);
  });
});

describe('benchmarks (P0-5)', () => {
  const cal = calibrationOf(MARK.athlete);
  it('HR above LTHR is corrected — 3:48 @ 181 does not become the threshold', () => {
    const r = applyBenchmark(cal, { id: '1', number: 1, date: '2026-10-14', paceSec: 228, avgHr: 181 });
    expect(r.after.thresholdPaceSec).toBeGreaterThanOrEqual(234);
    expect(r.notes).toContain('hr_above_lthr');
  });
  it('a slower test makes the threshold slower', () => {
    const r = applyBenchmark({ ...cal, thresholdPaceSec: 300, lthr: 170 }, { id: '1', number: 1, date: 'x', paceSec: 320, avgHr: 170 });
    expect(r.after.thresholdPaceSec).toBe(320);
  });
  it('compromised benchmark never touches the clean threshold', () => {
    const r = applyBenchmark(cal, { id: '3', number: 3, date: 'x', paceSec: 200, avgHr: 170 });
    expect(r.after.thresholdPaceSec).toBe(cal.thresholdPaceSec);
  });
  it('replay after delete returns to baseline', () => {
    expect(replay(cal, []).thresholdPaceSec).toBe(cal.thresholdPaceSec);
  });
});

describe('zones (P1-7)', () => {
  it('Friel Z2 = 85–89% LTHR and nothing above max HR', () => {
    const z = zones(178, 186);
    expect(z.find((x) => x.id === 'Z2')).toMatchObject({ min: 151, max: 158 });
    expect(Math.max(...z.map((x) => x.max))).toBeLessThanOrEqual(186);
  });
});

describe('plan structure (P1-9, T-*)', () => {
  it('short prep does not start with a full rehearsal', () => {
    const p = profile({ planStart: '2026-10-12', raceDate: '2026-11-07' });
    const w1 = generatePlan(p)[0];
    expect(w1.sessions.some((s) => s.benchmark === 5)).toBe(false);
    expect(allocatePhases(4)).toEqual(['threshold', 'compromised', 'peak', 'taper']);
  });
  it('Sunday race: Saturday is shake-out or rest, never a sim', () => {
    const p = profile({ raceDate: '2027-02-21' });
    const plan = generatePlan(p);
    const sat = plan.at(-1)!.sessions.find((s) => s.date === '2027-02-20')!;
    expect(['easy', 'rest']).toContain(sat.type);
  });
  it('long prep weeks progress instead of repeating', () => {
    const plan = generatePlan(profile({ planStart: '2026-06-01' }));
    const thr = plan.slice(0, 3).map((w) => w.sessions.find((s) => s.type === 'threshold')!.title);
    expect(new Set(thr).size).toBeGreaterThan(1);
  });
  it('all five benchmarks in a 16+ week plan', () => {
    const b = new Set(generatePlan(LISA).flatMap((w) => w.sessions).map((s) => s.benchmark).filter(Boolean));
    expect([...b].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('weak sleds get sled-specific strength', () => {
    const str = generatePlan(LISA).flatMap((w) => w.sessions).filter((s) => s.type === 'strength');
    expect(str.length).toBeGreaterThan(10);
    expect(str[0].focusStations).toEqual(expect.arrayContaining(['sledPull']));
  });
  it('threshold HR cap follows the athlete LTHR, not a global 176', () => {
    const s = generatePlan(MARK).flatMap((w) => w.sessions).find((x) => x.type === 'threshold' && !x.benchmark && x.hrCap)!;
    expect(s.hrCap).toBe(178);
  });
  it('achilles guard replaces WOD as well', () => {
    const p = profile({ weekSchedule: ['threshold', 'rest', 'wod', 'rest', 'rest', 'sim', 'rest'] });
    const wod = generatePlan(p, { flare: { '2026-10-14': 5 } })[0].sessions.find((s) => s.date === '2026-10-14')!;
    expect(wod.guard).toBe(true);
  });
  it('compliance ignores rest days and counts all past weeks', () => {
    const plan = generatePlan(LISA);
    const done: Record<string, boolean> = { '2026-10-12': true, '2026-10-13': true };
    expect(compliance(plan, done, '2026-10-14')).toBe(100); // Mon threshold + Tue easy; Wed strength not yet
  });
});

describe('doubles team model (D-1..D-3)', () => {
  const rick = athlete({ name: 'Rick', thresholdPaceSec: 245, lthr: 176, archetype: 'fast_runner', stationStars: stars({ sledPush: 2, burpees: 4, farmers: 4 }) });
  const tom = athlete({ name: 'Tom', thresholdPaceSec: 265, lthr: 168, archetype: 'diesel', stationStars: stars({ skierg: 4, sledPush: 5, sledPull: 4, row: 4, farmers: 5, lunges: 4, wallballs: 4 }) });
  const m = teamModel(rick, tom, 'doubles_open', 3720, '2027-01-31', '2026-10-14');
  it('slower runner paces, and both partners get the same chance', () => {
    expect(m.pacer).toBe('B');
    expect(teamModel(tom, rick, 'doubles_open', 3720, '2027-01-31', '2026-10-14').chance).toBe(m.chance);
  });
  it('sled push lead follows the ratings', () => {
    expect(m.splits.find((s) => s.station === 'sledPush')!.lead).toBe('B');
  });
});

describe('adaptive loop', () => {
  it('slows targets after two slow, high-HR threshold sessions', () => {
    const a = evaluate(
      [
        { date: '2026-10-05', type: 'threshold', targetPaceSec: 300, hrCap: 172, actualPaceSec: 310, avgHr: 175 },
        { date: '2026-10-12', type: 'threshold', targetPaceSec: 300, hrCap: 172, actualPaceSec: 315, avgHr: 178 },
      ],
      {},
      '2026-10-14',
    );
    expect(a?.kind).toBe('slow_down');
  });
});

describe('injuries', () => {
  it('legacy booleans map to past injuries', async () => {
    const { injuriesOf } = await import('./injury');
    expect(injuriesOf({ achilles: true, quad: true, back: false, shin: false })).toEqual({ achilles: 'past', knee: 'past' });
  });
  it('current running injury slows build-up, swaps stations, adds prehab', async () => {
    const { withInjuries } = await import('./injury');
    const sched = ['threshold', 'easy', 'strength', 'intervals', 'rest', 'sim', 'long'] as Profile['weekSchedule'];
    const a = { weeklyKm: 30, stationStars: stars({ lunges: 1, wallballs: 1 }) };
    const base = profile({ weekSchedule: sched }, a);
    const hurt = profile({ weekSchedule: sched }, a);
    hurt.athlete.flags = withInjuries(hurt.athlete.flags, { knee: 'now', hamstring: 'recent' });
    const kmOf = (p: Profile) => Math.max(...generatePlan(p).map((w) => w.sessions.reduce((n, s) => n + (s.km ?? 0), 0)));
    expect(kmOf(hurt)).toBeLessThan(kmOf(base));
    const str = generatePlan(hurt).flatMap((w) => w.sessions).filter((s) => s.type === 'strength');
    expect(str.every((s) => !s.focusStations?.includes('lunges') && !s.focusStations?.includes('wallballs'))).toBe(true);
    expect(str[0].description).toMatch(/Spanish squat/);
    expect(generatePlan(hurt).flatMap((w) => w.sessions).some((s) => s.type === 'intervals')).toBe(false);
  });
});

describe('coach decides (auto days)', () => {
  it('fills auto days around fixed sessions and keeps hard days apart', async () => {
    const { resolveSchedule } = await import('./schedule');
    const r = resolveSchedule(['auto', 'auto', 'wod', 'rest', 'auto', 'auto', 'auto']);
    expect(r[2]).toBe('wod');
    expect(r[3]).toBe('rest');
    for (const t of ['sim', 'threshold', 'long']) expect(r).toContain(t);
    expect(r).not.toContain('auto');
    const hard = ['threshold', 'intervals', 'sim', 'wod'];
    const thr = r.indexOf('threshold');
    expect(hard.includes(r[(thr + 6) % 7]) && hard.includes(r[(thr + 1) % 7])).toBe(false);
  });
  it('keeps a fully fixed week unchanged and plans contain no auto sessions', async () => {
    const { resolveSchedule } = await import('./schedule');
    const fixed = defaultSchedule(5);
    expect(resolveSchedule(fixed)).toEqual(fixed);
    const p = profile({ weekSchedule: ['auto', 'auto', 'auto', 'rest', 'auto', 'auto', 'rest'] });
    expect(generatePlan(p).flatMap((w) => w.sessions).some((s) => (s.type as string) === 'auto')).toBe(false);
  });
});

describe('session analysis', () => {
  it('flags a too-slow threshold at high HR and explains the adaptive rule', async () => {
    const { analyzeSession } = await import('./analysis');
    const p = profile({});
    const weeks = generatePlan(p);
    const s = weeks.flatMap((w) => w.sessions).find((x) => x.type === 'threshold')!;
    const a = analyzeSession(
      { date: s.date, planned: s, actualPaceSec: s.targetPaceSec! + 12, avgHr: s.hrCap! + 2, rpe: 9 },
      { profile: p, weeks, logs: [{ date: s.date, type: 'threshold', targetPaceSec: s.targetPaceSec, hrCap: s.hrCap, actualPaceSec: s.targetPaceSec! + 12, avgHr: s.hrCap! + 2, rpe: 9 }], morning: {}, today: s.date, ceiling: 4, adjust: null, weakest: ['sledPush'], lang: 'en' },
    );
    expect(a.verdict).toBe('off');
    expect(a.effects.map((e) => e.text).join(' ')).toMatch(/One more/);
  });
  it('recognises stations in a WOD and weak-station work', async () => {
    const { analyzeSession, stationsInText } = await import('./analysis');
    expect(stationsInText('5 rounds: 20 wall balls, 200m row, 10 burpees')).toEqual(['burpees', 'row', 'wallballs']);
    const p = profile({});
    const weeks = generatePlan(p);
    const s = { ...weeks[1].sessions[2], type: 'wod' as const, title: 'WOD' };
    const a = analyzeSession({ date: s.date, planned: s, rpe: 9, wod: { description: 'AMRAP 20: wall balls, lunges' } }, { profile: p, weeks, logs: [], morning: {}, today: s.date, ceiling: 4, adjust: null, weakest: ['wallballs'], lang: 'nl' });
    expect(a.findings.map((f) => f.text).join(' ')).toMatch(/zwak/);
  });
});

describe('injury impact', () => {
  it('reports lower peak volume and a slower forecast for a current running injury', async () => {
    const { injuryImpact, withInjuries } = await import('./injury').then(async (m) => ({ ...m, ...(await import('./analysis')) }));
    const p = profile({}, { weeklyKm: 30 });
    p.athlete.flags = withInjuries(p.athlete.flags, { achilles: 'now' });
    const imp = injuryImpact(p, p.planStart)!;
    expect(imp.peakKm).toBeLessThan(imp.peakKmBase);
    expect(imp.forecast).toBeGreaterThan(imp.forecastBase);
    expect(imp.avoided).toContain('burpees');
  });
});

describe('extra session on a rest day', () => {
  it('advises caution before a hard day and keeps legs fresh', async () => {
    const { suggestExtra } = await import('./extra');
    const p = profile({});
    const weeks = generatePlan(p);
    const sessions = weeks.flatMap((w) => w.sessions);
    const restBeforeHard = sessions.find((s, i) => s.type === 'rest' && ['threshold', 'sim'].includes(sessions[i + 1]?.type))!;
    const ctx = { profile: p, weeks, logs: [], morning: {}, today: p.planStart, ceiling: 4, weakest: ['sledPush', 'wallballs'] as ('sledPush' | 'wallballs')[], lang: 'en' as const };
    const st = suggestExtra(restBeforeHard.date, 'strength', ctx);
    expect(st.advice).toBe('caution');
    expect(st.session.title).toMatch(/no legs/);
    const ca = suggestExtra(restBeforeHard.date, 'cardio', ctx);
    expect(ca.session.title).toMatch(/Short easy run/);
  });
  it('advises rest close to the race and offers mobility', async () => {
    const { suggestExtra } = await import('./extra');
    const p = profile({});
    const weeks = generatePlan(p);
    const r = suggestExtra('2027-02-19', 'cardio', { profile: p, weeks, logs: [], morning: {}, today: p.planStart, ceiling: 4, weakest: [], lang: 'nl' });
    expect(r.advice).toBe('rest');
    expect(r.alternative?.type).toBe('recovery');
  });
});

describe('season with several races', () => {
  it('builds to each A race, adds recovery, slots in B/C races', async () => {
    const { generateSeason, currentProfile } = await import('./season');
    const p = profile({ raceDate: '2027-01-31', raceName: 'Amsterdam', season: [
      { id: 'b', name: 'Maastricht', date: '2026-12-13', goalSec: null, priority: 'B' },
      { id: 'a2', name: 'Rotterdam', date: '2027-04-18', goalSec: 4900, priority: 'A' },
    ] });
    const weeks = generateSeason(p);
    const all = weeks.flatMap((w) => w.sessions);
    expect(all.filter((s) => s.type === 'race').map((s) => s.date)).toEqual(['2026-12-13', '2027-01-31', '2027-04-18']);
    expect(weeks.some((w) => w.phase === 'recovery')).toBe(true);
    expect(all.find((s) => s.date === '2026-12-12')?.title).toMatch(/Shake-out/);
    expect(all.find((s) => s.date === '2026-12-14')?.type === 'recovery' || all.find((s) => s.date === '2026-12-14')?.type === 'rest').toBe(true);
    // weeks are contiguous and dates unique
    const dates = all.map((s) => s.date);
    expect(new Set(dates).size).toBe(dates.length);
    weeks.forEach((w, i) => expect(w.index).toBe(i + 1));
    // after the main race the forecast switches to Rotterdam
    expect(currentProfile(p, '2027-02-05').raceName).toBe('Rotterdam');
    expect(currentProfile(p, '2026-11-01').raceName).toBe('Amsterdam');
  });
  it('single race season equals the normal plan', async () => {
    const { generateSeason } = await import('./season');
    const p = profile({});
    expect(generateSeason(p).flatMap((w) => w.sessions).length).toBe(generatePlan(p).flatMap((w) => w.sessions).length);
  });
});

describe('fewer training days', () => {
  it('works with 1 or 2 days and lowers the forecast improvement', async () => {
    const one = profile({ weekSchedule: defaultSchedule(1) });
    const two = profile({ weekSchedule: defaultSchedule(2) });
    const four = profile({ weekSchedule: defaultSchedule(4) });
    const sims = generatePlan(one).flatMap((w) => w.sessions).filter((s) => s.type === 'sim');
    expect(sims.length).toBeGreaterThan(5);
    expect(sims[0].description).toMatch(/threshold/);
    const { raceModel } = await import('./raceModel');
    const f = (p: Profile) => raceModel(p, p.planStart).projected.finishSec;
    expect(f(one)).toBeGreaterThan(f(two));
    expect(f(two)).toBeGreaterThan(f(four));
  });
  it('adds a compromised finisher when there is no sim, and substitutes for home training', async () => {
    const p = profile({ weekSchedule: ['threshold', 'rest', 'strength', 'rest', 'easy', 'rest', 'long'], equipment: 'home' });
    const all = generatePlan(p).flatMap((w) => w.sessions);
    expect(all.some((s) => s.type === 'threshold' && /compromised/.test(s.description))).toBe(true);
    expect(all.find((s) => s.type === 'strength')!.description).toMatch(/No HYROX kit/);
  });
});

describe('alternatives when a session cannot go ahead', () => {
  it('sim → bodyweight compromised run or long run, recommendation depends on phase', async () => {
    const { alternativesFor } = await import('./alternatives');
    const p = profile({});
    const weeks = generatePlan(p);
    const sims = weeks.flatMap((w) => w.sessions.map((s) => ({ s, ph: w.phase }))).filter((x) => x.s.type === 'sim');
    const early = sims.find((x) => x.ph === 'base' || x.ph === 'prep')!;
    const late = sims.find((x) => x.ph === 'compromised')!;
    const a1 = alternativesFor(early.s, p, weeks, 'en')!;
    const a2 = alternativesFor(late.s, p, weeks, 'en')!;
    expect(a1.options.map((o) => o.key)).toEqual(['bw', 'long']);
    expect(a2.recommended).toBe('bw');
    expect(a1.options[0].session.alt).toBe(true);
    expect(a1.options[1].why).toMatch(/Brandt/);
  });
  it('current running injury → low-impact instead of a long run', async () => {
    const { alternativesFor } = await import('./alternatives');
    const { withInjuries } = await import('./injury');
    const p = profile({});
    p.athlete.flags = withInjuries(p.athlete.flags, { shin: 'now' });
    const weeks = generatePlan(p);
    const sim = weeks.flatMap((w) => w.sessions).find((s) => s.type === 'sim')!;
    const a = alternativesFor(sim, p, weeks, 'nl')!;
    expect(a.recommended).toBe('long');
    expect(a.options[1].session.type).toBe('recovery');
  });
});

describe('gym sim protocol (Groesbeek)', () => {
  it('maps weeks to the build-up and lightens heavy weeks', async () => {
    const { GROESBEEK, protocolStep } = await import('./simProtocol');
    expect(protocolStep(GROESBEEK, 20)).toMatchObject({ run: 50, station: 50, inBuild: false });
    expect(protocolStep(GROESBEEK, 1)).toMatchObject({ run: 50, station: 50, inBuild: true }); // week before race
    expect(protocolStep(GROESBEEK, 2)).toMatchObject({ run: 125, station: 100 });
    expect(protocolStep(GROESBEEK, 4)).toMatchObject({ run: 100, station: 100 });
    expect(protocolStep(GROESBEEK, 12)).toMatchObject({ run: 50, station: 50, inBuild: true });
    const base = profile({ category: 'doubles_open', weekSchedule: defaultSchedule(5) });
    const p = { ...base, simProtocol: GROESBEEK };
    const weeks = generatePlan(p, { lang: 'nl' });
    const sims = weeks.flatMap((w) => w.sessions).filter((s) => s.type === 'sim');
    expect(sims[0].description).toMatch(/500 m/);
    expect(sims[0].description).toMatch(/samen 100%/);
    const heavyWeek = weeks[weeks.length - 3]; // 125/100
    expect(heavyWeek.sessions.find((s) => s.type === 'sim')!.description).toMatch(/1250 m/);
    const longHeavy = heavyWeek.sessions.find((s) => s.type === 'long')!.km!;
    const plain = generatePlan(base, { lang: 'nl' })[weeks.length - 3].sessions.find((s) => s.type === 'long')!.km!;
    expect(longHeavy).toBeLessThan(plain);
  });
});

describe('per-race division and partner', () => {
  it('prepares for a doubles B race and a Pro C race inside a solo build', async () => {
    const { generateSeason, currentProfile } = await import('./season');
    const p = profile({
      raceDate: '2027-01-30',
      season: [
        { id: 'd', name: 'Doubles Utrecht', date: '2026-12-12', goalSec: 3900, priority: 'B', category: 'doubles_open', teamId: 't1' },
        { id: 'p', name: 'Pro Fun', date: '2026-11-21', goalSec: null, priority: 'C', category: 'solo_pro' },
      ],
    });
    const all = generateSeason(p, { lang: 'nl' }).flatMap((w) => w.sessions);
    const race = all.find((s) => s.date === '2026-12-12')!;
    expect(race.type).toBe('race');
    expect(race.title).toContain('Open · Doubles');
    const before = all.filter((s) => s.date < '2026-12-12' && s.date >= '2026-11-28');
    expect(before.some((s) => s.type === 'sim' && s.description?.includes('partner'))).toBe(true);
    const proPrep = all.filter((s) => s.date < '2026-11-21' && s.date >= '2026-11-07' && s.type === 'strength');
    expect(proPrep.length).toBeGreaterThan(0);
    expect(proPrep.every((s) => s.description?.includes('Pro-gewichten'))).toBe(true);
    // a season A race in doubles becomes the target with its own division
    const q = profile({ raceDate: '2026-11-01', season: [{ id: 'a', name: 'Doubles A', date: '2027-03-06', goalSec: 3800, priority: 'A', category: 'doubles_mixed' }] });
    expect(currentProfile(q, '2026-11-10').category).toBe('doubles_mixed');
  });
});

describe('reading the athlete notes', () => {
  it('flags pain in the calf and stopping in Rick\'s note', async () => {
    const { readNotes } = await import('./notes');
    const r = readNotes('Ik ging echter harder want het schoot in mijn kuit waardoor ik niet hard kon doorrrennen. Pijn maximaal en lopen is niet meer mogelijk. Conclusie te hard gestart');
    expect(r?.pain).toBe(true);
    expect(r?.area).toBe('achilles');
    expect(r?.stopped).toBe(true);
    expect(r?.tooFast).toBe(true);
    expect(readNotes('Lekker gelopen, geen pijn, benen fris')?.pain).toBe(false);
    expect(readNotes('Felt strong, legs a bit heavy')?.pain).toBe(false);
  });
});

describe('injury mode', () => {
  it('replaces runs while a running area is "now" and walks back in afterwards', async () => {
    const { withInjuries } = await import('./injury');
    const flags = withInjuries({ achilles: false, quad: false, back: false, shin: false }, { achilles: 'now' }, undefined, '2026-10-17');
    const p = profile({ planStart: '2026-10-12', raceDate: '2027-02-20' }, { flags });
    const wk = generatePlan(p, { lang: 'nl', today: '2026-10-18' }).flatMap((w) => w.sessions).filter((s) => s.date >= '2026-10-19' && s.date <= '2026-10-25');
    for (const s of wk.filter((x) => ['threshold', 'easy', 'long', 'sim', 'intervals'].includes(x.type))) {
      expect(s.cross).toBe(true);
      expect(s.targetPaceSec ?? null).toBeNull();
    }
    const back = { ...p, athlete: { ...p.athlete, flags: withInjuries(flags, { achilles: 'recent' }, undefined, '2026-11-02') } };
    const w1 = generatePlan(back, { lang: 'nl', today: '2026-11-02' }).flatMap((w) => w.sessions).filter((s) => s.date >= '2026-11-02' && s.date <= '2026-11-08');
    expect(w1.some((s) => s.title.startsWith('Wandel-hardloop'))).toBe(true);
    expect(w1.some((s) => s.type === 'threshold' && !s.cross)).toBe(false);
  });
});

describe('places', () => {
  const gym = { id: 'g', name: 'Gym', kind: 'hyrox' as const, items: ['treadmill', 'rower', 'skierg', 'sled', 'wallball', 'sandbag', 'kettlebells', 'dumbbells'] as never[] };
  const home = { id: 'h', name: 'Thuis', kind: 'home' as const, items: ['bike', 'kettlebells'] as never[], maxKg: 16 };
  const p = profile({ planStart: '2026-10-12', raceDate: '2027-02-20', places: [gym, home], placeByDow: ['g', null, 'g', null, 'g', 'g', 'g'] });
  it('keeps the goal but adapts the exercises to the place', () => {
    const base = generatePlan(p, { lang: 'nl', today: '2026-10-18' }).flatMap((w) => w.sessions);
    const thr = base.find((s) => s.date >= '2026-10-19' && s.type === 'threshold')!;
    expect(thr.cross).toBeFalsy();
    expect(thr.description).toContain('loopband');
    const sim = base.find((s) => s.date >= '2026-10-19' && s.type === 'sim')!;
    const homeDay = { [thr.date]: 'h', [sim.date]: 'h' };
    const moved = generatePlan(p, { lang: 'nl', today: '2026-10-18', placeByDate: homeDay }).flatMap((w) => w.sessions);
    const thrHome = moved.find((s) => s.date === thr.date)!;
    expect(thrHome.cross).toBe(true);
    expect(thrHome.title).toContain('Drempel zonder lopen');
    expect(thrHome.description).toContain('fiets');
    expect(thrHome.placeChosen).toBe(true);
    const simHome = moved.find((s) => s.date === sim.date)!;
    expect(simHome.description).toContain('Bij Thuis');
    expect(simHome.description).toContain('kettlebell');
  });
});

describe('smart extra training', () => {
  it('coach picks strength when the week lacks it, respects budget and cold-bath timing', async () => {
    const { suggestExtra } = await import('./extra');
    const p = profile({ planStart: '2026-10-12', raceDate: '2027-02-20', weekSchedule: ['threshold', 'rest', 'wod', 'rest', 'rest', 'sim', 'recovery'] });
    const weeks = generatePlan(p, { lang: 'nl', today: '2026-10-19' });
    const ctx = { profile: p, weeks, logs: [], morning: {}, today: '2026-10-19', ceiling: 4, weakest: ['sledPush', 'wallballs'] as never[], lang: 'nl' as const,
      place: { id: 'h', name: 'Thuis', kind: 'home' as const, items: ['kettlebells', 'cold', 'sauna'] as never[], maxKg: 16 } };
    const thu = suggestExtra('2026-10-22', 'coach', ctx);
    expect(thu.session.type).toBe('strength');
    expect(thu.why).toContain('krachtmoment');
    expect(thu.session.description).toContain('Bij Thuis');
    expect(thu.session.description).not.toContain('Geen HYROX-materiaal');
    expect(thu.load?.pct).toBeGreaterThan(100);
    // recovery the day after the WOD in a build phase: no cold bath advice
    const rec = suggestExtra('2026-10-22', 'recovery', ctx);
    expect(rec.session.description).toContain('Liever geen koud bad');
    expect(rec.session.description).toContain('Sauna');
    // two extras already this week → budget is out
    const withExtras = weeks.map((w) => ({ ...w, sessions: w.sessions.map((s) => (s.date === '2026-10-20' || s.date === '2026-10-23' ? { ...s, type: 'easy' as const, extra: true, km: 6 } : s)) }));
    expect(suggestExtra('2026-10-22', 'cardio', { ...ctx, weeks: withExtras }).advice).toBe('rest');
  });
});
