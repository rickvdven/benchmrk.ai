import type { Flags, Lang, Station } from './types';

/** Body areas that matter for HYROX. The first six take load from running. */
export const INJURY_AREAS = ['achilles', 'plantar', 'shin', 'knee', 'hamstring', 'hip', 'back', 'shoulder', 'wrist'] as const;
export type InjuryArea = (typeof INJURY_AREAS)[number];
/** now = hurts at the moment · recent = within the last 6 months · past = longer ago / recurring */
export type InjuryStatus = 'now' | 'recent' | 'past';
export type Injuries = Partial<Record<InjuryArea, InjuryStatus>>;

export const RUN_AREAS: InjuryArea[] = ['achilles', 'plantar', 'shin', 'knee', 'hamstring', 'hip'];
const RANK: Record<InjuryStatus, number> = { now: 3, recent: 2, past: 1 };

/** Reads the detailed map, falling back to the four legacy booleans (treated as "past"). */
export function injuriesOf(f: Flags | null | undefined): Injuries {
  if (!f) return {};
  if (f.injuries && Object.keys(f.injuries).length) return { ...f.injuries };
  const out: Injuries = {};
  if (f.achilles) out.achilles = 'past';
  if (f.quad) out.knee = 'past';
  if (f.back) out.back = 'past';
  if (f.shin) out.shin = 'past';
  return out;
}

/** Writes the detailed map and keeps the legacy booleans in sync (admin view, older code). */
export function withInjuries(f: Flags, inj: Injuries, note?: string, today: string = new Date().toISOString().slice(0, 10)): Flags {
  const clean = Object.fromEntries(Object.entries(inj).filter(([, v]) => v)) as Injuries;
  const prev = injuriesOf(f);
  // remember when an area became "now" (rehab progression counts from there)
  const since: Record<string, string> = {};
  for (const [a, st] of Object.entries(clean)) if (st === 'now') since[a] = f.injurySince?.[a] && prev[a as InjuryArea] === 'now' ? f.injurySince[a]! : today;
  // a running area going from "now" to "recent" starts the walk-run return
  const back = RUN_AREAS.some((a) => prev[a] === 'now' && clean[a] === 'recent');
  const anyRun = RUN_AREAS.some((a) => clean[a] === 'now' || clean[a] === 'recent');
  return {
    ...f,
    achilles: !!(clean.achilles || clean.plantar),
    quad: !!clean.knee,
    back: !!clean.back,
    shin: !!clean.shin,
    injuries: clean,
    injurySince: since,
    returnSince: back ? today : anyRun ? (f.returnSince ?? null) : null,
    note: note ?? f.note ?? '',
  };
}

export interface InjuryProfile {
  inj: Injuries;
  /** worst status among the running-load areas */
  runLoad: InjuryStatus | null;
  /** multiplier on the weekly volume increase */
  rampFactor: number;
  /** cap on peak km as a multiple of the starting volume */
  peakCap: number;
  /** stations not to use as a strength focus right now */
  avoidFocus: Station[];
  /** no fast intervals / strides (hamstring) */
  noSpeed: boolean;
  /** prehab areas, most urgent first (max 2 shown in a session) */
  prehab: InjuryArea[];
}

export function injuryProfile(f: Flags | null | undefined): InjuryProfile {
  const inj = injuriesOf(f);
  const runLoad = RUN_AREAS.reduce<InjuryStatus | null>((w, a) => {
    const s = inj[a];
    return s && (!w || RANK[s] > RANK[w]) ? s : w;
  }, null);
  const now = (a: InjuryArea) => inj[a] === 'now';
  const avoid = new Set<Station>();
  if (now('achilles') || now('plantar') || now('wrist')) avoid.add('burpees');
  if (now('achilles') || now('plantar')) avoid.add('sledPush').add('lunges').add('wallballs');
  if (now('knee')) avoid.add('lunges').add('wallballs');
  if (now('shoulder')) avoid.add('wallballs').add('skierg');
  if (now('wrist')) avoid.add('farmers');
  if (now('back')) avoid.add('sledPull');
  const prehab = (Object.keys(inj) as InjuryArea[]).sort((a, b) => RANK[inj[b]!] - RANK[inj[a]!]);
  return {
    inj,
    runLoad,
    rampFactor: runLoad === 'now' ? 0.4 : runLoad === 'recent' ? 0.7 : 1,
    peakCap: runLoad === 'now' ? 1.15 : runLoad === 'recent' ? 1.3 : Infinity,
    avoidFocus: [...avoid],
    noSpeed: inj.hamstring === 'now' || inj.hamstring === 'recent',
    prehab,
  };
}

