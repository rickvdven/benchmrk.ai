// Bouwt de statische content-pagina's na `vite build`: dist/<taal>/…/index.html, sitemap.xml en robots.txt.
// `node scripts/build-content.mjs --check` controleert alleen (geen dist nodig).
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { FONT_FILES, LOCALES, loadContent, overviewAlternates, overviewUrl, renderOverview, renderPage, robots, sitemap, validate } from './content.mjs';

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
for (const p of pages) write(`${p.url.slice(1)}/index.html`, renderPage(p));
for (const lang of Object.keys(overviewAlternates(pages))) write(`${overviewUrl(lang).slice(1)}/index.html`, renderOverview(lang, pages));
write('sitemap.xml', sitemap(pages));
write('robots.txt', robots());
const require = createRequire(import.meta.url);
mkdirSync(join(dist, 'content-assets'), { recursive: true });
for (const [from, to] of FONT_FILES) copyFileSync(require.resolve(from), join(dist, 'content-assets', to));
console.log(`content: ${pages.length} pagina's, sitemap.xml en robots.txt geschreven naar dist/`);
