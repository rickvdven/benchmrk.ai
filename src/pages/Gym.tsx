import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { useAppSettings, useAuth } from '../data/hooks';
import { useI18n, type Lang } from '../lib/i18n';
import { fmtEur } from '../lib/money';
import { nb } from '../lib/brand';
import en from '../locales/gym.en.json';
import nl from '../locales/gym.nl.json';
import de from '../locales/gym.de.json';
import es from '../locales/gym.es.json';
import ko from '../locales/gym.ko.json';

type GKey = keyof typeof en;
const G: Record<Lang, Record<string, string>> = { en, nl, de, es, ko };
const MAIL = 'info@benchmrk.ai';
const VIDEO = '/video/benchmrk-gyms-nl';

/**
 * Public page for gym owners and personal trainers. The commission comes from app_settings (ambassador_commission_pct)
 * and the price from price_year_cents, so changes in Admin → Settings show up here without a deploy.
 */
export default function Gym() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const settings = useAppSettings();
  const year = (Number(settings.data?.price_year_cents) || 3000) / 100;
  const pctRaw = Number(settings.data?.ambassador_commission_pct);
  const pct = Number.isFinite(pctRaw) && pctRaw > 0 ? pctRaw : 20;
  const g = (k: GKey) =>
    (G[lang]?.[k] ?? en[k])
      .replace('{price}', fmtEur(year, lang))
      .replace('{pct}', String(pct));
  // the dutch voice-over is only played automatically for dutch visitors
  const hasVideo = lang === 'nl';
  const [play, setPlay] = useState(false);
  const mailto = `mailto:${MAIL}?subject=${encodeURIComponent(g('mail.subject'))}`;

  useEffect(() => {
    const title = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const desc = meta?.getAttribute('content') ?? null;
    document.title = g('title');
    meta?.setAttribute('content', g('desc'));
    return () => {
      document.title = title;
      if (desc !== null) meta?.setAttribute('content', desc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  // links such as /gym#demo: the page renders after the hash jump, so scroll once it exists
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);

  const steps = [1, 2, 3].map((n) => ({ h: g(`st${n}.h` as GKey), d: g(`st${n}.d` as GKey) }));
  const rows = [1, 2, 3].map((n) => [g(`split.l${n}` as GKey), g(`split.r${n}` as GKey)]);
  const feats = [1, 2, 3, 4].map((n) => ({ h: g(`f${n}.h` as GKey), d: g(`f${n}.d` as GKey) }));
  const faq = [1, 2, 3, 4, 5].map((n) => ({ q: g(`q${n}` as GKey), a: g(`a${n}` as GKey) }));
  const th = 'border-b-[1.5px] border-ink px-5 py-[18px] text-left text-xs font-medium uppercase tracking-[0.06em] text-muted';
  const td = 'border-b border-[#e4e2dc] px-5 py-4 align-top';

  const video = (autoPlay: boolean) => (
    <video
      className="block aspect-video w-full border border-line bg-ink shadow-[0_24px_60px_rgba(20,20,19,0.14)]"
      controls
      preload="none"
      playsInline
      autoPlay={autoPlay}
      poster={`${VIDEO}-poster.jpg`}
      aria-label={g('demo.label')}
    >
      <source src={`${VIDEO}.mp4`} type="video/mp4" />
      <track kind="subtitles" src={`${VIDEO}.vtt`} srcLang="nl" label="Nederlands" default />
    </video>
  );

  return (
    <div className="min-h-screen bg-ground text-ink">
      <SiteHeader
        items={[
          { label: g('nav.athletes'), to: '/' },
          { label: g('nav.demo'), href: '#demo' },
          { label: g('nav.science'), to: '/science' },
          { label: g('nav.gyms'), to: '/gym', current: true },
        ]}
      />

      <main>
        {/* hero */}
        <section className="bm-wrap pb-16 pt-9 sm:pb-20 sm:pt-12">
          <p className="bm-kicker mb-[18px] sm:mb-7">{g('hero.kicker')}</p>
          <h1 className="bm-display max-w-[16ch] text-[clamp(44px,6vw,88px)] !leading-[0.94] [overflow-wrap:anywhere] [text-wrap:balance]">{nb(g('hero.h1'))}</h1>
          <p className="mt-6 max-w-[620px] text-[17px] text-ink-2 sm:mt-8 sm:text-[19px]">{g('hero.sub')}</p>
          <div className="mt-7 flex flex-wrap items-center gap-5 sm:mt-10">
            <a href={mailto} className="bm-btn-accent w-full sm:w-auto">
              {g('hero.cta')}
            </a>
            <a href="#demo" className="inline-flex min-h-[44px] items-center text-base text-ink underline underline-offset-[5px]">
              {g('hero.demo')}
            </a>
          </div>
          <p className="mt-7 max-w-[760px] text-sm text-muted">{g('hero.note')}</p>
        </section>

        {/* demo video */}
        <section id="demo" className="bm-wrap scroll-mt-4 pb-6 pt-6" aria-labelledby="demo-title">
          <div className="border-t-[1.5px] border-ink pt-12">
            <p className="bm-kicker mb-4">{g('demo.kicker')}</p>
            <h2 id="demo-title" className="bm-h2 max-w-[18ch]">
              {nb(g('demo.title'))}
            </h2>
            <div className="mt-8">
              {hasVideo || play ? (
                video(!hasVideo)
              ) : (
                <div className="relative">
                  <img src={`${VIDEO}-poster.jpg`} alt="" width={1600} height={900} loading="lazy" className="block aspect-video w-full border border-line bg-ink object-cover shadow-[0_24px_60px_rgba(20,20,19,0.14)]" />
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button type="button" className="bm-btn-accent" onClick={() => setPlay(true)}>
                      {g('demo.play')}
                    </button>
                    <p className="text-[15px] text-ink-2">{g('demo.caption')}</p>
                  </div>
                </div>
              )}
            </div>
            {hasVideo && (
              <details className="mt-4 max-w-[760px] text-[15px] text-ink-2">
                <summary className="min-h-[44px] cursor-pointer py-2 text-ink underline underline-offset-[5px]">{g('demo.transcript')}</summary>
                <p className="mt-1">{g('demo.text')}</p>
              </details>
            )}
          </div>
        </section>

        {/* three steps */}
        <section className="bm-wrap flex flex-wrap gap-12 pb-10 pt-16 sm:pt-[100px]" aria-labelledby="how-title">
          <h2 id="how-title" className="bm-h2 flex-[1_1_300px]">
            {nb(g('how.title'))}
          </h2>
          <ol className="m-0 flex flex-[2_1_520px] list-none flex-col p-0">
            {steps.map((s, i) => (
              <li key={s.h} className={clsx('flex gap-5 border-t border-line py-[22px] sm:gap-7', i === steps.length - 1 && 'border-b')}>
                <span className="min-w-[64px] font-mono text-muted">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-[20px] font-bold">{nb(s.h)}</h3>
                  <p className="mt-1.5 text-ink-2">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* what the gym decides, what stays per member */}
        <section className="bm-wrap pb-10 pt-16 sm:pt-[100px]" aria-labelledby="split-title">
          <h2 id="split-title" className="bm-h2 max-w-[18ch]">
            {nb(g('split.title'))}
          </h2>
          <div className="mt-9 overflow-x-auto rounded-paper border border-line bg-surface shadow-paper" tabIndex={0} role="region" aria-label={g('split.title')}>
            <table className="w-full min-w-[560px] border-collapse text-[15px]">
              <thead>
                <tr>
                  <th scope="col" className="w-1/2 border-2 border-b-[1.5px] border-ink bg-accent px-5 py-3.5 text-left text-sm font-extrabold uppercase tracking-[0.02em] text-ink">
                    {g('split.l')}
                  </th>
                  <th scope="col" className={th}>
                    {g('split.r')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([a, b]) => (
                  <tr key={a}>
                    <td className={clsx(td, 'border-x-2 border-x-ink bg-[#f6fadf] font-semibold')}>{a}</td>
                    <td className={td}>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-[60ch] text-ink-2">{g('split.note')}</p>
        </section>

        {/* four features */}
        <section className="bm-wrap pb-10 pt-16 sm:pt-[100px]" aria-labelledby="feat-title">
          <h2 id="feat-title" className="bm-h2 max-w-[18ch]">
            {nb(g('feat.title'))}
          </h2>
          <div className="mt-8 grid gap-x-10 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {feats.map((f, i) => (
              <div key={f.h} className="border-t-[1.5px] border-ink pb-8 pt-5">
                <div className="font-mono text-[13px] text-muted">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="my-2.5 text-[20px] font-bold leading-tight sm:text-[22px]">{nb(f.h)}</h3>
                <p className="text-ink-2">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* personal trainers */}
        <section className="bm-wrap pb-10 pt-6 sm:pt-12" aria-labelledby="pt-title">
          <div className="bg-ink px-6 py-12 text-ground sm:px-12 sm:py-16">
            <h2 id="pt-title" className="bm-h2 max-w-[20ch] !text-ground">
              {nb(g('pt.title'))}
            </h2>
            <p className="mt-6 max-w-[62ch] text-[17px] text-[#e4e2dc]">{g('pt.text')}</p>
            <Link to={user ? '/invite' : '/auth?mode=signup'} className="bm-btn-accent mt-8 w-full sm:w-auto">
              {g('pt.cta')}
            </Link>
          </div>
        </section>

        {/* science */}
        <section className="bm-wrap pb-6 pt-6">
          <Link to="/science" className="inline-flex min-h-[44px] items-center gap-1.5 text-ink underline underline-offset-[5px]">
            {g('sci.line')}
            <span aria-hidden>→</span>
          </Link>
        </section>

        {/* faq */}
        <section className="bm-wrap pb-10 pt-16 sm:pt-[100px]" aria-labelledby="faq-title">
          <h2 id="faq-title" className="bm-h2">
            {nb(g('faq.title'))}
          </h2>
          <div className="mt-8 max-w-[820px] border-b border-line">
            {faq.map((f) => (
              <details key={f.q} className="group border-t border-line">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-6 py-4 text-[18px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="font-mono text-xl text-muted group-open:hidden">
                    +
                  </span>
                  <span aria-hidden className="hidden font-mono text-xl text-muted group-open:inline">
                    −
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-5 text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* closer */}
        <section className="bm-wrap pb-16 pt-10 sm:pb-[120px] sm:pt-[60px]" aria-labelledby="end-title">
          <div className="border-t-[1.5px] border-ink pt-12">
            <h2 id="end-title" className="bm-h2 max-w-[18ch]">
              {nb(g('end.title'))}
            </h2>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href={mailto} className="bm-btn-accent w-full sm:w-auto">
                {g('end.cta')}
              </a>
              <p className="text-ink-2">
                {g('end.mail')}{' '}
                <a href={mailto} className="text-ink underline underline-offset-[5px]">
                  {MAIL}
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter guides={g('foot.guides')} notAffiliated={g('foot.hyrox')} />
    </div>
  );
}
