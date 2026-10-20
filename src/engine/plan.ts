import { fmtMmss, fmtHms, addDays, daysBetween, mondayOf, dowOf } from './time';
import { tx, STATION_NAMES, EXTRA_LOCALES, fillTpl } from './text';
import { z1Cap, z2Cap } from './zones';
import {
  effectiveThreshold,
  isDoubles,
  raceModel,
  stationWeights,
  trainingRacePace,
  type BaselineTable,
  DEFAULT_BASELINES,
} from './raceModel';
import type { CoachingRules, DayType, Lang, Phase, Profile, Session, Station, Week } from './types';
import { DEFAULT_RULES } from './types';
import { injuryNote, injuryProfile, prehabLine } from './injury';
import { adaptForInjury } from './rehab';
import { resolveSchedule } from './schedule';
import { substitutions } from './equipment';
import { adaptRunToPlace, placeFor, placeSubstitutions, type Place } from './places';
import { protocolSimText, protocolStep, simLoad } from './simProtocol';
import { STATIONS } from './types';

export const DEFAULT_SCHEDULES: Record<number, DayType[]> = {
  // 1 day: one compromised session that also carries the threshold stimulus
  1: ['rest', 'rest', 'rest', 'rest', 'rest', 'sim', 'rest'],
  2: ['threshold', 'rest', 'rest', 'rest', 'rest', 'sim', 'rest'],
  3: ['threshold', 'rest', 'strength', 'rest', 'rest', 'sim', 'rest'],
  4: ['threshold', 'rest', 'strength', 'rest', 'rest', 'sim', 'long'],
  5: ['threshold', 'easy', 'strength', 'rest', 'rest', 'sim', 'long'],
  6: ['threshold', 'easy', 'strength', 'rest', 'easy', 'sim', 'long'],
  7: ['threshold', 'easy', 'strength', 'recovery', 'easy', 'sim', 'long'],
};

export function defaultSchedule(days: number): DayType[] {
  const d = Math.max(1, Math.min(7, Math.round(days)));
  return [...DEFAULT_SCHEDULES[d]];
}

/** Move the sim to the team's shared day (swap with whatever was there). */
export function applySharedSimDay(schedule: DayType[], dow: number | null | undefined): DayType[] {
  if (dow == null || dow < 0 || dow > 6) return schedule;
  const s = [...schedule];
  const cur = s.indexOf('sim');
  if (cur === dow) return s;
  if (cur >= 0) s[cur] = s[dow] === 'rest' ? 'rest' : s[dow];
  s[dow] = 'sim';
  return s;
}

/** Phase per plan week for a plan of n weeks (last week = race week). */
export function allocatePhases(n: number): Phase[] {
  const out: Phase[] = [];
  const push = (p: Phase, k: number) => {
    for (let i = 0; i < k; i++) out.push(p);
  };
  if (n >= 16) {
    push('prep', n - 16);
    push('base', 4);
    push('threshold', 4);
    push('compromised', 4);
    push('peak', 2);
    push('taper', 2);
    return out;
  }
  if (n >= 8) {
    const taper = 2;
    const peak = n >= 12 ? 2 : 1;
    const r = n - taper - peak;
    const comp = Math.ceil(r / 3);
    const thr = Math.ceil((r - comp) / 2);
    const base = r - comp - thr;
    push('base', base);
    push('threshold', thr);
    push('compromised', comp);
    push('peak', peak);
    push('taper', taper);
    return out;
  }
  if (n >= 4) {
    const r = n - 2;
    const comp = Math.ceil(r / 2);
    push('threshold', r - comp);
    push('compromised', comp);
    push('peak', 1);
    push('taper', 1);
    return out;
  }
  if (n === 3) return ['threshold', 'compromised', 'taper'];
  if (n === 2) return ['compromised', 'taper'];
  return ['taper'];
}

/** Map a week within a (possibly compressed) phase to the 1..4 template step. */
const step = (phaseWeek: number, phaseLen: number, steps = 4) =>
  Math.min(steps, Math.max(1, Math.ceil((phaseWeek / phaseLen) * steps)));

