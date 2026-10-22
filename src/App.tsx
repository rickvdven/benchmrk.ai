import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAdminQuery, useAuth, useIsAdmin, useProfileRow, useSubscription } from './data/hooks';
import { membershipOk, PaywallScreen } from './components/Paywall';
import { isComplete } from './data/mapping';
import { configured } from './lib/supabase';
import { dropPrerender } from './lib/prerender';

/** After a new deploy old chunks 404: reload once instead of showing a broken page. */
function lazyRetry<T extends ComponentType<unknown>>(f: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const m = await f();
      sessionStorage.removeItem('rox:chunk-reload');
      return m;
    } catch (e) {
      if (!sessionStorage.getItem('rox:chunk-reload')) {
        sessionStorage.setItem('rox:chunk-reload', '1');
        window.location.reload();
      }
      throw e;
    }
  });
}

const Landing = lazyRetry(() => import('./pages/Landing'));
const AuthPage = lazyRetry(() => import('./pages/Auth'));
const Onboarding = lazyRetry(() => import('./pages/Onboarding'));
const Cockpit = lazyRetry(() => import('./pages/Cockpit'));
const Plan = lazyRetry(() => import('./pages/Plan'));
const Log = lazyRetry(() => import('./pages/Log'));
const Doubles = lazyRetry(() => import('./pages/Doubles'));
const Recovery = lazyRetry(() => import('./pages/Recovery'));
const SettingsPage = lazyRetry(() => import('./pages/Settings'));
const Admin = lazyRetry(() => import('./pages/admin/Admin'));
const Science = lazyRetry(() => import('./pages/Science'));
const InvitePage = lazyRetry(() => import('./pages/Invite'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

function RequireProfile({ children }: { children: ReactNode }) {
  const p = useProfileRow();
  if (p.isLoading) return <Spinner />;
  if (!isComplete(p.data)) return <Navigate to="/onboarding" replace />;
  return <RequireMembership>{children}</RequireMembership>;
}

function RequireMembership({ children }: { children: ReactNode }) {
  const sub = useSubscription();
  const admin = useIsAdmin();
  const loc = useLocation();
  if (sub.isLoading) return <Spinner />;
  if (admin || loc.pathname === '/settings' || membershipOk(sub.data)) return <>{children}</>;
  return <PaywallScreen />;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const admin = useAdminQuery();
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (admin.isLoading) return <Spinner />;
  return admin.data ? <>{children}</> : <Navigate to="/cockpit" replace />;
}

function Home() {
  const { user, ready } = useAuth();
  // a signed-in athlete goes to the cockpit: the prerendered landing page must not stay behind
  useEffect(() => {
    if (ready && user) dropPrerender();
  }, [ready, user]);
  if (!ready) return <Spinner />;
  return user ? <Navigate to="/cockpit" replace /> : <Landing />;
}

export default function App() {
  const loc = useLocation();
  useEffect(() => {
    if (loc.pathname !== '/' || !configured) dropPrerender();
  }, [loc.pathname]);
  if (!configured)
    return <div className="p-8 text-center text-muted">Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.</div>;
  const app = (el: ReactNode) => (
    <RequireAuth>
      <RequireProfile>{el}</RequireProfile>
    </RequireAuth>
  );
  return (
    <Layout>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/cockpit" element={app(<Cockpit />)} />
          <Route path="/plan" element={app(<Plan />)} />
          <Route path="/log" element={app(<Log />)} />
          <Route path="/doubles" element={app(<Doubles />)} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/science" element={<Science />} />
          <Route path="/settings" element={app(<SettingsPage />)} />
          <Route path="/invite" element={app(<InvitePage />)} />
          <Route path="/admin/*" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
