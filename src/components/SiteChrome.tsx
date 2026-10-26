import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { DISCLAIMER } from './Disclaimer';
import { LangSwitch, Wordmark } from './Layout';
import { useI18n } from '../lib/i18n';

export type NavItem = { label: string; to?: string; href?: string; current?: boolean };

/** Header of the public pages (home, /gym): wordmark, links, language switch and sign-in. */
export function SiteHeader({ items }: { items: NavItem[] }) {
  const { t } = useI18n();
  return (
    <header className="border-b border-line">
      <nav className="bm-wrap flex items-center gap-7 py-2.5 sm:py-[18px]" aria-label="Benchmrk">
        <Link to="/" className="text-[20px] no-underline sm:text-[22px]">
          <Wordmark />
        </Link>
        <div className="hidden flex-grow flex-wrap gap-6 md:flex">
          {items.map((it) => {
            const cls = clsx('text-[15px] hover:text-ink', it.current ? 'font-semibold text-ink' : 'text-ink-3');
            return it.to ? (
              <Link key={it.label} to={it.to} className={cls} aria-current={it.current ? 'page' : undefined}>
                {it.label}
              </Link>
            ) : (
              <a key={it.label} href={it.href} className={cls}>
                {it.label}
              </a>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <LangSwitch className="min-h-[44px] text-[15px]" />
          <Link to="/auth" className="bm-btn-outline">
            {t('nav.signin')}
          </Link>
        </div>
      </nav>
    </header>
  );
}

/** Footer of the public pages: disclaimer, "not affiliated with HYROX", guides and sources. */
export function SiteFooter({ guides, notAffiliated }: { guides?: string; notAffiliated: string }) {
  const { lang } = useI18n();
  const disclaimer = DISCLAIMER[lang] ?? DISCLAIMER.en;
  return (
    <footer className="border-t border-line">
      <div className="bm-wrap flex flex-wrap justify-between gap-6 pb-12 pt-8 text-[13px] text-muted">
        <div className="max-w-3xl space-y-2">
          <p>{disclaimer.short}</p>
          <p>{notAffiliated}</p>
        </div>
        <div className="flex gap-5">
          {guides && (
            <a href="/nl/gids" className="text-ink-3 underline">
              {guides}
            </a>
          )}
          <Link to="/science" className="text-ink-3 underline">
            {disclaimer.sources}
          </Link>
        </div>
      </div>
    </footer>
  );
}