interface Ctx {
  p: Profile;
  lang: Lang;
  rules: CoachingRules;
  T: number;
  lthr: number;
  maxHr: number;
  racePace: number;
  simBasePace: number;
  weekKm: number;
  weakest: Station[];
  inj: ReturnType<typeof injuryProfile>;
  /** no threshold run in the week → the sim carries threshold work */
  combo?: boolean;
  /** no sim in the week → threshold sessions get a compromised add-on */
  noSim?: boolean;
  /** this week's step of the gym sim protocol */
  simStep?: ReturnType<typeof protocolStep> | null;
  model: ReturnType<typeof raceModel>;
  /** place of the session being built (null = legacy equipment setting) */
  place?: Place | null;
}

/** Race-day text: the pace, what it adds up to, and whether that reaches the goal. */
function raceDayText(c: Ctx) {
  const m = c.model;
  const at = Math.round(c.racePace * 8 + m.projected.stationTotalSec + m.projected.roxzoneSec);
  const lines = [tx(c.lang, 'race.desc', { pace: fmtMmss(c.racePace) })];
  if (at <= c.p.goalSec + 15) lines.push(tx(c.lang, 'race.ok', { t: fmtHms(at), goal: fmtHms(c.p.goalSec) }));
  else
    lines.push(
      tx(c.lang, 'race.gap', { goal: fmtHms(c.p.goalSec), req: fmtMmss(Math.max(150, m.requiredRunPaceSec)), pace: fmtMmss(c.racePace), t: fmtHms(at) }),
    );
  lines.push(tx(c.lang, at > 75 * 60 ? 'race.fuel.long' : 'race.fuel.short', gRange(c, 1, 4)));
  return lines.join('\n');
}
const gRange = (c: Ctx, lo: number, hi: number) => {
  const kg = c.p.athlete.weightKg;
  return kg ? { lo: String(Math.round(kg * lo)), hi: `${Math.round(kg * hi)} g` } : { lo: String(lo), hi: `${hi} g/kg` };
};
/** Carbohydrate guidance for the last 1–2 days (Thomas, Erdman & Burke 2016). */
function carbText(c: Ctx) {
  const kg = c.p.athlete.weightKg;
  return kg ? tx(c.lang, 'carb.kg', { lo: Math.round(kg * 7), hi: Math.round(kg * 10), kg }) : tx(c.lang, 'carb.gen');
}

function restLabel(lang: Lang, s: number) {
  return s >= 60 ? `${s / 60} ${tx(lang, 'rest.min')}` : `${s} ${tx(lang, 'rest.s')}`;
}

function thresholdSession(c: Ctx, phase: Phase, st: number, deload: boolean, raceWeek: boolean): Partial<Session> {
  const { T } = c;
  type Rx = { n: number; d: number; off: number; rest: number };
  let rx: Rx;
  if (raceWeek) rx = { n: 4, d: 400, off: -15, rest: 120 };
  else if (deload) rx = { n: 4, d: 1000, off: -3, rest: 90 };
  else {
    const table: Record<Exclude<Phase, 'recovery'>, Rx[]> = {
      prep: [
        { n: 4, d: 1000, off: 5, rest: 120 },
        { n: 5, d: 1000, off: 5, rest: 120 },
        { n: 6, d: 1000, off: 3, rest: 120 },
        { n: 4, d: 1000, off: 3, rest: 90 },
      ],
      base: [
        { n: 5, d: 1000, off: 0, rest: 90 },
        { n: 6, d: 800, off: -5, rest: 90 },
        { n: 5, d: 1000, off: -3, rest: 90 },
        { n: 4, d: 1000, off: -4, rest: 90 },
      ],
      threshold: [
        { n: 5, d: 1000, off: -5, rest: 90 },
        { n: 4, d: 1600, off: -3, rest: 120 },
        { n: 3, d: 2000, off: 0, rest: 120 },
        { n: 4, d: 1000, off: -4, rest: 90 },
      ],
      compromised: [
        { n: 4, d: 1500, off: -3, rest: 90 },
        { n: 5, d: 1000, off: -5, rest: 60 },
        { n: 2, d: 3000, off: 0, rest: 180 },
        { n: 6, d: 1000, off: -6, rest: 60 },
      ],
      peak: [
        { n: 3, d: 2000, off: -3, rest: 120 },
        { n: 4, d: 1000, off: -5, rest: 90 },
        { n: 3, d: 2000, off: -3, rest: 120 },
        { n: 4, d: 1000, off: -5, rest: 90 },
      ],
      taper: [
        { n: 4, d: 1000, off: -3, rest: 120 },
        { n: 4, d: 1000, off: -3, rest: 120 },
        { n: 4, d: 400, off: -15, rest: 120 },
        { n: 4, d: 400, off: -15, rest: 120 },
      ],
    };
    rx = table[phase === 'recovery' ? 'base' : phase][st - 1];
  }
  const pace = T + rx.off;
  const reps = `${rx.n} × ${rx.d} m @ ${fmtMmss(pace)}/km`;
  const fast = rx.off < -6;
  const km = Math.round((rx.n * rx.d) / 1000 + 4);
  const addon = c.noSim && (phase === 'compromised' || phase === 'peak') && !raceWeek ? '\n' + tx(c.lang, 'thr.compAddon', { pace: fmtMmss(c.racePace) }) : '';
  return {
    type: 'threshold',
    title: tx(c.lang, 'thr.title', { reps }),
    description: tx(c.lang, fast ? 'thr.desc.fast' : 'thr.desc', { reps, rest: restLabel(c.lang, rx.rest), rpe: '8/10' }) + addon,
    targetPaceSec: pace,
    hrCap: fast ? null : Math.min(Math.round(c.lthr * c.rules.thresholdCapPctLthr), c.maxHr),
    rpe: fast ? '8/10' : null,
    warmup: tx(c.lang, 'thr.warmup'),
    km,
  };
}

