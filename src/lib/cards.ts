import { fmtMmss } from '../engine/time';

export type CardType = 'prediction' | 'benchmark_pr' | 'progress' | 'challenge';
export type CardFormat = 'story' | 'square' | 'og';
export const CARD_FORMATS: CardFormat[] = ['story', 'square', 'og'];
export const CARD_SIZE: Record<CardFormat, [number, number]> = { story: [1080, 1920], square: [1080, 1080], og: [1200, 630] };

/** What a card stores. Only these numbers and the nickname end up on a card; the server adds nickname and division. */
export interface CardData {
  v?: number;
  lang?: string;
  nickname: string;
  division: string;
  // prediction
  time?: number;
  goal?: number;
  chance?: number;
  runs?: number;
  stations?: number;
  roxzone?: number;
  race?: string;
  weeks?: number;
  // benchmark-pr
  n?: number;
  week?: number;
  old?: number;
  new?: number;
  chance_old?: number;
  chance_new?: number;
  // progress
  total?: number;
  start?: number;
  series?: number[];
  // challenge (phase 2)
  name_ch?: string;
  short_ch?: string;
  result?: string;
  previous?: string;
  pr?: boolean;
  rank?: number;
}

export const NICKNAME_RE = /^[A-Za-z0-9._-]{3,20}$/;
export const validNickname = (s: string) => NICKNAME_RE.test(s.trim());

/** Division code as the server stores it: open_men, open_women, pro_men, pro_women, doubles_open, doubles_pro. */
export function divisionCode(category: string | null | undefined, sex: string | null | undefined): string {
  const w = sex === 'woman';
  if (category === 'solo_pro') return w ? 'pro_women' : 'pro_men';
  if (category === 'doubles_open') return 'doubles_open';
  if (category === 'doubles_pro') return 'doubles_pro';
  return w ? 'open_women' : 'open_men';
}
/** Key in the competition locale for a division code; `full` gives the long form for running text. */
export const divisionKey = (code: string, full = false) => {
  // doubles teams are not split by sex in the profile, so short and full form are the same
  if (code.startsWith('doubles')) return `div.${code.replace('_', '.')}`;
  return `${full ? 'div.full' : 'div'}.${code.replace('_', '.')}`;
};

/** A change in seconds as "−0:46" or "+0:12" (a real minus sign). */
export const fmtDelta = (sec: number) => `${sec < 0 ? '−' : sec > 0 ? '+' : ''}${fmtMmss(Math.abs(sec))}`;

export const cardImageUrl = (code: string, format: CardFormat) => `/api/card/${code}.png?format=${format}`;
export const cardPageUrl = (code: string) => `/k/${code}`;
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
