import { addDays, fmtMmss } from './time';
import { areaName, mergeSignals, noteText, readNotes, type NoteSignals } from './notes';
import type { Adjustment, LoggedSession } from './adaptive';
import { generatePlan, type PlanOptions } from './plan';
import { raceModel, type BaselineTable } from './raceModel';
import { injuryProfile, type InjuryArea, type InjuryStatus } from './injury';
import { STATION_NAMES } from './text';
import type { Lang, Profile, Session, Station, Week } from './types';
import { STATIONS } from './types';

export type Tone = 'good' | 'warn' | 'bad' | 'info';
export interface Finding {
  tone: Tone;
  text: string;
}
export interface SessionAnalysis {
  verdict: 'on_target' | 'check' | 'off' | 'no_data';
  zone: string | null;
  pctLthr: number | null;
  findings: Finding[];
  effects: Finding[];
  next: Session[];
  /** what the notes said (pain, stopped, too fast) */
  signals?: NoteSignals | null;
}

export interface LoggedEntry {
  date: string;
  planned: Session;
  actualPaceSec?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  rpe?: number | null;
  wod?: { description?: string; work?: string } | null;
  /** the athlete's own words */
  notes?: string | null;
  /** AI reading of the notes (server), merged with the keyword reader */
  notesAi?: NoteSignals | null;
}

export interface AnalysisContext {
  profile: Profile;
  weeks: Week[];
  logs: LoggedSession[];
  morning: Record<string, number>;
  today: string;
  ceiling: number;
  adjust: Adjustment;
  weakest: Station[];
  lang: Lang;
}

const ZONES: [string, number][] = [
  ['Z1', 0],
  ['Z2', 0.85],
  ['Z3', 0.9],
  ['Z4', 0.95],
  ['Z5a', 1.0],
  ['Z5b', 1.03],
  ['Z5c', 1.07],
];
export const zoneOf = (hr: number, lthr: number) => ZONES.filter(([, lo]) => hr / lthr >= lo).pop()![0];

const HARD_TYPES = ['threshold', 'intervals', 'sim', 'race'];
const RUN_TYPES = ['threshold', 'intervals', 'easy', 'long', 'sim'];

/** Keywords per station to recognise them in a WOD description (all languages we support + common slang). */
const KEYWORDS: Record<Station, RegExp> = {
  skierg: /ski\s?erg|\bski\b|스키/i,
  sledPush: /sled\s?push|prowler|schlitten\s?schieben|empuje/i,
  sledPull: /sled\s?pull|schlitten\s?ziehen|arrastre/i,
  burpees: /burpee|버피/i,
  row: /\brow(ing|er)?\b|roei|rudern|remo|로잉|cal row/i,
  farmers: /farmer|carry|kettlebell carry|파머/i,
  lunges: /lunge|ausfallschritt|zancada|런지/i,
  wallballs: /wall\s?ball|wb\b|월볼/i,
};

export function stationsInText(text: string): Station[] {
  return STATIONS.filter((s) => KEYWORDS[s].test(text));
}

