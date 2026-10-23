import type { Lang } from './i18n';

/** A euro amount as each language writes it: €30 and €2,50 (nl), but 30 € and 2,50 € (de, es). */
export function fmtEur(n: number, lang: Lang) {
  const num = n.toLocaleString(lang === 'ko' ? 'en' : lang, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  return lang === 'de' || lang === 'es' ? `${num}\u00a0€` : `€${num}`;
}
