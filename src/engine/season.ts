import { addDays, daysBetween, mondayOf } from './time';
import { tx } from './text';
import { z1Cap, z2Cap } from './zones';
import { generatePlan, applySharedSimDay, defaultSchedule, type PlanOptions } from './plan';
import { resolveSchedule } from './schedule';
import { isDoubles, isPro } from './raceModel';
import type { Category, Profile, RaceEvent, Session, Week } from './types';
import { rulesOf } from './rules';

const HARD: Session['type'][] = ['threshold', 'intervals', 'sim', 'long'];

/** Main race + season races, sorted by date (main race always priority A). */
export function allRaces(p: Profile): RaceEvent[] {
  const main: RaceEvent = { id: 'main', name: p.raceName, date: p.raceDate, goalSec: p.goalSec, priority: 'A', category: p.category };
  const seen = new Set<string>();
  return [main, ...(p.season ?? [])]
    .filter((r) => r.date && !seen.has(r.date) && seen.add(r.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The race the forecast and countdown should be about: the next A race (or the next race at all). */
export function currentProfile(p: Profile, today: string): Profile {
  const races = allRaces(p).filter((r) => r.date >= today);
  const target = races.find((r) => r.priority === 'A') ?? races[0];
  if (!target || target.date === p.raceDate) return p;
  const main: RaceEvent = { id: 'main', name: p.raceName, date: p.raceDate, goalSec: p.goalSec, priority: 'A', category: p.category };
  return {
    ...p,
    category: target.category ?? p.category,
    raceName: target.name,
    raceDate: target.date,
    goalSec: target.goalSec ?? p.goalSec,
    season: [main, ...(p.season ?? []).filter((r) => r.date !== target.date)],
  };
}

/** Segments are built towards every A race; a race after the last A race becomes the final target. */
function targets(p: Profile): RaceEvent[] {
  const races = allRaces(p).filter((r) => r.date >= p.planStart);
  const a = races.filter((r) => r.priority === 'A');
  const lastA = a[a.length - 1];
  const tail = races.filter((r) => !lastA || r.date > lastA.date);
  if (tail.length) a.push(tail[tail.length - 1]);
  return a;
}

/** Whole season: build → A race → recovery → build → next A race. B/C races are slotted into the weeks. */
export function generateSeason(p: Profile, opts: PlanOptions = {}): Week[] {
  const lang = opts.lang ?? 'en';
  const tg = targets(p);
  if (!tg.length) return [];
  const weeks: Week[] = [];
  let start = p.planStart;
  const a = p.athlete;
  const schedule = resolveSchedule(applySharedSimDay(p.weekSchedule?.length === 7 ? p.weekSchedule : defaultSchedule(5), opts.sharedSimDow));

  tg.forEach((race, i) => {
    if (mondayOf(race.date) < mondayOf(start)) return;
    const seg = generatePlan(
      { ...p, planStart: start, raceDate: race.date, raceName: race.name, goalSec: race.goalSec ?? p.goalSec, category: race.category ?? p.category },
      { ...opts, today: opts.today && opts.today > start ? opts.today : start },
    );
    weeks.push(...seg);
    const next = tg[i + 1];
    if (!next) return;
    // rest of the race week: recovery, then one easy week if there is room before the next build
    const last = weeks[weeks.length - 1];
    for (let d = addDays(race.date, 1); d < addDays(mondayOf(race.date), 7); d = addDays(d, 1)) {
      last.sessions.push(afterRace(d, daysBetween(race.date, d), schedule, p, lang));
    }
    start = addDays(mondayOf(race.date), 7);
    if (daysBetween(start, next.date) >= 28) {
      const sessions: Session[] = [];
      for (let k = 0; k < 7; k++) sessions.push(afterRace(addDays(start, k), daysBetween(race.date, addDays(start, k)), schedule, p, lang, race.name));
      weeks.push({ index: 0, start, phase: 'recovery', phaseWeek: 1, phaseLen: 1, deload: true, sessions });
      start = addDays(start, 7);
    }
  });

  // slot in B / C races (and A races that are not a segment target)
  const tset = new Set(tg.map((r) => r.date));
  const byDate = new Map(weeks.flatMap((w) => w.sessions.map((s) => [s.date, s] as const)));
  for (const r of allRaces(p).filter((x) => !tset.has(x.date))) {
    const day = byDate.get(r.date);
    if (!day) continue;
    const nextA = tg.find((x) => x.date > r.date);
    const wk = weeks.find((w) => w.sessions.includes(day))!;
    // the race replaces this week's sim
    for (const s of wk.sessions) if (s.type === 'sim' && s.date !== r.date) Object.assign(s, easy(s, p, lang));
    // the race is in another division than the build it sits in: prepare for that in the 2 weeks before
    const segCat: Category = nextA?.category ?? tg[tg.length - 1]?.category ?? p.category;
    const rCat: Category = r.category ?? p.category;
    if (rCat !== segCat) {
      const win = weeks.flatMap((w) => w.sessions).filter((s) => s.date < r.date && s.date >= addDays(r.date, -14));
      if (isDoubles(rCat) && !isDoubles(segCat)) {
        const sim = [...win].reverse().find((s) => s.type === 'sim');
        if (sim) sim.description = `${tx(lang, 'race.prep.doubles', { name: r.name })}\n${sim.description ?? ''}`;
      }
      if (isPro(rCat) && !isPro(segCat)) {
        for (const s of win.filter((x) => x.type === 'strength')) s.description = `${tx(lang, 'race.prep.pro', { name: r.name })}\n${s.description ?? ''}`;
      }
      if (!isDoubles(rCat) && isDoubles(segCat)) {
        const sim = [...win].reverse().find((s) => s.type === 'sim');
        if (sim) sim.description = `${tx(lang, 'race.prep.solo', { name: r.name })}\n${sim.description ?? ''}`;
      }
    }
    Object.assign(day, {
      type: 'race',
      title: `${r.priority} · ${tx(lang, 'race.title', { name: r.name })}${rCat !== p.category ? ` · ${tx(lang, `cat.${rCat}`)}` : ''}`,
      description: tx(lang, r.priority === 'C' ? 'race.c' : 'race.b', { target: nextA?.name ?? p.raceName }),
      targetPaceSec: null,
      hrCap: null,
      benchmark: undefined,
      benchmarkText: undefined,
    } as Partial<Session>);
    const before = byDate.get(addDays(r.date, -1));
    if (before && before.type !== 'rest') Object.assign(before, { type: 'easy', title: tx(lang, 'shake.title'), description: tx(lang, 'shake.desc'), hrCap: z1Cap(a.lthr, a.maxHr, rulesOf(p)), km: 3, targetPaceSec: null, benchmark: undefined, benchmarkText: undefined });
    const before2 = byDate.get(addDays(r.date, -2));
    if (r.priority === 'B' && before2 && HARD.includes(before2.type)) Object.assign(before2, easy(before2, p, lang));
    const after = byDate.get(addDays(r.date, 1));
    if (after && after.type !== 'rest') Object.assign(after, { type: 'recovery', title: tx(lang, 'rec.title'), description: tx(lang, 'race.after'), hrCap: z1Cap(a.lthr, a.maxHr, rulesOf(p)), km: undefined, targetPaceSec: null, benchmark: undefined, benchmarkText: undefined });
    const after2 = byDate.get(addDays(r.date, 2));
    if (r.priority === 'B' && after2 && HARD.includes(after2.type)) Object.assign(after2, easy(after2, p, lang));
  }
  return weeks.map((w, i) => ({ ...w, index: i + 1 }));
}

function easy(_s: Session, p: Profile, lang: Parameters<typeof tx>[0]): Partial<Session> {
  const cap = z2Cap(p.athlete.lthr, p.athlete.maxHr, rulesOf(p));
  const km = 5;
  return { type: 'easy', title: tx(lang, 'easy.title', { km }), description: tx(lang, 'easy.desc', { km, cap }), hrCap: cap, km, targetPaceSec: Math.round(p.athlete.thresholdPaceSec * rulesOf(p).pace.easyFactor), rpe: null, benchmark: undefined, benchmarkText: undefined, focusStations: undefined };
}

function afterRace(date: string, daysAfter: number, schedule: Session['type'][], p: Profile, lang: Parameters<typeof tx>[0], raceName?: string): Session {
  const dow = (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const base = { id: date, date, dow } as Session;
  const planned = schedule[dow];
  const a = p.athlete;
  if (planned === 'rest') return { ...base, type: 'rest', title: tx(lang, 'rest.title'), description: tx(lang, 'rest.desc') };
  if (daysAfter <= 2) return { ...base, type: 'recovery', title: tx(lang, 'rec.title'), description: tx(lang, 'race.after'), hrCap: z1Cap(a.lthr, a.maxHr, rulesOf(p)) };
  const e = easy(base, p, lang);
  return { ...base, ...e, description: (raceName ? tx(lang, 'rec.week', { name: raceName }) + '\n' : '') + e.description } as Session;
}
