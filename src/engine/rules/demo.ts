import { addDays, mondayOf } from '../time';
import { defaultSchedule } from '../plan';
import type { Athlete, Profile } from '../types';

const stars = (o: Partial<Athlete['stationStars']> = {}): Athlete['stationStars'] => ({
  skierg: 3, sledPush: 3, sledPull: 3, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 3, ...o,
});
const flags = (o: Partial<Athlete['flags']> = {}): Athlete['flags'] => ({ achilles: false, quad: false, back: false, shin: false, ...o });

/**
 * Demo athletes for the plan-update preview in the admin (and the snapshot tests).
 * Plan started 4 weeks before `today`, race 12 weeks after it, so the 4-week preview lands in the middle of a build.
 */
export function demoAthletes(today: string): { id: string; label: string; profile: Profile }[] {
  const planStart = mondayOf(addDays(today, -28));
  const raceDate = addDays(mondayOf(addDays(today, 12 * 7)), 5);
  const base = { raceName: 'Demo race', raceDate, planStart, weekSchedule: defaultSchedule(5), equipment: 'gym' as const };
  return [
    {
      id: 'open-men-120',
      label: 'Open Men 1:20',
      profile: {
        ...base,
        category: 'solo_open',
        goalSec: 80 * 60,
        athlete: { name: 'Open Men', sex: 'man', lthr: 172, maxHr: 190, thresholdPaceSec: 268, weeklyKm: 30, weightKg: 80, archetype: 'hybrid', flags: flags(), stationStars: stars({ sledPush: 4, wallballs: 2 }), stationTimes: {} },
      },
    },
    {
      id: 'open-women-135',
      label: 'Open Women 1:35',
      profile: {
        ...base,
        category: 'solo_open',
        goalSec: 95 * 60,
        athlete: { name: 'Open Women', sex: 'woman', lthr: 174, maxHr: 192, thresholdPaceSec: 305, weeklyKm: 22, weightKg: 64, archetype: 'hybrid', flags: flags(), stationStars: stars({ sledPush: 2, sledPull: 2, row: 4 }), stationTimes: {} },
      },
    },
    {
      id: 'pro-men-110',
      label: 'Pro Men 1:10',
      profile: {
        ...base,
        category: 'solo_pro',
        goalSec: 70 * 60,
        weekSchedule: defaultSchedule(6),
        athlete: { name: 'Pro Men', sex: 'man', lthr: 178, maxHr: 188, thresholdPaceSec: 228, weeklyKm: 50, weightKg: 84, archetype: 'fast_runner', flags: flags(), stationStars: stars({ sledPush: 4, sledPull: 3, lunges: 2 }), stationTimes: {} },
      },
    },
  ];
}
