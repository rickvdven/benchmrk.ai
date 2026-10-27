import { DEFAULT_RULES } from '../types';
import type { RuleParams } from './params';

/** Version 1 is exactly the behaviour of the engine before rule sets existed. */
export const V1_PARAMS: RuleParams = {
  ...DEFAULT_RULES,
  forecast: {
    freqAerobic: { '1': 0.25, '2': 0.7, '3': 0.85 },
    freqAerobicFit2: 0.6,
    freqStation: { '1': 0.69, '2': 0.76, '3': 0.86 },
    injuryGain: { now: 0.6, recent: 0.85 },
    stationGain: { capLow: 0.1, capMid: 0.06, capHigh: 0.03, perWeek: 0.006 },
  },
  zones: {
    z1CapPct: 0.84,
    z2CapPct: 0.89,
    defs: [
      { id: 'Z1', lo: 0.65, hi: 0.84 },
      { id: 'Z2', lo: 0.85, hi: 0.89 },
      { id: 'Z3', lo: 0.9, hi: 0.94 },
      { id: 'Z4', lo: 0.95, hi: 0.99 },
      { id: 'Z5a', lo: 1.0, hi: 1.02 },
      { id: 'Z5b', lo: 1.03, hi: 1.06 },
      { id: 'Z5c', lo: 1.07, hi: null },
    ],
  },
  threshold: {
    table: {
      prep: [
        { n: 4, d: 1000, off: 5, rest: 120 },
        { n: 5, d: 1000, off: 5, rest: 120 },
        { n: 6, d: 1000, off: 3, rest: 120 },
        { n: 4, d: 1000, off: 3, rest: 90 },
      ],
      base: [
        { n: 5, d: 1000, off: 0, rest: 90 },
        { n: 6, d: 800, off: -5, rest: 90 },
        { n: 5, d: 1000, off: -3, rest: 90 },
        { n: 4, d: 1000, off: -4, rest: 90 },
      ],
      threshold: [
        { n: 5, d: 1000, off: -5, rest: 90 },
        { n: 4, d: 1600, off: -3, rest: 120 },
        { n: 3, d: 2000, off: 0, rest: 120 },
        { n: 4, d: 1000, off: -4, rest: 90 },
      ],
      compromised: [
        { n: 4, d: 1500, off: -3, rest: 90 },
        { n: 5, d: 1000, off: -5, rest: 60 },
        { n: 2, d: 3000, off: 0, rest: 180 },
        { n: 6, d: 1000, off: -6, rest: 60 },
      ],
      peak: [
        { n: 3, d: 2000, off: -3, rest: 120 },
        { n: 4, d: 1000, off: -5, rest: 90 },
        { n: 3, d: 2000, off: -3, rest: 120 },
        { n: 4, d: 1000, off: -5, rest: 90 },
      ],
      taper: [
        { n: 4, d: 1000, off: -3, rest: 120 },
        { n: 4, d: 1000, off: -3, rest: 120 },
        { n: 4, d: 400, off: -15, rest: 120 },
        { n: 4, d: 400, off: -15, rest: 120 },
      ],
    },
    deload: { n: 4, d: 1000, off: -3, rest: 90 },
    raceWeek: { n: 4, d: 400, off: -15, rest: 120 },
  },
  volume: { peakFactor: 1.4, peakFactorStrength: 1.6, rampShare: 0.6, deloadFactor: 0.7, taperFactor: 0.65, raceWeekFactor: 0.4 },
  longRun: { maxKmMan: 18, maxKmWoman: 16, weekShare: 0.32, heavySimFactor: 0.75 },
  sim: { baseOffsetSec: 15, thresholdOffsetSec: 5, compromisedEarlyOffsetSec: 5 },
  taper: { lastSimDays: 10, lastStrengthDays: 7, raceWeekDays: 6 },
};
