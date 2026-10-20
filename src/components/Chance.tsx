import { Info, TrendingUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { chanceBoosters, fmtHms, stationLabel, type Boost, type Lang } from '../engine';
import { useI18n } from '../lib/i18n';
import { toast } from 'sonner';
import { useMutations } from '../data/hooks';
import type { Profile } from '../engine';

type Key =
  | 'what' | 'body' | 'team' | 'feas' | 'today' | 'need' | 'already' | 'exp' | 'ok' | 'near' | 'stretch' | 'far'
  | 'adh' | 'exe' | 'nolog' | 'how' | 'day' | 'pace' | 'station' | 'roxzone' | 'all' | 'goal' | 'live' | 'open';
const T: Record<Lang, Record<Key, string>> = {
  en: {
    near: "A bit more than average progress – achievable if you hit your sessions",
    what: 'What does {c}% mean?',
    body: 'Your chance to hit your goal on a normal race day (Roxzone included) if you hit the sessions in your plan.',
    team: 'Your team’s chance to hit the goal on a normal race day if you both hit the sessions in your plan.',
    feas: 'Is it achievable?',
    today: 'If you raced today: {t}',
    need: 'Your goal needs {d} improvement',
    already: 'You are already under your goal today',
    exp: 'This plan should deliver about {d} in {w} weeks',
    ok: 'Fits within what your plan delivers',
    stretch: 'Needs more than average progress',
    far: 'More than is physiologically realistic in {w} weeks',
    adh: 'You did {a}% of your sessions – that lowers the expected gain.',
    exe: 'Key sessions on target pace: {h} of {n}{m}',
    nolog: 'Nothing logged yet: we assume you follow your plan.',
    how: 'How to raise your chance',
    day: 'One more training day per week',
    pace: 'Threshold 5 s/km faster – nail your threshold sessions and re-test',
    station: '{st} {s} s faster – extra technique and strength',
    roxzone: '30 s faster through the Roxzone – practise transitions, never walk',
    all: 'All together – your expected time becomes {t}',
    goal: 'More fitting goal: {g}',
    live: 'Hit the times in your plan and your chance goes up. Skip sessions or miss the paces and it drops – Benchmrk then suggests a more fitting goal.',
    open: 'Explain chance',
  },
  nl: {
    near: "Iets meer dan gemiddelde vooruitgang – haalbaar als je je trainingen haalt",
    what: 'Wat betekent {c}%?',
    body: 'Je kans om je doeltijd te halen op een normale racedag (inclusief Roxzone) als je de trainingen uit je schema haalt.',
    team: 'De kans dat jullie de doeltijd halen op een normale racedag als jullie allebei de trainingen uit het schema halen.',
    feas: 'Is het haalbaar?',
    today: 'Als je vandaag zou racen: {t}',
    need: 'Je doel vraagt {d} verbetering',
    already: 'Je zit vandaag al onder je doeltijd',
    exp: 'Dit schema levert naar verwachting ~{d} op in {w} weken',
    ok: 'Past binnen wat je schema oplevert',
    stretch: 'Vraagt meer dan gemiddelde vooruitgang',
    far: 'Meer dan fysiologisch realistisch in {w} weken',
    adh: 'Je deed {a}% van je trainingen – dat drukt je verwachte winst.',
    exe: 'Sleuteltrainingen op schematempo: {h} van {n}{m}',
    nolog: 'Nog niets gelogd: we gaan ervan uit dat je je schema volgt.',
    how: 'Zo verhoog je je kans',
    day: 'Eén trainingsdag extra per week',
    pace: 'Drempeltempo 5 s/km sneller – haal je drempeltrainingen en test opnieuw',
    station: '{st} {s} s sneller – extra techniek en kracht',
    roxzone: '30 s sneller door de Roxzone – oefen wissels, nooit wandelen',
    all: 'Alles samen – je verwachte tijd wordt {t}',
    goal: 'Passender doel: {g}',
    live: 'Haal je de tijden uit je schema, dan stijgt je kans. Sla je trainingen over of haal je de tempo’s niet, dan daalt hij – en stelt Benchmrk een passender doel voor.',
    open: 'Uitleg kans',
  },
  de: {
    near: "Etwas mehr als durchschnittlicher Fortschritt – machbar, wenn du deine Einheiten schaffst",
    what: 'Was bedeuten {c}%?',
    body: 'Deine Chance, dein Ziel an einem normalen Renntag (inkl. Roxzone) zu erreichen, wenn du die Einheiten deines Plans schaffst.',
    team: 'Die Chance eures Teams auf das Ziel an einem normalen Renntag, wenn ihr beide die Einheiten des Plans schafft.',
    feas: 'Ist es machbar?',
    today: 'Wenn du heute starten würdest: {t}',
    need: 'Dein Ziel braucht {d} Verbesserung',
    already: 'Du bist heute schon unter deinem Ziel',
    exp: 'Dieser Plan bringt voraussichtlich ~{d} in {w} Wochen',
    ok: 'Passt zu dem, was dein Plan bringt',
    stretch: 'Braucht überdurchschnittlichen Fortschritt',
    far: 'Mehr als physiologisch realistisch in {w} Wochen',
    adh: 'Du hast {a}% deiner Einheiten gemacht – das senkt den erwarteten Fortschritt.',
    exe: 'Schlüsseleinheiten im Zieltempo: {h} von {n}{m}',
    nolog: 'Noch nichts geloggt: wir gehen davon aus, dass du dem Plan folgst.',
    how: 'So erhöhst du deine Chance',
    day: 'Ein Trainingstag mehr pro Woche',
    pace: 'Schwellentempo 5 s/km schneller – Schwelleneinheiten durchziehen und neu testen',
    station: '{st} {s} s schneller – mehr Technik und Kraft',
    roxzone: '30 s schneller durch die Roxzone – Wechsel üben, nie gehen',
    all: 'Alles zusammen – erwartete Zeit wird {t}',
    goal: 'Passenderes Ziel: {g}',
    live: 'Schaffst du die Zeiten im Plan, steigt deine Chance. Lässt du Einheiten aus oder verfehlst die Tempi, sinkt sie – dann schlägt Benchmrk ein passenderes Ziel vor.',
    open: 'Chance erklären',
  },
  es: {
    near: "Algo más que el progreso medio – alcanzable si cumples tus sesiones",
    what: '¿Qué significa {c}%?',
    body: 'Tu probabilidad de lograr tu objetivo en un día de carrera normal (Roxzone incluida) si cumples las sesiones de tu plan.',
    team: 'La probabilidad de que vuestro equipo logre el objetivo en un día normal si ambos cumplís las sesiones del plan.',
    feas: '¿Es alcanzable?',
    today: 'Si corrieras hoy: {t}',
    need: 'Tu objetivo exige {d} de mejora',
    already: 'Hoy ya estás por debajo de tu objetivo',
    exp: 'Este plan debería aportar ~{d} en {w} semanas',
    ok: 'Cabe en lo que aporta tu plan',
    stretch: 'Exige un progreso superior a la media',
    far: 'Más de lo fisiológicamente realista en {w} semanas',
    adh: 'Hiciste el {a}% de tus sesiones – eso reduce la mejora esperada.',
    exe: 'Sesiones clave al ritmo del plan: {h} de {n}{m}',
    nolog: 'Aún nada registrado: suponemos que sigues tu plan.',
    how: 'Cómo subir tu probabilidad',
    day: 'Un día más de entrenamiento por semana',
    pace: 'Umbral 5 s/km más rápido – cumple tus sesiones de umbral y vuelve a testear',
    station: '{st} {s} s más rápido – técnica y fuerza extra',
    roxzone: '30 s más rápido por la Roxzone – practica transiciones, nunca camines',
    all: 'Todo junto – tu tiempo previsto pasa a {t}',
    goal: 'Objetivo más adecuado: {g}',
    live: 'Si cumples los tiempos del plan, sube. Si saltas sesiones o no llegas a los ritmos, baja – y Benchmrk propone un objetivo más adecuado.',
    open: 'Explicar probabilidad',
  },
  ko: {
    near: "평균보다 조금 더 큰 향상 – 세션을 해내면 달성 가능해요",
    what: '{c}%는 무슨 뜻인가요?',
    body: '플랜의 세션을 해낸다면, 보통의 레이스 당일(록스존 포함)에 목표를 달성할 확률이에요.',
    team: '둘 다 플랜의 세션을 해낸다면, 보통의 레이스 당일에 팀이 목표를 달성할 확률이에요.',
    feas: '달성 가능한가요?',
    today: '오늘 레이스를 한다면: {t}',
    need: '목표까지 {d} 단축이 필요해요',
    already: '오늘 이미 목표보다 빨라요',
    exp: '이 플랜은 {w}주 동안 약 {d} 단축을 기대해요',
    ok: '플랜이 만들어낼 수 있는 범위 안이에요',
    stretch: '평균 이상의 향상이 필요해요',
    far: '{w}주 안에 생리적으로 현실적인 범위를 넘어요',
    adh: '세션의 {a}%를 했어요 – 기대 향상이 줄어요.',
    exe: '목표 페이스를 지킨 핵심 세션: {n}개 중 {h}개{m}',
    nolog: '아직 기록이 없어요: 플랜을 따른다고 가정해요.',
    how: '확률을 높이는 방법',
    day: '주당 훈련일 하루 추가',
    pace: '역치 페이스 5초/km 단축 – 역치 세션을 지키고 다시 테스트',
    station: '{st} {s}초 단축 – 기술과 근력 보강',
    roxzone: '록스존 30초 단축 – 전환 연습, 절대 걷지 않기',
    all: '모두 합치면 – 예상 기록 {t}',
    goal: '더 알맞은 목표: {g}',
    live: '플랜의 기록을 해내면 확률이 올라가요. 세션을 건너뛰거나 페이스를 못 지키면 내려가고 – Benchmrk가 더 알맞은 목표를 제안해요.',
    open: '확률 설명',
  },
};
const MISS: Record<Lang, string> = { en: ' · {m} clearly too slow', nl: ' · {m} duidelijk te langzaam', de: ' · {m} deutlich zu langsam', es: ' · {m} claramente lentas', ko: ' · {m}개는 확실히 느림' };
const fmtGap = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min` : `${Math.round(s)} s`);
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

type Boosters = ReturnType<typeof chanceBoosters>;

/** (i) button next to a chance figure: is the goal achievable with this plan, what the log says, and levers to raise it. */
export function ChanceInfo({ chance, weeks, boosters, team, align = 'left' }: { chance: number; weeks: number; boosters?: Boosters | null; team?: boolean; align?: 'left' | 'right'; finishSec?: number; goalSec?: number }) {
  const { lang } = useI18n();
  const x = T[lang] ?? T.en;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const lever = (b: Boost) =>
    b.kind === 'station' ? fill(x.station, { st: stationLabel(lang, b.station!), s: b.seconds ?? 0 }) : x[b.kind as 'day' | 'pace' | 'roxzone'];
  const b = boosters;
  const ratio = b && b.neededSec > 0 ? b.neededSec / (Math.max(0, b.expectedSec) + 30) : 0;
  const verdict = !b ? null : ratio <= 1 ? { t: x.ok, c: 'text-good' } : ratio <= 1.35 ? { t: x.near, c: 'text-volt' } : ratio <= 1.6 ? { t: x.stretch, c: 'text-warn' } : { t: fill(x.far, { w: weeks }), c: 'text-bad' };
  const exe = b?.execution;
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button type="button" aria-label={x.open} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="ml-1 rounded-full p-0.5 text-muted hover:text-volt focus:text-volt focus:outline-none">
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="dialog" className={clsx('absolute top-6 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-4 text-left text-xs font-normal normal-case tracking-normal text-fg shadow-2xl', align === 'right' ? 'right-0' : 'left-0')}>
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{fill(x.what, { c: chance })}</p>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-fg" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-muted">{team ? x.team : x.body}</p>
          {b && (
            <>
              <div className="mt-2 space-y-0.5 rounded-lg bg-panel2 p-2">
                <p className="font-semibold">{x.feas}</p>
                <p className="text-muted">{fill(x.today, { t: fmtHms(b.currentSec) })}</p>
                <p className="text-muted">{b.neededSec > 0 ? fill(x.need, { d: fmtGap(b.neededSec) }) : x.already}</p>
                {b.neededSec > 0 && <p className="text-muted">{fill(x.exp, { d: fmtGap(Math.max(0, b.expectedSec)), w: weeks })}</p>}
                {verdict && b.neededSec > 0 && <p className={clsx('font-semibold', verdict.c)}>{verdict.t}</p>}
                <p className="pt-1 text-muted">
                  {b.adherence != null && b.adherence < 0.9 && <span className="block text-warn">{fill(x.adh, { a: Math.round(b.adherence * 100) })}</span>}
                  {exe && exe.n >= 2 ? (
                    <span className={clsx('block', exe.miss > exe.hit ? 'text-warn' : 'text-good')}>
                      {fill(x.exe, { h: exe.hit, n: exe.n, m: exe.miss ? fill(MISS[lang] ?? MISS.en, { m: exe.miss }) : '' })}
                    </span>
                  ) : b.adherence == null ? (
                    <span className="block">{x.nolog}</span>
                  ) : null}
                </p>
              </div>
              {(b.levers.length > 0 || b.goal) && (
                <>
                  <p className="mt-3 flex items-center gap-1 font-semibold text-volt">
                    <TrendingUp className="h-3.5 w-3.5" /> {x.how}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {b.levers.map((l) => (
                      <li key={l.kind} className="flex justify-between gap-3 border-t border-line pt-1">
                        <span>{lever(l)}</span>
                        <span className="stat shrink-0 font-semibold text-good">{l.chance}%</span>
                      </li>
                    ))}
                    {b.all.chance > (b.levers[0]?.chance ?? 0) && (
                      <li className="flex justify-between gap-3 border-t border-line pt-1 font-semibold">
                        <span>{fill(x.all, { t: fmtHms(b.all.finishSec) })}</span>
                        <span className="stat shrink-0 text-good">{b.all.chance}%</span>
                      </li>
                    )}
                    {b.goal && (
                      <li className="flex justify-between gap-3 border-t border-line pt-1 text-muted">
                        <span>{fill(x.goal, { g: fmtHms(b.goal.goalSec!) })}</span>
                        <span className="stat shrink-0">{b.goal.chance}%</span>
                      </li>
                    )}
                  </ul>
                </>
              )}
            </>
          )}
          <p className="mt-3 text-[11px] text-muted">{x.live}</p>
        </div>
      )}
    </span>
  );
}

const GAP: Record<Lang, { under: string; over: string; on: string }> = {
  en: { under: '{d} under your goal', over: '{d} over your goal', on: 'right on your goal' },
  nl: { under: '{d} onder je doeltijd', over: '{d} boven je doeltijd', on: 'precies op je doeltijd' },
  de: { under: '{d} unter deinem Ziel', over: '{d} über deinem Ziel', on: 'genau auf deinem Ziel' },
  es: { under: '{d} por debajo de tu objetivo', over: '{d} por encima de tu objetivo', on: 'justo en tu objetivo' },
  ko: { under: '목표보다 {d} 빠름', over: '목표보다 {d} 느림', on: '목표와 동일' },
};
/** Colour for a forecast: green when it beats the goal. */
export const gapTone = (finishSec: number, goalSec: number) => (finishSec <= goalSec ? 'text-good' : '');
/** "59 s onder je doeltijd" / "1:20 min boven je doeltijd". */
export function GoalGap({ finishSec, goalSec, className, chance }: { finishSec: number; goalSec: number; className?: string; chance?: number }) {
  const { lang } = useI18n();
  const g = GAP[lang] ?? GAP.en;
  const d = goalSec - finishSec;
  const txt = Math.abs(d) < 1 ? g.on : fill(d > 0 ? g.under : g.over, { d: fmtGap(Math.abs(d)) });
  // over the goal at average progress but still feasible (≥ 60 %): neutral, not a warning
  return <div className={clsx('text-xs font-medium', d >= 0 ? 'text-good' : (chance ?? 0) >= 60 ? 'text-muted' : 'text-warn', className)}>{txt}</div>;
}

const SUG: Record<Lang, { title: string; body: string; logs: string; btn: string; done: string; keep: string }> = {
  en: { title: 'More fitting goal: {g}', body: 'With what your plan and log show, {cur} is a stretch ({c}%). {g} gives you {c2}% – your sessions then train you exactly towards it.', logs: 'Based on your logged sessions.', btn: 'Set goal to {g}', done: 'Goal updated — plan adjusted', keep: 'Keep my goal' },
  nl: { title: 'Passender doel: {g}', body: 'Met wat je schema en je log laten zien, is {cur} hoog gegrepen ({c}%). Met {g} heb je {c2}% kans – je trainingen trainen je daar dan precies naartoe.', logs: 'Gebaseerd op je gelogde trainingen.', btn: 'Doel aanpassen naar {g}', done: 'Doel aangepast — schema bijgewerkt', keep: 'Mijn doel houden' },
  de: { title: 'Passenderes Ziel: {g}', body: 'Nach Plan und Log ist {cur} hoch gegriffen ({c}%). Mit {g} hast du {c2}% – deine Einheiten trainieren dich dann genau dorthin.', logs: 'Basierend auf deinen geloggten Einheiten.', btn: 'Ziel auf {g} setzen', done: 'Ziel geändert — Plan angepasst', keep: 'Ziel behalten' },
  es: { title: 'Objetivo más adecuado: {g}', body: 'Según tu plan y tu registro, {cur} es ambicioso ({c}%). Con {g} tienes un {c2}% – tus sesiones te entrenan justo hacia él.', logs: 'Basado en tus sesiones registradas.', btn: 'Cambiar objetivo a {g}', done: 'Objetivo actualizado — plan ajustado', keep: 'Mantener mi objetivo' },
  ko: { title: '더 알맞은 목표: {g}', body: '플랜과 기록을 보면 {cur}는 높은 목표예요 ({c}%). {g}면 {c2}% – 세션이 정확히 그 목표를 향해 훈련해요.', logs: '기록한 세션 기준.', btn: '목표를 {g}로 변경', done: '목표 변경됨 — 플랜 조정', keep: '목표 유지' },
};

/** Cockpit: when the goal has become a stretch, offer the goal that fits (one tap; the plan follows). */
export function GoalSuggestion({ profile, full, boosters, chance }: { profile: Profile; full: Profile; boosters: Boosters; chance: number }) {
  const { lang } = useI18n();
  const x = SUG[lang] ?? SUG.en;
  const { updateProfile } = useMutations();
  const g = boosters.goal;
  const key = `rox:keepgoal:${profile.raceDate}:${profile.goalSec}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return !!localStorage.getItem(key);
    } catch {
      return false;
    }
  });
  if (!g || chance >= 60 || hidden) return null;
  const fromLog = (profile.adherence ?? 1) < 0.9 || (profile.execution?.miss ?? 0) > 0;
  const apply = async () => {
    if (profile.raceDate === full.raceDate) await updateProfile({ goal_sec: g.goalSec! });
    else await updateProfile({ season: (full.season ?? []).map((r) => (r.date === profile.raceDate ? { ...r, goalSec: g.goalSec! } : r)) });
    toast.success(x.done);
  };
  const p = { g: fmtHms(g.goalSec!), cur: fmtHms(profile.goalSec), c: chance, c2: g.chance };
  return (
    <div className="mt-4 rounded-lg border border-warn/40 bg-warn/5 p-3 text-sm">
      <p className="font-semibold">{fill(x.title, p)}</p>
      <p className="mt-0.5 text-muted">
        {fill(x.body, p)} {fromLog ? x.logs : ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn-primary btn-sm" onClick={apply}>
          {fill(x.btn, p)}
        </button>
        <button
          className="btn-ghost btn-sm"
          onClick={() => {
            try {
              localStorage.setItem(key, '1');
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
        >
          {x.keep}
        </button>
      </div>
    </div>
  );
}
