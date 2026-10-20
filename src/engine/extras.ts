import { fmtHms, fmtMmss, addDays, daysBetween } from './time';
import { tx, STATION_NAMES, EXTRA_LOCALES, fillTpl } from './text';
import {
  DEFAULT_BASELINES,
  isDoubles,
  raceModel,
  soloStationTime,
  weightClass,
  DOUBLES_STATION_FACTOR,
  type BaselineTable,
} from './raceModel';
import type { Athlete, Category, Lang, Profile, Station, StationMap, Week } from './types';
import { STATIONS } from './types';

// ---------- radar profile (1–5 per axis) ----------
export type RadarAxis = 'engine' | 'durability' | 'sled' | 'grip' | 'explosive' | 'roxzone';
export const RADAR_AXES: RadarAxis[] = ['engine', 'durability', 'sled', 'grip', 'explosive', 'roxzone'];

/** Station score 1–5 from time relative to the mid-pack baseline (1.0 = 3, faster = higher). */
function stationScore(a: Athlete, c: Category, s: Station, base: BaselineTable) {
  const ratio = soloStationTime(a, c, s, base) / base[weightClass(c, a.sex)][s];
  return Math.max(1, Math.min(5, 3 + (1 - ratio) / 0.12));
}

export function radarScores(a: Athlete, c: Category, base: BaselineTable = DEFAULT_BASELINES): Record<RadarAxis, number> {
  const st = (s: Station) => stationScore(a, c, s, base);
  const avg = (...x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  // engine: threshold pace relative to sex-specific reference (men 4:45, women 5:15 = 3 points), ±20 s per point
  const ref = a.sex === 'woman' ? 315 : 285;
  const engine = Math.max(1, Math.min(5, 3 + (ref - a.thresholdPaceSec) / 20));
  const ratio = a.compromisedRatio ?? null;
  const durability = ratio ? Math.max(1, Math.min(5, 3 + (ratio - 0.87) / 0.025)) : avg(st('lunges'), st('wallballs'), st('burpees'), engine);
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    engine: r(engine),
    durability: r(durability),
    sled: r(avg(st('sledPush'), st('sledPull'))),
    grip: r(avg(st('farmers'), st('sledPull'))),
    explosive: r(avg(st('burpees'), st('wallballs'))),
    roxzone: r(avg(st('skierg'), st('row'), engine)),
  };
}

// ---------- station targets that fit the goal ----------
/** Station times that fit the goal given the projected run pace and roxzone, split in the athlete's own proportions. */
export function goalStationTargets(p: Profile, today: string, base: BaselineTable = DEFAULT_BASELINES): { budgetSec: number; targets: StationMap<number> } {
  const m = raceModel(p, today, base);
  const budgetSec = Math.max(8 * 45, p.goalSec - m.projected.runTotalSec - m.projected.roxzoneSec);
  const own = STATIONS.map((s) => soloStationTime(p.athlete, p.category, s, base) * (isDoubles(p.category) ? DOUBLES_STATION_FACTOR : 1));
  const tot = own.reduce((x, y) => x + y, 0);
  const targets = {} as StationMap<number>;
  STATIONS.forEach((s, i) => (targets[s] = Math.round((own[i] / tot) * budgetSec)));
  return { budgetSec, targets };
}

