import type { DayType } from './types';

const HARD: DayType[] = ['threshold', 'intervals', 'sim', 'wod'];
const RUN: DayType[] = ['threshold', 'intervals', 'easy', 'long', 'sim'];

/**
 * Fills the "auto" days around the sessions the athlete fixed themselves.
 * Order of importance: sim → threshold → strength → long, then easy / recovery.
 * Hard days are kept apart (no hard–hard back to back where avoidable), the week wraps Sunday → Monday.
 */
export function resolveSchedule(schedule: DayType[], opts: { runLoad?: 'now' | 'recent' | 'past' | null } = {}): DayType[] {
  const out = [...schedule];
  if (!out.includes('auto')) return out;
  const at = (i: number) => out[(i + 7) % 7];
  const free = () => out.flatMap((d, i) => (d === 'auto' ? [i] : []));
  const hardNear = (i: number) => (HARD.includes(at(i - 1)) ? 1 : 0) + (HARD.includes(at(i + 1)) ? 1 : 0);

  const place = (type: DayType, pref: number[], adjPenalty: number) => {
    if (out.includes(type)) return;
    const cand = free();
    if (!cand.length) return;
    const score = (i: number) => hardNear(i) * adjPenalty + pref.indexOf(i) * 0.4;
    out[cand.sort((a, b) => score(a) - score(b))[0]] = type;
  };

  place('sim', [5, 6, 4, 3, 2, 1, 0], 3);
  place('threshold', [1, 2, 0, 3, 4, 5, 6], 3);
  // station strength before the long run: with few days the sim + strength cover the stations
  place('strength', [2, 3, 4, 1, 0, 5, 6], 1);
  // long after the sim is the classic HYROX weekend
  place('long', [6, 5, 0, 4, 3, 2, 1], 0.5);

  const left = free();
  const training = out.filter((d) => d !== 'rest' && d !== 'auto').length + left.length;
  let runs = out.filter((d) => RUN.includes(d)).length;
  // the free day with the most hard neighbours becomes recovery first
  left.sort((a, b) => hardNear(b) - hardNear(a));
  for (const [k, i] of left.entries()) {
    const recover = (training >= 6 && k === 0) || (opts.runLoad === 'now' && runs >= 4);
    out[i] = recover ? 'recovery' : 'easy';
    if (!recover) runs++;
  }
  return out;
}