function intervalSession(c: Ctx, phase: Phase, raceWeek: boolean): Partial<Session> {
  const rx = raceWeek || phase === 'taper' ? { n: 6, d: 200, off: -20, rest: 60 } : phase === 'prep' || phase === 'base' ? { n: 8, d: 400, off: -15, rest: 60 } : { n: 6, d: 800, off: -12, rest: 90 };
  const reps = `${rx.n} × ${rx.d} m @ ${fmtMmss(c.T + rx.off)}/km`;
  return {
    type: 'intervals',
    title: tx(c.lang, 'int.title', { reps }),
    description: tx(c.lang, 'int.desc', { reps, rest: restLabel(c.lang, rx.rest), rpe: '8–9/10' }),
    targetPaceSec: c.T + rx.off,
    rpe: '8–9/10',
    warmup: tx(c.lang, 'thr.warmup'),
    km: Math.round((rx.n * rx.d) / 1000 + 4),
  };
}

function easySession(c: Ctx, km: number): Partial<Session> {
  const cap = z2Cap(c.lthr, c.maxHr);
  return {
    type: 'easy',
    title: tx(c.lang, 'easy.title', { km }),
    description:
      tx(c.lang, 'easy.desc', { km, cap }) +
      (c.p.athlete.archetype === 'strength' ? tx(c.lang, 'easy.extra') : '') +
      (c.inj.noSpeed ? injuryNote(c.lang, 'noSpeed') : '') +
      (c.inj.runLoad === 'now' ? injuryNote(c.lang, 'pain') : ''),
    targetPaceSec: Math.round(c.T * 1.22),
    hrCap: cap,
    km,
  };
}

function longSession(c: Ctx, km: number, phase: Phase): Partial<Session> {
  const cap = z2Cap(c.lthr, c.maxHr);
  const rp = phase === 'compromised' || phase === 'peak';
  return {
    type: 'long',
    title: tx(c.lang, 'long.title', { km }),
    description: tx(c.lang, rp ? 'long.desc.rp' : 'long.desc', { km, cap, rp: fmtMmss(c.racePace) }) + (c.inj.runLoad === 'now' ? injuryNote(c.lang, 'pain') : ''),
    targetPaceSec: Math.round(c.T * 1.25),
    hrCap: cap,
    km,
  };
}

