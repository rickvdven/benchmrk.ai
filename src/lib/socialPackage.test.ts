import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { errorText, readPackage } from './socialPackage';
import { st, socialKeys, SOCIAL_LANGS } from './socialTexts';

describe('package import', () => {
  it('reads one folder per post with post.json and its files', () => {
    const zip = zipSync({
      'week5/w5b-2-rekensom/post.json': strToU8(JSON.stringify({ format: 'carousel', platforms: ['instagram'], caption: 'x', media: ['1.jpg', '2.jpg'] })),
      'week5/w5b-2-rekensom/1.jpg': new Uint8Array([1]),
      'week5/w5b-2-rekensom/2.jpg': new Uint8Array([2]),
      'week5/w5b-3-reel/post.json': strToU8(JSON.stringify({ source: 'w5b-3-reel', format: 'reel', media: ['reel.mp4'], cover_path: 'cover.jpg' })),
      'week5/w5b-3-reel/reel.mp4': new Uint8Array([3]),
      'week5/w5b-3-reel/cover.jpg': new Uint8Array([4]),
      '__MACOSX/week5/w5b-3-reel/post.json': strToU8('{}'),
    });
    const posts = readPackage(zip).sort((a, b) => a.source.localeCompare(b.source));
    expect(posts.map((p) => p.source)).toEqual(['w5b-2-rekensom', 'w5b-3-reel']);
    expect(Object.keys(posts[0].files).sort()).toEqual(['1.jpg', '2.jpg']);
    expect(Object.keys(posts[1].files).sort()).toEqual(['cover.jpg', 'reel.mp4']);
  });
});

describe('texts', () => {
  it('every language has every key', () => {
    const en = socialKeys('en').sort();
    for (const l of SOCIAL_LANGS) expect(socialKeys(l).sort(), l).toEqual(en);
  });
  it('explains stored errors in plain language', () => {
    const t = (k: string, p?: Record<string, string | number>) => st('nl', k, p);
    expect(errorText(t, 'Instagram: [media] Media download has failed (code 9004) · Facebook: [token] expired')).toEqual([
      'Instagram: Meta kon het bestand niet gebruiken (formaat, verhouding, lengte of de link was verlopen).',
      'Facebook: Het Meta-token is ongeldig of verlopen. Vervang META_SYSTEM_USER_TOKEN in Vercel.',
    ]);
  });
});
