// Bundles server/*.ts into self-contained api/*.mjs functions (no relative imports at runtime).
import { build } from 'esbuild';
import { readdirSync, rmSync, mkdirSync } from 'node:fs';
rmSync('api', { recursive: true, force: true });
mkdirSync('api/cron', { recursive: true });
const entries = [
  ...readdirSync('server').filter((f) => f.endsWith('.ts')).map((f) => `server/${f}`),
  ...readdirSync('server/cron').filter((f) => f.endsWith('.ts')).map((f) => `server/cron/${f}`),
];
await build({
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'api',
  outbase: 'server',
  outExtension: { '.js': '.mjs' },
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
  external: ['@vercel/node'],
  logLevel: 'warning',
});
console.log('api bundled:', entries.join(', '));
