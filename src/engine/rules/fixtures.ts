import { GROESBEEK } from '../simProtocol';
import { defaultSchedule, type PlanOptions } from '../plan';
import type { Profile } from '../types';
import { demoAthletes } from './demo';

/** Fixed date for the snapshot tests. */
export const FIXTURE_TODAY = '2026-11-16';

/** Profiles that together touch every rule group: injuries, return-to-run, season races, sim protocol, doubles, short plans. */
export function fixtures(): { id: string; profile: Profile; opts: PlanOptions }[] {
  const demo = demoAthletes(FIXTURE_TODAY).map((d) => ({ id: d.id, profile: d.profile, opts: {} as PlanOptions }));
  const [om, ow, pm] = demo.map((d) => d.profile);
  return [
    ...demo,
    {
      id: 'doubles-achilles-now',
      profile: {
        ...om,
        category: 'doubles_open',
        athlete: { ...om.athlete, flags: { achilles: true, quad: false, back: false, shin: false, injuries: { achilles: 'now' }, injurySince: { achilles: '2026-11-12' } } },
      },
      opts: { sharedSimDow: 3, flare: { '2026-11-20': 6 } },
    },
    {
      id: 'strength-return-season-protocol',
      profile: {
        ...ow,
        weekSchedule: defaultSchedule(3),
        simProtocol: GROESBEEK,
        athlete: { ...ow.athlete, archetype: 'strength', weeklyKm: null, flags: { achilles: false, quad: false, back: false, shin: true, injuries: { shin: 'recent', knee: 'past' }, returnSince: '2026-11-09' } },
        season: [
          { id: 'b', name: 'B race', date: '2026-12-12', goalSec: 5900, priority: 'B' },
          { id: 'c', name: 'C race', date: '2027-01-09', goalSec: null, priority: 'C', category: 'doubles_mixed' },
          { id: 'a2', name: 'Spring A', date: '2027-05-15', goalSec: 5500, priority: 'A' },
        ],
      },
      opts: {},
    },
    {
      id: 'relay-hamstring-7days',
      profile: {
        ...pm,
        category: 'relay_open',
        weekSchedule: ['intervals', 'easy', 'strength', 'recovery', 'threshold', 'sim', 'long'],
        athlete: { ...pm.athlete, archetype: 'diesel', flags: { achilles: false, quad: false, back: true, shin: false, injuries: { hamstring: 'now', back: 'recent' } } },
      },
      opts: {},
    },
    {
      id: 'short-wod-1day',
      profile: { ...om, planStart: '2026-11-02', raceDate: '2026-11-28', weekSchedule: ['rest', 'wod', 'rest', 'rest', 'rest', 'sim', 'rest'], athlete: { ...om.athlete, archetype: 'fast_runner', weeklyKm: null, thresholdPaceSec: 340 } },
      opts: {},
    },
    {
      id: 'long-prep-pro-women',
      profile: { ...ow, category: 'solo_pro', planStart: '2026-06-01', raceDate: '2027-03-20', weekSchedule: defaultSchedule(4), athlete: { ...ow.athlete, archetype: 'diesel', compromisedRatio: 0.9 } },
      opts: { lang: 'nl' },
    },
  ];
}
