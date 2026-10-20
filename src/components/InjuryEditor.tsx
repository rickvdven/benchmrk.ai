import clsx from 'clsx';
import { INJURY_AREAS, injuriesOf, withInjuries, type Flags, type InjuryArea, type InjuryStatus, type Lang } from '../engine';
import { useI18n } from '../lib/i18n';

const STATUSES: InjuryStatus[] = ['now', 'recent', 'past'];

interface Pack {
  title: string;
  intro: string;
  areas: Record<InjuryArea, string>;
  status: Record<InjuryStatus, string>;
  note: string;
  notePh: string;
  warn: string;
  effect: string;
}

const P: Record<Lang, Pack> = {
  en: {
    title: 'Injuries & niggles',
    intro: 'Tick what applies and say when. The plan adjusts running volume, station focus and adds targeted prehab.',
    areas: { achilles: 'Achilles / calves', plantar: 'Foot / plantar fascia', shin: 'Shins', knee: 'Knees', hamstring: 'Hamstrings', hip: 'Hips / groin', back: 'Lower back', shoulder: 'Shoulders', wrist: 'Wrists / elbows' },
    status: { now: 'Hurts now', recent: '< 6 months', past: 'Longer ago' },
    note: 'Anything else? (optional)',
    notePh: 'E.g. knee surgery 2022, recurring calf strain in spring',
    warn: 'Pain right now? Have it checked by a physio. Benchmrk adapts the load but does not diagnose.',
    effect: 'Plan effect',
  },
  nl: {
    title: 'Blessures & klachten',
    intro: 'Vink aan wat speelt en wanneer. Het plan past loopvolume en stationfocus aan en voegt gerichte prehab toe.',
    areas: { achilles: 'Achilles / kuiten', plantar: 'Voet / fasciitis plantaris', shin: 'Scheenbenen', knee: 'Knieën', hamstring: 'Hamstrings', hip: 'Heup / lies', back: 'Onderrug', shoulder: 'Schouders', wrist: 'Polsen / ellebogen' },
    status: { now: 'Nu last', recent: '< 6 maanden', past: 'Langer geleden' },
    note: 'Nog iets? (optioneel)',
    notePh: 'Bijv. knieoperatie 2022, terugkerende kuitblessure in het voorjaar',
    warn: 'Nu pijn? Laat het checken door een fysio. Benchmrk past de belasting aan maar stelt geen diagnose.',
    effect: 'Effect op plan',
  },
  de: {
    title: 'Verletzungen & Beschwerden',
    intro: 'Kreuze an, was zutrifft und wann. Der Plan passt Laufumfang und Stationsfokus an und ergänzt gezielte Prehab.',
    areas: { achilles: 'Achillessehne / Waden', plantar: 'Fuß / Plantarfaszie', shin: 'Schienbeine', knee: 'Knie', hamstring: 'Oberschenkelrückseite', hip: 'Hüfte / Leiste', back: 'Unterer Rücken', shoulder: 'Schultern', wrist: 'Handgelenke / Ellbogen' },
    status: { now: 'Aktuell', recent: '< 6 Monate', past: 'Länger her' },
    note: 'Sonst noch etwas? (optional)',
    notePh: 'Z. B. Knie-OP 2022, wiederkehrende Wadenzerrung im Frühjahr',
    warn: 'Jetzt Schmerzen? Lass es von einem Physio prüfen. Benchmrk passt die Belastung an, stellt aber keine Diagnose.',
    effect: 'Auswirkung',
  },
  es: {
    title: 'Lesiones y molestias',
    intro: 'Marca lo que aplique y cuándo. El plan ajusta el volumen de carrera, el foco de estaciones y añade prehab específico.',
    areas: { achilles: 'Aquiles / gemelos', plantar: 'Pie / fascia plantar', shin: 'Tibias', knee: 'Rodillas', hamstring: 'Isquiotibiales', hip: 'Cadera / ingle', back: 'Zona lumbar', shoulder: 'Hombros', wrist: 'Muñecas / codos' },
    status: { now: 'Duele ahora', recent: '< 6 meses', past: 'Hace más' },
    note: '¿Algo más? (opcional)',
    notePh: 'P. ej. cirugía de rodilla 2022, rotura de gemelo recurrente en primavera',
    warn: '¿Dolor ahora? Que lo revise un fisio. Benchmrk adapta la carga pero no diagnostica.',
    effect: 'Efecto en el plan',
  },
  ko: {
    title: '부상 및 통증',
    intro: '해당 부위와 시기를 선택하세요. 플랜이 러닝 볼륨과 스테이션 포커스를 조정하고 맞춤 예방 운동을 추가합니다.',
    areas: { achilles: '아킬레스 / 종아리', plantar: '발 / 족저근막', shin: '정강이', knee: '무릎', hamstring: '햄스트링', hip: '고관절 / 사타구니', back: '허리', shoulder: '어깨', wrist: '손목 / 팔꿈치' },
    status: { now: '현재 통증', recent: '6개월 이내', past: '그 이전' },
    note: '기타 사항 (선택)',
    notePh: '예: 2022년 무릎 수술, 봄마다 재발하는 종아리 부상',
    warn: '지금 통증이 있나요? 물리치료사에게 확인받으세요. Benchmrk는 부하를 조정하지만 진단하지 않습니다.',
    effect: '플랜 영향',
  },
};

