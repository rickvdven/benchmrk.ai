import { injuriesOf, prehabLine, RUN_AREAS, type InjuryArea } from './injury';
import { daysBetween } from './time';
import { z2Cap } from './zones';
import type { Flags, Lang, Session } from './types';
import { V1 } from './rules/v1';
import type { RuleSet } from './rules/types';

/**
 * Injury mode for the plan.
 * - A running area is "now": no running. Runs become cross-training at the same heart-rate zone (Mujika & Padilla 2000;
 *   Eyestone 1993; Wilber 1996), calf-heavy stations are dropped, and every session carries a calf/tendon rehab block
 *   (isometric → heavy slow resistance → plyometrics; Beyer 2015, Silbernagel 2007).
 * - The athlete passes the return test → status "recent" + returnSince: 3-week walk-run return, threshold work last.
 */
export interface RehabCtx {
  lang: Lang;
  flags: Flags;
  lthr: number;
  maxHr: number;
  T: number; // threshold pace s/km
  rs?: RuleSet;
}

type K =
  | 'shot' | 'xThrT' | 'xThrD' | 'xZ2T' | 'xZ2D' | 'xSimT' | 'xSimD' | 'wod' | 'mod' | 'rowNote'
  | 'iso' | 'hsr' | 'plyo' | 'test' | 'gate'
  | 'w1' | 'w2' | 'w3' | 'wrT' | 'rThr' | 'rSim' | 'strNow' | 'area';
