// Texts and helpers for plan updates (before/after, plan history, /science changelog).
import nl from '../locales/planupdates.nl.json';
import en from '../locales/planupdates.en.json';
import de from '../locales/planupdates.de.json';
import es from '../locales/planupdates.es.json';
import ko from '../locales/planupdates.ko.json';
import type { DiffField, Localized, WeekDiff } from '../engine';

const D: Record<string, Record<string, string>> = { nl, en, de, es, ko };

/** Text for a key in a language, with {placeholders} filled. Falls back to English, then to the key itself. */
export function pt(lang: string, key: string, p: Record<string, string | number> = {}): string {
  const s = D[lang]?.[key] ?? D.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (p[k] === undefined ? m : String(p[k])));
}

/** A localized database value ({nl, en, …}) in the reader's language, else English, else Dutch. */
export const loc = (v: Partial<Localized> | null | undefined, lang: string) => (v ? ((v as Record<string, string>)[lang] ?? v.en ?? v.nl ?? '') : '');

/** "12 nov" style date in the reader's language. */
export function fmtDay(lang: string, iso: string, withYear = false) {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}

export const fieldList = (lang: string, fields: DiffField[]) => fields.filter((f) => f !== 'title' || fields.length === 1).map((f) => pt(lang, `field.${f}`)).join(', ');

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/** One line per week, e.g. "−4 km, +1 threshold block". */
export function weekSummary(lang: string, w: WeekDiff): string {
  if (!w.changed) return pt(lang, 'week.same');
  const parts: string[] = [];
  const dkm = Math.round(w.kmAfter - w.kmBefore);
  if (dkm) parts.push(pt(lang, 'week.km', { n: signed(dkm) }));
  for (const [type, n] of Object.entries(w.typeDelta)) if (n) parts.push(`${signed(n)} ${pt(lang, `type.${type}.${Math.abs(n) === 1 ? 'one' : 'other'}`)}`);
  if (!parts.length && w.loadBefore) {
    const pct = Math.round(((w.loadAfter - w.loadBefore) / w.loadBefore) * 100);
    if (pct) parts.push(pt(lang, 'week.load', { n: signed(pct) }));
  }
  return parts.length ? parts.join(', ') : pt(lang, 'day.changed', { fields: '' }).replace(/[:：]\s*$/, '');
}

/** Rule key → "Taper · volumeRaceWeek". */
export function ruleLabel(lang: string, key: string) {
  const [group, ...rest] = key.split('.');
  return `${pt(lang, `group.${group}`)} · ${rest.join('.')}`;
}

/** Rule value for display: fractions stay as they are, objects as compact JSON. */
export function fmtRuleValue(lang: string, v: unknown): string {
  if (typeof v === 'number') return v.toLocaleString(lang === 'ko' ? 'ko-KR' : lang, { maximumFractionDigits: 3 });
  if (Array.isArray(v) && v.every((x) => typeof x !== 'object')) return v.join(', ');
  return JSON.stringify(v);
}