type Dict = Record<string, string>;
const T: Record<Lang, Dict> = {
  en: {
    injuryLoad: 'Contains {list}, which loads an area that hurts right now. Watch how it feels tomorrow morning: stiffness ≥ {ceil}/10 switches the next run to low-impact automatically.',
    noData: 'Only ticked off — add pace, HR or RPE to get a full analysis.',
    zone: 'Average HR {hr} bpm = {pct}% of your threshold HR → zone {zone} (Friel).',
    zoneOk: 'That is the intended zone for this session.',
    zoneHigh: 'Higher than intended for this session ({want}). Easy days only work when they stay easy (80/20 principle).',
    zoneLowThr: 'Below threshold intensity ({want}): the stimulus was more tempo than threshold.',
    paceOnTarget: 'Pace {act}/km vs target {tgt}/km: on target ({diff}).',
    paceSlowHard: 'Pace {act}/km is {diff} slower than target at/above your HR cap → the target was too ambitious today.',
    paceSlowEasy: 'Pace {act}/km is {diff} slower than target, but HR stayed low → heat, wind, hills or held back? Not counted against you.',
    paceFastEasyHr: 'Pace {act}/km is {diff} faster than target with HR well under the cap and RPE ≤ 6 → you are fitter than the plan assumes.',
    paceFastHard: 'Pace {act}/km is {diff} faster than target but HR went over the cap → too hard; this does not make you faster sooner.',
    easyTooFast: 'Easy run at {act}/km with HR above the Zone 2 cap → slow down next time; the aerobic gain comes from volume, not speed.',
    rpeHighEasy: 'RPE {rpe} on an easy session is a fatigue signal. Sleep, food and stress count too.',
    rpeMax: 'RPE {rpe}: maximal. Threshold work should feel like 7–8/10 — sustainable, not all-out.',
    rpeOk: 'RPE {rpe} fits this session.',
    wodHard: 'WOD logged as hard (RPE {rpe}{hr}). Counts as a high-intensity day.',
    wodEasy: 'WOD logged as moderate (RPE {rpe}). Counts as a training day without extra fatigue.',
    wodStations: 'Station work recognised: {list}.',
    wodWeak: 'Includes your weak station{s} {list} — extra specific work, good.',
    wodNoText: 'Add what was on the board (or scan the whiteboard) so Benchmrk can see which stations you trained.',
    strengthRpe: 'Strength at RPE {rpe}. Keep 1–2 reps in reserve so the next run is not compromised.',
    effNone: 'No change needed: your next sessions stay as planned.',
    effSlowProgress: 'Threshold check: {n} of the last {m} threshold sessions were too slow at high HR. One more and Benchmrk proposes slowing your paces by 4 s/km.',
    effFastProgress: 'Threshold check: {n} of the last {m} threshold sessions were faster at low HR. One more and Benchmrk proposes speeding your paces up by 3 s/km.',
    effAdjust: 'Proposed on your cockpit: {what}. Accepting it changes all future paces and updates your forecast.',
    effDeloadWatch: 'Fatigue watch: average RPE over 7 days is {avg} ({n} sessions). At ≥ 8.5 Benchmrk proposes a lighter week.',
    effDeload: 'Average RPE {avg} over 7 days → Benchmrk proposes a lighter week (see cockpit).',
    effBackToBack: 'Tomorrow is {next}. After a hard day, run it by the HR cap, not by pace. Morning stiffness ≥ {ceil}/10 automatically switches it to low-impact.',
    effHardBefore: 'This hard session came the day after another hard one ({prev}). Fine occasionally; as a pattern it costs quality.',
    effDist: 'Last 7 days: {hard} of {all} sessions were hard ({pct}%). Aim for roughly 20–30 % hard; the rest easy.',
    effDistHigh: 'Last 7 days: {hard} of {all} sessions were hard ({pct}%). That is a lot — keep the next easy days really easy.',
    effBenchmark: 'This was benchmark {n}: log the benchmark result to recalibrate your paces and race forecast.',
    effStationsCount: 'Station work in a WOD does not change your station ratings automatically; update them in Settings once your times improve.',
  },
  nl: {
    injuryLoad: 'Bevat {list}, wat een plek belast waar je nu last van hebt. Let op hoe het morgenochtend voelt: stijfheid ≥ {ceil}/10 zet de volgende run automatisch om naar low-impact.',
    noData: 'Alleen afgevinkt — vul tempo, hartslag of RPE in voor een volledige analyse.',
    zone: 'Gem. hartslag {hr} bpm = {pct}% van je drempelhartslag → zone {zone} (Friel).',
    zoneOk: 'Dat is de bedoelde zone voor deze training.',
    zoneHigh: 'Hoger dan bedoeld voor deze training ({want}). Rustige dagen werken alleen als ze rustig blijven (80/20-principe).',
    zoneLowThr: 'Onder drempelintensiteit ({want}): de prikkel was meer tempo dan drempel.',
    paceOnTarget: 'Tempo {act}/km vs doel {tgt}/km: op schema ({diff}).',
    paceSlowHard: 'Tempo {act}/km is {diff} trager dan het doel bij/boven je hartslaglimiet → het doel was vandaag te ambitieus.',
    paceSlowEasy: 'Tempo {act}/km is {diff} trager dan het doel, maar je hartslag bleef laag → hitte, wind, heuvels of ingehouden? Telt niet tegen je.',
    paceFastEasyHr: 'Tempo {act}/km is {diff} sneller dan het doel met hartslag ruim onder de limiet en RPE ≤ 6 → je bent fitter dan het plan aanneemt.',
    paceFastHard: 'Tempo {act}/km is {diff} sneller dan het doel maar de hartslag ging over de limiet → te hard; daar word je niet sneller van.',
    easyTooFast: 'Rustige duurloop op {act}/km met hartslag boven de zone 2-limiet → volgende keer rustiger; de aerobe winst komt uit volume, niet uit snelheid.',
    rpeHighEasy: 'RPE {rpe} bij een rustige training is een vermoeidheidssignaal. Slaap, voeding en stress tellen ook mee.',
    rpeMax: 'RPE {rpe}: maximaal. Drempelwerk hoort als 7–8/10 te voelen — vol te houden, niet alles-of-niets.',
    rpeOk: 'RPE {rpe} past bij deze training.',
    wodHard: 'WOD gelogd als zwaar (RPE {rpe}{hr}). Telt als intensieve dag.',
    wodEasy: 'WOD gelogd als matig (RPE {rpe}). Telt als trainingsdag zonder extra vermoeidheid.',
    wodStations: 'Stationwerk herkend: {list}.',
    wodWeak: 'Bevat je zwakke station{s} {list} — extra specifiek werk, goed.',
    wodNoText: 'Vul in wat er op het bord stond (of scan het whiteboard) zodat Benchmrk ziet welke stations je hebt getraind.',
    strengthRpe: 'Kracht op RPE {rpe}. Houd 1–2 herhalingen in reserve zodat je volgende run niet lijdt.',
    effNone: 'Geen aanpassing nodig: je volgende trainingen blijven zoals gepland.',
    effSlowProgress: 'Drempelcheck: {n} van de laatste {m} drempeltrainingen waren te traag bij hoge hartslag. Nog één en Benchmrk stelt voor je tempo’s 4 s/km rustiger te maken.',
    effFastProgress: 'Drempelcheck: {n} van de laatste {m} drempeltrainingen waren sneller bij lage hartslag. Nog één en Benchmrk stelt voor je tempo’s 3 s/km sneller te maken.',
    effAdjust: 'Voorstel op je cockpit: {what}. Accepteren past alle toekomstige tempo’s en je voorspelling aan.',
    effDeloadWatch: 'Vermoeidheidscheck: gemiddelde RPE over 7 dagen is {avg} ({n} trainingen). Vanaf 8,5 stelt Benchmrk een lichtere week voor.',
    effDeload: 'Gemiddelde RPE {avg} over 7 dagen → Benchmrk stelt een lichtere week voor (zie cockpit).',
    effBackToBack: 'Morgen staat {next} gepland. Na een zware dag: loop die op hartslaglimiet, niet op tempo. Ochtendstijfheid ≥ {ceil}/10 zet hem automatisch om naar low-impact.',
    effHardBefore: 'Deze zware training kwam de dag na een andere zware ({prev}). Af en toe prima; als patroon kost het kwaliteit.',
    effDist: 'Laatste 7 dagen: {hard} van {all} trainingen waren zwaar ({pct}%). Mik op zo’n 20–30 % zwaar, de rest rustig.',
    effDistHigh: 'Laatste 7 dagen: {hard} van {all} trainingen waren zwaar ({pct}%). Dat is veel — houd de volgende rustige dagen echt rustig.',
    effBenchmark: 'Dit was benchmark {n}: log het benchmarkresultaat om je tempo’s en racevoorspelling te herkalibreren.',
    effStationsCount: 'Stationwerk in een WOD past je stationscores niet automatisch aan; werk ze bij in Instellingen zodra je tijden verbeteren.',
  },
  de: {
    injuryLoad: 'Enthält {list}, was eine Stelle belastet, die gerade schmerzt. Achte morgen früh darauf: Steifigkeit ≥ {ceil}/10 stellt den nächsten Lauf automatisch auf gelenkschonend um.',
    noData: 'Nur abgehakt — trag Tempo, HF oder RPE ein für eine vollständige Analyse.',
    zone: 'Durchschnitts-HF {hr} bpm = {pct}% deiner Schwellen-HF → Zone {zone} (Friel).',
    zoneOk: 'Das ist die beabsichtigte Zone für diese Einheit.',
    zoneHigh: 'Höher als vorgesehen ({want}). Lockere Tage wirken nur, wenn sie locker bleiben (80/20-Prinzip).',
    zoneLowThr: 'Unter Schwellenintensität ({want}): eher Tempo- als Schwellenreiz.',
    paceOnTarget: 'Tempo {act}/km vs. Ziel {tgt}/km: im Ziel ({diff}).',
    paceSlowHard: 'Tempo {act}/km ist {diff} langsamer als das Ziel bei/über deinem HF-Limit → das Ziel war heute zu ambitioniert.',
    paceSlowEasy: 'Tempo {act}/km ist {diff} langsamer als das Ziel, aber die HF blieb niedrig → Hitze, Wind, Hügel oder zurückgehalten? Zählt nicht gegen dich.',
    paceFastEasyHr: 'Tempo {act}/km ist {diff} schneller als das Ziel bei HF deutlich unter dem Limit und RPE ≤ 6 → du bist fitter, als der Plan annimmt.',
    paceFastHard: 'Tempo {act}/km ist {diff} schneller als das Ziel, aber die HF lag über dem Limit → zu hart; das macht dich nicht schneller.',
    easyTooFast: 'Lockerer Lauf mit {act}/km und HF über dem Zone-2-Limit → nächstes Mal langsamer; der aerobe Gewinn kommt aus Umfang, nicht aus Tempo.',
    rpeHighEasy: 'RPE {rpe} bei einer lockeren Einheit ist ein Ermüdungssignal. Schlaf, Ernährung und Stress zählen mit.',
    rpeMax: 'RPE {rpe}: maximal. Schwellenarbeit sollte sich wie 7–8/10 anfühlen — durchhaltbar, nicht alles.',
    rpeOk: 'RPE {rpe} passt zu dieser Einheit.',
    wodHard: 'WOD als hart geloggt (RPE {rpe}{hr}). Zählt als intensiver Tag.',
    wodEasy: 'WOD als moderat geloggt (RPE {rpe}). Zählt als Trainingstag ohne zusätzliche Ermüdung.',
    wodStations: 'Stationsarbeit erkannt: {list}.',
    wodWeak: 'Enthält deine schwache(n) Station(en) {list} — zusätzliche spezifische Arbeit, gut.',
    wodNoText: 'Trag ein, was auf dem Board stand (oder scanne das Whiteboard), damit Benchmrk sieht, welche Stationen du trainiert hast.',
    strengthRpe: 'Kraft mit RPE {rpe}. Halte 1–2 Wiederholungen in Reserve, damit der nächste Lauf nicht leidet.',
    effNone: 'Keine Anpassung nötig: deine nächsten Einheiten bleiben wie geplant.',
    effSlowProgress: 'Schwellencheck: {n} der letzten {m} Schwelleneinheiten waren bei hoher HF zu langsam. Noch eine, und Benchmrk schlägt 4 s/km langsamere Tempi vor.',
    effFastProgress: 'Schwellencheck: {n} der letzten {m} Schwelleneinheiten waren bei niedriger HF schneller. Noch eine, und Benchmrk schlägt 3 s/km schnellere Tempi vor.',
    effAdjust: 'Vorschlag im Cockpit: {what}. Annehmen ändert alle künftigen Tempi und deine Prognose.',
    effDeloadWatch: 'Ermüdungscheck: durchschnittliche RPE über 7 Tage {avg} ({n} Einheiten). Ab 8,5 schlägt Benchmrk eine leichtere Woche vor.',
    effDeload: 'Durchschnittliche RPE {avg} über 7 Tage → Benchmrk schlägt eine leichtere Woche vor (siehe Cockpit).',
    effBackToBack: 'Morgen steht {next} an. Nach einem harten Tag nach HF-Limit laufen, nicht nach Tempo. Morgensteifigkeit ≥ {ceil}/10 stellt automatisch auf gelenkschonend um.',
    effHardBefore: 'Diese harte Einheit kam am Tag nach einer anderen harten ({prev}). Ab und zu okay; als Muster kostet es Qualität.',
    effDist: 'Letzte 7 Tage: {hard} von {all} Einheiten waren hart ({pct}%). Ziel etwa 20–30 % hart, der Rest locker.',
    effDistHigh: 'Letzte 7 Tage: {hard} von {all} Einheiten waren hart ({pct}%). Das ist viel — halte die nächsten lockeren Tage wirklich locker.',
    effBenchmark: 'Das war Benchmark {n}: logge das Ergebnis, um Tempi und Rennprognose neu zu kalibrieren.',
    effStationsCount: 'Stationsarbeit in einem WOD ändert deine Stationsbewertungen nicht automatisch; passe sie in den Einstellungen an, wenn deine Zeiten besser werden.',
  },
  es: {
    injuryLoad: 'Incluye {list}, que carga una zona que ahora duele. Fíjate en cómo está mañana: rigidez ≥ {ceil}/10 cambia la próxima carrera a bajo impacto automáticamente.',
    noData: 'Solo marcada — añade ritmo, FC o RPE para un análisis completo.',
    zone: 'FC media {hr} ppm = {pct}% de tu FC umbral → zona {zone} (Friel).',
    zoneOk: 'Es la zona prevista para esta sesión.',
    zoneHigh: 'Más alta de lo previsto ({want}). Los días suaves solo funcionan si siguen siendo suaves (principio 80/20).',
    zoneLowThr: 'Por debajo de la intensidad umbral ({want}): el estímulo fue más tempo que umbral.',
    paceOnTarget: 'Ritmo {act}/km vs objetivo {tgt}/km: en objetivo ({diff}).',
    paceSlowHard: 'Ritmo {act}/km, {diff} más lento que el objetivo con FC en/sobre tu límite → el objetivo hoy fue demasiado ambicioso.',
    paceSlowEasy: 'Ritmo {act}/km, {diff} más lento que el objetivo pero con FC baja → ¿calor, viento, cuestas o te contuviste? No cuenta en tu contra.',
    paceFastEasyHr: 'Ritmo {act}/km, {diff} más rápido que el objetivo con FC muy por debajo del límite y RPE ≤ 6 → estás más en forma de lo que asume el plan.',
    paceFastHard: 'Ritmo {act}/km, {diff} más rápido que el objetivo pero la FC superó el límite → demasiado fuerte; así no mejoras antes.',
    easyTooFast: 'Rodaje suave a {act}/km con FC sobre el límite de zona 2 → la próxima vez más lento; la ganancia aeróbica viene del volumen, no de la velocidad.',
    rpeHighEasy: 'RPE {rpe} en una sesión suave es señal de fatiga. Sueño, comida y estrés también cuentan.',
    rpeMax: 'RPE {rpe}: máximo. El trabajo umbral debería sentirse 7–8/10 — sostenible, no a tope.',
    rpeOk: 'RPE {rpe} encaja con esta sesión.',
    wodHard: 'WOD registrado como duro (RPE {rpe}{hr}). Cuenta como día de alta intensidad.',
    wodEasy: 'WOD registrado como moderado (RPE {rpe}). Cuenta como día de entrenamiento sin fatiga extra.',
    wodStations: 'Trabajo de estaciones reconocido: {list}.',
    wodWeak: 'Incluye tu(s) estación(es) débil(es) {list} — trabajo específico extra, bien.',
    wodNoText: 'Añade lo que había en la pizarra (o escanéala) para que Benchmrk vea qué estaciones entrenaste.',
    strengthRpe: 'Fuerza a RPE {rpe}. Deja 1–2 repeticiones en reserva para que la siguiente carrera no sufra.',
    effNone: 'Sin cambios: tus próximas sesiones siguen según el plan.',
    effSlowProgress: 'Control umbral: {n} de las últimas {m} sesiones umbral fueron lentas con FC alta. Una más y Benchmrk propone ritmos 4 s/km más lentos.',
    effFastProgress: 'Control umbral: {n} de las últimas {m} sesiones umbral fueron más rápidas con FC baja. Una más y Benchmrk propone ritmos 3 s/km más rápidos.',
    effAdjust: 'Propuesta en tu cockpit: {what}. Aceptarla cambia todos los ritmos futuros y tu previsión.',
    effDeloadWatch: 'Control de fatiga: RPE media de 7 días {avg} ({n} sesiones). Desde 8,5 Benchmrk propone una semana más ligera.',
    effDeload: 'RPE media {avg} en 7 días → Benchmrk propone una semana más ligera (ver cockpit).',
    effBackToBack: 'Mañana toca {next}. Tras un día duro, hazla por límite de FC, no por ritmo. Rigidez matinal ≥ {ceil}/10 la cambia automáticamente a bajo impacto.',
    effHardBefore: 'Esta sesión dura fue el día después de otra dura ({prev}). De vez en cuando está bien; como patrón cuesta calidad.',
    effDist: 'Últimos 7 días: {hard} de {all} sesiones fueron duras ({pct}%). Apunta a un 20–30 % duro; el resto suave.',
    effDistHigh: 'Últimos 7 días: {hard} de {all} sesiones fueron duras ({pct}%). Es mucho — mantén los próximos días suaves de verdad.',
    effBenchmark: 'Esto fue el benchmark {n}: registra el resultado para recalibrar tus ritmos y tu previsión.',
    effStationsCount: 'El trabajo de estaciones en un WOD no cambia tus valoraciones automáticamente; actualízalas en Ajustes cuando mejoren tus tiempos.',
  },
  ko: {
    injuryLoad: '{list} 포함 — 현재 통증 부위에 부하를 줍니다. 내일 아침 상태를 확인하세요: 뻣뻣함 ≥ {ceil}/10이면 다음 러닝이 자동으로 저충격으로 바뀝니다.',
    noData: '완료 표시만 됨 — 전체 분석을 보려면 페이스, 심박수 또는 RPE를 입력하세요.',
    zone: '평균 심박수 {hr} bpm = 역치 심박수의 {pct}% → {zone} 존 (Friel).',
    zoneOk: '이 세션의 목표 존입니다.',
    zoneHigh: '이 세션 목표보다 높습니다 ({want}). 쉬운 날은 쉽게 유지해야 효과가 있습니다 (80/20 원칙).',
    zoneLowThr: '역치 강도 미만 ({want}): 역치보다 템포 자극에 가까웠습니다.',
    paceOnTarget: '페이스 {act}/km vs 목표 {tgt}/km: 목표 달성 ({diff}).',
    paceSlowHard: '페이스 {act}/km로 목표보다 {diff} 느렸고 심박수는 제한 이상 → 오늘 목표가 너무 높았습니다.',
    paceSlowEasy: '페이스 {act}/km로 목표보다 {diff} 느렸지만 심박수는 낮았습니다 → 더위, 바람, 언덕 또는 조절? 불리하게 계산되지 않습니다.',
    paceFastEasyHr: '페이스 {act}/km로 목표보다 {diff} 빨랐고 심박수는 제한보다 충분히 낮고 RPE ≤ 6 → 플랜 예상보다 체력이 좋습니다.',
    paceFastHard: '페이스 {act}/km로 목표보다 {diff} 빨랐지만 심박수가 제한을 넘었습니다 → 너무 강했습니다; 더 빨리 좋아지지 않습니다.',
    easyTooFast: '쉬운 러닝을 {act}/km로 달렸고 심박수가 2존 제한 이상 → 다음엔 더 천천히; 유산소 향상은 속도가 아닌 볼륨에서 옵니다.',
    rpeHighEasy: '쉬운 세션에서 RPE {rpe}는 피로 신호입니다. 수면, 식사, 스트레스도 영향을 줍니다.',
    rpeMax: 'RPE {rpe}: 최대치. 역치 훈련은 7–8/10으로 느껴져야 합니다 — 지속 가능하게.',
    rpeOk: 'RPE {rpe}는 이 세션에 적절합니다.',
    wodHard: 'WOD를 고강도로 기록 (RPE {rpe}{hr}). 고강도 날로 계산됩니다.',
    wodEasy: 'WOD를 중강도로 기록 (RPE {rpe}). 추가 피로 없는 훈련일로 계산됩니다.',
    wodStations: '인식된 스테이션: {list}.',
    wodWeak: '약한 스테이션 {list} 포함 — 추가 특화 훈련, 좋습니다.',
    wodNoText: '보드 내용을 입력(또는 화이트보드 스캔)하면 Benchmrk가 어떤 스테이션을 훈련했는지 알 수 있습니다.',
    strengthRpe: '근력 RPE {rpe}. 다음 러닝을 위해 1–2회 여유를 남기세요.',
    effNone: '변경 없음: 다음 세션은 계획대로 진행됩니다.',
    effSlowProgress: '역치 체크: 최근 {m}번 중 {n}번이 높은 심박수에서 느렸습니다. 한 번 더면 Benchmrk가 페이스를 4초/km 늦추도록 제안합니다.',
    effFastProgress: '역치 체크: 최근 {m}번 중 {n}번이 낮은 심박수에서 빨랐습니다. 한 번 더면 Benchmrk가 페이스를 3초/km 빠르게 제안합니다.',
    effAdjust: '콕핏 제안: {what}. 수락하면 모든 향후 페이스와 예측이 바뀝니다.',
    effDeloadWatch: '피로 체크: 7일 평균 RPE {avg} ({n}회). 8.5 이상이면 Benchmrk가 가벼운 주를 제안합니다.',
    effDeload: '7일 평균 RPE {avg} → Benchmrk가 가벼운 주를 제안합니다 (콕핏 참고).',
    effBackToBack: '내일은 {next}입니다. 힘든 날 다음에는 페이스가 아닌 심박수 제한으로 달리세요. 아침 뻣뻣함 ≥ {ceil}/10이면 자동으로 저충격으로 바뀝니다.',
    effHardBefore: '이 고강도 세션은 다른 고강도 세션({prev}) 다음 날이었습니다. 가끔은 괜찮지만 반복되면 질이 떨어집니다.',
    effDist: '최근 7일: {all}회 중 {hard}회가 고강도 ({pct}%). 약 20–30 %를 고강도로, 나머지는 쉽게.',
    effDistHigh: '최근 7일: {all}회 중 {hard}회가 고강도 ({pct}%). 많습니다 — 다음 쉬운 날은 정말 쉽게.',
    effBenchmark: '벤치마크 {n}이었습니다: 결과를 기록하면 페이스와 레이스 예측이 재보정됩니다.',
    effStationsCount: 'WOD의 스테이션 훈련은 스테이션 평가를 자동으로 바꾸지 않습니다; 기록이 좋아지면 설정에서 업데이트하세요.',
  },
};