const T: Record<Lang, Record<K, string>> = {
  en: {
    shot: '⚠️ Did you feel a "shot" or "kick" in your calf? Have a physio or doctor check it first (rule out an Achilles injury) before you load it.',
    xThrT: 'Threshold without running: {n} × 4 min',
    xThrD: '{n} × 4 min at threshold heart rate ({lo}–{hi} bpm), 2 min easy in between. Same stimulus as your threshold run, without impact on your {area}.',
    xZ2T: 'Endurance without running · {min} min',
    xZ2D: '{min} min in zone 2 (HR ≤ {cap}). Keeps your aerobic engine going while you can\'t run.',
    xSimT: 'Sim without running · 6 rounds',
    xSimD: '6 rounds: 4 min bike/rower at race heart rate + one station that doesn\'t load your {area}: SkiErg 250 m, sled pull 12.5 m, farmers carry 50 m (only if walking is pain-free). No sled push, lunges, burpees or wall balls.',
    wod: 'Injury: adapt the WOD – no running or jumping, no burpees, lunges, sled push or wall balls. Replace running with bike, rower or SkiErg.',
    mod: 'Choose: bike / spinning / home trainer, rower, SkiErg or deep-water running.',
    rowNote: 'Rower: stop if the catch hurts your calf.',
    iso: 'Calf rehab (day {d}): isometric – 5 × 45 s holding on the balls of your feet (wall support), pain max 3/10. Then seated calf raises 3 × 15 light.',
    hsr: 'Calf rehab (day {d}): heavy slow – seated and standing calf raises 3 × 15→8 (3 s up, 3 s down), 3×/week. Pain max 5/10 and not worse the next morning.',
    plyo: 'Calf rehab (day {d}): heavy calf raises 3 × 8 + pogo jumps 3 × 20 if pain-free.',
    test: 'Return test: 20–25 single-leg calf raises and 10 single-leg hops pain-free, walking pain-free → mark yourself "recovering" in the cockpit.',
    gate: 'Pain max 5/10 during, and not worse tomorrow morning? Carry on. Otherwise go one step back.',
    w1: 'Walk-run (return week 1): 10 × (1 min easy running + 1 min walking); later this week 8 × (2 min + 1 min).',
    w2: 'Walk-run (return week 2): 5 × (4 min easy + 1 min walking); later this week 20–30 min continuous easy.',
    w3: 'Return week 3: 30–40 min easy continuous + 4 relaxed strides.',
    wrT: 'Walk-run · return week {w}',
    rThr: 'Return week 3: threshold back, but half the reps. Stop if your {area} reacts.',
    rSim: 'Return week 3: runs in this sim at easy pace, no race pace yet.',
    strNow: 'Injury: no calf-heavy stations (sled push, lunges, burpees, wall balls) – upper body, hips and core instead.',
    area: 'calf / Achilles',
  },
  nl: {
    shot: '⚠️ Voelde je een "schot" of "trap" in je kuit? Laat eerst een fysio of arts kijken (achillespees uitsluiten) voordat je gaat belasten.',
    xThrT: 'Drempel zonder lopen: {n} × 4 min',
    xThrD: '{n} × 4 min op drempelhartslag ({lo}–{hi} bpm), 2 min rustig ertussen. Zelfde prikkel als je drempelrun, zonder klap op je {area}.',
    xZ2T: 'Duurtraining zonder lopen · {min} min',
    xZ2D: '{min} min in zone 2 (HS ≤ {cap}). Houdt je aerobe motor draaiend zolang je niet kunt lopen.',
    xSimT: 'Sim zonder lopen · 6 rondes',
    xSimD: '6 rondes: 4 min fiets/roeier op racehartslag + één station dat je {area} niet belast: SkiErg 250 m, sled pull 12,5 m, farmers carry 50 m (alleen als wandelen pijnvrij gaat). Geen sled push, lunges, burpees of wall balls.',
    wod: 'Blessure: pas de WOD aan – niet lopen of springen, geen burpees, lunges, sled push of wall balls. Vervang lopen door fiets, roeier of SkiErg.',
    mod: 'Kies: fiets / spinning / hometrainer, roeier, SkiErg of aquajoggen.',
    rowNote: 'Roeier: stop als de inzet (catch) pijn doet in je kuit.',
    iso: 'Kuitrevalidatie (dag {d}): isometrisch – 5 × 45 s op de bal van je voeten blijven staan (steun tegen de muur), pijn max 3/10. Daarna zittend kuitheffen 3 × 15 licht.',
    hsr: 'Kuitrevalidatie (dag {d}): zwaar en langzaam – zittend en staand kuitheffen 3 × 15→8 (3 s op, 3 s neer), 3×/week. Pijn max 5/10 en morgenochtend niet erger.',
    plyo: 'Kuitrevalidatie (dag {d}): zwaar kuitheffen 3 × 8 + pogo-sprongetjes 3 × 20 als het pijnvrij is.',
    test: 'Terugkeertest: 20–25 keer kuitheffen op één been en 10 hops op één been pijnvrij, wandelen pijnvrij → zet jezelf in de cockpit op "herstellende".',
    gate: 'Pijn max 5/10 tijdens en morgenochtend niet erger? Door. Anders een stap terug.',
    w1: 'Wandel-hardloop (terugkeerweek 1): 10 × (1 min rustig hardlopen + 1 min wandelen); later deze week 8 × (2 min + 1 min).',
    w2: 'Wandel-hardloop (terugkeerweek 2): 5 × (4 min rustig + 1 min wandelen); later deze week 20–30 min aaneengesloten rustig.',
    w3: 'Terugkeerweek 3: 30–40 min rustig aaneengesloten + 4 ontspannen versnellingen.',
    wrT: 'Wandel-hardloop · terugkeerweek {w}',
    rThr: 'Terugkeerweek 3: drempel komt terug, maar de helft van de herhalingen. Stop als je {area} reageert.',
    rSim: 'Terugkeerweek 3: de runs in deze sim op rustig tempo, nog geen racetempo.',
    strNow: 'Blessure: geen kuitzware stations (sled push, lunges, burpees, wall balls) – bovenlichaam, heupen en romp in plaats daarvan.',
    area: 'kuit / achilles',
  },
  de: {
    shot: '⚠️ Hast du einen „Schlag“ in der Wade gespürt? Lass es zuerst von Physio oder Arzt prüfen (Achillessehne ausschließen), bevor du belastest.',
    xThrT: 'Schwelle ohne Laufen: {n} × 4 min',
    xThrD: '{n} × 4 min bei Schwellenpuls ({lo}–{hi} bpm), 2 min locker dazwischen. Gleicher Reiz wie dein Schwellenlauf, ohne Stoß auf {area}.',
    xZ2T: 'Ausdauer ohne Laufen · {min} min',
    xZ2D: '{min} min in Zone 2 (HF ≤ {cap}). Hält deinen aeroben Motor am Laufen, solange du nicht laufen kannst.',
    xSimT: 'Sim ohne Laufen · 6 Runden',
    xSimD: '6 Runden: 4 min Rad/Rudern bei Rennpuls + eine Station ohne Belastung für {area}: SkiErg 250 m, Sled Pull 12,5 m, Farmers Carry 50 m (nur wenn Gehen schmerzfrei ist). Kein Sled Push, Lunges, Burpees oder Wall Balls.',
    wod: 'Verletzung: WOD anpassen – kein Laufen oder Springen, keine Burpees, Lunges, Sled Push oder Wall Balls. Laufen durch Rad, Rudern oder SkiErg ersetzen.',
    mod: 'Wähle: Rad / Spinning / Ergometer, Rudern, SkiErg oder Aqua-Jogging.',
    rowNote: 'Rudern: abbrechen, wenn der Catch in der Wade schmerzt.',
    iso: 'Wadenreha (Tag {d}): isometrisch – 5 × 45 s auf den Fußballen halten (Wandstütze), Schmerz max 3/10. Danach sitzendes Wadenheben 3 × 15 leicht.',
    hsr: 'Wadenreha (Tag {d}): schwer und langsam – sitzendes und stehendes Wadenheben 3 × 15→8 (3 s hoch, 3 s runter), 3×/Woche. Schmerz max 5/10, am nächsten Morgen nicht schlimmer.',
    plyo: 'Wadenreha (Tag {d}): schweres Wadenheben 3 × 8 + Pogo-Sprünge 3 × 20, wenn schmerzfrei.',
    test: 'Rückkehrtest: 20–25 einbeinige Wadenheber und 10 einbeinige Hops schmerzfrei, Gehen schmerzfrei → im Cockpit auf „in Erholung“ setzen.',
    gate: 'Schmerz max 5/10 und morgen früh nicht schlimmer? Weiter. Sonst einen Schritt zurück.',
    w1: 'Geh-Lauf (Rückkehrwoche 1): 10 × (1 min locker laufen + 1 min gehen); später in der Woche 8 × (2 min + 1 min).',
    w2: 'Geh-Lauf (Rückkehrwoche 2): 5 × (4 min locker + 1 min gehen); später 20–30 min am Stück locker.',
    w3: 'Rückkehrwoche 3: 30–40 min locker am Stück + 4 lockere Steigerungen.',
    wrT: 'Geh-Lauf · Rückkehrwoche {w}',
    rThr: 'Rückkehrwoche 3: Schwelle kommt zurück, aber halbe Wiederholungen. Abbrechen, wenn {area} reagiert.',
    rSim: 'Rückkehrwoche 3: Läufe in dieser Sim locker, noch kein Renntempo.',
    strNow: 'Verletzung: keine wadenlastigen Stationen (Sled Push, Lunges, Burpees, Wall Balls) – stattdessen Oberkörper, Hüfte, Rumpf.',
    area: 'Wade / Achillessehne',
  },
  es: {
    shot: '⚠️ ¿Sentiste un "latigazo" en el gemelo? Que lo revise primero un fisio o médico (descartar el Aquiles) antes de cargar.',
    xThrT: 'Umbral sin correr: {n} × 4 min',
    xThrD: '{n} × 4 min a pulso de umbral ({lo}–{hi} lpm), 2 min suave entre medias. Mismo estímulo que tu carrera de umbral, sin impacto en {area}.',
    xZ2T: 'Resistencia sin correr · {min} min',
    xZ2D: '{min} min en zona 2 (FC ≤ {cap}). Mantiene tu motor aeróbico mientras no puedes correr.',
    xSimT: 'Sim sin correr · 6 rondas',
    xSimD: '6 rondas: 4 min bici/remo a pulso de carrera + una estación que no cargue {area}: SkiErg 250 m, sled pull 12,5 m, farmers 50 m (solo si caminar no duele). Sin sled push, lunges, burpees ni wall balls.',
    wod: 'Lesión: adapta el WOD – sin correr ni saltar, sin burpees, lunges, sled push ni wall balls. Sustituye correr por bici, remo o SkiErg.',
    mod: 'Elige: bici / spinning / rodillo, remo, SkiErg o aquarunning.',
    rowNote: 'Remo: para si el agarre (catch) duele en el gemelo.',
    iso: 'Rehab de gemelo (día {d}): isométrico – 5 × 45 s de puntillas (apoyo en la pared), dolor máx 3/10. Después elevaciones sentado 3 × 15 ligeras.',
    hsr: 'Rehab de gemelo (día {d}): pesado y lento – elevaciones sentado y de pie 3 × 15→8 (3 s arriba, 3 s abajo), 3×/semana. Dolor máx 5/10 y no peor a la mañana siguiente.',
    plyo: 'Rehab de gemelo (día {d}): elevaciones pesadas 3 × 8 + saltitos pogo 3 × 20 si no duele.',
    test: 'Test de vuelta: 20–25 elevaciones a una pierna y 10 saltos a una pierna sin dolor, caminar sin dolor → márcate "recuperándome" en el cockpit.',
    gate: '¿Dolor máx 5/10 y no peor mañana? Sigue. Si no, un paso atrás.',
    w1: 'Caminar-correr (semana de vuelta 1): 10 × (1 min trote suave + 1 min caminando); más tarde 8 × (2 min + 1 min).',
    w2: 'Caminar-correr (semana de vuelta 2): 5 × (4 min suave + 1 min caminando); más tarde 20–30 min seguidos suaves.',
    w3: 'Semana de vuelta 3: 30–40 min suaves seguidos + 4 progresiones relajadas.',
    wrT: 'Caminar-correr · semana de vuelta {w}',
    rThr: 'Semana de vuelta 3: vuelve el umbral, pero con la mitad de repeticiones. Para si {area} reacciona.',
    rSim: 'Semana de vuelta 3: carreras de este sim a ritmo suave, aún sin ritmo de carrera.',
    strNow: 'Lesión: sin estaciones que carguen el gemelo (sled push, lunges, burpees, wall balls) – tren superior, cadera y core.',
    area: 'gemelo / Aquiles',
  },
  ko: {
    shot: '⚠️ 종아리에 "탁" 하는 충격을 느꼈나요? 부하를 주기 전에 먼저 물리치료사나 의사에게 확인받으세요 (아킬레스 손상 배제).',
    xThrT: '러닝 없는 역치: {n} × 4분',
    xThrD: '역치 심박({lo}–{hi} bpm)으로 {n} × 4분, 사이 2분 가볍게. 역치 러닝과 같은 자극, {area}에 충격 없음.',
    xZ2T: '러닝 없는 지구력 · {min}분',
    xZ2D: '존 2(HR ≤ {cap})로 {min}분. 달릴 수 없는 동안 유산소 엔진을 유지해요.',
    xSimT: '러닝 없는 시뮬 · 6라운드',
    xSimD: '6라운드: 자전거/로잉 4분 레이스 심박 + {area}에 부담 없는 스테이션 하나: SkiErg 250 m, sled pull 12.5 m, farmers 50 m (걷기가 통증 없을 때만). sled push, 런지, 버피, 월볼 금지.',
    wod: '부상: WOD 조정 – 러닝·점프 금지, 버피·런지·sled push·월볼 금지. 러닝은 자전거, 로잉, SkiErg로 대체.',
    mod: '선택: 자전거 / 스피닝 / 실내 자전거, 로잉, SkiErg 또는 수중 러닝.',
    rowNote: '로잉: 캐치에서 종아리가 아프면 중단.',
    iso: '종아리 재활 ({d}일차): 등척성 – 발볼로 5 × 45초 버티기 (벽 지지), 통증 최대 3/10. 이후 앉아서 카프레이즈 3 × 15 가볍게.',
    hsr: '종아리 재활 ({d}일차): 무겁고 느리게 – 앉아서·서서 카프레이즈 3 × 15→8 (3초 올리고 3초 내리기), 주 3회. 통증 최대 5/10, 다음 날 아침 악화 없음.',
    plyo: '종아리 재활 ({d}일차): 무거운 카프레이즈 3 × 8 + 통증 없으면 포고 점프 3 × 20.',
    test: '복귀 테스트: 한 발 카프레이즈 20–25회와 한 발 홉 10회 통증 없이, 걷기 통증 없음 → 콕핏에서 "회복 중"으로 변경.',
    gate: '통증 최대 5/10이고 내일 아침 악화 없음? 계속. 아니면 한 단계 뒤로.',
    w1: '걷기-달리기 (복귀 1주): 10 × (1분 가볍게 달리기 + 1분 걷기); 주 후반 8 × (2분 + 1분).',
    w2: '걷기-달리기 (복귀 2주): 5 × (4분 가볍게 + 1분 걷기); 주 후반 20–30분 연속 가볍게.',
    w3: '복귀 3주: 30–40분 연속 가볍게 + 가벼운 가속주 4회.',
    wrT: '걷기-달리기 · 복귀 {w}주',
    rThr: '복귀 3주: 역치가 돌아오지만 반복은 절반. {area}가 반응하면 중단.',
    rSim: '복귀 3주: 이 시뮬의 러닝은 가볍게, 아직 레이스 페이스 아님.',
    strNow: '부상: 종아리 부담 스테이션(sled push, 런지, 버피, 월볼) 금지 – 대신 상체, 엉덩이, 코어.',
    area: '종아리 / 아킬레스',
  },
};
const tr = (l: Lang, k: K, p: Record<string, string | number> = {}) => ((T[l] ?? T.en)[k]).replace(/\{(\w+)\}/g, (_, x) => String(p[x] ?? ''));

