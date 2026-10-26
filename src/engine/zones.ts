import { V1 } from './rules/v1';
import type { RuleSet } from './rules/types';

/** Joe Friel run heart-rate zones as % of LTHR, capped at the athlete's max HR. */
export interface Zone {
  id: string;
  lo: number; // fraction of LTHR
  hi: number | null;
  min: number;
  max: number;
}

export function zones(lthr: number, maxHr: number, rs: RuleSet = V1): Zone[] {
  return rs.zones.table.map((z) => {
    const min = Math.min(Math.round(z.lo * lthr), maxHr);
    const max = z.hi === null ? maxHr : Math.min(Math.round(z.hi * lthr), maxHr);
    return { ...z, min, max };
  }).filter((z) => z.min < z.max || z.id === 'Z1');
}

const top = (rs: RuleSet, id: string) => rs.zones.table.find((z) => z.id === id)?.hi ?? 1;
export const z2Cap = (lthr: number, maxHr: number, rs: RuleSet = V1) => Math.min(Math.round(top(rs, 'Z2') * lthr), maxHr);
export const z1Cap = (lthr: number, maxHr: number, rs: RuleSet = V1) => Math.min(Math.round(top(rs, 'Z1') * lthr), maxHr);
