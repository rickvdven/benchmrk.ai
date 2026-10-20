import { fmtMmss } from './time';
import { STATION_NAMES } from './text';
import type { Lang, Station } from './types';
import { STATIONS } from './types';

/**
 * A gym's own way of building sims towards a race.
 * Percentages are of the race distance per run (1 km) and of the full station volume per athlete.
 * Blocks are chronological and end in the week before the race week; earlier weeks use `offSeason`.
 */
export interface SimBlock {
  weeks: number;
  run: number; // % of 1 km
  station: number; // % of the full station volume (per athlete)
}
export interface SimProtocol {
  name: string;
  rounds: number; // 8 = all stations once
  offSeason: { run: number; station: number };
  blocks: SimBlock[];
  note?: string;
}

/** Gym Groesbeek: 8 rounds at 50/50 outside the race window; 12-week build to 125 % run with 100 % stations; last week 50/50. */
export const GROESBEEK: SimProtocol = {
  name: 'Gym Groesbeek',
  rounds: 8,
  offSeason: { run: 50, station: 50 },
  blocks: [
    { weeks: 3, run: 50, station: 50 },
    { weeks: 2, run: 75, station: 50 },
    { weeks: 2, run: 75, station: 75 },
    { weeks: 1, run: 100, station: 75 },
    { weeks: 2, run: 100, station: 100 },
    { weeks: 1, run: 125, station: 100 },
    { weeks: 1, run: 50, station: 50 },
  ],
};

/** Full race volume per station (per athlete in solo). */
const FULL: Record<Station, { v: number; unit: 'm' | 'reps'; step: number }> = {
  skierg: { v: 1000, unit: 'm', step: 50 },
  sledPush: { v: 50, unit: 'm', step: 12.5 },
  sledPull: { v: 50, unit: 'm', step: 12.5 },
  burpees: { v: 80, unit: 'm', step: 10 },
  row: { v: 1000, unit: 'm', step: 50 },
  farmers: { v: 200, unit: 'm', step: 25 },
  lunges: { v: 100, unit: 'm', step: 10 },
  wallballs: { v: 100, unit: 'reps', step: 5 },
};

export const protocolWeeks = (p: SimProtocol) => p.blocks.reduce((n, b) => n + Math.max(0, b.weeks), 0);

/** Which run/station % applies, given the number of weeks until the race week (0 = race week). */
export function protocolStep(p: SimProtocol, weeksToRaceWeek: number): { run: number; station: number; inBuild: boolean; block: number } {
  const k = weeksToRaceWeek - 1; // 0 = week before the race week
  const W = protocolWeeks(p);
  if (k < 0 || k >= W) return { ...p.offSeason, inBuild: false, block: -1 };
  let fromEnd = 0;
  for (let i = p.blocks.length - 1; i >= 0; i--) {
    fromEnd += p.blocks[i].weeks;
    if (k < fromEnd) return { run: p.blocks[i].run, station: p.blocks[i].station, inBuild: true, block: i };
  }
  return { ...p.offSeason, inBuild: false, block: -1 };
}

const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step);

export function stationVolume(s: Station, pct: number) {
  const f = FULL[s];
  const v = roundTo((f.v * pct) / 100, f.step);
  return `${Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')} ${f.unit === 'm' ? 'm' : 'reps'}`;
}

/** Load of the sim relative to a full race (1.0 = race volume). Used to lighten the rest of the week. */
export const simLoad = (step: { run: number; station: number }) => (step.run + step.station) / 200;