type T = Record<string, string>;
const PREHAB: Record<Lang, Record<InjuryArea, string>> = {
  en: {
    achilles: 'Achilles/calves: heavy slow calf raises 3×12 (3 s down), straight and bent knee.',
    plantar: 'Foot: single-leg calf raises on a step with toes on a towel 3×12 + foot doming 2×20.',
    shin: 'Shins: tibialis raises against a wall 3×20 + single-leg calf raises 3×15.',
    knee: 'Knees: Spanish squat or wall sit 5×45 s + slow step-downs 3×10 each leg.',
    hamstring: 'Hamstrings: Nordic curls 3×5 (assisted) + single-leg RDL 3×8.',
    hip: 'Hips/groin: Copenhagen plank 3×20 s + banded lateral walks 2×15 steps.',
    back: 'Lower back: McGill big 3 (curl-up, side plank, bird dog) 3×10 s holds, brace hard on sled pull and farmers.',
    shoulder: 'Shoulders: band external rotation 3×15 + face pulls 3×15.',
    wrist: 'Wrists/elbows: wrist curls and extensions 2×15; use fists or parallettes for burpees if needed.',
  },
  nl: {
    achilles: 'Achilles/kuiten: zware langzame kuitheffingen 3×12 (3 s zakken), gestrekte en gebogen knie.',
    plantar: 'Voet: kuitheffingen op één been op een trede met tenen op een handdoek 3×12 + foot doming 2×20.',
    shin: 'Scheenbenen: tibialis raises tegen de muur 3×20 + kuitheffingen op één been 3×15.',
    knee: 'Knieën: Spanish squat of wall sit 5×45 s + langzame step-downs 3×10 per been.',
    hamstring: 'Hamstrings: Nordic curls 3×5 (ondersteund) + single-leg RDL 3×8.',
    hip: 'Heup/lies: Copenhagen plank 3×20 s + banded lateral walks 2×15 stappen.',
    back: 'Onderrug: McGill big 3 (curl-up, side plank, bird dog) 3×10 s vasthouden; romp hard aanspannen bij sled pull en farmers.',
    shoulder: 'Schouders: externe rotatie met band 3×15 + face pulls 3×15.',
    wrist: 'Polsen/ellebogen: wrist curls en extensies 2×15; burpees desnoods op vuisten of parallettes.',
  },
  de: {
    achilles: 'Achilles/Waden: schweres langsames Wadenheben 3×12 (3 s ab), gestrecktes und gebeugtes Knie.',
    plantar: 'Fuß: einbeiniges Wadenheben auf einer Stufe, Zehen auf einem Handtuch 3×12 + Foot Doming 2×20.',
    shin: 'Schienbeine: Tibialis Raises an der Wand 3×20 + einbeiniges Wadenheben 3×15.',
    knee: 'Knie: Spanish Squat oder Wall Sit 5×45 s + langsame Step-downs 3×10 pro Bein.',
    hamstring: 'Hamstrings: Nordic Curls 3×5 (unterstützt) + einbeiniges RDL 3×8.',
    hip: 'Hüfte/Leiste: Copenhagen Plank 3×20 s + Lateral Walks mit Band 2×15 Schritte.',
    back: 'Unterer Rücken: McGill Big 3 (Curl-up, Side Plank, Bird Dog) 3×10 s halten; Rumpf fest bei Sled Pull und Farmers.',
    shoulder: 'Schultern: Außenrotation mit Band 3×15 + Face Pulls 3×15.',
    wrist: 'Handgelenke/Ellbogen: Wrist Curls und Extensions 2×15; Burpees notfalls auf Fäusten oder Parallettes.',
  },
  es: {
    achilles: 'Aquiles/gemelos: elevaciones de talón pesadas y lentas 3×12 (3 s bajando), rodilla recta y flexionada.',
    plantar: 'Pie: elevaciones de talón a una pierna en un escalón con los dedos sobre una toalla 3×12 + foot doming 2×20.',
    shin: 'Tibias: tibialis raises contra la pared 3×20 + elevaciones de talón a una pierna 3×15.',
    knee: 'Rodillas: Spanish squat o sentadilla en pared 5×45 s + step-downs lentos 3×10 por pierna.',
    hamstring: 'Isquios: Nordic curls 3×5 (asistidos) + peso muerto rumano a una pierna 3×8.',
    hip: 'Cadera/ingle: plancha Copenhagen 3×20 s + pasos laterales con banda 2×15.',
    back: 'Zona lumbar: McGill big 3 (curl-up, plancha lateral, bird dog) 3×10 s; core firme en sled pull y farmers.',
    shoulder: 'Hombros: rotación externa con banda 3×15 + face pulls 3×15.',
    wrist: 'Muñecas/codos: curls y extensiones de muñeca 2×15; burpees sobre puños o paralelas si hace falta.',
  },
  ko: {
    achilles: '아킬레스/종아리: 무겁고 느린 카프 레이즈 3×12 (3초 내리기), 무릎 편 자세와 굽힌 자세.',
    plantar: '발: 계단에서 한 발 카프 레이즈(발가락 아래 수건) 3×12 + 풋 도밍 2×20.',
    shin: '정강이: 벽에 기대 티비알리스 레이즈 3×20 + 한 발 카프 레이즈 3×15.',
    knee: '무릎: 스패니시 스쿼트 또는 월 싯 5×45초 + 느린 스텝다운 다리당 3×10.',
    hamstring: '햄스트링: 노르딕 컬 3×5 (보조) + 한 다리 RDL 3×8.',
    hip: '고관절/사타구니: 코펜하겐 플랭크 3×20초 + 밴드 사이드 워크 2×15걸음.',
    back: '허리: McGill Big 3 (컬업, 사이드 플랭크, 버드독) 3×10초 유지; 슬레드 풀과 파머스에서 코어 강하게.',
    shoulder: '어깨: 밴드 외회전 3×15 + 페이스 풀 3×15.',
    wrist: '손목/팔꿈치: 손목 컬과 익스텐션 2×15; 필요하면 주먹이나 패럴렛으로 버피.',
  },
};

