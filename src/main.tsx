import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './data/hooks';
import { I18nProvider } from './lib/i18n';
import { flush } from './lib/queue';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './index.css';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } } });
void flush();
// remember an invite code from any link (?ref=CODE) until the visitor signs up — also for Google sign-in
try {
  const r = new URLSearchParams(window.location.search).get('ref');
  if (r) localStorage.setItem('rox:ref', r.trim().toUpperCase());
  const g = new URLSearchParams(window.location.search).get('gym');
  if (g) localStorage.setItem('rox:gym', g.trim().toUpperCase());
} catch {
  /* storage blocked */
}

// after a new deploy an open tab may ask for an old chunk: reload once instead of showing an error
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('rox:reloaded')) return;
    sessionStorage.setItem('rox:reloaded', '1');
  } catch {
    /* ignore */
  }
  e.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster theme="light" position="top-center" richColors />
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
