// Texts for Admin → Social. NL and EN are written out; DE, ES and KO use the English text under the same keys.
import nl from '../locales/social.nl.json';
import en from '../locales/social.en.json';
import de from '../locales/social.de.json';
import es from '../locales/social.es.json';
import ko from '../locales/social.ko.json';

const D: Record<string, Record<string, string>> = { nl, en, de, es, ko };

export function st(lang: string, key: string, p: Record<string, string | number> = {}): string {
  const s = D[lang]?.[key] ?? D.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (p[k] === undefined ? m : String(p[k])));
}

export const SOCIAL_LANGS = Object.keys(D);
export const socialKeys = (lang: string) => Object.keys(D[lang] ?? {});
