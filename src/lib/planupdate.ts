// Texts for plan updates (the notice, the before/after page, plan history, admin and the source details on /science).
import nl from '../locales/planupdate.nl.json';
import en from '../locales/planupdate.en.json';
import de from '../locales/planupdate.de.json';
import es from '../locales/planupdate.es.json';
import ko from '../locales/planupdate.ko.json';

const D: Record<string, Record<string, string>> = { nl, en, de, es, ko };

/** Text for a key in a language, with {placeholders} filled. Falls back to English, then to the key itself. */
export function pt(lang: string, key: string, p: Record<string, string | number> = {}): string {
  const s = D[lang]?.[key] ?? D.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (p[k] === undefined ? m : String(p[k])));
}