const EX: Partial<Record<Lang, Record<Station, (kg: ReturnType<typeof stationWeights>) => string>>> & { en: Record<Station, (kg: ReturnType<typeof stationWeights>) => string> } = {
  en: {
    sledPush: (w) => `Heavy sled push 5 × 15 m at ~${Math.round(w.sledPush * 1.15)} kg total, 2 min rest`,
    sledPull: (w) => `Sled pull 5 × 12.5 m hand-over-hand at ${w.sledPull} kg + 3 × 10 bent-over rows`,
    lunges: (w) => `Sandbag walking lunges 4 × 25 m @ ${w.lunges} kg + 3 × 8 Bulgarian split squats each leg`,
    wallballs: (w) => `Wall balls EMOM 10 min: 12–15 reps @ ${w.wallball} kg + 3 × 5 front squats`,
    farmers: (w) => `Farmers carry 4 × 50 m @ 2 × ${w.farmers} kg, no drops + 3 × 30 s dead hang`,
    burpees: () => `Burpee broad jumps 4 × 10 reps at steady rhythm + 3 × 6 broad jumps`,
    row: () => `Row 5 × 250 m hard, 1 min rest + 3 × 10 Romanian deadlifts`,
    skierg: () => `SkiErg 6 × 200 m at race effort, 45 s rest + 3 × 10 straight-arm pulldowns`,
  },
  nl: {
    sledPush: (w) => `Zware sled push 5 × 15 m op ~${Math.round(w.sledPush * 1.15)} kg totaal, 2 min rust`,
    sledPull: (w) => `Sled pull 5 × 12,5 m hand-over-hand op ${w.sledPull} kg + 3 × 10 bent-over rows`,
    lunges: (w) => `Sandbag walking lunges 4 × 25 m @ ${w.lunges} kg + 3 × 8 Bulgarian split squats per been`,
    wallballs: (w) => `Wall balls EMOM 10 min: 12–15 reps @ ${w.wallball} kg + 3 × 5 front squats`,
    farmers: (w) => `Farmers carry 4 × 50 m @ 2 × ${w.farmers} kg, niet neerzetten + 3 × 30 s hangen`,
    burpees: () => `Burpee broad jumps 4 × 10 reps in vast ritme + 3 × 6 broad jumps`,
    row: () => `Roeien 5 × 250 m hard, 1 min rust + 3 × 10 Roemeense deadlifts`,
    skierg: () => `SkiErg 6 × 200 m op race-inspanning, 45 s rust + 3 × 10 straight-arm pulldowns`,
  },
};

function strengthSession(c: Ctx, phase: Phase): Partial<Session> {
  const a = c.p.athlete;
  const w = stationWeights(c.p.category, a.sex);
  const avoid = new Set<Station>([...c.inj.avoidFocus, ...(a.flags.achilles ? (['burpees'] as Station[]) : [])]);
  const focus = c.weakest.filter((s) => !avoid.has(s)).slice(0, 2);
  if (!focus.length) focus.push((['sledPush', 'row', 'skierg'] as Station[]).find((s) => !avoid.has(s)) ?? 'row');
  const names = focus.map((s) => (STATION_NAMES[c.lang] ?? STATION_NAMES.en)[s]).join(' + ');
  const descKey = phase === 'prep' ? 'str.desc.base' : phase === 'recovery' ? 'str.desc.taper' : `str.desc.${phase}`;
  const lines = [tx(c.lang, descKey), ...(a.archetype === 'strength' ? [tx(c.lang, 'str.maintenance')] : []), ...focus.map((s) => {
      const tpl = EXTRA_LOCALES[c.lang]?.strength[s];
      return '• ' + (tpl ? fillTpl(tpl, { push: Math.round(w.sledPush * 1.15), pull: w.sledPull, lunges: w.lunges, wb: w.wallball, farmers: w.farmers }) : (EX[c.lang] ?? EX.en)[s](w));
    }), '• ' + tx(c.lang, 'str.core')];
  for (const area of c.inj.prehab.slice(0, 2)) lines.push('• ' + prehabLine(c.lang, area));
  lines.push(...(c.place ? placeSubstitutions(c.lang, c.place, focus) : substitutions(c.lang, c.p.equipment, focus)));
  return {
    type: 'strength',
    title: tx(c.lang, 'str.title', { stations: names }),
    description: lines.join('\n'),
    focusStations: focus,
    rpe: phase === 'taper' ? '5/10' : '7–8/10',
  };
}

/** Station strength outside the generated plan (extra session added by the athlete). */
export function stationStrengthSession(p: Profile, lang: Lang, phase: Phase, weakest: Station[], place: Place | null = null): Partial<Session> {
  const c = { p, lang, weakest, inj: injuryProfile(p.athlete.flags), place } as unknown as Ctx;
  return strengthSession(c, phase);
}

