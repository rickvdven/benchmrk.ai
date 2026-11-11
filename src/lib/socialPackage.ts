// Helpers for Admin → Social: package import and readable errors.
import { unzipSync } from 'fflate';

/** "Instagram: [media] detail · Facebook: [token] detail" → readable lines, one per platform. */
export function errorText(t: (key: string) => string, raw: string): string[] {
  return raw
    .split(' · ')
    .map((part) => {
      const m = part.match(/^(?:(Instagram|Facebook): )?\[(\w+)\]/);
      if (!m) return part;
      return `${m[1] ? `${m[1]}: ` : ''}${t(`error.${m[2]}`)}`;
    })
    .filter(Boolean);
}

/** Reads a package zip: one folder per post with post.json and its files. Exported for the tests. */
export function readPackage(zip: Uint8Array): { source: string; json: Record<string, unknown>; files: Record<string, Uint8Array> }[] {
  const all = unzipSync(zip);
  const out: { source: string; json: Record<string, unknown>; files: Record<string, Uint8Array> }[] = [];
  for (const name of Object.keys(all)) {
    if (!/(^|\/)post\.json$/.test(name) || name.startsWith('__MACOSX/')) continue;
    const dir = name.slice(0, name.length - 'post.json'.length);
    const json = JSON.parse(new TextDecoder().decode(all[name])) as Record<string, unknown>;
    const files: Record<string, Uint8Array> = {};
    for (const f of Object.keys(all)) if (f.startsWith(dir) && f !== name && !f.endsWith('/') && !f.slice(dir.length).includes('/')) files[f.slice(dir.length)] = all[f];
    const folder = dir.replace(/\/$/, '').split('/').pop() ?? '';
    out.push({ source: String(json.source ?? folder ?? ''), json, files });
  }
  return out;
}

