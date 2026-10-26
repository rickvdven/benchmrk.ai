import { rulesOf } from './rules';
import { addDays, daysBetween } from './time';
import { z1Cap, z2Cap } from './zones';
import { injuryProfile, prehabLine } from './injury';
import { stationStrengthSession, weekOf } from './plan';
import { raceModel } from './raceModel';
import { adaptRunToPlace, type Place } from './places';
import { STATION_NAMES } from './text';
import type { LoggedSession } from './adaptive';
import type { Lang, Profile, Session, Station, Week } from './types';

export type ExtraFocus = 'coach' | 'cardio' | 'strength' | 'mobility' | 'recovery';
export type ExtraAdvice = 'go' | 'caution' | 'rest';
export interface ExtraSuggestion {
  advice: ExtraAdvice;
  reasons: string[];
  session: Session;
  /** offered when the advice is "rest": the mobility session */
  alternative: Session | null;
  /** why the coach picked this session (coach focus) */
  why?: string;
  /** week load incl. this session vs. the planned week (1.0 = as planned) */
  load?: { pct: number; over: boolean };
}

const HARD = ['threshold', 'intervals', 'sim', 'race'];

type Dict = Record<string, string>;
const T: Record<Lang, Dict> = {
  en: {
    whyStrength: "Your week has {n} strength moment(s). 2×/week improves running economy (2–8 %) and cuts injuries (Blagrove 2018; Lauersen 2014) – so strength gives you the most.",
    whyRun: "Your projected run pace is {s} s/km behind your goal: extra easy kilometres are the cheapest gain.",
    whyStation: "Your runs are on track; the biggest gain is in {st}.",
    whyRecover: "Your body asks for recovery today – this helps you more than extra load.",
    whyInjury: "With a current running injury the coach picks work that doesn't load it.",
    budget: "This puts your week at {pct}% of the planned load. Above ~125 % the risk of overload rises – keep it easy.",
    budgetOut: "You already added {n} extra sessions this week. More now is overload, not progress.",
    recTitle: "Recovery · {min} min",
    recSleep: "First: sleep. Nothing on this list beats a good night (Walsh 2021).",
    recSauna: "Sauna 20–30 min (80–100 °C) or infrared 10–20 min (45–50 °C) right after an easy session, up to 3×/week. Drink well. Not before a hard session or race. Small studies suggest ~2 % endurance gain (Scoon 2007; Kirby 2021).",
    recColdNo: "Rather no cold bath today: right after strength or station work it blunts your strength gains (Roberts 2015; Malta 2021). After a pure run it is fine.",
    recColdOk: "Cold bath 11–15 °C for 11–15 min: helps a little against soreness (Machado 2016). Fine now – race/taper or after a run.",
    recHot: "Hot tub: relaxing. As heat preparation only useful before a race in the heat (40 °C, up to 40 min after an easy run, 6 days; Zurawlew 2016).",
    recFoam: "Foam roller 30–120 s per muscle group: mainly useful as a warm-up; after training a little less soreness (Wiewelhove 2019).",
    recMob: "Mobility 10–15 min for range of motion and feeling good – not as injury prevention (that is strength training).",

    raceClose: 'Race in {n} day(s): extra training now costs freshness and gains nothing.',
    stiff: 'Morning stiffness {n}/10 today — your tissue asks for recovery, not load.',
    fatigue: 'Average RPE {n} over the last 7 days: you are already carrying a lot of fatigue.',
    nextHard: 'Tomorrow is {s}. Keep today easy so that session gets your best legs.',
    prevHard: 'Yesterday was hard ({s}). Today counts as recovery for that work.',
    manyDays: 'You already trained {n} of the last 6 days. Rest is when the adaptation happens.',
    deload: 'This is a lighter week on purpose; extra load undoes the deload.',
    injury: 'You marked a running injury as current: cardio is kept low-impact.',
    ok: 'Good day for extra work: no hard session tomorrow and recovery looks fine.',
    cardioTitle: 'Extra easy run · {km} km',
    cardioDesc: '{km} km fully conversational, Zone 2 (HR ≤ {cap}). Extra aerobic volume is the cheapest way to a faster HYROX — as long as it stays easy.',
    cardioShortTitle: 'Short easy run · {km} km',
    cardioShortDesc: '{km} km in Zone 1–2 (HR ≤ {cap}), no strides. Just blood flow — you stay fresh for tomorrow.',
    ergTitle: 'Erg engine · 40 min Zone 2',
    ergDesc: '40 min alternating 10 min row / 10 min SkiErg at Zone 2 (HR ≤ {cap}). Aerobic work without extra running impact.',
    lowTitle: 'Low-impact cardio · 30–40 min',
    lowDesc: '30–40 min bike, cross-trainer or row in Zone 2 (HR ≤ {cap}). Builds the engine without loading the injury.',
    upperTitle: 'Upper body & core (no legs)',
    upperDesc: 'Legs stay fresh for tomorrow.\n• SkiErg technique 4 × 250 m easy\n• Pull-ups or lat pulldown 4 × 8\n• Bent-over rows 3 × 10\n• Push-ups 3 × 12\n• Core: 3 × 45 s plank + 3 × 10 dead bugs',
    mobTitle: 'Mobility & stretching · 25 min',
    mobDesc: '• 5 min easy walk or spin\n• Hip flexor stretch 2 × 45 s each side\n• Calf stretch straight + bent knee 2 × 45 s\n• Hamstring floss 2 × 10\n• Thoracic rotations 2 × 8 each side\n• Pigeon / 90-90 hips 2 × 45 s\n• Foam roll quads, calves, upper back',
  },
  nl: {
    whyStrength: "Je week heeft {n} krachtmoment(en). 2×/week verbetert je loopeconomie (2–8 %) en verlaagt blessures (Blagrove 2018; Lauersen 2014) – kracht levert je nu het meest op.",
    whyRun: "Je verwachte looptempo ligt {s} s/km achter op je doel: extra rustige kilometers zijn de goedkoopste winst.",
    whyStation: "Je runs liggen op schema; de meeste winst zit in {st}.",
    whyRecover: "Je lichaam vraagt vandaag om herstel – daar heb je meer aan dan aan extra belasting.",
    whyInjury: "Met een actuele loopblessure kiest de coach werk dat die niet belast.",
    budget: "Hiermee komt je week op {pct}% van de geplande belasting. Boven ~125 % neemt de kans op overbelasting toe – houd het rustig.",
    budgetOut: "Je hebt deze week al {n} extra trainingen toegevoegd. Meer is nu overbelasting, geen vooruitgang.",
    recTitle: "Herstel · {min} min",
    recSleep: "Eerst: slaap. Niets op deze lijst wint van een goede nacht (Walsh 2021).",
    recSauna: "Sauna 20–30 min (80–100 °C) of infrarood 10–20 min (45–50 °C) direct na een rustige training, tot 3×/week. Goed drinken. Niet vóór een zware training of race. Kleine studies wijzen op ~2 % duurwinst (Scoon 2007; Kirby 2021).",
    recColdNo: "Liever geen koud bad vandaag: direct na kracht- of stationwerk remt het je krachtwinst (Roberts 2015; Malta 2021). Na een pure looptraining kan het wel.",
    recColdOk: "Koud bad 11–15 °C, 11–15 min: helpt een beetje tegen spierpijn (Machado 2016). Nu prima – race/taper of na een looptraining.",
    recHot: "Jacuzzi: ontspannend. Als hittevoorbereiding alleen zinvol vóór een race in de warmte (40 °C, tot 40 min na een rustige run, 6 dagen; Zurawlew 2016).",
    recFoam: "Foamroller 30–120 s per spiergroep: vooral nuttig als warming-up; na de training iets minder spierpijn (Wiewelhove 2019).",
    recMob: "Mobiliteit 10–15 min voor bewegingsbereik en een goed gevoel – niet als blessurepreventie (dat is krachttraining).",

    raceClose: 'Race over {n} dag(en): extra training kost nu frisheid en levert niets meer op.',
    stiff: 'Ochtendstijfheid {n}/10 vandaag — je weefsel vraagt om herstel, niet om belasting.',
    fatigue: 'Gemiddelde RPE {n} over de laatste 7 dagen: je draagt al veel vermoeidheid mee.',
    nextHard: 'Morgen staat {s} gepland. Houd vandaag rustig zodat je die training met frisse benen doet.',
    prevHard: 'Gisteren was zwaar ({s}). Vandaag telt als herstel van dat werk.',
    manyDays: 'Je hebt al {n} van de laatste 6 dagen getraind. Tijdens rust word je sterker.',
    deload: 'Dit is bewust een lichtere week; extra belasting maakt de deload ongedaan.',
    injury: 'Je hebt een loopblessure als actueel aangegeven: cardio blijft low-impact.',
    ok: 'Goede dag voor extra werk: morgen geen zware training en je herstel ziet er goed uit.',
    cardioTitle: 'Extra rustige duurloop · {km} km',
    cardioDesc: '{km} km volledig op praattempo, zone 2 (HS ≤ {cap}). Extra aeroob volume is de goedkoopste weg naar een snellere HYROX — zolang het rustig blijft.',
    cardioShortTitle: 'Korte rustige run · {km} km',
    cardioShortDesc: '{km} km in zone 1–2 (HS ≤ {cap}), geen strides. Alleen doorbloeding — je blijft fris voor morgen.',
    ergTitle: 'Erg-motor · 40 min zone 2',
    ergDesc: '40 min afwisselend 10 min roeien / 10 min SkiErg in zone 2 (HS ≤ {cap}). Aeroob werk zonder extra loopbelasting.',
    lowTitle: 'Low-impact cardio · 30–40 min',
    lowDesc: '30–40 min fietsen, crosstrainer of roeien in zone 2 (HS ≤ {cap}). Bouwt de motor zonder de blessure te belasten.',
    upperTitle: 'Bovenlichaam & core (geen benen)',
    upperDesc: 'Benen blijven fris voor morgen.\n• SkiErg-techniek 4 × 250 m rustig\n• Pull-ups of lat pulldown 4 × 8\n• Bent-over rows 3 × 10\n• Push-ups 3 × 12\n• Core: 3 × 45 s plank + 3 × 10 dead bugs',
    mobTitle: 'Mobiliteit & stretching · 25 min',
    mobDesc: '• 5 min rustig wandelen of fietsen\n• Heupbuigers rekken 2 × 45 s per kant\n• Kuiten rekken gestrekt + gebogen knie 2 × 45 s\n• Hamstring floss 2 × 10\n• Thoracale rotaties 2 × 8 per kant\n• Pigeon / 90-90 heupen 2 × 45 s\n• Foamrollen bovenbenen, kuiten, bovenrug',
  },
  de: {
    whyStrength: "Deine Woche hat {n} Krafteinheit(en). 2×/Woche verbessert die Laufökonomie (2–8 %) und senkt Verletzungen (Blagrove 2018; Lauersen 2014) – Kraft bringt dir jetzt am meisten.",
    whyRun: "Dein erwartetes Lauftempo liegt {s} s/km hinter deinem Ziel: zusätzliche lockere Kilometer sind der günstigste Gewinn.",
    whyStation: "Deine Läufe sind im Plan; der größte Gewinn liegt bei {st}.",
    whyRecover: "Dein Körper braucht heute Erholung – das bringt dir mehr als Zusatzbelastung.",
    whyInjury: "Bei einer aktuellen Laufverletzung wählt der Coach Arbeit, die sie nicht belastet.",
    budget: "Damit liegt deine Woche bei {pct} % der geplanten Belastung. Über ~125 % steigt das Überlastungsrisiko – bleib locker.",
    budgetOut: "Du hast diese Woche schon {n} Extraeinheiten. Mehr ist jetzt Überlastung, kein Fortschritt.",
    recTitle: "Erholung · {min} Min.",
    recSleep: "Zuerst: Schlaf. Nichts auf dieser Liste schlägt eine gute Nacht (Walsh 2021).",
    recSauna: "Sauna 20–30 Min. (80–100 °C) oder Infrarot 10–20 Min. (45–50 °C) direkt nach einer lockeren Einheit, bis 3×/Woche. Gut trinken. Nicht vor harten Einheiten oder Rennen. Kleine Studien: ~2 % Ausdauergewinn (Scoon 2007; Kirby 2021).",
    recColdNo: "Heute lieber kein Eisbad: direkt nach Kraft- oder Stationsarbeit bremst es den Kraftzuwachs (Roberts 2015; Malta 2021). Nach einem reinen Lauf ist es ok.",
    recColdOk: "Kaltes Bad 11–15 °C, 11–15 Min.: hilft etwas gegen Muskelkater (Machado 2016). Jetzt ok – Rennen/Taper oder nach einem Lauf.",
    recHot: "Whirlpool: entspannend. Als Hitzevorbereitung nur vor einem Rennen in der Hitze sinnvoll (40 °C, bis 40 Min. nach lockerem Lauf, 6 Tage; Zurawlew 2016).",
    recFoam: "Faszienrolle 30–120 s pro Muskelgruppe: vor allem als Aufwärmen; danach etwas weniger Muskelkater (Wiewelhove 2019).",
    recMob: "Mobilität 10–15 Min. für Beweglichkeit und Wohlbefinden – nicht als Verletzungsprävention (das ist Krafttraining).",

    raceClose: 'Rennen in {n} Tag(en): Extratraining kostet jetzt Frische und bringt nichts mehr.',
    stiff: 'Morgensteifigkeit {n}/10 heute — dein Gewebe braucht Erholung, keine Belastung.',
    fatigue: 'Durchschnittliche RPE {n} in den letzten 7 Tagen: du trägst schon viel Ermüdung.',
    nextHard: 'Morgen steht {s} an. Halte heute locker, damit du diese Einheit mit frischen Beinen machst.',
    prevHard: 'Gestern war hart ({s}). Heute zählt als Erholung dafür.',
    manyDays: 'Du hast schon an {n} der letzten 6 Tage trainiert. In der Pause wirst du stärker.',
    deload: 'Das ist bewusst eine leichtere Woche; Zusatzbelastung macht den Deload zunichte.',
    injury: 'Du hast eine aktuelle Laufverletzung angegeben: Cardio bleibt gelenkschonend.',
    ok: 'Guter Tag für Extraarbeit: morgen keine harte Einheit und die Erholung sieht gut aus.',
    cardioTitle: 'Extra lockerer Lauf · {km} km',
    cardioDesc: '{km} km im Plauderton, Zone 2 (HF ≤ {cap}). Zusätzlicher aerober Umfang ist der günstigste Weg zu einem schnelleren HYROX — solange er locker bleibt.',
    cardioShortTitle: 'Kurzer lockerer Lauf · {km} km',
    cardioShortDesc: '{km} km in Zone 1–2 (HF ≤ {cap}), keine Steigerungen. Nur Durchblutung — du bleibst frisch für morgen.',
    ergTitle: 'Erg-Motor · 40 Min. Zone 2',
    ergDesc: '40 Min. abwechselnd 10 Min. Rudern / 10 Min. SkiErg in Zone 2 (HF ≤ {cap}). Aerobe Arbeit ohne zusätzliche Laufbelastung.',
    lowTitle: 'Gelenkschonendes Cardio · 30–40 Min.',
    lowDesc: '30–40 Min. Rad, Crosstrainer oder Rudern in Zone 2 (HF ≤ {cap}). Baut den Motor auf, ohne die Verletzung zu belasten.',
    upperTitle: 'Oberkörper & Core (keine Beine)',
    upperDesc: 'Die Beine bleiben frisch für morgen.\n• SkiErg-Technik 4 × 250 m locker\n• Klimmzüge oder Latzug 4 × 8\n• Vorgebeugtes Rudern 3 × 10\n• Liegestütze 3 × 12\n• Core: 3 × 45 s Plank + 3 × 10 Dead Bugs',
    mobTitle: 'Mobilität & Dehnen · 25 Min.',
    mobDesc: '• 5 Min. lockeres Gehen oder Radeln\n• Hüftbeuger dehnen 2 × 45 s pro Seite\n• Waden dehnen gestreckt + gebeugt 2 × 45 s\n• Hamstring Floss 2 × 10\n• BWS-Rotationen 2 × 8 pro Seite\n• Taube / 90-90 Hüfte 2 × 45 s\n• Faszienrolle Oberschenkel, Waden, oberer Rücken',
  },
  es: {
    raceClose: 'Carrera en {n} día(s): entrenar extra ahora cuesta frescura y no aporta nada.',
    stiff: 'Rigidez matinal {n}/10 hoy — tus tejidos piden recuperación, no carga.',
    fatigue: 'RPE media {n} en los últimos 7 días: ya acumulas bastante fatiga.',
    nextHard: 'Mañana toca {s}. Hoy suave para llegar con piernas frescas.',
    prevHard: 'Ayer fue duro ({s}). Hoy cuenta como recuperación de ese trabajo.',
    manyDays: 'Ya entrenaste {n} de los últimos 6 días. La adaptación ocurre en el descanso.',
    deload: 'Esta semana es más ligera a propósito; carga extra anula la descarga.',
    injury: 'Marcaste una lesión de carrera como actual: el cardio será de bajo impacto.',
    ok: 'Buen día para trabajo extra: mañana no hay sesión dura y la recuperación va bien.',
    cardioTitle: 'Rodaje suave extra · {km} km',
    cardioDesc: '{km} km a ritmo de conversación, zona 2 (FC ≤ {cap}). Volumen aeróbico extra es la vía más barata a un HYROX más rápido — mientras sea suave.',
    cardioShortTitle: 'Rodaje corto suave · {km} km',
    cardioShortDesc: '{km} km en zona 1–2 (FC ≤ {cap}), sin progresivos. Solo activar — llegas fresco a mañana.',
    ergTitle: 'Motor en ergómetros · 40 min zona 2',
    ergDesc: '40 min alternando 10 min remo / 10 min SkiErg en zona 2 (FC ≤ {cap}). Trabajo aeróbico sin impacto extra de carrera.',
    lowTitle: 'Cardio de bajo impacto · 30–40 min',
    lowDesc: '30–40 min bici, elíptica o remo en zona 2 (FC ≤ {cap}). Construye motor sin cargar la lesión.',
    upperTitle: 'Tren superior y core (sin piernas)',
    upperDesc: 'Las piernas quedan frescas para mañana.\n• Técnica SkiErg 4 × 250 m suave\n• Dominadas o jalón 4 × 8\n• Remo inclinado 3 × 10\n• Flexiones 3 × 12\n• Core: 3 × 45 s plancha + 3 × 10 dead bugs',
    mobTitle: 'Movilidad y estiramientos · 25 min',
    mobDesc: '• 5 min caminar o bici suave\n• Flexores de cadera 2 × 45 s por lado\n• Gemelos rodilla recta + flexionada 2 × 45 s\n• Hamstring floss 2 × 10\n• Rotaciones torácicas 2 × 8 por lado\n• Paloma / 90-90 cadera 2 × 45 s\n• Foam roller cuádriceps, gemelos, espalda alta',
  },
  ko: {
    raceClose: '레이스까지 {n}일: 지금 추가 훈련은 컨디션만 떨어뜨리고 얻는 것이 없습니다.',
    stiff: '오늘 아침 뻣뻣함 {n}/10 — 몸이 부하가 아닌 회복을 원합니다.',
    fatigue: '최근 7일 평균 RPE {n}: 이미 피로가 많이 쌓여 있습니다.',
    nextHard: '내일은 {s}입니다. 그 세션을 위해 오늘은 가볍게 하세요.',
    prevHard: '어제는 힘들었습니다 ({s}). 오늘은 그 회복일입니다.',
    manyDays: '최근 6일 중 이미 {n}일 훈련했습니다. 적응은 휴식 중에 일어납니다.',
    deload: '이번 주는 의도적으로 가벼운 주입니다; 추가 부하는 디로드를 무효로 만듭니다.',
    injury: '현재 러닝 부상이 있어 유산소는 저충격으로 유지합니다.',
    ok: '추가 훈련하기 좋은 날: 내일 고강도 세션이 없고 회복 상태도 좋습니다.',
    cardioTitle: '추가 이지런 · {km} km',
    cardioDesc: '{km} km 대화 가능한 페이스, 2존 (심박수 ≤ {cap}). 추가 유산소 볼륨이 더 빠른 HYROX로 가는 가장 쉬운 방법입니다 — 쉽게 유지하는 한.',
    cardioShortTitle: '짧은 이지런 · {km} km',
    cardioShortDesc: '{km} km 1–2존 (심박수 ≤ {cap}), 스트라이드 없음. 혈액순환만 — 내일을 위해 신선하게.',
    ergTitle: '에르그 엔진 · 40분 2존',
    ergDesc: '로잉 10분 / SkiErg 10분 번갈아 40분, 2존 (심박수 ≤ {cap}). 러닝 충격 없는 유산소 훈련.',
    lowTitle: '저충격 유산소 · 30–40분',
    lowDesc: '자전거, 크로스트레이너 또는 로잉 30–40분 2존 (심박수 ≤ {cap}). 부상 부위에 부담 없이 엔진을 키웁니다.',
    upperTitle: '상체 & 코어 (하체 제외)',
    upperDesc: '내일을 위해 다리는 쉬게 합니다.\n• SkiErg 기술 4 × 250 m 가볍게\n• 풀업 또는 랫풀다운 4 × 8\n• 벤트오버 로우 3 × 10\n• 푸시업 3 × 12\n• 코어: 플랭크 3 × 45초 + 데드버그 3 × 10',
    mobTitle: '가동성 & 스트레칭 · 25분',
    mobDesc: '• 5분 가벼운 걷기 또는 자전거\n• 고관절 굴곡근 스트레칭 측당 2 × 45초\n• 종아리 스트레칭(무릎 편/굽힌) 2 × 45초\n• 햄스트링 플로싱 2 × 10\n• 흉추 회전 측당 2 × 8\n• 피전 / 90-90 고관절 2 × 45초\n• 폼롤러 허벅지, 종아리, 상부 등',
  },
};
const tr = (lang: Lang, k: string, p: Record<string, string | number> = {}) =>
  ((T[lang] ?? T.en)[k] ?? T.en[k]).replace(/\{(\w+)\}/g, (_, x) => String(p[x] ?? ''));

