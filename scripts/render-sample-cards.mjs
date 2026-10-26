// Renders the three example cards in all formats to PNG files, for a visual check against docs/competitie/reference/kaarten.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
const bundle = join(root, 'node_modules/.cache/card-render/cardImage.mjs'); // inside the repo so the external resvg package resolves
if (!out) throw new Error('usage: node scripts/render-sample-cards.mjs <output dir>');
mkdirSync(out, { recursive: true });
await build({ entryPoints: [`${root}/server/_lib/cardImage.ts`], bundle: true, platform: 'node', format: 'esm', outfile: bundle, external: ['@resvg/resvg-js'], banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" }, logLevel: 'error', absWorkingDir: root });
const { renderCardPng } = await import(bundle);
const f = (n) => readFileSync(`${root}/server/fonts/${n}`);
const fonts = [
  { name: 'Archivo', data: f('archivo-400.ttf'), weight: 400, style: 'normal' }, { name: 'Archivo', data: f('archivo-700.ttf'), weight: 700, style: 'normal' },
  { name: 'Archivo', data: f('archivo-800.ttf'), weight: 800, style: 'normal' }, { name: 'Archivo Cond', data: f('archivo-800-cond.ttf'), weight: 800, style: 'normal' },
  { name: 'IBM Plex Mono', data: f('plex-mono-400.woff'), weight: 400, style: 'normal' }, { name: 'IBM Plex Mono', data: f('plex-mono-600.woff'), weight: 600, style: 'normal' },
];
const cards = {
  prediction: { type: 'prediction', code: '7QX2K9', example: true, data: { lang: 'nl', nickname: 'sledpusher', division: 'open_men', time: 4721, goal: 4800, chance: 96, runs: 2544, stations: 1852, roxzone: 325 } },
  benchmark_pr: { type: 'benchmark_pr', code: 'R4MW3B', example: true, data: { lang: 'nl', nickname: 'lunge_lotte', division: 'open_women', n: 2, week: 7, old: 872, new: 826, time: 5191, goal: 5280, chance_old: 74, chance_new: 83 } },
  progress: { type: 'progress', code: 'K9TD5H', example: true, data: { lang: 'nl', nickname: 'kmvreter', division: 'pro_men', week: 9, total: 16, start: 4925, time: 4733, goal: 4800, series: [4925, 4900, 4870, 4850, 4810, 4785, 4765, 4750, 4733] } },
};
mkdirSync(`${out}/png`, { recursive: true });
for (const [k, c] of Object.entries(cards)) for (const fmt of ['story', 'square', 'og']) {
  const t0 = Date.now();
  const png = await renderCardPng(c, fmt, fonts);
  writeFileSync(`${out}/png/${k}-${fmt}.png`, png);
  console.log(k, fmt, png.length, Date.now() - t0 + 'ms');
}
