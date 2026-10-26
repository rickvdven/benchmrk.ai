// Texts that go with a card: link-preview title and description (Open Graph), captions to copy and the WhatsApp text.
import { fmtHms } from '../engine/time';
import { divisionKey, fmtDelta, type CardData, type CardType } from './cards';
import { ct } from './competition';

const lang = (d: CardData) => d.lang ?? 'en';
const chance = (d: CardData) => d.chance ?? d.chance_new ?? '';

/** Title and description of the link preview (og.*): only what is printed on the card itself. */
export function ogFor(type: CardType, d: CardData): { title: string; desc: string } {
  const l = lang(d);
  const division = ct(l, divisionKey(d.division));
  const goal = d.goal ? fmtHms(d.goal) : '';
  if (type === 'prediction') {
    return {
      title: ct(l, 'og.pred.title', { name: d.nickname, time: fmtHms(d.time), division }),
      desc: ct(l, 'og.pred.desc', { goal, chance: d.chance ?? '' }),
    };
  }
  if (type === 'benchmark_pr') {
    return {
      title: ct(l, 'og.pr.title', { name: d.nickname, delta: fmtDelta((d.new ?? 0) - (d.old ?? 0)), n: d.n ?? '' }),
      desc: ct(l, 'og.pr.desc', { old: fmtMmss0(d.old), new: fmtMmss0(d.new), time: fmtHms(d.time) }),
    };
  }
  if (type === 'progress') {
    return {
      title: ct(l, 'og.prog.title', { name: d.nickname, delta: fmtDelta((d.time ?? 0) - (d.start ?? 0)), weeks: d.week ?? '' }),
      desc: ct(l, 'og.prog.desc', { start: fmtHms(d.start), time: fmtHms(d.time) }),
    };
  }
  if (type === 'challenge') {
    return { title: ct(l, 'og.ch.title', { name: d.nickname, result: d.result ?? '', week: d.week ?? '' }), desc: ct(l, 'og.ch.desc') };
  }
  return { title: ct(l, 'og.fallback.title'), desc: ct(l, 'og.fallback.desc') };
}
export const ogFallback = (l: string) => ({ title: ct(l, 'og.fallback.title'), desc: ct(l, 'og.fallback.desc') });

const fmtMmss0 = (s?: number) => (s === undefined ? '' : `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`);

/** Three example captions per card type (cap.*), with the numbers filled in. `weeksAgo` is the gap to the previous benchmark. */
export function captionsFor(type: CardType, d: CardData, extra: { race?: string; runs?: number; weeksAgo?: number } = {}): string[] {
  const l = lang(d);
  const goal = d.goal ? fmtHms(d.goal) : '';
  const race = d.race ?? extra.race ?? '';
  const keys: string[] = [];
  const p: Record<string, string | number> = {};
  if (type === 'prediction') {
    Object.assign(p, { race, time: fmtHms(d.time), runs: fmtHms(d.runs), stations: fmtHms(d.stations), roxzone: fmtHms(d.roxzone), goal, chance: d.chance ?? '', weeks: d.weeks ?? '' });
    keys.push('cap.pred.1', 'cap.pred.2', 'cap.pred.3');
  } else if (type === 'benchmark_pr') {
    Object.assign(p, { n: d.n ?? '', delta: fmtDelta((d.new ?? 0) - (d.old ?? 0)), old: fmtMmss0(d.old), new: fmtMmss0(d.new), time: fmtHms(d.time), goal, chance: chance(d) });
    // "four weeks ago" only when the previous benchmark really was about four weeks earlier
    keys.push('cap.pr.1', ...(extra.weeksAgo !== undefined && Math.round(extra.weeksAgo) === 4 ? ['cap.pr.2'] : []), 'cap.pr.3');
  } else if (type === 'progress') {
    Object.assign(p, { start: fmtHms(d.start), time: fmtHms(d.time), weeks: d.week ?? '', delta: fmtDelta((d.time ?? 0) - (d.start ?? 0)), goal });
    keys.push('cap.prog.1', 'cap.prog.2', 'cap.prog.3');
  } else {
    Object.assign(p, { week: d.week ?? '', result: d.result ?? '', rank: d.rank ?? '', divisionFull: ct(l, divisionKey(d.division, true)) });
    keys.push('cap.ch.1', 'cap.ch.2', 'cap.ch.3');
  }
    // "{delta} faster than four weeks ago" reads without the minus sign
  return keys.map((k) => ct(l, k, k === 'cap.pr.2' ? { ...p, delta: fmtMmss0(Math.abs((d.new ?? 0) - (d.old ?? 0))) } : p));
}

/** Default WhatsApp text (wa.*); the link is always appended. */
export function whatsappFor(type: CardType, d: CardData, link: string, race?: string): string {
  const l = lang(d);
  const goal = d.goal ? fmtHms(d.goal) : '';
  if (type === 'prediction') {
    const r = d.race ?? race;
    return ct(l, r ? 'wa.pred' : 'wa.pred.noRace', { race: r ?? '', time: fmtHms(d.time), goal, chance: d.chance ?? '', link });
  }
  if (type === 'benchmark_pr') return ct(l, 'wa.pr', { n: d.n ?? '', delta: fmtMmss0(Math.abs((d.new ?? 0) - (d.old ?? 0))), time: fmtHms(d.time), link });
  if (type === 'progress') return ct(l, 'wa.prog', { weeks: d.week ?? '', start: fmtHms(d.start), time: fmtHms(d.time), link });
  return ct(l, 'wa.ch', { week: d.week ?? '', result: d.result ?? '', link });
}

/** Alt text of the card image (card.*.alt). */
export function altFor(type: CardType, d: CardData): string {
  const l = lang(d);
  if (type === 'prediction') return ct(l, 'card.pred.alt', { name: d.nickname, time: fmtHms(d.time), goal: d.goal ? fmtHms(d.goal) : '', chance: d.chance ?? '' });
  if (type === 'benchmark_pr') return ct(l, 'card.pr.alt', { name: d.nickname, delta: fmtDelta((d.new ?? 0) - (d.old ?? 0)), old: fmtMmss0(d.old), new: fmtMmss0(d.new) });
  if (type === 'progress') return ct(l, 'card.prog.alt', { start: fmtHms(d.start), time: fmtHms(d.time), week: d.week ?? '' });
  const k = d.pr && d.rank ? 'card.ch.alt.both' : d.rank ? 'card.ch.alt.top10' : 'card.ch.alt.pr';
  return ct(l, k, { week: d.week ?? '', result: d.result ?? '', rank: d.rank ?? '' });
}