function simSession(c: Ctx, phase: Phase, st: number, full: boolean): Partial<Session> {
  const doubles = isDoubles(c.p.category);
  const fmt = tx(c.lang, doubles ? 'sim.fmt.doubles' : 'sim.fmt.solo');
  const decay = c.rules.eliteMaxDecaySec;
  let body: string;
  let pace: number;
  if (phase === 'prep' || phase === 'base') {
    pace = c.simBasePace + 15;
    body = tx(c.lang, 'sim.base', { pace: fmtMmss(pace) });
  } else if (phase === 'threshold') {
    pace = c.simBasePace + 5;
    body = tx(c.lang, 'sim.threshold', { pace: fmtMmss(pace) });
  } else if (phase === 'compromised') {
    pace = st <= 2 ? c.racePace + 5 : c.racePace;
    body = tx(c.lang, 'sim.compromised', { pace: fmtMmss(pace), decay });
  } else if (phase === 'peak') {
    pace = c.racePace;
    body = full
      ? tx(c.lang, 'sim.peak.full', { pace: fmtMmss(pace) })
      : tx(c.lang, 'sim.peak.blocks', { pace: fmtMmss(pace), stations: c.weakest.map((s) => (STATION_NAMES[c.lang] ?? STATION_NAMES.en)[s]).join(', ') });
  } else {
    pace = c.racePace;
    body = tx(c.lang, 'sim.taper', { pace: fmtMmss(pace) });
  }
  const fmtLine = doubles
    ? tx(c.lang, 'sim.doubles', { ski: c.rules.skiShiftM, sled: c.rules.sledShiftM, wb: c.rules.wallBallSet })
    : tx(c.lang, 'sim.solo');
  const subs = c.place
    ? placeSubstitutions(c.lang, c.place, [...STATIONS])
    : substitutions(c.lang, c.p.equipment, c.p.equipment === 'home' ? STATIONS.filter((x) => x !== 'burpees') : ['skierg', 'sledPush', 'sledPull', 'wallballs']);
  const combo = c.combo && phase !== 'taper' ? tx(c.lang, 'sim.combo', { pace: fmtMmss(c.T) }) + '\n' : '';
  if (c.p.simProtocol && c.simStep) {
    const st = c.simStep;
    const ppace = st.run <= 50 ? c.racePace - 10 : st.run > 100 ? c.racePace + 5 : c.racePace;
    const pt = protocolSimText(c.p.simProtocol, st, { lang: c.lang, pace: ppace, doubles, raceName: c.p.raceName });
    return {
      type: 'sim',
      title: tx(c.lang, 'sim.title', { format: fmt }),
      description: [combo + pt.lines.join('\n'), ...subs].join('\n'),
      targetPaceSec: ppace,
      rpe: simLoad(st) <= 0.5 ? '7/10' : '8/10',
      km: pt.km,
    };
  }
  return {
    type: 'sim',
    title: tx(c.lang, 'sim.title', { format: fmt }),
    description: [combo + body, fmtLine, ...subs].join('\n'),
    targetPaceSec: pace,
    rpe: phase === 'taper' ? '6/10' : '8/10',
    km: phase === 'peak' && full ? 8 : phase === 'compromised' ? 6 : 4,
  };
}

export interface PlanOptions {
  lang?: Lang;
  rules?: CoachingRules;
  baselines?: BaselineTable;
  /** dates with a morning stiffness score at/above the guard ceiling -> score */
  flare?: Record<string, number>;
  /** doubles: shared sim day (0 = Monday) */
  sharedSimDow?: number | null;
  /** used to compute the race pace for training; defaults to planStart */
  today?: string;
  /** place chosen for a single session (date → place id) */
  placeByDate?: Record<string, string>;
}

const IMPACT: Session['type'][] = ['threshold', 'intervals', 'easy', 'long', 'sim', 'wod'];

