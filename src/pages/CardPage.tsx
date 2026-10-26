import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  STATIONS,
  chanceBoosters,
  defaultSchedule,
  fmtHms,
  mondayOf,
  parseMmss,
  parseRaceTime,
  raceModel,
  todayISO,
  addDays,
  type Category,
  type Profile,
  type Sex,
} from '../engine';
import { ChanceInfo } from '../components/Chance';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { getCard } from '../lib/cardApi';
import { altFor } from '../lib/cardTexts';
import { cardImageUrl, CODE_RE, divisionKey } from '../lib/cards';
import { useI18n } from '../lib/i18n';
import { ct } from '../lib/competition';
import { useCt } from '../lib/useCt';
import { Spinner } from '../components/ui';

const DASHED = 'border-dashed border-[#a8a498]';
const PAD = 'px-[18px] sm:px-[26px]';
const SEG = ['var(--bm-seg-runs)', 'var(--bm-seg-stations)', 'var(--bm-seg-roxzone)'];

/** The divisions of the check, with the engine category and sex they stand for. */
const DIVS: { id: string; cat: Category; sex: Sex; key: string }[] = [
  { id: 'open_women', cat: 'solo_open', sex: 'woman', key: 'div.full.open.women' },
  { id: 'open_men', cat: 'solo_open', sex: 'man', key: 'div.full.open.men' },
  { id: 'pro_women', cat: 'solo_pro', sex: 'woman', key: 'div.full.pro.women' },
  { id: 'pro_men', cat: 'solo_pro', sex: 'man', key: 'div.full.pro.men' },
  { id: 'doubles_women', cat: 'doubles_open', sex: 'woman', key: 'div.full.doubles.women' },
  { id: 'doubles_men', cat: 'doubles_open', sex: 'man', key: 'div.full.doubles.men' },
  { id: 'doubles_mixed', cat: 'doubles_mixed', sex: 'man', key: 'div.full.doubles.mixed' },
];