export interface ExtraContext {
  profile: Profile;
  weeks: Week[];
  logs: LoggedSession[];
  morning: Record<string, number>;
  today: string;
  ceiling: number;
  weakest: Station[];
  lang: Lang;
  /** where the extra session would happen */
  place?: Place | null;
}

/** Rough load of a session: minutes × intensity (session-RPE style), for the weekly budget. */
export function sessionLoad(x: Session, T: number): number {
  const runMin = (km?: number, f = 1.22) => ((km ?? 6) * T * f) / 60;
  switch (x.type) {
    case 'threshold':
    case 'intervals':
      return 50 * 1.6;
    case 'sim':
      return 70 * 1.8;
    case 'long':
      return runMin(x.km, 1.25) * 1.1;
    case 'easy':
      return x.km ? runMin(x.km) : 40;
    case 'strength':
      return 50 * 1.2;
    case 'wod':
      return 60 * 1.4;
    case 'recovery':
      return 30 * 0.3;
    default:
      return 0;
  }
}

/** A smart extra session for a rest/recovery day — or the advice not to train. */
export function suggestExtra(date: string, focusIn: ExtraFocus, c: ExtraContext): ExtraSuggestion {
  const { lang, profile: p } = c;
  const a = p.athlete;
  const all = c.weeks.flatMap((w) => w.sessions);
  const week = weekOf(c.weeks, date);
  const rest: string[] = [];
  const caution: string[] = [];

  const toRace = daysBetween(date, p.raceDate);
  if (toRace >= 0 && toRace <= 2) rest.push(tr(lang, 'raceClose', { n: toRace }));
  const stiff = c.morning[date];
  if (stiff !== undefined && stiff >= c.ceiling) rest.push(tr(lang, 'stiff', { n: stiff }));
  const recent = c.logs.filter((l) => l.date < date && l.date >= addDays(date, -7) && l.rpe);
  const avgRpe = recent.length ? recent.reduce((n, l) => n + (l.rpe ?? 0), 0) / recent.length : 0;
  if (recent.length >= 3 && avgRpe >= 8) rest.push(tr(lang, 'fatigue', { n: avgRpe.toFixed(1) }));

  const next = all.find((s) => s.date === addDays(date, 1));
  const nextHard = !!next && (HARD.includes(next.type) || !!next.benchmark);
  if (nextHard) caution.push(tr(lang, 'nextHard', { s: next!.title }));
  const prevLog = c.logs.find((l) => l.date === addDays(date, -1));
  const prevPlan = all.find((s) => s.date === addDays(date, -1));
  if ((prevLog && (HARD.includes(prevLog.type) || (prevLog.rpe ?? 0) >= 8)) || (!prevLog && prevPlan && HARD.includes(prevPlan.type) && prevPlan.date < c.today)) {
    caution.push(tr(lang, 'prevHard', { s: prevPlan?.title ?? prevLog!.type }));
  }
  const days = new Set(c.logs.filter((l) => l.date < date && l.date >= addDays(date, -6)).map((l) => l.date)).size;
  if (days >= 5) caution.push(tr(lang, 'manyDays', { n: days }));
  if (week && (week.deload || week.phase === 'taper')) caution.push(tr(lang, 'deload'));

  // weekly budget: extras already in this week (other days)
  const extrasThisWeek = (week?.sessions ?? []).filter((x) => x.extra && x.date !== date && x.type !== 'recovery').length;
  if (extrasThisWeek >= 2 && focusIn !== 'recovery' && focusIn !== 'mobility') rest.push(tr(lang, 'budgetOut', { n: extrasThisWeek }));

  const rs = rulesOf(p);
  const inj = injuryProfile(a.flags, rs);
  const z2 = z2Cap(a.lthr, a.maxHr, rs);
  const z1 = z1Cap(a.lthr, a.maxHr, rs);
  const weekKm = week ? week.sessions.reduce((n, s) => n + (s.km ?? 0), 0) : 25;

  // ---- "let the coach choose": where is the biggest gain, given today's state?
  let focus: ExtraFocus = focusIn;
  let why: string | undefined;
  if (focusIn === 'coach') {
    const strengthMoments = (week?.sessions ?? []).reduce((n, x) => n + (x.type === 'strength' ? 1 : x.type === 'wod' ? 0.5 : 0), 0);
    const m = raceModel(p, c.today);
    if (rest.length) {
      focus = 'recovery';
      why = tr(lang, 'whyRecover');
    } else if (inj.runLoad === 'now') {
      focus = caution.length ? 'mobility' : 'strength';
      why = tr(lang, 'whyInjury');
    } else if (strengthMoments < 2) {
      focus = caution.length ? 'mobility' : 'strength';
      why = tr(lang, 'whyStrength', { n: Math.round(strengthMoments) });
    } else if (m.runGapSecPerKm > 0) {
      focus = 'cardio';
      why = tr(lang, 'whyRun', { s: Math.round(m.runGapSecPerKm) });
    } else {
      focus = caution.length ? 'mobility' : 'strength';
      why = tr(lang, 'whyStation', { st: (STATION_NAMES[lang] ?? STATION_NAMES.en)[c.weakest[0] ?? 'sledPush'] });
    }
  }
  const base = { id: date, date, dow: (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7, extra: true, extraFocus: focus === 'coach' ? 'cardio' : focus } as Session;

  const mobility: Session = {
    ...base,
    extraFocus: 'mobility',
    type: 'recovery',
    title: tr(lang, 'mobTitle'),
    description: [tr(lang, 'mobDesc'), ...inj.prehab.slice(0, 2).map((x) => '• ' + prehabLine(lang, x))].join('\n'),
    hrCap: z1,
  };

  const advice: ExtraAdvice = rest.length ? 'rest' : caution.length ? 'caution' : 'go';
  const has = (i: string) => !!c.place?.items.includes(i as never);
  let session: Session;
  if (focus === 'mobility') session = mobility;
  else if (focus === 'recovery') {
    // recovery modalities with honest evidence and timing
    const today = all.find((x) => x.date === date);
    const strengthDay = [today, prevPlan].some((x) => x && ['strength', 'wod', 'sim'].includes(x.type));
    const compPhase = (week?.phase === 'taper') || toRace <= 7;
    const lines = [tr(lang, 'recSleep')];
    if (has('sauna')) lines.push('• ' + tr(lang, 'recSauna'));
    if (has('cold')) lines.push('• ' + tr(lang, strengthDay && !compPhase ? 'recColdNo' : 'recColdOk'));
    if (has('hottub')) lines.push('• ' + tr(lang, 'recHot'));
    if (has('foamroller') || !c.place) lines.push('• ' + tr(lang, 'recFoam'));
    lines.push('• ' + tr(lang, 'recMob'), tr(lang, 'mobDesc'));
    session = { ...base, extraFocus: 'mobility', type: 'recovery', title: tr(lang, 'recTitle', { min: has('sauna') ? 45 : 30 }), description: lines.join('\n'), hrCap: z1, sourceKey: 'Walsh' };
  } else if (focus === 'cardio') {
    if (inj.runLoad === 'now') {
      caution.push(tr(lang, 'injury'));
      session = { ...base, type: 'recovery', title: tr(lang, 'lowTitle'), description: tr(lang, 'lowDesc', { cap: z2 }), hrCap: z2 };
    } else if (advice !== 'go') {
      const km = Math.max(4, Math.min(6, Math.round(weekKm * 0.12)));
      session = { ...base, type: 'easy', title: tr(lang, 'cardioShortTitle', { km }), description: tr(lang, 'cardioShortDesc', { km, cap: z2 }), hrCap: z2, km };
    } else if (a.archetype === 'fast_runner' && (!c.place || has('rower') || has('skierg'))) {
      // runners already have the running engine; ergs add aerobic work without extra impact
      session = { ...base, type: 'easy', title: tr(lang, 'ergTitle'), description: tr(lang, 'ergDesc', { cap: z2 }), hrCap: z2 };
    } else {
      const km = Math.max(5, Math.min(12, Math.round(weekKm * 0.18)));
      session = { ...base, type: 'easy', title: tr(lang, 'cardioTitle', { km }), description: tr(lang, 'cardioDesc', { km, cap: z2 }), hrCap: z2, km, targetPaceSec: Math.round(a.thresholdPaceSec * rs.pace.easyFactor) };
    }
    if (c.place && session.type === 'easy' && session.km) {
      const adapted = adaptRunToPlace(lang, session, c.place, { lthr: a.lthr, maxHr: a.maxHr, T: a.thresholdPaceSec, z2 });
      if (adapted) session = { ...session, ...adapted } as Session;
    }
  } else {
    if (advice !== 'go') {
      session = { ...base, type: 'strength', title: tr(lang, 'upperTitle'), description: tr(lang, 'upperDesc'), rpe: '6/10' };
    } else {
      // stations not already trained in a strength session this week
      const done = new Set((week?.sessions ?? []).flatMap((s) => s.focusStations ?? []));
      const order = [...c.weakest.filter((s) => !done.has(s)), ...c.weakest.filter((s) => done.has(s))];
      const st = stationStrengthSession(p, lang, week?.phase ?? 'base', order, c.place ?? null);
      session = { ...base, ...(st as Session), extra: true, extraFocus: 'strength' };
    }
  }

  // weekly budget check (planned sessions + extras + this one)
  let load: ExtraSuggestion['load'];
  if (week && focus !== 'recovery' && focus !== 'mobility') {
    const T = a.thresholdPaceSec;
    const planned = week.sessions.filter((x) => !x.extra).reduce((n, x) => n + sessionLoad(x, T), 0);
    const withExtra = week.sessions.filter((x) => x.date !== date).reduce((n, x) => n + sessionLoad(x, T), 0) + sessionLoad(session, T);
    if (planned > 0) {
      const pct = Math.round((withExtra / planned) * 100);
      // one extra session on top of a 4-day week is ~+20 %: fine. Above ~125 % it starts to stack up.
      load = { pct, over: pct > 125 };
      if (pct > 125) caution.push(tr(lang, 'budget', { pct }));
    }
  }

  const final: ExtraAdvice = focus === 'recovery' ? 'go' : rest.length ? 'rest' : caution.length ? 'caution' : 'go';
  const reasons = focus === 'recovery' && rest.length ? rest : rest.length ? rest : caution.length ? caution : [tr(lang, 'ok')];
  return { advice: final, reasons, session, alternative: final === 'rest' && focus !== 'mobility' ? mobility : null, why, load };
}