const CALF: InjuryArea[] = ['achilles', 'plantar', 'shin'];

/** Running areas that are "now", and since when. */
export function runInjury(f: Flags | null | undefined, today: string) {
  const inj = injuriesOf(f);
  const now = RUN_AREAS.filter((a) => inj[a] === 'now');
  if (!now.length) return null;
  const dates = now.map((a) => f?.injurySince?.[a]).filter(Boolean) as string[];
  const since = dates.sort()[0] ?? today;
  return { areas: now, since, calf: now.some((a) => CALF.includes(a)) };
}

/** Walk-run return: week 1–3 after passing the return test, else null. */
export function returnWeek(f: Flags | null | undefined, date: string, rs: RuleSet = V1) {
  const inj = injuriesOf(f);
  if (!f?.returnSince || !RUN_AREAS.some((a) => inj[a] === 'recent') || RUN_AREAS.some((a) => inj[a] === 'now')) return null;
  const d = daysBetween(f.returnSince, date);
  if (d < 0 || d >= rs.returnToRun.days) return null;
  return Math.floor(d / 7) + 1;
}

function rehabLine(lang: Lang, day: number) {
  return day < 7 ? tr(lang, 'iso', { d: day + 1 }) : day < 21 ? tr(lang, 'hsr', { d: day + 1 }) : tr(lang, 'plyo', { d: day + 1 });
}

