// Builds src/locales/competition.<taal>.json from the key tables in docs/competitie/COPY.md.
// COPY.md is leading: change the text there, then run `node scripts/competition-locale.mjs`.
// NL and EN come from COPY.md. DE, ES and KO follow later: until then they carry the English text, so no key is missing.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Prefixes in use. Later phases add theirs (lb., ch., wall., ...).
export const PREFIXES = ['nav.', 'st.privacy', 'div.', 'card.', 'share.', 'kpage.', 'priv.', 'consent.', 'og.', 'wa.', 'cap.', 'invite.'];

export function parseCopy(md) {
  const out = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const key = m[1];
    if (/[{}]/.test(key)) continue;
    const cells = m[2].split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
    if (cells.length < 2) continue;
    out[key] = { nl: cells[0], en: cells[1] };
  }
  return out;
}

export function build(prefixes = PREFIXES) {
  const rows = parseCopy(readFileSync(join(root, 'docs/competitie/COPY.md'), 'utf8'));
  const keys = Object.keys(rows).filter((k) => prefixes.some((p) => k.startsWith(p)));
  const pick = (lang) => Object.fromEntries(keys.sort().map((k) => [k, rows[k][lang === 'nl' ? 'nl' : 'en']]));
  return { keys, files: { nl: pick('nl'), en: pick('en'), de: pick('en'), es: pick('en'), ko: pick('en') } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { keys, files } = build();
  for (const [lang, d] of Object.entries(files)) writeFileSync(join(root, `src/locales/competition.${lang}.json`), JSON.stringify(d, null, 2) + '\n');
  console.log(`competition locales: ${keys.length} keys x 5 languages`);
}