const T: Record<Lang, Record<string, string>> = {
  en: {
    head: '{proto} · {r} rounds: {m} m at ~{pace}/km + station at {st}% volume (race order):',
    off: 'Outside the race window: speed and technique.',
    build: 'Build-up to {race}: run {run}% · stations {st}%.',
    roxzone: 'Run longer than race distance: trains running through the Roxzone on tired legs.',
    taper: 'Last week before the race: everything at {st}% — stay sharp, arrive fresh.',
    dbl: 'Doubles: you each do {st}% of every station — together {tot}% of the doubles race volume.',
    heavy: 'Big sim this week: the rest of the week is a bit lighter.',
  },
  nl: {
    head: '{proto} · {r} rondes: {m} m op ~{pace}/km + station op {st}% volume (racevolgorde):',
    off: 'Buiten de racewindow: snelheid en techniek.',
    build: 'Opbouw naar {race}: lopen {run}% · stations {st}%.',
    roxzone: 'Langer lopen dan de raceafstand: traint doorlopen door de Roxzone op vermoeide benen.',
    taper: 'Laatste week voor de race: alles op {st}% — scherp blijven, fris aan de start.',
    dbl: 'Doubles: jullie doen allebei {st}% van elk station — samen {tot}% van het doubles-racevolume.',
    heavy: 'Grote sim deze week: de rest van de week is iets lichter.',
  },
  de: {
    head: '{proto} · {r} Runden: {m} m in ~{pace}/km + Station mit {st}% Volumen (Rennreihenfolge):',
    off: 'Außerhalb des Rennfensters: Tempo und Technik.',
    build: 'Aufbau zu {race}: Laufen {run}% · Stationen {st}%.',
    roxzone: 'Länger laufen als die Renndistanz: trainiert das Durchlaufen der Roxzone mit müden Beinen.',
    taper: 'Letzte Woche vor dem Rennen: alles auf {st}% — scharf bleiben, frisch starten.',
    dbl: 'Doubles: ihr macht beide {st}% jeder Station — zusammen {tot}% des Doubles-Rennvolumens.',
    heavy: 'Große Sim diese Woche: der Rest der Woche ist etwas leichter.',
  },
  es: {
    head: '{proto} · {r} rondas: {m} m a ~{pace}/km + estación al {st}% del volumen (orden de carrera):',
    off: 'Fuera de la ventana de carrera: velocidad y técnica.',
    build: 'Progresión hacia {race}: carrera {run}% · estaciones {st}%.',
    roxzone: 'Correr más que la distancia de carrera: entrena correr la Roxzone con piernas cansadas.',
    taper: 'Última semana antes de la carrera: todo al {st}% — afilado y fresco.',
    dbl: 'Dobles: los dos hacéis el {st}% de cada estación — juntos el {tot}% del volumen de la carrera.',
    heavy: 'Sim grande esta semana: el resto de la semana es algo más ligero.',
  },
  ko: {
    head: '{proto} · {r}라운드: {m} m를 ~{pace}/km + 스테이션 {st}% 볼륨 (레이스 순서):',
    off: '레이스 기간 밖: 스피드와 기술.',
    build: '{race}를 향한 빌드업: 러닝 {run}% · 스테이션 {st}%.',
    roxzone: '레이스 거리보다 길게 달리기: 지친 다리로 록스존을 통과하는 훈련.',
    taper: '레이스 전 마지막 주: 모두 {st}% — 날카롭게, 상쾌하게.',
    dbl: '더블스: 둘 다 각 스테이션의 {st}% — 합쳐서 더블스 레이스 볼륨의 {tot}%.',
    heavy: '이번 주 큰 시뮬: 나머지 주간은 조금 가볍게.',
  },
};
const tr = (l: Lang, k: string, p: Record<string, string | number>) => ((T[l] ?? T.en)[k]).replace(/\{(\w+)\}/g, (_, x) => String(p[x] ?? ''));

export function protocolSimText(
  p: SimProtocol,
  step: { run: number; station: number; inBuild: boolean; block: number },
  o: { lang: Lang; pace: number; doubles: boolean; raceName: string },
): { lines: string[]; km: number } {
  const m = Math.round((1000 * step.run) / 100);
  const stations = STATIONS.slice(0, Math.max(1, Math.min(8, p.rounds)));
  const names = STATION_NAMES[o.lang] ?? STATION_NAMES.en;
  const lines = [
    tr(o.lang, 'head', { proto: p.name, r: p.rounds, m, pace: fmtMmss(o.pace), st: step.station }),
    ...stations.map((s, i) => `${i + 1}. ${m} m → ${names[s]} ${stationVolume(s, step.station)}`),
  ];
  const last = step.inBuild && step.block === p.blocks.length - 1;
  if (!step.inBuild) lines.push(tr(o.lang, 'off', {}));
  else if (last && step.run <= 60) lines.push(tr(o.lang, 'taper', { st: step.station }));
  else lines.push(tr(o.lang, 'build', { race: o.raceName, run: step.run, st: step.station }));
  if (step.run > 100) lines.push(tr(o.lang, 'roxzone', {}));
  if (o.doubles) lines.push(tr(o.lang, 'dbl', { st: step.station, tot: step.station * 2 }));
  if (simLoad(step) >= 1) lines.push(tr(o.lang, 'heavy', {}));
  return { lines, km: Math.round((p.rounds * m) / 1000 + 3) };
}
