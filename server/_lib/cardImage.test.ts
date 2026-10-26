import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderCardPng, type CardFont, type CardInput } from './cardImage';
import { CARD_FORMATS, CARD_SIZE, type CardData } from '../../src/lib/cards';

const f = (n: string) => readFileSync(new URL(`../fonts/${n}`, import.meta.url));
const fonts: CardFont[] = [
  { name: 'Archivo', data: f('archivo-400.ttf'), weight: 400, style: 'normal' },
  { name: 'Archivo', data: f('archivo-700.ttf'), weight: 700, style: 'normal' },
  { name: 'Archivo', data: f('archivo-800.ttf'), weight: 800, style: 'normal' },
  { name: 'Archivo Cond', data: f('archivo-800-cond.ttf'), weight: 800, style: 'normal' },
  { name: 'IBM Plex Mono', data: f('plex-mono-400.woff'), weight: 400, style: 'normal' },
  { name: 'IBM Plex Mono', data: f('plex-mono-600.woff'), weight: 600, style: 'normal' },
];
const base = { v: 1, lang: 'nl', nickname: 'sledpusher', division: 'open_men' } satisfies Partial<CardData>;
const cards: Record<string, CardInput> = {
  prediction: { type: 'prediction', code: 'ABCDE2', data: { ...base, time: 4721, goal: 4800, chance: 96, runs: 2544, stations: 1852, roxzone: 325 } },
  benchmark_pr: { type: 'benchmark_pr', code: 'ABCDE2', data: { ...base, n: 2, week: 7, old: 292, new: 286, time: 5191, goal: 5280, chance_old: 74, chance_new: 83 } },
  progress: { type: 'progress', code: 'ABCDE2', data: { ...base, week: 9, total: 16, start: 4925, time: 4733, goal: 4800, series: [4925, 4900, 4870, 4850, 4810, 4785, 4765, 4750, 4733] } },
};
const dims = (png: Buffer) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });

describe('card images', () => {
  for (const [name, card] of Object.entries(cards)) {
    for (const fmt of CARD_FORMATS) {
      it(`${name} as ${fmt} is a PNG of the right size`, async () => {
        const png = await renderCardPng(card, fmt, fonts);
        expect(png.subarray(1, 4).toString()).toBe('PNG');
        expect(dims(png)).toEqual({ w: CARD_SIZE[fmt][0], h: CARD_SIZE[fmt][1] });
        expect(png.length).toBeGreaterThan(20_000);
      }, 60_000);
    }
  }
  it('draws an English card, a card without a chance and a very long nickname', async () => {
    const en = await renderCardPng({ ...cards.prediction, data: { ...cards.prediction.data, lang: 'en', chance: undefined, nickname: 'x'.repeat(20) } }, 'story', fonts);
    expect(dims(en)).toEqual({ w: 1080, h: 1920 });
    const doubles = await renderCardPng({ ...cards.progress, data: { ...cards.progress.data, division: 'doubles_pro', series: [4925, 4733] } }, 'og', fonts);
    expect(dims(doubles)).toEqual({ w: 1200, h: 630 });
  }, 60_000);
  it('falls back to English for languages without card texts yet', async () => {
    const png = await renderCardPng({ ...cards.prediction, data: { ...cards.prediction.data, lang: 'ko' } }, 'og', fonts);
    expect(dims(png)).toEqual({ w: 1200, h: 630 });
  }, 60_000);
});

/** The code points a TTF covers, read from its cmap (formats 4 and 12 are all a subset needs). */
function coveredCodePoints(buf: Buffer): Set<number> {
  const out = new Set<number>();
  const n = buf.readUInt16BE(4);
  let cmapAt = 0;
  for (let i = 0; i < n; i++) if (buf.toString('ascii', 12 + i * 16, 16 + i * 16) === 'cmap') cmapAt = buf.readUInt32BE(20 + i * 16);
  const subs = buf.readUInt16BE(cmapAt + 2);
  for (let i = 0; i < subs; i++) {
    const t = cmapAt + buf.readUInt32BE(cmapAt + 8 + i * 8);
    const fmt = buf.readUInt16BE(t);
    if (fmt === 12) {
      for (let g = 0, ng = buf.readUInt32BE(t + 12); g < ng; g++) {
        const a = t + 16 + g * 12;
        for (let c = buf.readUInt32BE(a); c <= buf.readUInt32BE(a + 4); c++) out.add(c);
      }
    } else if (fmt === 4) {
      const sc = buf.readUInt16BE(t + 6) / 2;
      for (let g = 0; g < sc; g++) {
        const end = buf.readUInt16BE(t + 14 + g * 2);
        const start = buf.readUInt16BE(t + 16 + sc * 2 + g * 2);
        for (let c = start; c <= end && c < 0xffff; c++) out.add(c);
      }
    }
  }
  return out;
}

describe('korean card font', () => {
  it('has every Hangul syllable of the Korean texts (rebuild with scripts/korean-card-font.py when this fails)', () => {
    const texts = JSON.parse(readFileSync(new URL('../../src/locales/competition.ko.json', import.meta.url), 'utf8')) as Record<string, string>;
    const covered = coveredCodePoints(f('noto-sans-kr-700.ttf'));
    const missing = [...new Set(Object.values(texts).join(''))].filter((c) => c.charCodeAt(0) > 0x2e80 && !covered.has(c.charCodeAt(0)));
    expect(missing).toEqual([]);
  });
});