// ---------- weekly milestones ----------
export function weekMilestone(w: Week, p: Profile, lang: Lang): string | null {
  const T = p.athlete.thresholdPaceSec + (p.paceAdjustSec ?? 0);
  const b = w.sessions.find((s) => s.benchmark)?.benchmark;
  const M: Partial<Record<Lang, Record<string, string>>> & { en: Record<string, string> } = {
    en: {
      b1: `Target: 4 × 1000 m at ${fmtMmss(T - 4)}/km with HR ≤ ${p.athlete.lthr - 2}.`,
      b2: `Target: hold ${fmtMmss(T)}/km for 3 × 2000 m without passing your LTHR.`,
      b3: 'Target: log every split — run 8 within 12 s/km of run 1.',
      b4: 'Target: decay run 1 → run 8 below 12 s/km.',
      b5: `Target: full rehearsal at goal pace — finish ≤ ${fmtHms(p.goalSec)}.`,
      deload: 'Deload week: volume down ~30 %, keep the quality short.',
      taper: 'Taper (2 weeks): volume −40–60 %, same intensity and number of sessions. Last heavy strength 7–10 days out, last big sim 10–14 days out, carbs in the last 2 days. (Bosquet 2007, Travis 2020, Thomas 2016)',
    },
    nl: {
      b1: `Doel: 4 × 1000 m op ${fmtMmss(T - 4)}/km met HS ≤ ${p.athlete.lthr - 2}.`,
      b2: `Doel: ${fmtMmss(T)}/km vasthouden over 3 × 2000 m zonder boven je drempelhartslag te komen.`,
      b3: 'Doel: log elke split — run 8 binnen 12 s/km van run 1.',
      b4: 'Doel: verval run 1 → run 8 onder 12 s/km.',
      b5: `Doel: volledige generale repetitie op doeltempo — finish ≤ ${fmtHms(p.goalSec)}.`,
      deload: 'Rustweek: volume ~30 % omlaag, kwaliteit kort houden.',
      taper: 'Taper (2 weken): volume −40–60 %, zelfde intensiteit en aantal trainingen. Laatste zware kracht 7–10 dagen voor, laatste grote sim 10–14 dagen voor, koolhydraten de laatste 2 dagen. (Bosquet 2007, Travis 2020, Thomas 2016)',
    },
  };
  const extra = EXTRA_LOCALES[lang]?.milestones;
  const d: Record<string, string> = M[lang] ??
    (extra
      ? Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, fillTpl(v, { pace: fmtMmss(k === 'b1' ? T - 4 : T), cap: p.athlete.lthr - 2, goal: fmtHms(p.goalSec) })]))
      : M.en);
  if (b) return d[`b${b}`];
  if (w.deload) return d.deload;
  if (w.phase === 'taper') return d.taper;
  return null;
}

// ---------- plan check ----------
export interface PlanCheck {
  key: string;
  passed: boolean;
}
export function validatePlan(weeks: Week[], p: Profile, maxIncrease = 0.1): { score: number; checks: PlanCheck[] } {
  const all = weeks.flatMap((w) => w.sessions);
  const bms = new Set(all.map((s) => s.benchmark).filter(Boolean));
  const kmPerWeek = weeks.map((w) => w.sessions.reduce((n, s) => n + (s.km ?? 0), 0));
  let rampOk = true;
  for (let i = 1; i < kmPerWeek.length; i++) if (kmPerWeek[i - 1] > 0 && kmPerWeek[i] > kmPerWeek[i - 1] * (1 + maxIncrease) + 3) rampOk = false;
  const lastDays = all.filter((s) => daysBetween(s.date, p.raceDate) > 0 && daysBetween(s.date, p.raceDate) <= 6);
  const checks: PlanCheck[] = [
    { key: 'benchmarks', passed: bms.size >= Math.min(5, Math.max(1, Math.floor(weeks.length / 3))) },
    { key: 'taper', passed: lastDays.every((s) => s.type !== 'sim' && s.type !== 'strength' && s.type !== 'long') },
    { key: 'dayBefore', passed: all.filter((s) => s.date === addDays(p.raceDate, -1)).every((s) => s.type === 'rest' || (s.km ?? 0) <= 4) },
    { key: 'volumeRamp', passed: rampOk },
    { key: 'strength', passed: all.some((s) => s.type === 'strength') },
    { key: 'threshold', passed: all.some((s) => s.type === 'threshold') },
    { key: 'deload', passed: weeks.length < 6 || weeks.some((w) => w.deload || w.phase === 'taper') },
  ];
  return { score: Math.round((checks.filter((c) => c.passed).length / checks.length) * 100), checks };
}

// ---------- export ----------
export function planToMarkdown(weeks: Week[], p: Profile, lang: Lang) {
  const lines = [`# ${p.raceName} · ${p.raceDate}`, '', `Goal: ${fmtHms(p.goalSec)} · ${p.category}`, ''];
  for (const w of weeks) {
    lines.push(`## Week ${w.index} · ${tx(lang, `phase.${w.phase}`)}${w.deload ? ' (deload)' : ''}`);
    const ms = weekMilestone(w, p, lang);
    if (ms) lines.push(`> ${ms}`);
    for (const s of w.sessions) {
      if (s.type === 'rest') continue;
      const meta = [s.targetPaceSec ? `${fmtMmss(s.targetPaceSec)}/km` : '', s.hrCap ? `HR ≤ ${s.hrCap}` : '', s.rpe ? `RPE ${s.rpe}` : '', s.benchmark ? `Benchmark ${s.benchmark}` : '']
        .filter(Boolean)
        .join(' · ');
      lines.push(`- **${s.date}** ${s.title}${meta ? ` — ${meta}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export const stationLabel = (lang: Lang, s: Station) => STATION_NAMES[lang]?.[s] ?? STATION_NAMES.en[s];
