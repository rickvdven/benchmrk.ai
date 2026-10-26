// Texts and helpers for the competition and sharing features (cards, nickname, privacy).
// The key tables come from docs/competitie/COPY.md (see scripts/competition-locale.mjs). Shared by the app and the card renderer in server/.
import nl from '../locales/competition.nl.json';
import en from '../locales/competition.en.json';
import de from '../locales/competition.de.json';
import es from '../locales/competition.es.json';
import ko from '../locales/competition.ko.json';

const D: Record<string, Record<string, string>> = { nl, en, de, es, ko };

/** Text for a key in a language, with {placeholders} filled. Falls back to English, then to the key itself. */
export function ct(lang: string, key: string, p: Record<string, string | number> = {}): string {
  const s = D[lang]?.[key] ?? D.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (p[k] === undefined ? m : String(p[k])));
}
