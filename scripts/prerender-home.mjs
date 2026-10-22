// Prerenders the home page after `vite build`, so crawlers and AI answer engines get the full page as HTML.
// - dist/app.html  = the untouched SPA shell; vercel.json sends every app route there
// - dist/index.html = the same shell plus the Dutch landing page in #prerender, served for "/" only
// The browser does not hydrate (the language is picked client-side): #prerender stays visible until
// React's own landing page has mounted (src/lib/prerender.ts), and is hidden at once for signed-in
// visitors and for visitors whose language will not be Dutch, so they never see a flash of the wrong page.
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'node_modules', '.prerender');

const SITE = 'https://benchmrk.ai/';
const TITLE = 'Benchmrk · AI-trainingscoach voor HYROX';
const DESC =
  'Een trainingsplan voor HYROX op je eigen drempel, voor je race of je hele seizoen. Met een eindtijdvoorspelling per run, station en Roxzone.';

// same order as initialLang() in src/lib/i18n.tsx: ?lang= > own choice > IP country > browser
const GATE = `(function(){try{var d=document.documentElement,l=window.localStorage,m=location.search.match(/[?&]lang=([a-z]{2})/i),c=(m&&m[1].toLowerCase())||l.getItem('rox:lang'),g=l.getItem('rox:geo'),n=(navigator.language||'').slice(0,2).toLowerCase(),auth=false;for(var i=0;i<l.length;i++){if(/^sb-.*-auth-token$/.test(l.key(i)||'')){auth=true;break}}var nl=c?c==='nl':g?['NL','BE','SR','AW','CW','SX','BQ'].indexOf(g)>=0:n==='nl';if(auth||!nl)d.className+=' no-pr'}catch(e){}})();`;
const STYLE = '#prerender~#root{display:none}.no-pr #prerender{display:none}.no-pr #prerender~#root{display:block}';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const shell = readFileSync(join(dist, 'index.html'), 'utf8');
if (!shell.includes('<div id="root"></div>')) throw new Error('prerender: <div id="root"></div> not found in dist/index.html');
copyFileSync(join(dist, 'index.html'), join(dist, 'app.html'));

await build({
  root,
  logLevel: 'warn',
  build: { ssr: 'src/entry-prerender.tsx', outDir: out, emptyOutDir: true, copyPublicDir: false },
});
const { render } = await import(pathToFileURL(join(out, 'entry-prerender.js')).href);
const body = render();
rmSync(out, { recursive: true, force: true });
if (!body.includes('<h1')) throw new Error('prerender: the rendered home page has no <h1>');

const head = [
  `<meta property="og:type" content="website" />`,
  `<meta property="og:url" content="${SITE}" />`,
  `<meta property="og:title" content="${esc(TITLE)}" />`,
  `<meta property="og:description" content="${esc(DESC)}" />`,
  `<meta property="og:locale" content="nl_NL" />`,
  `<meta name="twitter:card" content="summary" />`,
  `<style>${STYLE}</style>`,
  `<script>${GATE}</script>`,
].join('\n    ');

const html = shell
  .replace(/<html lang="[^"]*">/, '<html lang="nl">')
  .replace(/<title>[^<]*<\/title>/, `<title>${esc(TITLE)}</title>`)
  .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(DESC)}" />`)
  .replace('</head>', `    ${head}\n  </head>`)
  .replace('<div id="root"></div>', `<div id="prerender">${body}</div><div id="root"></div>`);
writeFileSync(join(dist, 'index.html'), html);
console.log(`prerender: home page ${Math.round(body.length / 1024)} kB HTML in dist/index.html, SPA shell in dist/app.html`);
