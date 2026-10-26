import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pt } from './planupdate';

const load = (l: string) => JSON.parse(readFileSync(new URL(`../locales/planupdate.${l}.json`, import.meta.url), 'utf8')) as Record<string, string>;
const files = { en: load('en'), nl: load('nl'), de: load('de'), es: load('es'), ko: load('ko') };
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(tsx?|ts)$/.test(f) && !/\.test\./.test(f) ? [readFileSync(p, 'utf8')] : [];
  });
}

describe('plan update texts', () => {
  it('has the same keys and placeholders in all five languages, none empty', () => {
    for (const l of ['nl', 'de', 'es', 'ko'] as const) {
      expect(Object.keys(files[l]), l).toEqual(Object.keys(files.en));
      for (const [k, v] of Object.entries(files[l])) {
        expect(v.trim().length, `${l} ${k}`).toBeGreaterThan(0);
        expect(placeholders(v), `${l} ${k}`).toEqual(placeholders(files.en[k]));
      }
    }
  });
  it('has every key the code uses', () => {
    const src = sources(join(process.cwd(), 'src')).join('\n');
    const used = new Set([...src.matchAll(/'(pu\.[A-Za-z0-9.]+)'/g)].map((m) => m[1]));
    for (const k of used) expect(files.en[k], k).toBeTruthy();
    // keys built from a type or group name
    for (const t of ['threshold', 'intervals', 'easy', 'long', 'sim', 'strength', 'wod', 'recovery', 'rest', 'race']) expect(files.en[`pu.type.${t}`], t).toBeTruthy();
    for (const g of ['zones', 'threshold', 'volume', 'longRun', 'sim', 'taper', 'forecast', 'other']) expect(files.en[`pu.group.${g}`], g).toBeTruthy();
    for (const r of ['start', 'update', 'rollback']) expect(files.en[`pu.reason.${r}`], r).toBeTruthy();
    for (const d of ['openMen', 'openWomen', 'proMen']) expect(files.en[`pu.admin.demo.${d}`], d).toBeTruthy();
  });
  it('fills placeholders and falls back to English', () => {
    expect(pt('nl', 'pu.banner.title', { date: '12 nov' })).toBe('Nieuw: planupdate 12 nov');
    expect(pt('xx', 'pu.hist.version', { n: 3 })).toBe('Version 3');
  });
});