const EFFECT: Record<Lang, Record<InjuryStatus, string>> = {
  en: { now: 'Slower running build-up, lower peak volume, pain rule on every run, irritating stations swapped out.', recent: 'Running volume builds more gradually; prehab in every strength session.', past: 'Prehab in every strength session.' },
  nl: { now: 'Rustigere loopopbouw, lager piekvolume, pijnregel bij elke run, prikkelende stations vervangen.', recent: 'Loopvolume bouwt geleidelijker op; prehab in elke krachtsessie.', past: 'Prehab in elke krachtsessie.' },
  de: { now: 'Langsamerer Laufaufbau, geringerer Spitzenumfang, Schmerzregel bei jedem Lauf, reizende Stationen ersetzt.', recent: 'Laufumfang steigt langsamer; Prehab in jeder Krafteinheit.', past: 'Prehab in jeder Krafteinheit.' },
  es: { now: 'Progresión de carrera más lenta, menor volumen pico, regla del dolor en cada carrera, estaciones irritantes sustituidas.', recent: 'El volumen de carrera sube más gradualmente; prehab en cada sesión de fuerza.', past: 'Prehab en cada sesión de fuerza.' },
  ko: { now: '러닝 증가 속도와 최대 볼륨을 낮추고, 모든 러닝에 통증 규칙을 적용하며 자극이 되는 스테이션을 교체합니다.', recent: '러닝 볼륨을 더 천천히 늘리고 모든 근력 세션에 예방 운동을 넣습니다.', past: '모든 근력 세션에 예방 운동을 넣습니다.' },
};

export function InjuryEditor({ value, onChange }: { value: Flags; onChange: (f: Flags) => void }) {
  const { lang } = useI18n();
  const p = P[lang] ?? P.en;
  const inj = injuriesOf(value);
  const set = (a: InjuryArea, s: InjuryStatus | null) => onChange(withInjuries(value, { ...inj, [a]: s ?? undefined }));
  const worst = STATUSES.find((s) => Object.values(inj).includes(s));
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">{p.title}</p>
        <p className="text-xs text-muted">{p.intro}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {INJURY_AREAS.map((a) => {
          const s = inj[a];
          return (
            <div key={a} className={clsx('rounded-lg border p-3 text-sm', s === 'now' ? 'border-bad/60 bg-bad/10' : s ? 'border-warn/60 bg-warn/10' : 'border-line')}>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="accent-[rgb(var(--volt))]" checked={!!s} onChange={(e) => set(a, e.target.checked ? 'past' : null)} />
                {p.areas[a]}
              </label>
              {s && (
                <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label={p.areas[a]}>
                  {STATUSES.map((x) => (
                    <button
                      key={x}
                      type="button"
                      role="radio"
                      aria-checked={s === x}
                      onClick={() => set(a, x)}
                      className={clsx('rounded-md border px-2 py-0.5 text-xs', s === x ? 'border-volt bg-volt/15 text-volt' : 'border-line text-muted hover:text-fg')}
                    >
                      {p.status[x]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {worst && (
        <p className="text-xs text-muted">
          <span className="font-semibold text-fg">{p.effect}:</span> {EFFECT[lang]?.[worst] ?? EFFECT.en[worst]}
        </p>
      )}
      {worst === 'now' && <p className="rounded-lg border border-bad/50 bg-bad/10 p-3 text-xs">{p.warn}</p>}
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{p.note}</span>
        <input className="input" maxLength={300} value={value.note ?? ''} placeholder={p.notePh} onChange={(e) => onChange({ ...value, note: e.target.value })} />
      </label>
    </div>
  );
}

export const injuryLabels = (lang: Lang) => {
  const p = P[lang] ?? P.en;
  return { areas: p.areas, status: p.status };
};
