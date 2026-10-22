import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { DisclaimerFooter } from './Disclaimer';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Activity, Building2, CalendarDays, Gauge, HeartPulse, Gift, LogOut, NotebookPen, Settings, Shield, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, useIsAdmin, useIsGymAccount, useProfileRow, useRealtime } from '../data/hooks';
import { LANGS, useI18n, type Lang } from '../lib/i18n';
import { onQueueChange, pendingCount } from '../lib/queue';

const NAV = [
  { to: '/cockpit', key: 'nav.cockpit', icon: Gauge },
  { to: '/plan', key: 'nav.plan', icon: CalendarDays },
  { to: '/log', key: 'nav.log', icon: NotebookPen },
  { to: '/doubles', key: 'nav.doubles', icon: Users },
  { to: '/recovery', key: 'nav.recovery', icon: HeartPulse },
  { to: '/invite', key: 'nav.invite', icon: Gift },
] as const;

/** Wordmark: BENCH + MRK on a lime block (lime only as a surface, never as text). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('font-extrabold uppercase tracking-[0.02em] text-ink [font-stretch:80%]', className)}>
      BENCH<span className="ml-px bg-accent px-[3px]">MRK</span>
    </span>
  );
}

export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => {
        const next = e.target.value as Lang;
        setLang(next);
        if (user) supabase.from('profiles').update({ lang: next }).eq('id', user.id).then(() => undefined);
      }}
      className={clsx('rounded border-0 bg-transparent px-1 font-semibold uppercase text-ink-3 hover:bg-panel2 hover:text-fg', className ?? 'h-8 text-xs')}
    >
      {LANGS.map((l) => (
        <option key={l.value} value={l.value} className="bg-panel text-fg">
          {l.value.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, setLang, setUnits } = useI18n();
  const admin = useIsAdmin();
  const gymAccount = useIsGymAccount().isGym;
  const prof = useProfileRow();
  useEffect(() => {
    // the profile's language and units follow the athlete across devices
    if (prof.data?.lang) setLang(prof.data.lang);
    if (prof.data?.units) setUnits(prof.data.units);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prof.data?.lang, prof.data?.units]);
  const nav = useNavigate();
  const [pending, setPending] = useState(pendingCount());
  useRealtime();
  useEffect(() => onQueueChange(setPending) as unknown as () => void, []);
  const qc = useQueryClient();
  const loc = useLocation();
  // apply a remembered invite / gym code once the visitor is signed in (password or Google)
  useEffect(() => {
    if (!user) return;
    let code: string | null = null;
    try {
      code = localStorage.getItem('rox:ref');
    } catch {
      return;
    }
    let gymCode: string | null = null;
    try {
      gymCode = localStorage.getItem('rox:gym');
    } catch {
      /* ignore */
    }
    if (gymCode) {
      const tryJoin = (attempt: number) =>
        void supabase.rpc('join_gym', { _code: gymCode }).then(({ data, error }) => {
          if (error) {
            // session may not be attached yet right after sign-up → retry a few times, keep the code until it works
            if (attempt < 4) setTimeout(() => tryJoin(attempt + 1), 1000 * (attempt + 1));
            return;
          }
          try {
            localStorage.removeItem('rox:gym');
          } catch {
            /* ignore */
          }
          if (data) {
            toast.success(`✓ ${(data as { name: string }).name}`);
            void qc.invalidateQueries({ queryKey: ['gym'] });
            void qc.invalidateQueries({ queryKey: ['profile'] });
          }
        });
      setTimeout(() => tryJoin(0), 300);
    }
    if (!code) return;
    void supabase.rpc('apply_referral', { _code: code }).then(() => {
      try {
        localStorage.removeItem('rox:ref');
      } catch {
        /* ignore */
      }
    });
  }, [user]);

  // the public landing page brings its own header and footer (design A)
  if (!user && loc.pathname === '/') return <>{children}</>;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to={user ? '/cockpit' : '/'} className="text-xl">
            <Wordmark />
            <span className="ml-2 rounded-sm border border-line px-1.5 py-0.5 align-middle font-mono text-[10px] font-medium uppercase tracking-wider text-ink-3">{t('common.beta')}</span>
          </Link>
          <div className="flex items-center gap-1">
            {user && (
              <nav className="hidden gap-1 md:flex">
                {NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) => clsx('rounded-lg px-3 py-1.5 text-sm font-medium', isActive ? 'bg-panel2 text-volt' : 'text-muted hover:text-fg')}
                  >
                    {t(n.key)}
                  </NavLink>
                ))}
              </nav>
            )}
            {gymAccount && (
              <NavLink to="/my-gym" className={({ isActive }) => clsx('flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium', isActive ? 'bg-panel2 text-volt' : 'text-muted hover:text-fg')}>
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.myGym')}</span>
              </NavLink>
            )}
            {admin && (
              <NavLink to="/admin" className={({ isActive }) => clsx('flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium', isActive ? 'bg-panel2 text-volt' : 'text-volt/80 hover:text-volt')}>
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.admin')}</span>
              </NavLink>
            )}
            <LangSwitch />
            {user ? (
              <>
                <NavLink to="/settings" aria-label={t('nav.settings')} className={({ isActive }) => clsx('rounded-lg p-2', isActive ? 'text-volt' : 'text-muted hover:text-fg')}>
                  <Settings className="h-4 w-4" />
                </NavLink>
                <button
                  aria-label={t('nav.signout')}
                  className="rounded-lg p-2 text-muted hover:text-fg"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    nav('/');
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-ghost btn-sm border-[#8a877f]">
                {t('nav.signin')}
              </Link>
            )}
          </div>
        </div>
        {pending > 0 && (
          <div className="border-t border-warn/30 bg-warn/10 py-1 text-center text-xs text-warn">
            <Activity className="mr-1 inline h-3 w-3" />
            {t('common.offlineQueued', { n: pending })}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">{children}</main>
      <DisclaimerFooter />
      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-volt' : 'text-muted')}>
              <n.icon className="h-5 w-5" />
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