/** Rewrites one planned session for injury mode / return-to-run. Returns null if nothing changes. */
export function adaptForInjury(c: RehabCtx, s: Partial<Session>, date: string, today: string, opts: { taper?: boolean } = {}): Partial<Session> | null {
  if (date < today || !s.type || s.type === 'rest' || s.type === 'race') return null;
  const lang = c.lang;
  const rs = c.rs ?? V1;
  const ri = runInjury(c.flags, today);
  const area = tr(lang, 'area');
  const lo = Math.round(c.lthr * 0.95);
  const hi = Math.min(c.lthr, c.maxHr);
  const cap = z2Cap(c.lthr, c.maxHr, rs);
  const minutesFor = (km?: number) =>
    Math.max(rs.returnToRun.crossMinMinutes, Math.min(rs.returnToRun.crossMaxMinutes, Math.round(((km ?? 6) * c.T * rs.pace.easyFactor) / 60 / 5) * 5));

  if (ri) {
    const day = Math.max(0, daysBetween(ri.since, date));
    const head = day <= 3 && ri.calf ? [tr(lang, 'shot')] : [];
    const tail = [...(ri.calf ? [rehabLine(lang, day), tr(lang, 'test')] : []), tr(lang, 'gate')];
    const wrap = (out: Partial<Session>, body: string[]) => ({ ...out, description: [...head, ...body, ...tail].join('\n'), cross: true, sourceKey: 'Mujika & Padilla (2000)' }) as Partial<Session>;
    switch (s.type) {
      case 'threshold':
      case 'intervals': {
        const n = opts.taper ? rs.returnToRun.crossThresholdRepsTaper : rs.returnToRun.crossThresholdReps;
        return wrap({ type: 'threshold', title: tr(lang, 'xThrT', { n }), targetPaceSec: null, km: undefined, hrCap: hi, rpe: '7–8/10', benchmark: undefined, benchmarkText: undefined }, [
          tr(lang, 'xThrD', { n, lo, hi, area }),
          tr(lang, 'mod') + ' ' + tr(lang, 'rowNote'),
        ]);
      }
      case 'easy':
      case 'long': {
        const min = minutesFor(s.km);
        return wrap({ type: s.type, title: tr(lang, 'xZ2T', { min }), targetPaceSec: null, km: undefined, hrCap: cap, benchmark: undefined, benchmarkText: undefined }, [tr(lang, 'xZ2D', { min, cap }), tr(lang, 'mod')]);
      }
      case 'sim':
        return wrap({ type: 'sim', title: tr(lang, 'xSimT'), targetPaceSec: null, km: undefined, hrCap: hi, rpe: '7/10', benchmark: undefined, benchmarkText: undefined }, [tr(lang, 'xSimD', { area })]);
      case 'wod':
        return { ...s, description: [...head, tr(lang, 'wod'), s.description ?? '', ...tail].filter(Boolean).join('\n'), cross: true } as Partial<Session>;
      case 'strength':
        return { ...s, description: [...head, tr(lang, 'strNow'), s.description ?? '', ...tail].filter(Boolean).join('\n') };
      case 'recovery':
        return ri.calf ? { ...s, description: [s.description ?? '', rehabLine(lang, day)].join('\n') } : null;
      default:
        return null;
    }
  }

  const w = returnWeek(c.flags, date, rs);
  if (!w) return null;
  const hsr = tr(lang, 'hsr', { d: daysBetween(c.flags.returnSince!, date) + 1 });
  const gate = tr(lang, 'gate');
  const walkRun = { title: tr(lang, 'wrT', { w }), description: [tr(lang, w === 1 ? 'w1' : w === 2 ? 'w2' : 'w3'), gate, hsr].join('\n'), targetPaceSec: null, km: undefined, hrCap: cap, sourceKey: 'Silbernagel', benchmark: undefined, benchmarkText: undefined };
  switch (s.type) {
    // every running day carries the walk-run; threshold only comes back after the 3 return weeks
    case 'easy':
    case 'threshold':
    case 'intervals':
      return { ...s, type: 'easy', ...walkRun } as Partial<Session>;
    case 'long':
      if (w < 3) {
        const min = minutesFor(s.km);
        return { ...s, title: tr(lang, 'xZ2T', { min }), description: [tr(lang, 'xZ2D', { min, cap }), tr(lang, 'mod'), gate].join('\n'), targetPaceSec: null, km: undefined, hrCap: cap, cross: true } as Partial<Session>;
      }
      return { ...s, type: 'easy', ...walkRun } as Partial<Session>;
    case 'sim':
      if (w < 3) return { ...s, title: tr(lang, 'xSimT'), description: [tr(lang, 'xSimD', { area }), gate].join('\n'), targetPaceSec: null, km: undefined, cross: true, benchmark: undefined, benchmarkText: undefined } as Partial<Session>;
      return { ...s, description: [tr(lang, 'rSim'), s.description ?? '', gate].join('\n'), benchmark: undefined, benchmarkText: undefined };
    case 'recovery':
      return { ...s, description: [s.description ?? '', hsr].join('\n') };
    default:
      return null;
  }
}


