import { useMemo, useState } from 'react';
import { DISCLAIMER } from '../components/Disclaimer';
import { chanceTone } from '../engine';
import { ChanceInfo, GoalGap, gapTone } from '../components/Chance';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Minus,
  X,
  Dumbbell,
  Flame,
  Gauge,
  HeartPulse,
  Repeat,
  ShieldAlert,
  TriangleAlert,
  Users,
} from 'lucide-react';
import {
  STATIONS,
  defaultSchedule,
  fmtHms,
  mondayOf,
  parseMmss,
  parseRaceTime,
  raceModel,
  chanceBoosters,
  teamModel,
  applyBenchmark,
  calibrationOf,
  stationLabel,
  fmtMmss,
  todayISO,
  addDays,
  type Athlete,
  type Category,
  type Profile,
  type Sex,
} from '../engine';
import { useI18n, type Lang } from '../lib/i18n';
import { useAppSettings } from '../data/hooks';
import { PredictionBar } from '../components/charts';
import en from '../locales/landing.en.json';
import nl from '../locales/landing.nl.json';
import de from '../locales/landing.de.json';
import es from '../locales/landing.es.json';
import ko from '../locales/landing.ko.json';

type LKey = keyof typeof en;
const L: Record<Lang, Record<string, string>> = { en, nl, de, es, ko };

const DIVISIONS: { id: string; cat: Category; sex: Sex; label: string }[] = [
  { id: 'ow', cat: 'solo_open', sex: 'woman', label: 'Open · Women' },
  { id: 'om', cat: 'solo_open', sex: 'man', label: 'Open · Men' },
  { id: 'pw', cat: 'solo_pro', sex: 'woman', label: 'Pro · Women' },
  { id: 'pm', cat: 'solo_pro', sex: 'man', label: 'Pro · Men' },
  { id: 'dm', cat: 'doubles_open', sex: 'man', label: 'Doubles · Men' },
  { id: 'dw', cat: 'doubles_open', sex: 'woman', label: 'Doubles · Women' },
];

