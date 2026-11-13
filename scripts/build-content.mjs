// Bouwt de statische content-pagina's na `vite build`: dist/<taal>/…/index.html, sitemap.xml en robots.txt.
// `node scripts/build-content.mjs --check` controleert alleen (geen dist nodig).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { FONT_FILES, LOCALES, homeLinks, loadContent, overviewAlternates, overviewUrl, renderOverview, renderPage, renderTopic, robots, sitemap, topicHubs, validate, weekTopic } from './content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const check = process.argv.includes('--check');

const pages = loadContent(root);
const { errors, warnings } = validate(pages);
for (const w of warnings) console.warn(`  waarschuwing  ${w}`);
for (const e of errors) console.error(`  fout          ${e}`);
if (errors.length) {
  console.error(`content: ${errors.length} fout(en), build gestopt`);
  process.exit(1);
}
console.log(`content: ${pages.length} pagina's in orde${warnings.length ? `, ${warnings.length} waarschuwing(en)` : ''}`);
if (check) process.exit(0);

if (!existsSync(join(dist, 'index.html'))) {
  console.error('content: dist/index.html ontbreekt, draai eerst vite build');
  process.exit(1);
}
const write = (rel, html) => {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};
for (const p of pages) write(`${p.url.slice(1)}/index.html`, renderPage(p, pages));
const featured = weekTopic(root);
for (const lang of Object.keys(overviewAlternates(pages))) write(`${overviewUrl(lang).slice(1)}/index.html`, renderOverview(lang, pages, { featured }));
const hubs = topicHubs(pages);
for (const h of hubs) write(`${h.url.slice(1)}/index.html`, renderTopic(h.lang, h.key, pages));
// homepage: gidslinks in de ruwe HTML binnen #root, zodat crawlers zonder JavaScript de gidsen vinden; React vervangt ze bij het laden
const home = join(dist, 'index.html');
const homeHtml = readFileSync(home, 'utf8');
const rootRe = /<div id="root">(?:<nav[\s\S]*?<\/nav>)?<\/div>/;
if (!rootRe.test(homeHtml)) {
  console.error('content: <div id="root"></div> niet gevonden in dist/index.html');
  process.exit(1);
}
writeFileSync(home, homeHtml.replace(rootRe, `<div id="root">${homeLinks(pages)}</div>`));
write('sitemap.xml', sitemap(pages));
write('robots.txt', robots());
const require = createRequire(import.meta.url);
mkdirSync(join(dist, 'content-assets'), { recursive: true });
for (const [from, to] of FONT_FILES) copyFileSync(require.resolve(from), join(dist, 'content-assets', to));
console.log(`content: ${pages.length} pagina's, ${hubs.length} onderwerppagina's, sitemap.xml en robots.txt geschreven naar dist/`);
