import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { build, parseCopy } from '../../scripts/competition-locale.mjs';
import { ct } from './competition';

const load = (l: string) => JSON.parse(readFileSync(new URL(`../locales/competition.${l}.json`, import.meta.url), 'utf8')) as Record<string, string>;
const files = { nl: load('nl'), en: load('en'), de: load('de'), es: load('es'), ko: load('ko') };
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('competition texts', () => {
  it('has the same keys in all five languages', () => {
    const keys = Object.keys(files.en).sort();
    for (const l of ['nl', 'de', 'es', 'ko'] as const) expect(Object.keys(files[l]).sort()).toEqual(keys);
  });
  it('uses the same placeholders in every language for every key', () => {
    for (const l of ['nl', 'de', 'es', 'ko'] as const) for (const k of Object.keys(files.en)) expect(placeholders(files[l][k]), `${l} ${k}`).toEqual(placeholders(files.en[k]));
  });
  it('has real DE, ES and KO translations, not the English text', () => {
    for (const l of ['de', 'es', 'ko'] as const) {
      const same = Object.keys(files.en).filter((k) => files[l][k] === files.en[k] && /[a-z]{4}/i.test(files.en[k]));
      // a few texts are the same word in another language (brand, division names, "Story", "Roxzone"); more than that means a missing translation
      expect(same.length, `${l}: ${same.join(', ')}`).toBeLessThan(60);
    }
  });
  it('has no empty text', () => {
    for (const l of Object.values(files)) for (const [k, v] of Object.entries(l)) expect(v.trim().length, k).toBeGreaterThan(0);
  });
  it('matches COPY.md: the generated files are up to date', () => {
    const { files: fresh } = build();
    for (const l of ['nl', 'en', 'de', 'es', 'ko'] as const) expect(files[l]).toEqual(fresh[l]);
  });
  it('keeps the texts the privacy rules depend on', () => {
    for (const l of ['nl', 'en']) {
      expect(files[l as 'nl']['priv.private.badge']).toBeTruthy();
      expect(files[l as 'nl']['consent.check']).toBeTruthy();
    }
  });
  it('never puts personal data on a card or in a share text', () => {
    for (const [k, v] of Object.entries(files.en)) if (/^(card|og|wa|cap)\./.test(k)) expect(v, k).not.toMatch(/\b(email|e-mail|heart rate|weight)\b/i);
  });
  it('fills placeholders and falls back to English, then to the key', () => {
    expect(ct('nl', 'card.pred.goal', { goal: '1:20:00' })).toBe('doel 1:20:00');
    expect(ct('de', 'card.pred.goal', { goal: '1:20:00' })).toBe(files.de['card.pred.goal'].replace('{goal}', '1:20:00'));
    expect(ct('xx', 'card.pred.goal', { goal: '1:20:00' })).toBe('goal 1:20:00');
    expect(ct('en', 'no.such.key')).toBe('no.such.key');
    expect(ct('en', 'card.pred.goal')).toBe('goal {goal}');
  });
  it('parses key tables from markdown', () => {
    expect(parseCopy('| `a.b` | Eén | One | S F L |\n| `c.{d}` | x | y |\n| not a row |')).toEqual({ 'a.b': { nl: 'Eén', en: 'One' } });
  });
});