const NOTES: Record<Lang, T> = {
  en: {
    pain: ' Pain rule: ≤ 3/10 during the run and back to normal the next morning is fine. Worse? Swap for the same time on a bike or cross-trainer.',
    noSpeed: ' Hamstring: skip strides and keep every rep at or below threshold pace.',
    intSwap: 'Hamstring care: no fast intervals — threshold reps instead.',
  },
  nl: {
    pain: ' Pijnregel: ≤ 3/10 tijdens de run en de volgende ochtend weer normaal is oké. Erger? Wissel voor dezelfde tijd op fiets of crosstrainer.',
    noSpeed: ' Hamstring: sla de strides over en houd elke herhaling op of onder drempeltempo.',
    intSwap: 'Hamstringzorg: geen snelle intervallen — in plaats daarvan drempelherhalingen.',
  },
  de: {
    pain: ' Schmerzregel: ≤ 3/10 beim Laufen und am nächsten Morgen wieder normal ist ok. Schlimmer? Gleiche Zeit auf Rad oder Crosstrainer.',
    noSpeed: ' Hamstring: keine Steigerungsläufe, jede Wiederholung auf oder unter Schwellentempo.',
    intSwap: 'Hamstring-Schutz: keine schnellen Intervalle — stattdessen Schwellenwiederholungen.',
  },
  es: {
    pain: ' Regla del dolor: ≤ 3/10 durante la carrera y normal a la mañana siguiente está bien. ¿Peor? Cambia por el mismo tiempo en bici o elíptica.',
    noSpeed: ' Isquios: sin progresivos, cada repetición a ritmo umbral o más lento.',
    intSwap: 'Cuidado de isquios: sin intervalos rápidos — repeticiones a umbral en su lugar.',
  },
  ko: {
    pain: ' 통증 규칙: 달리는 중 3/10 이하이고 다음 날 아침 정상으로 돌아오면 괜찮습니다. 더 나쁘면 같은 시간 자전거나 크로스트레이너로 바꾸세요.',
    noSpeed: ' 햄스트링: 스트라이드는 생략하고 모든 반복을 역치 페이스 이하로.',
    intSwap: '햄스트링 보호: 빠른 인터벌 대신 역치 반복.',
  },
};

export const prehabLine = (lang: Lang, a: InjuryArea) => (PREHAB[lang] ?? PREHAB.en)[a];
export const injuryNote = (lang: Lang, k: 'pain' | 'noSpeed' | 'intSwap') => (NOTES[lang] ?? NOTES.en)[k];
