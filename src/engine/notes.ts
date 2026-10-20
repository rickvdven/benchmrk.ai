import type { InjuryArea } from './injury';
import type { Lang } from './types';

/** What the athlete's own words say about a session. Filled by the AI reader when available, else by keyword rules. */
export interface NoteSignals {
  pain: boolean;
  area: InjuryArea | null;
  /** 0–10, only from the AI reader */
  severity?: number | null;
  /** had to stop, walk or could not finish as planned */
  stopped: boolean;
  /** says they started / went too fast */
  tooFast: boolean;
  /** a sudden 'shot' / 'pop' / 'kick' – needs a physio check first */
  shot?: boolean;
  /** one-sentence summary in the athlete's language (AI only) */
  summary?: string;
  /** up to 3 short pieces of advice (AI only) */
  advice?: string[];
  source: 'ai' | 'rules';
}

const AREA: [InjuryArea, RegExp][] = [
  ['achilles', /\b(kuit|kuiten|achilles|calf|calves|wade|waden|gemelos?|pantorrilla|종아리|아킬레스)/i],
  ['plantar', /(voetzool|hiel|fasci|plantar|\bheel\b|ferse|talón|발바닥|발뒤꿈치)/i],
  ['shin', /(scheen|\bshin|schienbein|espinilla|tibia|정강이)/i],
  ['knee', /\b(knie|knee|rodilla|무릎)/i],
  ['hamstring', /(hamstring|achterkant (van )?(mijn |m'n )?bovenbeen|isquio|햄스트링|oberschenkelrückseite)/i],
  ['hip', /\b(heup|lies|hip|groin|hüfte|leiste|cadera|ingle|고관절|사타구니)/i],
  ['back', /(onderrug|\brug\b|lower back|\bback\b|rücken|espalda|lumbar|허리)/i],
  ['shoulder', /(schouder|shoulder|schulter|hombro|어깨)/i],
  ['wrist', /(\bpols|wrist|handgelenk|muñeca|elleboog|elbow|ellbogen|codo|손목|팔꿈치)/i],
];
const PAIN =
  /(pijn|blessure|geblesseerd|schoot in|schiet in|verrekt|verrekking|kramp|scheur|zweepslag|\bpain|painful|hurt|injur|strain|pulled|tweak|cramp|schmerz|verletz|zerrung|krampf|dolor|lesi[oó]n|tir[oó]n|calambre|통증|부상|아프|쥐가)/i;
const NO_PAIN = /(geen pijn|zonder pijn|pijnvrij|no pain|pain[- ]free|without pain|keine schmerzen|schmerzfrei|sin dolor|통증 없)/i;
const STOPPED =
  /(niet meer (mogelijk|lopen|rennen|verder)|kon niet (meer|verder|doorrennen|doorlopen|hard)|gestopt|afgebroken|opgegeven|moest wandelen|speed ?mars|gewandeld|stopped|couldn.?t (run|continue|finish)|could not|had to (walk|stop)|aufgehört|abgebrochen|konnte nicht|musste gehen|no pude|tuve que (parar|caminar)|abandon|중단|못했|걸어야)/i;
const SHOT = /(schoot in|schiet in|knal|knap|trap tegen|shot|\bpop(ped)?\b|kicked|schlag|peitschenhieb|latigazo|chasquido|탁|뚝)/i;
const TOO_FAST =
  /(te hard (gestart|begonnen|van start|weg)|te snel (gestart|begonnen)|started too (fast|hard)|went out too (fast|hard)|too fast at the start|zu schnell (gestartet|angegangen|losgelaufen)|sal[ií] demasiado r[aá]pido|empec[eé] demasiado r[aá]pido|너무 빨리 (시작|출발))/i;

/** Keyword reader (EN/NL/DE/ES/KO). Deliberately conservative: it only flags, it never diagnoses. */
export function readNotes(text: string | null | undefined): NoteSignals | null {
  const t = (text ?? '').trim();
  if (t.length < 3) return null;
  const painWord = PAIN.test(t);
  const negated = NO_PAIN.test(t) && !/(blessure|geblesseerd|injur|verletz|lesi[oó]n|부상)/i.test(t);
  const pain = painWord && !negated;
  const area = pain ? (AREA.find(([, re]) => re.test(t))?.[0] ?? null) : null;
  const stopped = STOPPED.test(t);
  const tooFast = TOO_FAST.test(t);
  const shot = pain && SHOT.test(t);
  if (!pain && !stopped && !tooFast) return { pain: false, area: null, stopped: false, tooFast: false, source: 'rules' };
  return { pain, area, stopped, tooFast, shot, source: 'rules' };
}

/** Prefer the AI reading, but never drop a pain signal the rules found. */
export function mergeSignals(ai: NoteSignals | null | undefined, rules: NoteSignals | null): NoteSignals | null {
  if (!ai) return rules;
  if (!rules) return ai;
  return {
    ...ai,
    pain: ai.pain || rules.pain,
    area: ai.area ?? rules.area,
    stopped: ai.stopped || rules.stopped,
    tooFast: ai.tooFast || rules.tooFast,
    shot: ai.shot || rules.shot,
  };
}

type Txt = Record<'shot' | 'stoppedOnly' | 'pain' | 'painArea' | 'stopped' | 'tooFast' | 'rest' | 'register' | 'doctor' | 'notCount' | 'rpe10' | 'yourWords' | 'nextSim', string>;
const T: Record<Lang, Txt> = {
  en: {
    shot: "A sudden 'shot' or 'kick' in the calf can be a muscle tear or Achilles injury: have a physio or doctor check it before you load it again – especially if you can't rise onto your toes on that leg.",
    stoppedOnly: 'You could not finish the session as planned – it counts as done, but not as a full session.',
    pain: 'You report pain{stop}. This is not a successful session but an injury signal.',
    painArea: 'You report pain in your {area}{stop}. This is not a successful session but an injury signal.',
    stopped: ' and could not continue as planned',
    tooFast: 'You say you started too fast: in a race that costs you the second half. Next sim: runs 1–2 deliberately 5–10 s/km slower than goal pace.',
    rest: 'Now: no running or jumping for 48–72 h. Cycling, swimming or mobility only if it is pain-free.',
    register: 'Register the injury below: the plan then builds up more gently (less running volume, no speed work, low-impact options) and adds prehab.',
    doctor: 'Can\'t walk normally, swelling, or pain lasting more than 3 days → have it checked by a physio or doctor.',
    notCount: 'The pace and heart-rate targets of this session are not judged: an aborted session says nothing about your fitness.',
    rpe10: 'RPE {rpe}/10 is maximal effort – more than this session should cost.',
    yourWords: 'From your notes: {s}',
    nextSim: 'Your next sim starts more controlled automatically: the plan keeps the pace targets, you keep runs 1–2 on the slow side.',
  },
  nl: {
    shot: "Een plotseling 'schot' of 'trap' in je kuit kan een spierscheur of achillesblessure zijn: laat een fysio of arts kijken voordat je weer belast – zeker als je op dat been niet op je tenen kunt staan.",
    stoppedOnly: 'Je kon de training niet afmaken zoals gepland – hij telt als gedaan, maar niet als volledige training.',
    pain: 'Je meldt pijn{stop}. Dit is geen geslaagde training maar een blessuresignaal.',
    painArea: 'Je meldt pijn in je {area}{stop}. Dit is geen geslaagde training maar een blessuresignaal.',
    stopped: ' en kon niet verder zoals gepland',
    tooFast: 'Je geeft aan dat je te hard startte: in een race kost dat je de tweede helft. Volgende sim: run 1–2 bewust 5–10 s/km rustiger dan doeltempo.',
    rest: 'Nu: 48–72 uur niet hardlopen of springen. Fietsen, zwemmen of mobiliteit alleen als het pijnvrij is.',
    register: 'Registreer de blessure hieronder: het schema bouwt dan rustiger op (minder loopvolume, geen snelheid, low-impact alternatieven) en voegt prehab toe.',
    doctor: 'Kun je niet normaal lopen, is het dik, of houdt de pijn langer dan 3 dagen aan → laat het checken door een fysio of arts.',
    notCount: 'De tempo- en hartslagdoelen van deze training worden niet beoordeeld: een afgebroken training zegt niets over je conditie.',
    rpe10: 'RPE {rpe}/10 is maximale inspanning – meer dan deze training zou moeten kosten.',
    yourWords: 'Uit je notities: {s}',
    nextSim: 'Houd in je volgende sim run 1–2 bewust aan de rustige kant; het schema houdt dezelfde tempodoelen aan.',
  },
  de: {
    shot: "Ein plötzlicher „Schlag“ in der Wade kann ein Muskelfaserriss oder eine Achillessehnenverletzung sein: vor erneuter Belastung von Physio oder Arzt prüfen lassen – vor allem, wenn du auf dem Bein nicht auf die Zehen kommst.",
    stoppedOnly: 'Du konntest die Einheit nicht wie geplant beenden – sie zählt als erledigt, aber nicht als vollständige Einheit.',
    pain: 'Du meldest Schmerzen{stop}. Das ist keine gelungene Einheit, sondern ein Verletzungssignal.',
    painArea: 'Du meldest Schmerzen in {area}{stop}. Das ist keine gelungene Einheit, sondern ein Verletzungssignal.',
    stopped: ' und konntest nicht wie geplant weitermachen',
    tooFast: 'Du sagst, du bist zu schnell gestartet: im Rennen kostet das die zweite Hälfte. Nächste Sim: Läufe 1–2 bewusst 5–10 s/km langsamer als Zieltempo.',
    rest: 'Jetzt: 48–72 h kein Laufen oder Springen. Radfahren, Schwimmen oder Mobilität nur schmerzfrei.',
    register: 'Trage die Verletzung unten ein: der Plan baut dann vorsichtiger auf (weniger Laufumfang, kein Tempo, Low-Impact) und ergänzt Prehab.',
    doctor: 'Kannst du nicht normal gehen, ist es geschwollen oder halten die Schmerzen länger als 3 Tage an → Physio oder Arzt.',
    notCount: 'Tempo- und Herzfrequenzziele dieser Einheit werden nicht bewertet: eine abgebrochene Einheit sagt nichts über deine Fitness.',
    rpe10: 'RPE {rpe}/10 ist maximale Anstrengung – mehr, als diese Einheit kosten sollte.',
    yourWords: 'Aus deinen Notizen: {s}',
    nextSim: 'Halte in der nächsten Sim Läufe 1–2 bewusst ruhiger; der Plan behält die Tempoziele.',
  },
  es: {
    shot: "Un 'latigazo' repentino en el gemelo puede ser una rotura fibrilar o una lesión del Aquiles: que lo revise un fisio o médico antes de volver a cargar – sobre todo si no puedes ponerte de puntillas con esa pierna.",
    stoppedOnly: 'No pudiste terminar la sesión como estaba previsto – cuenta como hecha, pero no como sesión completa.',
    pain: 'Indicas dolor{stop}. No es una sesión lograda sino una señal de lesión.',
    painArea: 'Indicas dolor en {area}{stop}. No es una sesión lograda sino una señal de lesión.',
    stopped: ' y no pudiste seguir como estaba previsto',
    tooFast: 'Dices que saliste demasiado rápido: en carrera eso te cuesta la segunda mitad. Próximo sim: carreras 1–2 a propósito 5–10 s/km más lentas que el ritmo objetivo.',
    rest: 'Ahora: 48–72 h sin correr ni saltar. Bici, natación o movilidad solo si no duele.',
    register: 'Registra la lesión abajo: el plan progresa con más cuidado (menos volumen de carrera, sin velocidad, opciones de bajo impacto) y añade prehab.',
    doctor: 'Si no puedes caminar con normalidad, hay hinchazón o el dolor dura más de 3 días → fisio o médico.',
    notCount: 'No se evalúan los objetivos de ritmo y pulso: una sesión interrumpida no dice nada de tu forma.',
    rpe10: 'RPE {rpe}/10 es esfuerzo máximo – más de lo que debería costar esta sesión.',
    yourWords: 'De tus notas: {s}',
    nextSim: 'En el próximo sim mantén las carreras 1–2 a propósito más tranquilas; el plan conserva los objetivos de ritmo.',
  },
  ko: {
    shot: "종아리에 갑자기 '탁' 하는 충격은 근육 파열이나 아킬레스 손상일 수 있어요: 다시 부하를 주기 전에 물리치료사나 의사에게 확인받으세요 – 특히 그 다리로 발끝으로 설 수 없다면.",
    stoppedOnly: '계획대로 세션을 마치지 못했어요 – 완료로 기록되지만 완전한 세션은 아니에요.',
    pain: '통증을 기록했어요{stop}. 성공한 세션이 아니라 부상 신호예요.',
    painArea: '{area}에 통증을 기록했어요{stop}. 성공한 세션이 아니라 부상 신호예요.',
    stopped: ' 그리고 계획대로 계속할 수 없었어요',
    tooFast: '너무 빨리 시작했다고 했어요: 레이스에서는 후반을 잃게 돼요. 다음 시뮬: 1–2번 러닝은 목표 페이스보다 5–10초/km 느리게.',
    rest: '지금: 48–72시간 러닝·점프 금지. 자전거, 수영, 가동성 운동은 통증이 없을 때만.',
    register: '아래에서 부상을 등록하세요: 플랜이 더 천천히 빌드업하고 (러닝 볼륨 감소, 스피드 없음, 저충격 대안) 프리햅을 추가해요.',
    doctor: '정상적으로 걷기 어렵거나, 붓거나, 통증이 3일 넘게 지속되면 → 물리치료사나 의사에게 확인받으세요.',
    notCount: '이 세션의 페이스·심박 목표는 평가하지 않아요: 중단된 세션은 체력에 대해 알려주지 않아요.',
    rpe10: 'RPE {rpe}/10은 최대 노력이에요 – 이 세션에 필요한 것보다 많아요.',
    yourWords: '메모에서: {s}',
    nextSim: '다음 시뮬에서는 1–2번 러닝을 의도적으로 천천히; 플랜의 페이스 목표는 그대로예요.',
  },
};
export const noteText = (lang: Lang, k: keyof Txt, p: Record<string, string | number> = {}) =>
  ((T[lang] ?? T.en)[k]).replace(/\{(\w+)\}/g, (_, x) => String(p[x] ?? ''));

const AREA_NAME: Record<Lang, Record<InjuryArea, string>> = {
  en: { achilles: 'calf / Achilles', plantar: 'foot', shin: 'shin', knee: 'knee', hamstring: 'hamstring', hip: 'hip / groin', back: 'lower back', shoulder: 'shoulder', wrist: 'wrist / elbow' },
  nl: { achilles: 'kuit / achilles', plantar: 'voet', shin: 'scheen', knee: 'knie', hamstring: 'hamstring', hip: 'heup / lies', back: 'onderrug', shoulder: 'schouder', wrist: 'pols / elleboog' },
  de: { achilles: 'Wade / Achillessehne', plantar: 'Fuß', shin: 'Schienbein', knee: 'Knie', hamstring: 'Oberschenkelrückseite', hip: 'Hüfte / Leiste', back: 'unteren Rücken', shoulder: 'Schulter', wrist: 'Handgelenk / Ellbogen' },
  es: { achilles: 'gemelo / Aquiles', plantar: 'pie', shin: 'tibia', knee: 'rodilla', hamstring: 'isquiotibial', hip: 'cadera / ingle', back: 'zona lumbar', shoulder: 'hombro', wrist: 'muñeca / codo' },
  ko: { achilles: '종아리 / 아킬레스', plantar: '발', shin: '정강이', knee: '무릎', hamstring: '햄스트링', hip: '고관절 / 사타구니', back: '허리', shoulder: '어깨', wrist: '손목 / 팔꿈치' },
};
export const areaName = (lang: Lang, a: InjuryArea) => (AREA_NAME[lang] ?? AREA_NAME.en)[a];
