// Fonts for the card renderer, embedded in the bundle by esbuild (loader "binary", see build-api.mjs).
// Archivo is a static instance of the variable font (weights 400/700/800, plus 800 at 72 % width for titles),
// IBM Plex Mono is the latin subset. Noto Sans KR is a subset with only the Hangul syllables the Korean card texts use
// (satori falls back to it for glyphs the other fonts lack); regenerate it when the Korean texts change (scripts/korean-card-font.py). Source: @fontsource-variable/archivo and @fontsource/ibm-plex-mono (OFL).
import archivo400 from '../fonts/archivo-400.ttf';
import archivo700 from '../fonts/archivo-700.ttf';
import archivo800 from '../fonts/archivo-800.ttf';
import archivo800cond from '../fonts/archivo-800-cond.ttf';
import notoKr700 from '../fonts/noto-sans-kr-700.ttf';
import mono400 from '../fonts/plex-mono-400.woff';
import mono600 from '../fonts/plex-mono-600.woff';
import type { CardFont } from './cardImage';

export const cardFonts: CardFont[] = [
  { name: 'Archivo', data: archivo400, weight: 400, style: 'normal' },
  { name: 'Archivo', data: archivo700, weight: 700, style: 'normal' },
  { name: 'Archivo', data: archivo800, weight: 800, style: 'normal' },
  { name: 'Archivo Cond', data: archivo800cond, weight: 800, style: 'normal' },
  { name: 'Noto Sans KR', data: notoKr700, weight: 700, style: 'normal' },
  { name: 'IBM Plex Mono', data: mono400, weight: 400, style: 'normal' },
  { name: 'IBM Plex Mono', data: mono600, weight: 600, style: 'normal' },
];