/** Public page of a shared card: the card, and the quick check with the division of the sharer filled in. */
export default function CardPage() {
  const { code: raw } = useParams();
  const code = (raw ?? '').toUpperCase();
  const { lang } = useI18n();
  const c = useCt();
  const q = useQuery({ queryKey: ['card', code], enabled: CODE_RE.test(code), staleTime: 5 * 60_000, queryFn: () => getCard(code) });
  const card = q.data ?? null;
  const ref = card?.ref ?? null;

  // the referral of the sharer is kept until the visitor signs up
  useEffect(() => {
    if (!ref) return;
    try {
      localStorage.setItem('rox:ref', ref.trim().toUpperCase());
    } catch {
      /* storage blocked */
    }
  }, [ref]);
  useEffect(() => {
    const t = card ? ct(lang, 'og.fallback.title') : ct(lang, 'kpage.notFound.title');
    const prev = document.title;
    document.title = `${t} | Benchmrk`;
    return () => {
      document.title = prev;
    };
  }, [card, lang]);

  const prefill = card && DIVS.some((d) => d.id === card.data.division) ? card.data.division : '';
  const [div, setDiv] = useState('');
  useEffect(() => setDiv(prefill), [prefill]);
  const [tp, setTp] = useState('4:45');
  const [goal, setGoal] = useState('1:20:00');
  const [weeksIn, setWeeksIn] = useState('16');
  const [calculated, setCalculated] = useState(false);
  const d = DIVS.find((x) => x.id === div);
  const weeks = Math.min(24, Math.max(4, parseInt(weeksIn, 10) || 16));
  const tpSec = parseMmss(tp);
  const goalSec = parseRaceTime(goal);
  const mb = useMemo(() => {
    if (!calculated || !d || !tpSec || tpSec < 165 || tpSec > 540 || !goalSec) return null;
    const today = todayISO();
    const p: Profile = {
      athlete: {
        name: '', sex: d.sex, lthr: 170, maxHr: 190, thresholdPaceSec: tpSec, archetype: 'hybrid',
        flags: { achilles: false, quad: false, back: false, shin: false },
        stationStars: Object.fromEntries(STATIONS.map((s) => [s, 3])) as Profile['athlete']['stationStars'],
        stationTimes: {},
      },
      category: d.cat, raceName: 'HYROX', raceDate: addDays(today, weeks * 7), goalSec, planStart: mondayOf(today), weekSchedule: defaultSchedule(5),
    };
    const model = raceModel(p, today);
    return { m: model, b: chanceBoosters(p, today, undefined, model) };
  }, [calculated, d, tpSec, goalSec, weeks]);
  const m = mb?.m ?? null;
  const signup = `/auth?mode=signup${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;

  if (q.isLoading) return <Spinner />;
  return (
    <div className="min-h-screen bg-ground pb-6 text-ink">
      <SiteHeader items={[]} />
      <main className="bm-wrap grid gap-8 pb-4 pt-8 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] md:gap-14 md:pt-12">
        <section aria-label={c('kpage.cardRegion')} className="min-w-0">
          {card ? (
            <>
              <p className="mb-4 text-[15px] text-ink-2">
                {(() => {
                  const [pre, post] = c('kpage.sharedBy', { name: '\u0000', divisionFull: ct(lang, divisionKey(card.data.division, true)) }).split('\u0000');
                  return (
                    <>
                      {pre}
                      <b className="text-ink">{card.data.nickname}</b>
                      {post}
                    </>
                  );
                })()}
              </p>
              <div className="mx-auto max-w-[520px] overflow-hidden shadow-[0_10px_30px_rgba(20,20,19,0.18)] md:mx-0">
                <img src={cardImageUrl(code, 'square')} alt={altFor(card.type, card.data)} width={1080} height={1080} className="block aspect-square h-auto w-full bg-surface-2" />
              </div>
            </>
          ) : (
            <div className="rounded-paper border border-line bg-surface p-6 shadow-paper">
              <h1 className="text-[28px] font-extrabold uppercase leading-none [font-stretch:72%]">{c('kpage.notFound.title')}</h1>
              <p className="mt-3 text-ink-2">{c('kpage.notFound.body')}</p>
            </div>
          )}
        </section>

        <section className="min-w-0">
          <div className="w-full rounded-paper border border-line bg-surface shadow-paper">
            <div className={clsx(PAD, DASHED, 'border-b pb-3.5 pt-[18px]')}>
              <h2 className="text-lg font-extrabold uppercase tracking-[0.02em] [font-stretch:80%]">{c('kpage.check.title')}</h2>
              <p className="mt-1 text-[14px] text-ink-2">{c('kpage.check.sub')}</p>
            </div>
            <form
              className={clsx(PAD, DASHED, 'flex flex-wrap gap-x-4 gap-y-3 border-b py-3.5')}
              onSubmit={(e) => {
                e.preventDefault();
                setCalculated(true);
              }}
            >
              <label className="bm-field flex-[1_1_100%]">
                <span className="flex items-center gap-2">
                  {c('kpage.field.division')}
                  {prefill && div === prefill && <span className="bg-accent px-1.5 font-mono text-[11px] font-semibold uppercase text-ink">{c('kpage.field.prefilledBadge')}</span>}
                </span>
                <select
                  className="bm-input"
                  value={div}
                  onChange={(e) => {
                    setDiv(e.target.value);
                    setCalculated(false);
                  }}
                  aria-describedby="kdiv-help"
                >
                  {!div && <option value="">–</option>}
                  {DIVS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {c(x.key)}
                    </option>
                  ))}
                </select>
                <span id="kdiv-help" className="text-[13px] text-muted">
                  {div && prefill === div ? c('kpage.check.prefilled', { divisionFull: c(DIVS.find((x) => x.id === div)!.key) }) : div ? '' : c('kpage.check.chooseDivision')}
                </span>
              </label>
              <label className="bm-field flex-[1_1_130px]">
                {c('kpage.field.pace')}
                <input className="bm-input" value={tp} onChange={(e) => (setTp(e.target.value), setCalculated(false))} inputMode="numeric" />
              </label>
              <label className="bm-field flex-[1_1_90px]">
                {c('kpage.field.goal')}
                <input className="bm-input" value={goal} onChange={(e) => (setGoal(e.target.value), setCalculated(false))} inputMode="numeric" />
              </label>
              <label className="bm-field flex-[1_1_100%] sm:flex-[1_1_130px]">
                {c('kpage.field.weeks')}
                <input className="bm-input" type="number" min={4} max={24} value={weeksIn} onChange={(e) => (setWeeksIn(e.target.value), setCalculated(false))} />
              </label>
              <button type="submit" className="bm-btn-ink w-full" disabled={!div}>
                {c('kpage.check.btn')}
                <span aria-hidden>→</span>
              </button>
            </form>

            <div aria-live="polite">
              {m && goalSec && (
                <div className={clsx(PAD, 'pb-2 pt-3.5 font-mono text-[15px]')}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 pb-1">
                    <span className="font-sans text-sm font-semibold">{c('kpage.res.expected')}</span>
                    <span className="text-[34px] font-semibold tracking-[-0.02em]">{fmtHms(m.projected.finishSec)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-3 text-[13px] text-ink-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="bg-accent px-2 py-0.5 text-[17px] font-semibold text-ink">{m.chance}%</span>
                      {c('kpage.res.chance', { goal: fmtHms(goalSec) })}
                      <ChanceInfo chance={m.chance} weeks={m.weeksLeft} boosters={mb?.b} align="right" finishSec={m.projected.finishSec} goalSec={goalSec} />
                    </span>
                  </div>
                  <div className="relative flex h-3.5" role="img" aria-label={c('kpage.res.barLabel', { runs: fmtHms(m.projected.runTotalSec), stations: fmtHms(m.projected.stationTotalSec), roxzone: fmtHms(m.projected.roxzoneSec) })}>
                    {[m.projected.runTotalSec, m.projected.stationTotalSec, m.projected.roxzoneSec].map((v, i) => (
                      <div key={i} style={{ flex: `${v} 1 0`, background: SEG[i] }} />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    <span>{c('kpage.res.runs', { runs: fmtHms(m.projected.runTotalSec) })}</span>
                    <span>{c('kpage.res.stations', { stations: fmtHms(m.projected.stationTotalSec) })}</span>
                    <span>{c('kpage.res.roxzone', { roxzone: fmtHms(m.projected.roxzoneSec) })}</span>
                  </div>
                  <p className="mt-3 font-sans text-xs leading-normal text-[#5e5b53]">{c('kpage.res.note')}</p>
                </div>
              )}
            </div>

            <div className={clsx(PAD, 'pb-6 pt-3')}>
              <Link to={signup} className="bm-btn-accent w-full">
                {c('kpage.cta.plan')}
              </Link>
              <p className="mt-3 text-xs leading-normal text-[#5e5b53]">{c('kpage.cta.sub')}</p>
            </div>
          </div>
          <p className="mt-6 max-w-[56ch] text-[15px] text-ink-2">{c('kpage.about')}</p>
        </section>
      </main>
      <SiteFooter notAffiliated={c('kpage.disclaimer')} />
    </div>
  );
}
