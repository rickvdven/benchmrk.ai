import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { DISCLAIMER } from '../components/Disclaimer';
import { ChanceInfo, GoalGap } from '../components/Chance';
import { LangSwitch, Wordmark } from '../components/Layout';
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
  stationLabel,
  fmtMmss,
  todayISO,
  addDays,
  type Athlete,
  type Category,
  type Profile,
  type RaceBreakdown,
  type Sex,
} from '../engine';
import { useI18n, type Lang } from '../lib/i18n';
import { useAppSettings } from '../data/hooks';
import en from '../locales/landing.en.json';
import nl from '../locales/landing.nl.json';
import de from '../locales/landing.de.json';
import es from '../locales/landing.es.json';
import ko from '../locales/landing.ko.json';

type LKey = keyof typeof en;
const L: Record<Lang, Record<string, string>> = { en, nl, de, es, ko };

/** A euro amount as each language writes it: €30 and €2,50 (nl), but 30 € and 2,50 € (de, es). */
function fmtEur(n: number, lang: Lang) {
  const num = n.toLocaleString(lang === 'ko' ? 'en' : lang, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  return lang === 'de' || lang === 'es' ? `${num}\u00a0€` : `€${num}`;
}

const DIVISIONS: { id: string; cat: Category; sex: Sex; label: string }[] = [
  { id: 'ow', cat: 'solo_open', sex: 'woman', label: 'Open · Women' },
  { id: 'om', cat: 'solo_open', sex: 'man', label: 'Open · Men' },
  { id: 'pw', cat: 'solo_pro', sex: 'woman', label: 'Pro · Women' },
  { id: 'pm', cat: 'solo_pro', sex: 'man', label: 'Pro · Men' },
  { id: 'dm', cat: 'doubles_open', sex: 'man', label: 'Doubles · Men' },
  { id: 'dw', cat: 'doubles_open', sex: 'woman', label: 'Doubles · Women' },
];

// segment colours differ in lightness, not only in hue (benchmrk-a-licht/tokens.css)
const SEG = ['var(--bm-seg-runs)', 'var(--bm-seg-stations)', 'var(--bm-seg-roxzone)'];
const DASHED = 'border-dashed border-[#a8a498]';
const PAD = 'px-[18px] sm:px-[26px]';

/** Receipt-style bar: runs / stations / Roxzone in three greys, with the goal as a marker. */
function ReceiptBar({ b, goalSec }: { b: RaceBreakdown; goalSec: number }) {
  const { t } = useI18n();
  const max = Math.max(b.finishSec, goalSec);
  const parts = [
    { label: t('ck.runs'), v: b.runTotalSec },
    { label: t('ck.stations'), v: b.stationTotalSec },
    { label: t('ck.roxzone'), v: b.roxzoneSec },
  ];
  const summary = `${parts.map((p) => `${p.label} ${fmtHms(p.v)}`).join(', ')}, ${t('ck.goal')} ${fmtHms(goalSec)}`;
  return (
    <div className={clsx(PAD, 'pb-1 pt-2.5')}>
      <div className="relative flex h-3.5" role="img" aria-label={summary}>
        {parts.map((p, i) => (
          <div key={p.label} style={{ flex: `${p.v} 1 0`, background: SEG[i] }} />
        ))}
        {max > b.finishSec && <div style={{ flex: `${max - b.finishSec} 1 0` }} />}
        <div className="absolute -bottom-1.5 -top-1.5 w-0.5 -translate-x-full bg-ink" style={{ left: `${(goalSec / max) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5e5b53]" aria-hidden>
        {parts.map((p, i) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5" style={{ background: SEG[i] }} />
            {p.label}
          </span>
        ))}
        <span className="ml-auto">| {t('ck.goal')}</span>
      </div>
    </div>
  );
}

function QuickCheck({ l }: { l: (k: LKey) => string }) {
  const { t, pace } = useI18n();
  const [div, setDiv] = useState('om');
  const [tp, setTp] = useState('4:45');
  const [goal, setGoal] = useState('1:20:00');
  const [weeksIn, setWeeksIn] = useState('16');
  const weeks = Math.min(24, Math.max(4, parseInt(weeksIn, 10) || 16));
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
  const row = 'flex justify-between gap-3 py-[5px]';
  return (
    <div className="w-full min-w-0 rounded-paper border border-line bg-surface text-ink shadow-paper lg:max-w-[500px] lg:rotate-[0.6deg]">
      <div className={clsx(PAD, DASHED, 'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b pb-3.5 pt-[18px]')}>
        <h2 className="text-lg font-extrabold uppercase tracking-[0.02em] [font-stretch:80%]">{l('qc.label')}</h2>
        <span className="font-mono text-xs text-[#5e5b53]">{l('qc.sub')}</span>
      </div>
      <div className={clsx(PAD, DASHED, 'flex flex-wrap gap-x-4 gap-y-3 border-b py-3.5')}>
        <label className="bm-field flex-[1_1_100%]">
          {l('qc.division')}
          <select className="bm-input" value={div} onChange={(e) => setDiv(e.target.value)}>
            {DIVISIONS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="bm-field flex-[1_1_130px]">
          {l('qc.threshold')}
          <input className="bm-input" value={tp} onChange={(e) => setTp(e.target.value)} inputMode="numeric" />
        </label>
        <label className="bm-field flex-[1_1_90px]">
          {l('qc.goal')}
          <input className="bm-input" value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="numeric" />
        </label>
        <label className="bm-field flex-[1_1_100%] sm:flex-[1_1_130px]">
          {l('qc.weeks')}
          <input className="bm-input" type="number" min={4} max={24} value={weeksIn} onChange={(e) => setWeeksIn(e.target.value)} />
        </label>
      </div>
      {m ? (
        <>
          <div className={clsx(PAD, 'pb-1.5 pt-3.5 font-mono text-[15px]')}>
            <div className={row}>
              <span>{t('ck.runs')}</span>
              <span>{fmtHms(m.projected.runTotalSec)}</span>
            </div>
            <div className={row}>
              <span>{t('ck.stations')}</span>
              <span>{fmtHms(m.projected.stationTotalSec)}</span>
            </div>
            <div className={clsx(row, 'border-b-[1.5px] border-ink')}>
              <span>{t('ck.roxzone')}</span>
              <span>{fmtHms(m.projected.roxzoneSec)}</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 pb-1 pt-3.5">
              <span className="font-sans text-sm font-semibold">{l('qc.projected')}</span>
              <span className="text-[30px] font-semibold tracking-[-0.02em] sm:text-[34px]">{fmtHms(m.projected.finishSec)}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-3 py-0.5 text-[13px] text-[#5e5b53]">
              <span>
                {t('ck.goal')} {fmtHms(goalSec!)}
              </span>
              <GoalGap finishSec={m.projected.finishSec} goalSec={goalSec!} chance={m.chance} />
            </div>
          </div>
          <ReceiptBar b={m.projected} goalSec={goalSec!} />
          <dl className={clsx(PAD, 'flex flex-wrap gap-3 py-3.5 font-mono text-[13px] text-ink-2')}>
            <div className="flex-[1_1_120px]">
              <dt className="inline">{l('qc.needed')}: </dt>
              <dd className="inline font-semibold text-ink">{pace(m.requiredRunPaceSec)}</dd>
            </div>
            <div className="flex-[1_1_120px]">
              <dt className="inline">{l('qc.yours')}: </dt>
              <dd className="inline font-semibold text-ink">{pace(m.projected.runPaceSec)}</dd>
            </div>
            <div className="flex-[1_1_120px]">
              <dt className="inline">{l('qc.chance')}: </dt>
              <dd className="inline font-semibold text-ink">
                {m.chance}%
                <ChanceInfo chance={m.chance} weeks={m.weeksLeft} boosters={mb?.b} align="right" finishSec={m.projected.finishSec} goalSec={goalSec!} />
              </dd>
            </div>
          </dl>
          <div className={clsx(PAD, 'pb-6')}>
            <Link to="/auth?mode=signup" className="bm-btn-ink">
              {l('qc.cta')}
              <span aria-hidden>→</span>
            </Link>
            <p className="mt-3 text-xs leading-normal text-[#5e5b53]">{l('qc.note')}</p>
          </div>
        </>
      ) : (
        <p className={clsx(PAD, 'py-5 font-mono text-[13px] text-warn')}>e.g. 4:45 · 1:20:00</p>
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

/** The three example athletes as a results table – every number is computed live by the engine. */
function Examples({ l }: { l: (k: LKey) => string }) {
  const { lang, pace } = useI18n();
  const rows = useMemo(() => {
    const today = todayISO();
    const split = (k: LKey) => {
      const [name, ...div] = l(k).split(' · ');
      return { name, div: div.join(' · ') };
    };
    const solo = (k: 'a' | 'b', p: Profile) => {
      const m = raceModel(p, today);
      const st = m.weakestStations[0];
      return {
        k, ...split(`ex.${k}.name` as LKey), thr: pace(p.athlete.thresholdPaceSec), goal: p.goalSec, proj: m.projected.finishSec, chance: m.chance,
        loss: st ? `${stationLabel(lang, st)} ${fmtMmss(m.current.stations[st])}` : '–',
      };
    };
    const tm = teamModel(RICK, TOM, 'doubles_open', 3900, addDays(today, 105), today);
    return [
      solo('a', prof(LISA, 'solo_open', 5100, 18)),
      solo('b', prof(MARK, 'solo_pro', 4500, 12)),
      {
        k: 'c' as const, ...split('ex.c.name'), thr: `${pace(RICK.thresholdPaceSec)} / ${pace(TOM.thresholdPaceSec)}`, goal: 3900,
        proj: tm.projectedFinishSec, chance: tm.chance, loss: `${l('ex.pacer')} ${tm.pacer === 'A' ? 'Rick' : 'Tom'} ${pace(tm.runPaceSec)}`,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, pace]);
  const heads: LKey[] = ['ex.th.athlete', 'ex.th.division', 'ex.th.threshold', 'ex.th.goal', 'ex.th.projected', 'ex.th.chance', 'ex.th.loss'];
  return (
    <>
      <div className="mt-12 overflow-x-auto" tabIndex={0} role="region" aria-label={l('ex.title')}>
        <table className="bm-table min-w-[760px]">
          <thead>
            <tr>
              {heads.map((h) => (
                <th key={h} scope="col">
                  {l(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => (
              <tr key={r.k}>
                <th scope="row" className="py-[18px] font-sans font-bold">
                  {r.name}
                </th>
                <td className="py-[18px]">{r.div}</td>
                <td className="py-[18px]">{r.thr}</td>
                <td className="py-[18px]">{fmtHms(r.goal)}</td>
                <td className="py-[18px] font-semibold">{fmtHms(r.proj)}</td>
                <td className="py-[18px]">{r.chance}%</td>
                <td className="py-[18px]">{r.loss}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 max-w-[720px] space-y-3 text-ink-2">
        {rows.map((r) => (
          <p key={r.k}>
            <span className="bm-mark">
              {l('ex.focus')} · {r.name}:
            </span>{' '}
            {l(`ex.${r.k}.focus` as LKey)}
          </p>
        ))}
      </div>
    </>
  );
}

const Check = ({ label }: { label: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" role="img" aria-label={label} className="block">
    <path d="M3 9.5 L7.5 14 L15 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
  </svg>
);

function Compare({ l }: { l: (k: LKey) => string }) {
  type C = 'y' | 'n' | 'p';
  const rows: [LKey, C, C, C, C][] = [
    ['cmp.r1', 'n', 'p', 'y', 'y'],
    ['cmp.r2', 'n', 'p', 'p', 'y'],
    ['cmp.r3', 'n', 'n', 'y', 'y'],
    ['cmp.r5', 'n', 'n', 'p', 'y'],
  ];
  const cell = (c: C) =>
    c === 'y' ? (
      <Check label={l('cmp.yes')} />
    ) : c === 'n' ? (
      <span className="text-[#8a877f]" role="img" aria-label={l('cmp.no')}>
        —
      </span>
    ) : (
      <span className="text-ink-3">{l('cmp.part')}</span>
    );
  // the Benchmrk column reads as one block: lime-tinted cells with a 2px ink frame
  const ours = 'border-x-2 border-x-ink bg-[#f6fadf] px-5';
  const th = 'border-b-[1.5px] border-ink px-3 py-[18px] text-left text-xs font-medium uppercase tracking-[0.06em] text-muted';
  const td = 'border-b border-[#e4e2dc] px-3 py-4';
  return (
    <div className="mt-9 overflow-x-auto rounded-paper border border-line bg-surface shadow-paper" tabIndex={0} role="region" aria-label={l('cmp.title')}>
      <table className="w-full min-w-[780px] border-collapse text-[15px]">
        <thead>
          <tr>
            <th scope="col" className={clsx(th, 'w-[34%] !pl-5')}>
              {l('cmp.what')}
            </th>
            {(['cmp.col1', 'cmp.col2', 'cmp.col3'] as LKey[]).map((k) => (
              <th key={k} scope="col" className={th}>
                {l(k)}
              </th>
            ))}
            <th scope="col" className="w-[18%] border-2 border-b-[1.5px] border-ink bg-accent px-5 py-3.5 text-left text-sm font-extrabold uppercase tracking-[0.02em] text-ink">
              {l('cmp.col4')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, ...cells]) => (
            <tr key={k}>
              <th scope="row" className={clsx(td, '!pl-5 text-left font-medium')}>
                {l(k)}
              </th>
              {cells.map((c, i) => (
                <td key={i} className={clsx(td, i === 3 && clsx(ours, '!border-b-[#e2e8c2]'))}>
                  {cell(c)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="font-mono">
            <th scope="row" className="py-[18px] pl-5 pr-3 text-left font-sans font-bold">
              {l('cmp.r6')}
            </th>
            {(['cmp.p1', 'cmp.p2', 'cmp.p3'] as LKey[]).map((k) => (
              <td key={k} className="px-3 py-[18px]">
                {l(k)}
              </td>
            ))}
            <td className={clsx(ours, 'border-b-2 border-b-ink py-[18px] text-[17px] font-semibold')}>{l('cmp.p4')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function Landing() {
  const { lang, t } = useI18n();
  const settings = useAppSettings();
  // the yearly price is set in Admin → Settings (app_settings.price_year_cents), the same value commissions use
  const year = (Number(settings.data?.price_year_cents) || 3000) / 100;
  const l = (k: LKey) => (L[lang]?.[k] ?? en[k]).replace('{price}', fmtEur(year, lang)).replace('{month}', fmtEur(year / 12, lang));
  const beta = settings.data?.paywall_enabled !== true;
  const disclaimer = DISCLAIMER[lang] ?? DISCLAIMER.en;
  const navLink = 'text-[15px] text-ink-3 hover:text-ink';

  const problems = [
    { h: l('p1.h'), d: l('p1.d') },
    { h: l('p2.h'), d: l('p2.d') },
    { h: l('p3.h'), d: l('p3.d') },
  ];
  const steps = [
    { t: l('st1.t'), h: l('st1.h'), d: l('st1.d') },
    { t: l('st2.t'), h: l('st2.h'), d: l('st2.d') },
    { t: l('st3.t'), h: l('st3.h'), d: l('st3.d') },
  ];

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="border-b border-line">
        <nav className="bm-wrap flex items-center gap-7 py-2.5 sm:py-[18px]" aria-label="Benchmrk">
          <Link to="/" className="text-[20px] no-underline sm:text-[22px]">
            <Wordmark />
          </Link>
          <div className="hidden flex-grow flex-wrap gap-6 md:flex">
            <a href="#how" className={navLink}>
              {l('how')}
            </a>
            <a href="#examples" className={navLink}>
              {l('nav.examples')}
            </a>
            <a href="#price" className={navLink}>
              {l('nav.price')}
            </a>
            <Link to="/science" className={navLink}>
              {l('nav.science')}
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <LangSwitch className="min-h-[44px] text-[15px]" />
            <Link to="/auth" className="bm-btn-outline">
              {t('nav.signin')}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* hero */}
        <section className="bm-wrap flex flex-wrap items-start gap-x-16 gap-y-10 pb-16 pt-9 sm:pb-20 sm:pt-12">
          <div className="min-w-0 flex-[1_1_480px] sm:pt-3">
            <p className="bm-kicker mb-[18px] sm:mb-7">{l('hero.kicker')}</p>
            <h1 className="bm-display max-w-[14ch] text-[clamp(44px,5.2vw,76px)] !leading-[0.94] [overflow-wrap:anywhere] [text-wrap:balance]">{l('h1b')}</h1>
            <p className="mt-6 max-w-[520px] text-[17px] text-ink-2 sm:mt-8 sm:text-[19px]">{l('sub')}</p>
            <div className="mt-7 flex flex-wrap items-center gap-5 sm:mt-10">
              <Link to="/auth?mode=signup" className="bm-btn-accent w-full sm:w-auto">
                {l('cta')}
              </Link>
              <a href="#how" className="text-base text-ink underline underline-offset-[5px]">
                {l('how')}
              </a>
            </div>
            <p className="mt-7 text-sm text-muted">{[l('tick1'), l('tick2'), l('tick3')].join(' · ')}</p>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] justify-end">
            <QuickCheck l={l} />
          </div>
        </section>

        {/* the app in action: an illustration with example values, not live data */}
        <section className="bm-wrap pt-6" aria-labelledby="app-title">
          <div className="flex flex-wrap items-center gap-x-[72px] gap-y-8 border-t-[1.5px] border-ink pt-12">
            <div className="min-w-0 flex-[1_1_420px]">
              <h2 id="app-title" className="bm-h2 max-w-[14ch] !text-[clamp(36px,4.4vw,56px)]">
                {l('app.title')}
              </h2>
              <p className="mt-[22px] max-w-[46ch] text-ink-2">{l('app.d')}</p>
              <dl className="mt-7 max-w-[420px] font-mono text-sm">
                {(
                  [
                    ['app.r1', '1:18:41', '1:17:55'],
                    ['app.r2', '96%', '98%'],
                    ['app.r3', '4:45', '4:43/km'],
                  ] as [LKey, string, string][]
                ).map(([k, from, to], i) => (
                  <div key={k} className={clsx('flex justify-between gap-4 border-t border-line py-2.5', i === 2 && 'border-b')}>
                    <dt className="text-muted">{l(k)}</dt>
                    <dd>
                      {from} → <strong>{to}</strong>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted">{l('app.note')}</p>
            </div>
            <div className="flex flex-[0_1_400px] justify-center">
              <picture>
                <source srcSet="/benchmrk-app-benchmark-log.webp" type="image/webp" />
                <img src="/benchmrk-app-benchmark-log.png" alt={l('app.alt')} width={1000} height={1800} loading="lazy" className="block h-auto w-[400px] max-w-full" />
              </picture>
            </div>
          </div>
        </section>

        {/* problem */}
        <section className="bm-wrap pb-10 pt-16 sm:pt-[120px]" aria-labelledby="prob-title">
          <h2 id="prob-title" className="bm-h2 max-w-[760px]">
            {l('prob.title')}
          </h2>
          <div className="mt-8 flex flex-wrap gap-x-12 sm:mt-14">
            {problems.map((p, i) => (
              <div key={p.h} className="flex-[1_1_280px] border-t-[1.5px] border-ink pb-8 pt-5">
                <div className="font-mono text-[13px] text-muted">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="my-2.5 text-[20px] font-bold leading-tight sm:text-[22px]">{p.h}</h3>
                <p className="text-ink-2">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* example athletes */}
        <section id="examples" className="bm-wrap scroll-mt-4 pb-10 pt-16 sm:pt-[100px]" aria-labelledby="ex-title">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="ex-title" className="bm-h2 max-w-[680px]">
              {l('ex.title')}
            </h2>
            <p className="max-w-[380px] text-[15px] text-muted">{l('ex.sub')}</p>
          </div>
          <Examples l={l} />
        </section>

        {/* steps */}
        <section id="how" className="bm-wrap flex scroll-mt-4 flex-wrap gap-12 pb-10 pt-16 sm:pt-[100px]">
          <h2 className="bm-h2 flex-[1_1_300px]">{l('how.title')}</h2>
          <ol className="m-0 flex flex-[2_1_520px] list-none flex-col p-0">
            {steps.map((s, i) => (
              <li key={s.h} className={clsx('flex gap-5 border-t border-line py-[22px] sm:gap-7', i === steps.length - 1 && 'border-b')}>
                <span className="min-w-[64px] font-mono text-muted">{s.t}</span>
                <div>
                  <h3 className="text-[20px] font-bold">{s.h}</h3>
                  <p className="mt-1.5 text-ink-2">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* compare */}
        <section className="bm-wrap pb-10 pt-16 sm:pt-[100px]" aria-labelledby="cmp-title">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <h2 id="cmp-title" className="bm-h2">
              {l('cmp.title')}
            </h2>
            <p className="max-w-[380px] text-[15px] text-muted">{l('cmp.sub')}</p>
          </div>
          <Compare l={l} />
        </section>

        {/* price: same receipt form as the quick check */}
        <section id="price" className="bm-wrap scroll-mt-4 pb-16 pt-16 sm:pb-[120px] sm:pt-[110px]" aria-labelledby="price-title">
          <div className="flex flex-wrap items-start gap-x-20 gap-y-12 border-t-[1.5px] border-ink pt-12">
            <div className="min-w-0 flex-[1_1_380px]">
              <h2 id="price-title" className="bm-h2 max-w-[14ch]">
                {l('price.title')}
              </h2>
              <p className="mt-5 max-w-[44ch] text-ink-2">{l('price.lead')}</p>
              <ol className="m-0 mt-8 max-w-[440px] list-none p-0">
                {(
                  [
                    ['price.free', 'price.s1'],
                    ['price.free', 'price.s2'],
                    [null, 'price.s3'],
                  ] as [LKey | null, LKey][]
                ).map(([tag, k], i) => (
                  <li key={k} className={clsx('flex gap-[18px] border-t border-line py-3.5', i === 2 && 'border-b')}>
                    <span className={clsx('min-w-[64px] font-mono', tag ? 'text-muted' : 'font-semibold text-ink')}>{tag ? l(tag) : fmtEur(year, lang)}</span>
                    <span>{l(k)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative w-full min-w-0 flex-[0_1_440px] rounded-paper border border-line bg-surface shadow-paper sm:-rotate-[0.5deg]">
              {beta && (
                <div className="absolute -top-4 right-[22px] -rotate-[8deg] border-2 border-ink bg-surface px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] opacity-[0.85]" aria-hidden>
                  {l('price.stamp')}
                </div>
              )}
              <div className={clsx(PAD, DASHED, 'flex flex-wrap items-baseline justify-between gap-x-3 border-b pb-4 pt-[22px]')}>
                <h3 className="text-lg font-extrabold uppercase tracking-[0.02em] [font-stretch:80%]">{l('price.rc.title')}</h3>
                <span className="font-mono text-xs text-muted">{l('price.rc.season')}</span>
              </div>
              <ul className={clsx(PAD, 'm-0 list-none pb-1.5 pt-2.5 font-mono text-sm')}>
                {(['price.i1', 'price.i2', 'price.i3', 'price.i4', 'price.i5'] as LKey[]).map((k, i) => (
                  <li key={k} className={clsx('flex justify-between gap-4 py-[9px]', i < 4 && 'border-b border-dashed border-[#c9c5ba]')}>
                    <span>{l(k)}</span>
                    <span className="shrink-0">{l('price.incl')}</span>
                  </li>
                ))}
              </ul>
              <div className="mx-[18px] flex items-baseline justify-between gap-3 border-t-[1.5px] border-ink pb-1 pt-4 sm:mx-[26px]">
                <span className="font-mono font-semibold">{l('price.total')}</span>
                <span className="text-[72px] font-extrabold leading-[0.9] [font-stretch:72%]">{fmtEur(year, lang)}</span>
              </div>
              <p className={clsx(PAD, 'pb-[18px] text-right font-mono text-[13px] text-muted')}>{l('price.month')}</p>
              <div className={clsx(PAD, 'pb-6')}>
                <Link to="/auth?mode=signup" className="bm-btn-accent w-full !justify-between px-[18px]">
                  {l('cta')}
                  <span aria-hidden>→</span>
                </Link>
                <p className="mt-3 text-xs leading-normal text-muted">{l('price.f4')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="bm-wrap flex flex-wrap justify-between gap-6 pb-12 pt-8 text-[13px] text-muted">
          <p className="max-w-3xl">{disclaimer.short}</p>
          <Link to="/science" className="text-ink-3 underline">
            {disclaimer.sources}
          </Link>
        </div>
      </footer>
    </div>
  );
}