// ---------- blessurekracht bij een vervangende training ----------

type RBK = 'isoT' | 'hsrT' | 'plyoT' | 'isoX' | 'hsrX' | 'plyoX' | 'otherT' | 'note';
const RB: Record<Lang, Record<RBK, string>> = {
  en: {
    isoT: 'Leg and calf strength · phase 1, isometric · ~15 min',
    hsrT: 'Leg and calf strength · phase 2, heavy and slow · ~20 min',
    plyoT: 'Leg and calf strength · phase 3, strength and jumps · ~20 min',
    isoX: 'Thighs and hips without loading the calf: glute bridge 3 × 12 and wall sit 3 × 30 s, only if pain-free.',
    hsrX: 'Add: split squat or step-up 3 × 8 each leg and single-leg glute bridge 3 × 10, if pain-free.',
    plyoX: 'Add: split squat 3 × 8 each leg and step-ups 3 × 10 each leg. Single-leg hops only once pogo jumps are pain-free.',
    otherT: 'Injury strength · ~15 min',
    note: 'If the pain stays or gets worse, have a physiotherapist look at it.',
  },
  nl: {
    isoT: 'Been- en kuitkracht · fase 1, isometrisch · ±15 min',
    hsrT: 'Been- en kuitkracht · fase 2, zwaar en langzaam · ±20 min',
    plyoT: 'Been- en kuitkracht · fase 3, kracht en sprong · ±20 min',
    isoX: 'Bovenbeen en heup zonder kuitbelasting: glute bridge 3 × 12 en wall sit 3 × 30 s, alleen als dat pijnvrij is.',
    hsrX: 'Erbij: split squat of step-up 3 × 8 per been en glute bridge op één been 3 × 10, als dat pijnvrij is.',
    plyoX: 'Erbij: split squat 3 × 8 per been en step-ups 3 × 10 per been. Hops op één been pas als pogo jumps pijnvrij zijn.',
    otherT: 'Blessurekracht · ±15 min',
    note: 'Blijft de pijn of wordt hij erger, laat er een fysiotherapeut naar kijken.',
  },
  de: {
    isoT: 'Bein- und Wadenkraft · Phase 1, isometrisch · ca. 15 Min.',
    hsrT: 'Bein- und Wadenkraft · Phase 2, schwer und langsam · ca. 20 Min.',
    plyoT: 'Bein- und Wadenkraft · Phase 3, Kraft und Sprünge · ca. 20 Min.',
    isoX: 'Oberschenkel und Hüfte ohne Wadenbelastung: Glute Bridge 3 × 12 und Wall Sit 3 × 30 s, nur wenn schmerzfrei.',
    hsrX: 'Dazu: Split Squat oder Step-up 3 × 8 pro Bein und einbeinige Glute Bridge 3 × 10, wenn schmerzfrei.',
    plyoX: 'Dazu: Split Squat 3 × 8 pro Bein und Step-ups 3 × 10 pro Bein. Einbeinige Hops erst, wenn Pogo Jumps schmerzfrei sind.',
    otherT: 'Kraft für die Verletzung · ca. 15 Min.',
    note: 'Bleibt der Schmerz oder wird er schlimmer, lass eine Physiotherapeutin oder einen Physiotherapeuten draufschauen.',
  },
  es: {
    isoT: 'Fuerza de pierna y gemelo · fase 1, isométrica · ~15 min',
    hsrT: 'Fuerza de pierna y gemelo · fase 2, pesada y lenta · ~20 min',
    plyoT: 'Fuerza de pierna y gemelo · fase 3, fuerza y saltos · ~20 min',
    isoX: 'Muslo y cadera sin cargar el gemelo: puente de glúteo 3 × 12 y sentadilla en pared 3 × 30 s, solo si no duele.',
    hsrX: 'Añade: split squat o step-up 3 × 8 por pierna y puente de glúteo a una pierna 3 × 10, si no duele.',
    plyoX: 'Añade: split squat 3 × 8 por pierna y step-ups 3 × 10 por pierna. Saltos a una pierna solo cuando los pogo jumps no duelan.',
    otherT: 'Fuerza para la lesión · ~15 min',
    note: 'Si el dolor sigue o empeora, que lo vea un fisioterapeuta.',
  },
  ko: {
    isoT: '다리·종아리 근력 · 1단계, 등척성 · 약 15분',
    hsrT: '다리·종아리 근력 · 2단계, 무겁고 느리게 · 약 20분',
    plyoT: '다리·종아리 근력 · 3단계, 근력과 점프 · 약 20분',
    isoX: '종아리에 부담 없는 허벅지·엉덩이: 글루트 브리지 3 × 12, 월 싯 3 × 30초, 통증이 없을 때만.',
    hsrX: '추가: 스플릿 스쿼트 또는 스텝업 다리당 3 × 8, 한 다리 글루트 브리지 3 × 10, 통증이 없을 때.',
    plyoX: '추가: 스플릿 스쿼트 다리당 3 × 8, 스텝업 다리당 3 × 10. 한 발 홉은 포고 점프가 통증 없을 때부터.',
    otherT: '부상 근력 · 약 15분',
    note: '통증이 계속되거나 심해지면 물리치료사에게 확인받으세요.',
  },
};

