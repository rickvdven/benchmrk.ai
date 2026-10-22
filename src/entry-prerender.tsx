// Build-time render of the home page (Dutch), see scripts/prerender-home.mjs. Not part of the browser bundle.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from './lib/i18n';
import Landing from './pages/Landing';

export function render(): string {
  const qc = new QueryClient();
  return renderToString(
    <QueryClientProvider client={qc}>
      <I18nProvider initial="nl">
        <StaticRouter location="/">
          <Landing />
        </StaticRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}