export function generatePlan(p: Profile, opts: PlanOptions = {}): Week[] {
  const lang = opts.lang ?? 'en';
  const rules = opts.rules ?? DEFAULT_RULES;
  const today = opts.today ?? p.planStart;
  const start = mondayOf(p.planStart);
  const raceWeekStart = mondayOf(p.raceDate);
  const n = Math.floor(daysBetween(start, raceWeekStart) / 7) + 1;
  if (n < 1 || daysBetween(start, p.raceDate) < 0) return [];

  const model = raceModel(p, today, opts.baselines ?? DEFAULT_BASELINES);
  const a = p.athlete;
  const T = effectiveThreshold(p);
  const c: Ctx = {
    p,
    lang,
    rules,
    T,
    lthr: a.lthr,
    maxHr: a.maxHr,
    racePace: trainingRacePace(model),
    simBasePace: model.current.runPaceSec,
    weekKm: 0,
    weakest: model.weakestStations,
    inj: injuryProfile(a.flags),
    model,
  };
  const phases = allocatePhases(n);
  const schedule = resolveSchedule(applySharedSimDay(p.weekSchedule?.length === 7 ? p.weekSchedule : defaultSchedule(5), opts.sharedSimDow), {
    runLoad: c.inj.runLoad,
  });
  c.combo = !schedule.includes('threshold') && !schedule.includes('intervals');
  c.noSim = !schedule.includes('sim');
  const noStrength = !schedule.includes('strength');

  // running volume
  const startKm = a.weeklyKm && a.weeklyKm > 0 ? a.weeklyKm : T >= 330 ? 15 : T >= 285 ? 22 : T >= 240 ? 32 : 42;
  // strength athletes: the running engine is the limiter → more room to build aerobic volume
  // current / recent running injuries: slower ramp and a lower ceiling
  const peakKm = startKm * Math.min(a.archetype === 'strength' ? 1.6 : 1.4, c.inj.peakCap);
  let km = startKm;

  // benchmark weeks
  const lastIdx = (ph: Phase) => phases.lastIndexOf(ph);
  const firstIdx = (ph: Phase) => phases.indexOf(ph);
  const lenOf = (ph: Phase) => phases.filter((x) => x === ph).length;
  const bWeek: Record<number, number> = {};
  if (lastIdx('base') >= 0) bWeek[1] = lastIdx('base');
  else if (firstIdx('threshold') >= 0) bWeek[1] = firstIdx('threshold');
  if (lenOf('threshold') >= 2) bWeek[2] = firstIdx('threshold') + Math.max(1, lenOf('threshold') - 2);
  if (lenOf('compromised') >= 2) {
    bWeek[3] = firstIdx('compromised') + Math.floor((lenOf('compromised') - 1) / 2);
    bWeek[4] = lastIdx('compromised');
  } else if (lenOf('compromised') === 1) bWeek[3] = firstIdx('compromised');
  if (firstIdx('peak') >= 0) bWeek[5] = firstIdx('peak');

  const weeks: Week[] = [];
  for (let wi = 0; wi < n; wi++) {
    const phase = phases[wi];
    const phaseStart = phases.indexOf(phase);
    const phaseLen = lenOf(phase);
    const phaseWeek = wi - phaseStart + 1;
    const st = phase === 'prep' ? ((phaseWeek - 1) % 4) + 1 : step(phaseWeek, phaseLen);
    const deload =
      (phase === 'prep' && phaseWeek % 4 === 0) ||
      ((phase === 'base' || phase === 'threshold') && phaseLen >= 4 && phaseWeek === phaseLen);
    const raceWeek = wi === n - 1;
    c.simStep = p.simProtocol ? protocolStep(p.simProtocol, n - 1 - wi) : null;
    const heavySim = !!c.simStep && simLoad(c.simStep) >= 1 && schedule.includes('sim');
    // volume progression
    if (wi > 0 && !deload && phase !== 'taper') km = Math.min(peakKm, km * (1 + rules.maxWeeklyVolumeIncrease * 0.6 * c.inj.rampFactor));
    let weekKm = km;
    if (deload) weekKm = km * 0.7;
    if (phase === 'taper') weekKm = raceWeek ? km * 0.4 : km * 0.65;
    c.weekKm = weekKm;

    const weekStart = addDays(start, wi * 7);
    const sessions: Session[] = [];
    let thresholdUsed = false;
    let simUsed = false;
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const base = { id: date, date, dow: d } as Session;
      // where this session happens (only for today and later; history keeps its text)
      c.place = date >= today ? placeFor(p.places, p.placeByDow, opts.placeByDate?.[date], d) : null;
      const toRace = daysBetween(date, p.raceDate);
      if (toRace < 0) continue;
      if (toRace === 0) {
        sessions.push({
          ...base,
          type: 'race',
          title: tx(lang, 'race.title', { name: p.raceName || 'HYROX' }),
          description: raceDayText(c),
          targetPaceSec: c.racePace,
          sourceKey: 'Thomas',
        });
        continue;
      }
      let type: DayType = schedule[d];
      // race-week safety: nothing hard in the last days
      if (toRace === 1) {
        if (type !== 'rest') {
          sessions.push({ ...base, type: 'easy', title: tx(lang, 'shake.title'), description: tx(lang, 'shake.desc') + '\n' + carbText(c), hrCap: z1Cap(a.lthr, a.maxHr), km: 3, sourceKey: 'Harrison' });
        } else sessions.push({ ...base, type: 'rest', title: tx(lang, 'rest.title'), description: tx(lang, 'rest.desc') + '\n' + carbText(c), sourceKey: 'Thomas' });
        continue;
      }
      if (toRace === 2) type = 'rest';
      // race week: no big sim, long run or heavy lifting, but keep the number of sessions (frequency cut ≤ 20 %)
      const raceWeekEasy = toRace <= 6 && (type === 'sim' || type === 'long' || type === 'intervals');
      if (raceWeekEasy) type = 'easy';

      let s: Partial<Session>;
      switch (type) {
        case 'threshold':
          s = thresholdSession(c, phase, st, deload, raceWeek);
          if (!thresholdUsed) {
            if (bWeek[1] === wi && !raceWeek) {
              s.benchmark = 1;
              s.benchmarkText = tx(lang, 'b1', { pace: fmtMmss(T - 4), cap: Math.min(a.lthr - 2, a.maxHr) });
              const reps = `4 × 1000 m @ ${fmtMmss(T - 4)}/km`;
              s.title = tx(lang, 'thr.title', { reps });
              s.description = tx(lang, 'thr.desc', { reps, rest: restLabel(lang, 90) });
              s.targetPaceSec = T - 4;
              s.hrCap = a.lthr - 2;
            } else if (bWeek[2] === wi && !raceWeek) {
              s.benchmark = 2;
              s.benchmarkText = tx(lang, 'b2', { pace: fmtMmss(T) });
              const reps = `3 × 2000 m @ ${fmtMmss(T)}/km`;
              s.title = tx(lang, 'thr.title', { reps });
              s.description = tx(lang, 'thr.desc', { reps, rest: restLabel(lang, 120) });
              s.targetPaceSec = T;
              s.hrCap = Math.min(Math.round(a.lthr * rules.thresholdCapPctLthr), a.maxHr);
            }
          }
          thresholdUsed = true;
          break;
        case 'intervals':
          if (c.inj.noSpeed) {
            s = thresholdSession(c, phase === 'taper' ? 'taper' : 'base', st, deload, raceWeek);
            s.description = injuryNote(lang, 'intSwap') + '\n' + s.description;
          } else s = intervalSession(c, phase, raceWeek);
          break;
        case 'easy':
          s = easySession(c, Math.max(4, Math.round(weekKm * (raceWeekEasy ? 0.15 : 0.2))));
          if (raceWeekEasy) {
            s.description = tx(lang, 'taper.easy', { pace: fmtMmss(c.racePace) }) + '\n' + s.description;
            s.sourceKey = 'Mujika';
          }
          break;
        case 'long':
          // a race-size sim this week already carries a lot of running → shorter long run
          s = longSession(c, Math.max(6, Math.min(a.sex === 'woman' ? 16 : 18, Math.round(weekKm * 0.32 * (heavySim ? 0.75 : 1)))), phase);
          break;
        case 'strength':
          if (phase === 'taper' && toRace >= 7) {
            // last heavy session 7–10 days out: same load, half the sets (Travis et al. 2020)
            s = strengthSession(c, 'peak');
            s.description = tx(lang, 'str.taper.last') + '\n' + s.description;
            s.sourceKey = 'Travis et al. (2020)';
          } else if (toRace <= 6) {
            s = strengthSession(c, 'taper');
            s.description = tx(lang, 'str.taper.light') + '\n' + s.description;
            s.sourceKey = 'Travis et al. (2020)';
          } else s = strengthSession(c, heavySim ? 'taper' : phase);
          break;
        case 'sim': {
          const full = bWeek[5] === wi;
          if (phase === 'taper' && toRace >= 10 && !c.simStep) {
            // last big sim 10–14 days out (race-level strain, Brandt et al. 2025), then only short sharp blocks
            s = simSession(c, 'peak', st, false);
            s.description = tx(lang, 'sim.taper.last') + '\n' + s.description;
          } else {
            s = simSession(c, phase, st, full);
            if (phase === 'taper') s.description = tx(lang, 'sim.taper.short') + '\n' + s.description;
          }
          if (phase === 'taper') s.sourceKey = 'Bosquet';
          if (!simUsed) {
            for (const b of [3, 4, 5] as const) {
              if (bWeek[b] === wi) {
                s.benchmark = b;
                s.benchmarkText = tx(lang, `b${b}`, { decay: rules.eliteMaxDecaySec });
              }
            }
          }
          if (opts.sharedSimDow === d && isDoubles(p.category)) {
            s.sharedTeamDay = true;
            s.description += '\n' + tx(lang, 'sim.team');
          }
          simUsed = true;
          break;
        }
        case 'wod':
          s = { type: 'wod', title: tx(lang, 'wod.title'), description: toRace <= 6 ? tx(lang, 'wod.raceweek') : tx(lang, 'wod.desc'), rpe: toRace <= 6 ? '5/10' : null };
          // no strength day in the week: research says 2×/week (1× to maintain) – make this the strength moment
          if (noStrength && phase !== 'taper') {
            s.description += '\n' + tx(lang, 'str.missing');
            s.sourceKey = 'Blagrove';
          }
          break;
        case 'recovery':
          s = {
            type: 'recovery',
            title: tx(lang, 'rec.title'),
            description: tx(lang, 'rec.desc', { cap: z1Cap(a.lthr, a.maxHr) }) + (a.flags.achilles ? tx(lang, 'rec.achilles') : ''),
            hrCap: z1Cap(a.lthr, a.maxHr),
          };
          break;
        default:
          s = { type: 'rest', title: tx(lang, 'rest.title'), description: tx(lang, 'rest.desc') };
      }
      // injury mode: no running while a running area is "now"; walk-run return afterwards
      const inj = adaptForInjury({ lang, flags: a.flags, lthr: a.lthr, maxHr: a.maxHr, T }, s, date, today, { taper: phase === 'taper' });
      if (inj) s = { ...s, ...inj };
      if (c.place && s.type !== 'rest') {
        const run = adaptRunToPlace(lang, s, c.place, { lthr: a.lthr, maxHr: a.maxHr, T, z2: z2Cap(a.lthr, a.maxHr) });
        if (run) s = { ...s, ...run };
        s.placeName = c.place.name;
        s.placeChosen = !!opts.placeByDate?.[date];
      }
      if (s.cross) s.warmup = undefined;
      let session: Session = { ...base, ...s, deload } as Session;
      if (phase === 'taper' && !session.sourceKey && session.type !== 'rest') session.sourceKey = 'Bosquet';
      if (s.type !== 'rest' && s.type !== 'recovery' && s.type !== 'strength') session.tip = tx(lang, `tip.${a.archetype}`);
      const score = opts.flare?.[date];
      if (score !== undefined && score >= rules.achillesStiffnessCeiling && IMPACT.includes(session.type)) {
        session = {
          ...base,
          type: 'recovery',
          title: tx(lang, 'guard.title'),
          description: tx(lang, 'guard.desc', { score, orig: session.title }),
          hrCap: z2Cap(a.lthr, a.maxHr),
          guard: true,
        };
      }
      sessions.push(session);
    }
    weeks.push({ index: wi + 1, start: weekStart, phase, phaseWeek, phaseLen, deload, sessions });
  }
  return weeks;
}

export const phaseLabel = (lang: Lang, ph: Phase) => tx(lang, `phase.${ph}`);

/** Compliance over all past training sessions (rest days excluded). */
export function compliance(weeks: Week[], completed: Record<string, boolean>, today: string, from = '0000-00-00') {
  const due = weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.date >= from && (s.date < today || (s.date === today && completed[s.date])) && s.type !== 'rest' && s.type !== 'race')
    // extra sessions the athlete added only count once they are done
    .filter((s) => !s.extra || completed[s.date]);
  if (!due.length) return null;
  return Math.round((due.filter((s) => completed[s.date]).length / due.length) * 100);
}

export const weekOf = (weeks: Week[], date: string) => weeks.find((w) => date >= w.start && date <= addDays(w.start, 6));
export { dowOf };