export type RehabPhase = 'iso' | 'hsr' | 'plyo';
export interface RehabBlock {
  title: string;
  /** one exercise or rule per line */
  text: string;
  /** calf/Achilles/foot/shin protocol (isometric → heavy slow → plyometric) */
  calf: boolean;
  phase?: RehabPhase;
}

/**
 * Strength block for a current injury, to add to a replacement session ("can't do this as planned").
 * Calf, foot and shin follow the same phases as injury mode (isometric → heavy slow resistance → plyometrics;
 * Beyer 2015, Silbernagel 2007): by days since the injury, or by return week after the return test.
 * Other areas get their prehab line. Null when there is no current injury and no return week.
 */
export function rehabStrength(c: { lang: Lang; flags: Flags | null | undefined; rs?: RuleSet }, date: string, today: string): RehabBlock | null {
  const lang = c.lang;
  const rb = RB[lang] ?? RB.en;
  const inj = injuriesOf(c.flags);
  const ri = runInjury(c.flags, today);
  const w = returnWeek(c.flags, date, c.rs ?? V1);
  let phase: RehabPhase | undefined;
  let day = 0;
  if (ri?.calf) {
    day = Math.max(0, daysBetween(ri.since, date));
    phase = day < 7 ? 'iso' : day < 21 ? 'hsr' : 'plyo';
  } else if (w && CALF.some((a) => inj[a] === 'recent')) {
    day = Math.max(0, daysBetween(c.flags!.returnSince!, date));
    phase = w < 3 ? 'hsr' : 'plyo';
  }
  const active = (a: InjuryArea) => inj[a] === 'now' || (!!w && inj[a] === 'recent');
  const others = (Object.keys(inj) as InjuryArea[]).filter((a) => !CALF.includes(a) && active(a));
  if (!phase && !others.length) return null;
  const lines: string[] = [];
  if (phase) {
    lines.push(tr(lang, phase, { d: day + 1 }), rb[`${phase}X` as RBK]);
    if (ri?.calf) lines.push(tr(lang, 'test'));
  }
  for (const a of others) lines.push(prehabLine(lang, a));
  lines.push(tr(lang, 'gate'), rb.note);
  return { title: phase ? rb[`${phase}T` as RBK] : rb.otherT, text: lines.join('\n'), calf: !!phase, phase };
}

/** The chosen replacement session with the injury strength block appended. */
export function withRehab(s: Session, b: RehabBlock): Session {
  return { ...s, description: `${s.description}\n\n${b.title}\n${b.text}`, sourceKey: b.calf ? 'Beyer' : s.sourceKey };
}