const tr = (lang: Lang, k: string, p: Record<string, string | number> = {}) =>
  ((T[lang] ?? T.en)[k] ?? T.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (p[x] !== undefined ? String(p[x]) : ''));
const sdiff = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(Math.round(d))} s/km`;
const names = (lang: Lang, st: Station[]) => st.map((s) => (STATION_NAMES[lang] ?? STATION_NAMES.en)[s]).join(', ');

/** How a logged session scores against the theory (Friel zones, 80/20, plan targets) and what it means for upcoming training. */
export function analyzeSession(e: LoggedEntry, c: AnalysisContext): SessionAnalysis {
  const { lang } = c;
  const a = c.profile.athlete;
  const s = e.planned;
  const findings: Finding[] = [];
  const effects: Finding[] = [];
  const hasData = !!(e.actualPaceSec || e.avgHr || e.rpe || e.wod?.description || e.wod?.work || e.notes?.trim());
  const sig = mergeSignals(e.notesAi, readNotes(e.notes));
  let zone: string | null = null;
  let pctLthr: number | null = null;
  const isRun = RUN_TYPES.includes(s.type);
  const easyType = s.type === 'easy' || s.type === 'long' || s.type === 'recovery';

  if (e.avgHr) {
    zone = zoneOf(e.avgHr, a.lthr);
    pctLthr = Math.round((e.avgHr / a.lthr) * 100);
    findings.push({ tone: 'info', text: tr(lang, 'zone', { hr: e.avgHr, pct: pctLthr, zone }) });
    if (easyType) {
      const cap = s.hrCap ?? Math.round(0.89 * a.lthr);
      if (e.avgHr > cap + 2) findings.push({ tone: 'warn', text: tr(lang, 'zoneHigh', { want: s.type === 'recovery' ? 'Z1' : 'Z1–Z2' }) });
      else findings.push({ tone: 'good', text: tr(lang, 'zoneOk') });
    } else if (s.type === 'threshold') {
      if (pctLthr < 92) findings.push({ tone: 'warn', text: tr(lang, 'zoneLowThr', { want: 'Z4–Z5a' }) });
      else if (pctLthr <= 103) findings.push({ tone: 'good', text: tr(lang, 'zoneOk') });
    }
  }

  // pace vs target
  if (isRun && e.actualPaceSec && s.targetPaceSec) {
    const d = e.actualPaceSec - s.targetPaceSec; // + = slower
    const p = { act: fmtMmss(e.actualPaceSec), tgt: fmtMmss(s.targetPaceSec), diff: sdiff(d) };
    const cap = s.hrCap ?? null;
    if (easyType) {
      if (d < -20 && e.avgHr && cap && e.avgHr > cap) findings.push({ tone: 'warn', text: tr(lang, 'easyTooFast', p) });
    } else if (Math.abs(d) <= 5) findings.push({ tone: 'good', text: tr(lang, 'paceOnTarget', p) });
    else if (d > 5) {
      if (!cap || (e.avgHr ?? 0) >= cap) findings.push({ tone: 'bad', text: tr(lang, 'paceSlowHard', { ...p, diff: sdiff(d).replace('+', '') }) });
      else findings.push({ tone: 'info', text: tr(lang, 'paceSlowEasy', { ...p, diff: sdiff(d).replace('+', '') }) });
    } else {
      if (cap && e.avgHr && e.avgHr > cap) findings.push({ tone: 'warn', text: tr(lang, 'paceFastHard', { ...p, diff: sdiff(-d).replace('+', '') }) });
      else if (cap && e.avgHr && e.avgHr <= cap - 4 && (e.rpe ?? 10) <= 6) findings.push({ tone: 'good', text: tr(lang, 'paceFastEasyHr', { ...p, diff: sdiff(-d).replace('+', '') }) });
      else findings.push({ tone: 'good', text: tr(lang, 'paceOnTarget', p) });
    }
  }

  // RPE
  if (e.rpe) {
    if (easyType && e.rpe >= 7) findings.push({ tone: 'warn', text: tr(lang, 'rpeHighEasy', { rpe: e.rpe }) });
    else if (s.type === 'threshold' && e.rpe >= 10) findings.push({ tone: 'warn', text: tr(lang, 'rpeMax', { rpe: e.rpe }) });
    else if (s.type === 'strength') findings.push({ tone: e.rpe >= 9 ? 'warn' : 'good', text: tr(lang, 'strengthRpe', { rpe: e.rpe }) });
    else if (s.type !== 'wod' && e.rpe >= 10) findings.push({ tone: 'warn', text: noteText(lang, 'rpe10', { rpe: e.rpe }) });
    else if (s.type !== 'wod') findings.push({ tone: 'good', text: tr(lang, 'rpeOk', { rpe: e.rpe }) });
  }

  // WOD: intensity + stations recognised on the board
  let hardToday = HARD_TYPES.includes(s.type) || (e.rpe ?? 0) >= 8;
  if (s.type === 'wod') {
    const hard = (e.rpe ?? 0) >= 8 || (e.avgHr ?? 0) >= a.lthr * 0.95;
    hardToday = hard;
    if (e.rpe) findings.push({ tone: 'info', text: tr(lang, hard ? 'wodHard' : 'wodEasy', { rpe: e.rpe, hr: e.avgHr ? `, ${e.avgHr} bpm` : '' }) });
    const text = `${e.wod?.description ?? ''} ${e.wod?.work ?? ''}`;
    const st = stationsInText(text);
    if (!text.trim()) findings.push({ tone: 'info', text: tr(lang, 'wodNoText') });
    else if (st.length) {
      findings.push({ tone: 'info', text: tr(lang, 'wodStations', { list: names(lang, st) }) });
      const sore = st.filter((x) => injuryProfile(a.flags).avoidFocus.includes(x));
      if (sore.length) findings.push({ tone: 'warn', text: tr(lang, 'injuryLoad', { list: names(lang, sore), ceil: c.ceiling }) });
      const weak = st.filter((x) => c.weakest.includes(x));
      if (weak.length) findings.push({ tone: 'good', text: tr(lang, 'wodWeak', { list: names(lang, weak), s: weak.length > 1 ? 's' : '' }) });
      effects.push({ tone: 'info', text: tr(lang, 'effStationsCount') });
    }
  }

  if (!hasData) findings.push({ tone: 'info', text: tr(lang, 'noData') });

  // ---------- the athlete's own words come first ----------
  const allS = c.weeks.flatMap((w) => w.sessions);
  if (sig?.pain) {
    const stop = sig.stopped ? noteText(lang, 'stopped') : '';
    const out: Finding[] = [{ tone: 'bad', text: sig.area ? noteText(lang, 'painArea', { area: areaName(lang, sig.area), stop }) : noteText(lang, 'pain', { stop }) }];
    if (sig.shot) out.push({ tone: 'bad', text: noteText(lang, 'shot') });
    if (sig.summary) out.push({ tone: 'info', text: noteText(lang, 'yourWords', { s: sig.summary }) });
    out.push({ tone: 'info', text: noteText(lang, 'notCount') });
    const eff: Finding[] = [
      { tone: 'warn', text: noteText(lang, 'rest') },
      { tone: 'info', text: noteText(lang, 'register') },
      ...(sig.advice ?? []).slice(0, 3).map((t) => ({ tone: 'info' as const, text: t })),
      { tone: 'warn', text: noteText(lang, 'doctor') },
    ];
    const nextS = allS.filter((x) => x.date > e.date && x.date >= c.today && x.type !== 'rest').slice(0, 3);
    return { verdict: 'off', zone, pctLthr, findings: out, effects: eff, next: nextS, signals: sig };
  }
  if (sig?.stopped) findings.unshift({ tone: 'warn', text: noteText(lang, 'stoppedOnly') });
  if (sig?.summary) findings.unshift({ tone: 'info', text: noteText(lang, 'yourWords', { s: sig.summary }) });
  if (sig?.tooFast) {
    findings.push({ tone: 'warn', text: noteText(lang, 'tooFast') });
    effects.push({ tone: 'info', text: noteText(lang, 'nextSim') });
  }
  for (const t of (sig?.advice ?? []).slice(0, 3)) effects.push({ tone: 'info', text: t });

  // ---------- effects on the future ----------
  const all = c.weeks.flatMap((w) => w.sessions);
  const nextDay = all.find((x) => x.date === addDays(e.date, 1));
  const prevLog = c.logs.find((l) => l.date === addDays(e.date, -1));
  if (hardToday && nextDay && HARD_TYPES.includes(nextDay.type) && nextDay.date >= c.today) {
    effects.push({ tone: 'warn', text: tr(lang, 'effBackToBack', { next: nextDay.title, ceil: c.ceiling }) });
  }
  if (hardToday && prevLog && (HARD_TYPES.includes(prevLog.type) || (prevLog.rpe ?? 0) >= 8)) {
    effects.push({ tone: 'info', text: tr(lang, 'effHardBefore', { prev: prevLog.date.slice(5).split('-').reverse().join('/') }) });
  }

  // adaptive threshold rule progress (mirrors evaluate())
  const thr = c.logs
    .filter((l) => l.type === 'threshold' && l.actualPaceSec && l.targetPaceSec && l.date <= e.date)
    .sort((x, y) => y.date.localeCompare(x.date))
    .slice(0, 3);
  if (c.adjust && (c.adjust.kind === 'slow_down' || c.adjust.kind === 'speed_up')) {
    const what = c.adjust.kind === 'slow_down' ? `+${c.adjust.sec} s/km` : `−${c.adjust.sec} s/km`;
    effects.push({ tone: 'warn', text: tr(lang, 'effAdjust', { what }) });
  } else if (s.type === 'threshold' && thr.length) {
    const slow = thr.filter((l) => l.actualPaceSec! - l.targetPaceSec! > 5 && (!l.hrCap || (l.avgHr ?? 0) >= l.hrCap)).length;
    const fast = thr.filter((l) => l.targetPaceSec! - l.actualPaceSec! >= 3 && l.hrCap && (l.avgHr ?? 999) <= l.hrCap - 4 && (l.rpe ?? 10) <= 6).length;
    if (slow === 1) effects.push({ tone: 'info', text: tr(lang, 'effSlowProgress', { n: slow, m: thr.length }) });
    if (fast === 1) effects.push({ tone: 'info', text: tr(lang, 'effFastProgress', { n: fast, m: thr.length }) });
  }

  // fatigue + intensity distribution over the 7 days up to this session
  const since = addDays(e.date, -6);
  const week = c.logs.filter((l) => l.date >= since && l.date <= e.date && l.type !== 'rest');
  const rpes = week.filter((l) => l.rpe);
  if (rpes.length >= 2) {
    const avg = rpes.reduce((n, l) => n + (l.rpe ?? 0), 0) / rpes.length;
    if (c.adjust?.kind === 'deload') effects.push({ tone: 'warn', text: tr(lang, 'effDeload', { avg: avg.toFixed(1) }) });
    else if (avg >= 7.5) effects.push({ tone: 'info', text: tr(lang, 'effDeloadWatch', { avg: avg.toFixed(1), n: rpes.length }) });
  }
  if (week.length >= 3) {
    const hard = week.filter((l) => HARD_TYPES.includes(l.type) || (l.rpe ?? 0) >= 7).length;
    const pct = Math.round((hard / week.length) * 100);
    effects.push({ tone: pct > 50 ? 'warn' : 'info', text: tr(lang, pct > 50 ? 'effDistHigh' : 'effDist', { hard, all: week.length, pct }) });
  }

  if (s.benchmark) effects.push({ tone: 'info', text: tr(lang, 'effBenchmark', { n: s.benchmark }) });
  if (!effects.some((x) => x.tone === 'warn')) effects.unshift({ tone: 'good', text: tr(lang, 'effNone') });

  const next = all.filter((x) => x.date > e.date && x.date >= c.today && x.type !== 'rest').slice(0, 3);
  const verdict: SessionAnalysis['verdict'] = !hasData
    ? 'no_data'
    : findings.some((f) => f.tone === 'bad')
      ? 'off'
      : findings.some((f) => f.tone === 'warn')
        ? 'check'
        : 'on_target';
  return { verdict, zone, pctLthr, findings, effects, next, signals: sig };
}

// ---------- injury impact (for explaining plan changes) ----------
export interface InjuryImpact {
  areas: { area: InjuryArea; status: InjuryStatus }[];
  runLoad: InjuryStatus | null;
  peakKmBase: number;
  peakKm: number;
  avoided: Station[];
  noSpeed: boolean;
  forecastBase: number;
  forecast: number;
}

export function injuryImpact(p: Profile, today: string, opts: PlanOptions = {}, base?: BaselineTable): InjuryImpact | null {
  const ip = injuryProfile(p.athlete.flags);
  const areas = Object.entries(ip.inj).map(([area, status]) => ({ area: area as InjuryArea, status: status as InjuryStatus }));
  if (!areas.length) return null;
  const clean: Profile = { ...p, athlete: { ...p.athlete, flags: { achilles: false, quad: false, back: false, shin: false, injuries: {} } } };
  const peak = (pr: Profile) => Math.round(Math.max(0, ...generatePlan(pr, { ...opts, today }).map((w) => w.sessions.reduce((n, s) => n + (s.km ?? 0), 0))));
  return {
    areas,
    runLoad: ip.runLoad,
    peakKmBase: peak(clean),
    peakKm: peak(p),
    avoided: ip.avoidFocus,
    noSpeed: ip.noSpeed,
    forecastBase: raceModel(clean, today, base).projected.finishSec,
    forecast: raceModel(p, today, base).projected.finishSec,
  };
}