function QuickCheck({ l }: { l: (k: LKey) => string }) {
  const { pace } = useI18n();
  const [div, setDiv] = useState('om');
  const [tp, setTp] = useState('4:45');
  const [goal, setGoal] = useState('1:20:00');
  const [weeks, setWeeks] = useState(16);
  const d = DIVISIONS.find((x) => x.id === div)!;
  const tpSec = parseMmss(tp);
  const goalSec = parseRaceTime(goal);
  const mb = useMemo(() => {
    if (!tpSec || tpSec < 165 || tpSec > 540 || !goalSec) return null;
    const today = todayISO();
    const p: Profile = {
      athlete: {
        name: '',
        sex: d.sex,
        lthr: 170,
        maxHr: 190,
        thresholdPaceSec: tpSec,
        archetype: 'hybrid',
        flags: { achilles: false, quad: false, back: false, shin: false },
        stationStars: Object.fromEntries(STATIONS.map((s) => [s, 3])) as Profile['athlete']['stationStars'],
        stationTimes: {},
      },
      category: d.cat,
      raceName: 'HYROX',
      raceDate: addDays(today, weeks * 7),
      goalSec,
      planStart: mondayOf(today),
      weekSchedule: defaultSchedule(5),
    };
    const model = raceModel(p, today);
    return { m: model, b: chanceBoosters(p, today, undefined, model) };
  }, [tpSec, goalSec, weeks, d]);
  const m = mb?.m ?? null;
  const tone = !m ? '' : chanceTone(m.chance);
  return (
    <div className="panel relative p-5 shadow-[0_0_80px_-20px_rgb(var(--volt)/0.35)]">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Gauge className="h-4 w-4 text-volt" /> {l('qc.title')}
      </div>
      <p className="mt-0.5 text-xs text-muted">{l('qc.sub')}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="col-span-2 space-y-1">
          <span className="label">{l('qc.division')}</span>
          <select className="input" value={div} onChange={(e) => setDiv(e.target.value)}>
            {DIVISIONS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="label">{l('qc.threshold')}</span>
          <input className="input stat" value={tp} onChange={(e) => setTp(e.target.value)} inputMode="numeric" />
        </label>
        <label className="space-y-1">
          <span className="label">{l('qc.goal')}</span>
          <input className="input stat" value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="numeric" />
        </label>
        <label className="col-span-2 space-y-1">
          <span className="label">
            {l('qc.weeks')}: <span className="stat text-fg">{weeks}</span>
          </span>
          <input type="range" min={4} max={24} value={weeks} onChange={(e) => setWeeks(+e.target.value)} className="w-full accent-[rgb(var(--volt))]" />
        </label>
      </div>
      {m ? (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="label">{l('qc.projected')}</div>
              <div className={clsx('stat text-3xl font-bold', gapTone(m.projected.finishSec, goalSec!))}>{fmtHms(m.projected.finishSec)}</div>
              <GoalGap finishSec={m.projected.finishSec} goalSec={goalSec!} chance={m.chance} />
            </div>
            <div className="text-right">
              <div className={clsx('stat text-3xl font-bold', tone)}>{m.chance}%</div>
              <div className="text-xs text-muted">
                {l('qc.chance')}
                <ChanceInfo chance={m.chance} weeks={m.weeksLeft} boosters={mb?.b} align="right" finishSec={m.projected.finishSec} goalSec={goalSec!} />
              </div>
            </div>
          </div>
          <PredictionBar b={m.projected} goalSec={goalSec!} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-panel2 p-2">
              <div className="text-muted">{l('qc.needed')}</div>
              <div className="stat text-sm font-semibold">{pace(m.requiredRunPaceSec)}</div>
            </div>
            <div className="rounded-lg bg-panel2 p-2">
              <div className="text-muted">{l('qc.yours')}</div>
              <div className="stat text-sm font-semibold">{pace(m.projected.runPaceSec)}</div>
            </div>
          </div>
          <Link to="/auth?mode=signup" className="btn-primary mt-4 w-full">
            {l('qc.cta')} <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-[11px] text-muted">{l('qc.note')}</p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-warn">e.g. 4:45 · 1:20:00</p>
      )}
    </div>
  );
}


const stars = (o: Partial<Athlete['stationStars']> = {}) =>
  ({ skierg: 3, sledPush: 3, sledPull: 3, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 3, ...o }) as Athlete['stationStars'];
const ath = (o: Partial<Athlete>): Athlete => ({
  name: '', sex: 'man', lthr: 175, maxHr: 190, thresholdPaceSec: 300, archetype: 'hybrid',
  flags: { achilles: false, quad: false, back: false, shin: false }, stationStars: stars(), stationTimes: {}, ...o,
});
const prof = (a: Athlete, cat: Category, goalSec: number, weeks: number): Profile => {
  const today = todayISO();
  return { athlete: a, category: cat, raceName: 'HYROX', raceDate: addDays(today, weeks * 7), goalSec, planStart: mondayOf(today), weekSchedule: defaultSchedule(5) };
};
const LISA = ath({ name: 'Lisa', sex: 'woman', lthr: 172, maxHr: 188, thresholdPaceSec: 305, stationStars: stars({ skierg: 4, row: 4, sledPush: 2, sledPull: 2, wallballs: 2 }) });
const MARK = ath({ name: 'Mark', lthr: 178, maxHr: 186, thresholdPaceSec: 235, archetype: 'fast_runner', stationStars: stars({ sledPush: 2, sledPull: 2, lunges: 2 }) });
const RICK = ath({ name: 'Rick', lthr: 176, thresholdPaceSec: 245, archetype: 'fast_runner', stationStars: stars({ sledPush: 2, burpees: 4, farmers: 4 }) });
const TOM = ath({ name: 'Tom', lthr: 168, maxHr: 188, thresholdPaceSec: 265, archetype: 'diesel', stationStars: stars({ skierg: 4, sledPush: 5, sledPull: 4, row: 4, farmers: 5, lunges: 4, wallballs: 4 }) });

function Examples({ l }: { l: (k: LKey) => string }) {
  const { lang, pace } = useI18n();
  const [pick, setPick] = useState<'a' | 'b' | 'c'>('a');
  const today = todayISO();
  const solo = pick === 'a' ? prof(LISA, 'solo_open', 5100, 18) : prof(MARK, 'solo_pro', 4500, 12);
  const m = raceModel(solo, today);
  const tm = pick === 'c' ? teamModel(RICK, TOM, 'doubles_open', 3900, addDays(today, 105), today) : null;
  const chance = tm ? tm.chance : m.chance;
  const projected = tm ? tm.projectedFinishSec : m.projected.finishSec;
  const goal = tm ? 3900 : solo.goalSec;
  const tone = chanceTone(chance);
  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        {(['a', 'b', 'c'] as const).map((k) => (
          <button key={k} onClick={() => setPick(k)} className={clsx('rounded-lg border px-3 py-2 text-sm font-medium', pick === k ? 'border-volt bg-volt/10 text-volt' : 'border-line text-muted hover:text-fg')}>
            {l(`ex.${k}.name` as LKey)}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{l(`ex.${pick}.desc` as LKey)}</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <div className="label">{l('ex.verdict')}</div>
          <div className="flex items-end gap-6">
            <div>
              <div className="text-xs text-muted">{l('qc.projected')}</div>
              <div className={clsx('stat text-3xl font-bold', gapTone(projected, goal))}>{fmtHms(projected)}</div>
              <GoalGap finishSec={projected} goalSec={goal} chance={chance} />
              <div className="text-xs text-muted">{l('qc.goal')} {fmtHms(goal)}</div>
            </div>
            <div>
              <div className={clsx('stat text-3xl font-bold', tone)}>{chance}%</div>
              <div className="text-xs text-muted">
                {l('qc.chance')}
                <ChanceInfo chance={chance} weeks={tm ? 15 : m.weeksLeft} boosters={tm ? null : chanceBoosters(solo, today, undefined, m)} team={!!tm} finishSec={projected} goalSec={goal} />
              </div>
            </div>
          </div>
          {tm ? (
            <p className="text-sm">
              <span className="font-semibold">{l('ex.pacer')}:</span> {tm.pacer === 'A' ? 'Rick' : 'Tom'} · {pace(tm.runPaceSec)} — {l('qc.needed').toLowerCase()} {pace(tm.requiredRunPaceSec)}
            </p>
          ) : (
            <PredictionBar b={m.projected} goalSec={goal} />
          )}
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="label mb-1">{tm ? l('ex.split' as LKey) : l('ex.weak')}</div>
            {tm ? (
              <ul className="space-y-1">
                {tm.splits.filter((x) => x.lead !== 'even').slice(0, 4).map((x) => (
                  <li key={x.station} className="flex justify-between border-t border-line pt-1">
                    <span>{stationLabel(lang, x.station)}</span>
                    <span className="stat text-muted">{x.lead === 'A' ? 'Rick' : 'Tom'} {x.aSegments}/{x.bSegments}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-1">
                {m.weakestStations.map((st) => (
                  <li key={st} className="flex justify-between border-t border-line pt-1">
                    <span>{stationLabel(lang, st)}</span>
                    <span className="stat text-muted">{fmtMmss(m.current.stations[st])}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg bg-volt/10 p-3">
            <span className="font-semibold text-volt">{l('ex.focus')}: </span>
            {l(`ex.${pick}.focus` as LKey)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BenchmarkProof({ l }: { l: (k: LKey) => string }) {
  const r = applyBenchmark(calibrationOf(MARK), { id: 'x', number: 1, date: todayISO(), paceSec: 228, avgHr: 181 });
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr]">
      <div className="panel p-5 text-sm">
        <p>{l('bm.case')}</p>
        <div className="mt-3 flex gap-4">
          <div>
            <div className="label">pace</div>
            <div className="stat text-xl font-semibold">3:48</div>
          </div>
          <div>
            <div className="label">HR</div>
            <div className="stat text-xl font-semibold text-warn">181</div>
          </div>
          <div>
            <div className="label">LTHR</div>
            <div className="stat text-xl font-semibold">178</div>
          </div>
        </div>
      </div>
      <div className="panel border-bad/40 p-5 text-sm">
        <div className="flex items-center gap-2 font-semibold text-bad">
          <X className="h-4 w-4" /> {l('bm.other')}
        </div>
        <p className="mt-2 text-muted">{l('bm.otherv')}</p>
      </div>
      <div className="panel border-good/50 p-5 text-sm">
        <div className="flex items-center gap-2 font-semibold text-good">
          <Check className="h-4 w-4" /> {l('bm.ours')}
        </div>
        <p className="mt-2">{l('bm.oursv').replace('3:56', fmtMmss(r.after.thresholdPaceSec))}</p>
      </div>
    </div>
  );
}

function Compare({ l }: { l: (k: LKey) => string }) {
  type C = 'y' | 'n' | 'p' | string;
  const rows: [LKey, C, C, C, C][] = [
    ['cmp.r1', 'n', 'p', 'y', 'y'],
    ['cmp.r2', 'n', 'p', 'p', 'y'],
    ['cmp.r3', 'n', 'n', 'y', 'y'],
    ['cmp.r4', 'n', 'n', 'p', 'y'],
    ['cmp.r5', 'n', 'n', 'p', 'y'],
  ];
  const cell = (c: C) =>
    c === 'y' ? <Check className="mx-auto h-4 w-4 text-good" aria-label="yes" /> : c === 'n' ? <Minus className="mx-auto h-4 w-4 text-muted/60" aria-label="no" /> : <span className="text-xs text-warn">{l('cmp.part')}</span>;
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="p-3 text-left font-medium" />
            {(['cmp.col1', 'cmp.col2', 'cmp.col3'] as LKey[]).map((k) => (
              <th key={k} className="p-3 font-medium">{l(k)}</th>
            ))}
            <th className="rounded-t-lg bg-volt/10 p-3 font-semibold text-volt">{l('cmp.col4')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, a, b, c, d]) => (
            <tr key={k} className="border-t border-line text-center">
              <td className="p-3 text-left">{l(k)}</td>
              <td className="p-3">{cell(a)}</td>
              <td className="p-3">{cell(b)}</td>
              <td className="p-3">{cell(c)}</td>
              <td className="bg-volt/10 p-3">{cell(d)}</td>
            </tr>
          ))}
          <tr className="border-t border-line text-center">
            <td className="p-3 text-left">{l('cmp.r6')}</td>
            <td className="stat p-3 text-muted">{l('cmp.p1')}</td>
            <td className="stat p-3 text-muted">{l('cmp.p2')}</td>
            <td className="stat p-3 text-muted">{l('cmp.p3')}</td>
            <td className="stat bg-volt/10 p-3 font-semibold text-volt">{l('cmp.p4')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Section({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-14 sm:py-20">
      <div className="mb-8 text-center">
        <div className="eyebrow mb-2">{eyebrow}</div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const SOURCES = [
  { k: 'sci1' as const, name: 'Brandt et al. · Frontiers in Physiology (2025)', url: 'https://doi.org/10.3389/fphys.2025.1519240' },
  { k: 'sci2' as const, name: 'WOD-Science · Gommaar D’Hulst', url: 'https://morningchalkup.com/2025/04/15/can-you-be-elite-at-both-crossfit-and-hyrox/' },
  { k: 'sci3' as const, name: 'Joe Friel · %LTHR zones', url: 'https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/' },
  { k: 'sci4' as const, name: 'HYROX weights per division', url: 'https://www.redbull.com/us-en/hyrox-weights-overview' },
];

export default function Landing() {
  const { lang } = useI18n();
  const settings = useAppSettings();
  const l = (k: LKey) => L[lang]?.[k] ?? en[k];
  const beta = settings.data?.paywall_enabled !== true;
  const price = String(settings.data?.price_text ?? '€2,50 / month · €30 / year');

  const problems = [
    { i: Activity, h: l('p1.h'), d: l('p1.d') },
    { i: BarChart3, h: l('p2.h'), d: l('p2.d') },
    { i: TriangleAlert, h: l('p3.h'), d: l('p3.d') },
  ];
  const pillars = [
    { i: Gauge, h: l('s1.h'), d: l('s1.d') },
    { i: HeartPulse, h: l('s2.h'), d: l('s2.d') },
    { i: Repeat, h: l('s3.h'), d: l('s3.d') },
    { i: ShieldAlert, h: l('s4.h'), d: l('s4.d') },
    { i: Users, h: l('s5.h'), d: l('s5.d') },
    { i: Dumbbell, h: l('s6.h'), d: l('s6.d') },
  ];
  const steps = [
    { h: l('st1.h'), d: l('st1.d') },
    { h: l('st2.h'), d: l('st2.d') },
    { h: l('st3.h'), d: l('st3.d') },
  ];

  return (
    <div className="-mt-6">
      {/* hero */}
      <section className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-volt/40 bg-volt/10 px-3 py-1 text-xs font-medium text-volt">⚡ {l('badge')}</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
            {l('h1a')}
            <br />
            <span className="text-volt">{l('h1b')}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{l('sub')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/auth?mode=signup" className="btn-primary h-12 px-6 text-base">
              🚀 {l('cta')}
            </Link>
            <a href="#how" className="btn-ghost h-12 px-6 text-base">
              {l('how')}
            </a>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
            {[l('tick1'), l('tick2'), l('tick3')].map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-volt" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <QuickCheck l={l} />
      </section>

      <Section eyebrow={l('prob.eyebrow')} title={l('prob.title')}>
        <div className="grid gap-4 md:grid-cols-3">
          {problems.map((p) => (
            <div key={p.h} className="panel p-6">
              <p.i className="h-5 w-5 text-bad" />
              <h3 className="mt-3 font-semibold">{p.h}</h3>
              <p className="mt-2 text-sm text-muted">{p.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow={l('sol.eyebrow')} title={l('sol.title')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.h} className="panel flex gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-volt/10">
                <p.i className="h-5 w-5 text-volt" />
              </span>
              <div>
                <h3 className="font-semibold">{p.h}</h3>
                <p className="mt-1 text-sm text-muted">{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="how" eyebrow={l('how.eyebrow')} title={l('how.title')}>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.h} className="panel p-6">
              <div className="stat text-3xl font-bold text-volt">{i + 1}</div>
              <h3 className="mt-3 font-semibold">{s.h}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow={l('ex.eyebrow')} title={l('ex.title')}>
        <p className="-mt-4 mb-6 text-center text-sm text-muted">{l('ex.sub')}</p>
        <Examples l={l} />
      </Section>

      <Section eyebrow={l('bm.eyebrow')} title={l('bm.title')}>
        <p className="-mt-4 mb-6 text-center text-sm text-muted">{l('bm.sub')}</p>
        <BenchmarkProof l={l} />
      </Section>

      <Section eyebrow={l('cmp.eyebrow')} title={l('cmp.title')}>
        <Compare l={l} />
      </Section>

      <Section eyebrow={l('sci.eyebrow')} title={l('sci.title')}>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <a key={s.k} href={s.url} target="_blank" rel="noreferrer" className="panel block p-5 transition-colors hover:border-volt/50">
              <p className="text-sm">{l(s.k)}</p>
              <p className="mt-2 text-xs font-semibold text-volt">{s.name} ↗</p>
            </a>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link to="/science" className="btn-ghost">
            {(DISCLAIMER[lang] ?? DISCLAIMER.en).sources} <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      </Section>

      <section className="py-14 sm:py-20">
        <div className="panel mx-auto max-w-md border-volt/40 p-8 text-center shadow-[0_0_80px_-30px_rgb(var(--volt)/0.5)]">
          <div className="eyebrow">{l('price.eyebrow')}</div>
          <div className="mt-3">
            <span className="text-5xl font-extrabold">{l('price.big')}</span>
            <span className="text-muted"> {l('price.per')}</span>
          </div>
          <p className="mt-2 text-sm">{l('price.sub')}</p>
          <p className="mt-1 text-xs text-muted">{price}</p>
          {beta && <p className="mx-auto mt-3 inline-block rounded-full bg-volt/15 px-3 py-1 text-xs font-semibold text-volt">{l('price.beta')}</p>}
          <ul className="mt-5 space-y-2 text-left text-sm">
            {[l('price.f1'), l('price.f2'), l('price.f3'), l('price.f4')].map((x) => (
              <li key={x} className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-volt" /> {x}
              </li>
            ))}
          </ul>
          <Link to="/auth?mode=signup" className="btn-primary mt-6 w-full">
            {l('cta')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-2xl py-6">
        <h2 className="mb-4 text-center text-2xl font-extrabold">{l('faq.title')}</h2>
        <div className="space-y-2">
          {(['1', '2', '3'] as const).map((n) => (
            <details key={n} className="panel p-4">
              <summary className="cursor-pointer font-semibold">{l(`q${n}` as LKey)}</summary>
              <p className="mt-2 text-sm text-muted">{l(`a${n}` as LKey)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="py-14">
        <div className="rounded-2xl border border-volt/30 bg-gradient-to-br from-volt/15 via-panel to-panel p-8 text-center sm:p-12">
          <Flame className="mx-auto h-7 w-7 text-volt" />
          <h2 className="mx-auto mt-3 max-w-xl text-2xl font-extrabold sm:text-3xl">{l('final.title')}</h2>
          <Link to="/auth?mode=signup" className="btn-primary mt-6 h-12 px-6 text-base">
            {l('final.cta')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
