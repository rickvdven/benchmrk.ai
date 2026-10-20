import { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAppSettings, useAuth } from '../data/hooks';
import { useI18n } from '../lib/i18n';
import { Field } from '../components/ui';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function AuthPage() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const [params] = useSearchParams();
  const loc = useLocation();
  const [gymName, setGymName] = useState<string | null>(null);
  useEffect(() => {
    let code: string | null = null;
    try {
      code = params.get('gym') ?? localStorage.getItem('rox:gym');
    } catch {
      code = params.get('gym');
    }
    if (code) void supabase.rpc('gym_preview', { _code: code }).then(({ data }) => data && setGymName((data as { name: string }).name));
  }, [params]);
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [ref, setRef] = useState(() => {
    try {
      return params.get('ref') ?? localStorage.getItem('rox:ref') ?? '';
    } catch {
      return params.get('ref') ?? '';
    }
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const settings = useAppSettings();
  const google = settings.data?.google_login === true;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === 'PASSWORD_RECOVERY') setMode('reset');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (ready && user && mode !== 'reset') return <Navigate to={(loc.state as { from?: string })?.from ?? '/cockpit'} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin + '/onboarding' } });
        if (error) throw error;
        if (ref.trim() && data.session) {
          await supabase.rpc('apply_referral', { _code: ref.trim() });
          try {
            localStorage.removeItem('rox:ref');
          } catch {
            /* ignore */
          }
        }
        if (!data.session) setMsg(t('auth.confirmSent'));
      } else if (mode === 'forgot') {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth?mode=reset' });
        setMsg(t('auth.resetSent'));
      } else {
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) throw error;
        toast.success(t('common.saved'));
        setMode('signin');
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'signup' ? t('auth.signup') : mode === 'reset' ? t('auth.setPassword') : mode === 'forgot' ? t('auth.forgot') : t('auth.signin');
  return (
    <div className="mx-auto mt-6 max-w-sm">
      <form onSubmit={submit} className="panel space-y-4 p-6">
        {gymName && <p className="rounded-lg border border-volt/40 bg-volt/10 p-2.5 text-sm">{gymName}</p>}
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {mode !== 'reset' && (
          <Field label={t('auth.email')}>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        )}
        {mode !== 'forgot' && (
          <Field label={mode === 'reset' ? t('auth.newPassword') : t('auth.password')} help={mode !== 'signin' ? t('auth.pwHint') : undefined}>
            <input className="input" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
        )}
        {mode === 'signup' && (
          <Field label={t('auth.ref')}>
            <input className="input uppercase" value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
        )}
        {msg && <p className="text-sm text-warn">{msg}</p>}
        {google && (mode === 'signin' || mode === 'signup') && (
          <>
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/cockpit' } })}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/></svg>
              {t('auth.google')}
            </button>
            <p className="text-center text-xs text-muted">{t('auth.or')}</p>
          </>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {title}
        </button>
        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
          {mode === 'signin' ? (
            <>
              <button type="button" className="hover:text-fg" onClick={() => setMode('signup')}>
                {t('auth.noAccount')} <span className="text-volt">{t('auth.signup')}</span>
              </button>
              <button type="button" className="hover:text-fg" onClick={() => setMode('forgot')}>
                {t('auth.forgot')}
              </button>
            </>
          ) : (
            <button type="button" className="hover:text-fg" onClick={() => setMode('signin')}>
              {t('auth.haveAccount')} <span className="text-volt">{t('auth.signin')}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
