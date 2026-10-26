/** Joe Friel run heart-rate zones as % of LTHR, capped at the athlete's max HR. */
export interface Zone {
  id: string;
  lo: number; // fraction of LTHR
  hi: number | null;
  min: number;
  max: number;
}

export const DEFAULT_ZONE_DEFS: { id: string; lo: number; hi: number | null }[] = [
  { id: 'Z1', lo: 0.65, hi: 0.84 },
  { id: 'Z2', lo: 0.85, hi: 0.89 },
  { id: 'Z3', lo: 0.9, hi: 0.94 },
  { id: 'Z4', lo: 0.95, hi: 0.99 },
  { id: 'Z5a', lo: 1.0, hi: 1.02 },
  { id: 'Z5b', lo: 1.03, hi: 1.06 },
  { id: 'Z5c', lo: 1.07, hi: null },
];

export function zones(lthr: number, maxHr: number, defs = DEFAULT_ZONE_DEFS): Zone[] {
  return defs.map((z) => {
    const min = Math.min(Math.round(z.lo * lthr), maxHr);
    const max = z.hi === null ? maxHr : Math.min(Math.round(z.hi * lthr), maxHr);
    return { ...z, min, max };
  }).filter((z) => z.min < z.max || z.id === 'Z1');
}

export const z2Cap = (lthr: number, maxHr: number, pct = 0.89) => Math.min(Math.round(pct * lthr), maxHr);
export const z1Cap = (lthr: number, maxHr: number, pct = 0.84) => Math.min(Math.round(pct * lthr), maxHr);
