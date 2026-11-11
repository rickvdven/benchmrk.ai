import { describe, expect, it } from 'vitest';
import { countHashtags, validateDraft, SOCIAL } from './socialRules';
import { amsMonday, fromAmsInput, toAmsInput } from './amsterdam';

const now = new Date('2026-11-11T10:00:00Z');
const later = '2026-11-11T11:00:00Z';
const img = (n: number) => ({ path: `posts/k/${n}.jpg`, kind: 'image' as const });

describe('validateDraft', () => {
  it('accepts a valid image, carousel and reel', () => {
    expect(validateDraft({ format: 'image', platforms: ['instagram'], caption: 'Hoi #hyrox', media: [img(1)], scheduled_at: later }, { now })).toEqual([]);
    expect(validateDraft({ format: 'carousel', platforms: ['instagram', 'facebook'], caption: '', media: [img(1), img(2)] }, { now })).toEqual([]);
    expect(validateDraft({ format: 'reel', platforms: ['instagram'], caption: '', media: [{ path: 'posts/k/reel.mp4', kind: 'video' }], cover_path: 'posts/k/cover.jpg' }, { now })).toEqual([]);
  });
  it('checks counts, types, caption and time', () => {
    expect(validateDraft({ format: 'carousel', platforms: ['instagram'], caption: '', media: [img(1)] }, { now })).toContain('carousel_count');
    expect(validateDraft({ format: 'carousel', platforms: ['instagram'], caption: '', media: Array.from({ length: 11 }, (_, i) => img(i)) }, { now })).toContain('carousel_count');
    expect(validateDraft({ format: 'reel', platforms: ['instagram'], caption: '', media: [img(1)] }, { now })).toContain('reel_count');
    expect(validateDraft({ format: 'image', platforms: ['instagram'], caption: '', media: [{ path: 'posts/k/1.png', kind: 'image' }] }, { now })).toContain('media_type');
    expect(validateDraft({ format: 'image', platforms: ['instagram'], caption: 'x'.repeat(SOCIAL.captionMax + 1), media: [img(1)] }, { now })).toContain('caption_length');
    expect(validateDraft({ format: 'image', platforms: ['instagram'], caption: Array.from({ length: 31 }, (_, i) => `#t${i}`).join(' '), media: [img(1)] }, { now })).toContain('hashtags');
    expect(validateDraft({ format: 'image', platforms: ['instagram'], caption: '', media: [img(1)], scheduled_at: '2026-11-11T10:10:00Z' }, { now })).toContain('time_too_soon');
    expect(validateDraft({ format: 'image', platforms: ['instagram'], caption: '', media: [img(1)], scheduled_at: '2026-11-11T10:10:00Z' }, { now, minLeadMinutes: 0 })).toEqual([]);
    expect(validateDraft({ format: 'story', platforms: ['facebook'], caption: '', media: [img(1)] }, { now })).toContain('story_instagram_only');
    expect(validateDraft({ format: 'image', platforms: ['instagram'], caption: '', media: [{ path: '../x/1.jpg', kind: 'image' }] }, { now })).toContain('media_path');
  });
  it('counts hashtags', () => {
    expect(countHashtags('#a b #c d#e #é')).toBe(3);
  });
});

describe('Amsterdam time', () => {
  it('converts both ways, also across daylight saving time', () => {
    expect(fromAmsInput('2026-11-17T18:30')).toBe('2026-11-17T17:30:00.000Z'); // winter, +1
    expect(fromAmsInput('2026-07-01T18:30')).toBe('2026-07-01T16:30:00.000Z'); // summer, +2
    expect(toAmsInput('2026-11-17T17:30:00Z')).toBe('2026-11-17T18:30');
    expect(toAmsInput('2026-03-29T01:30:00Z')).toBe('2026-03-29T03:30');
    expect(fromAmsInput(toAmsInput('2026-10-25T03:30:00Z'))).toBe('2026-10-25T03:30:00.000Z');
    // 02:30 on the night the clocks go back exists twice; the later one (winter time) is chosen
    expect(fromAmsInput('2026-10-25T02:30')).toBe('2026-10-25T01:30:00.000Z');
  });
  it('finds the Monday in Amsterdam, not UTC', () => {
    expect(amsMonday('2026-11-15T23:30:00Z')).toBe('2026-11-16'); // Monday 00:30 in Amsterdam
    expect(amsMonday('2026-11-15T22:30:00Z')).toBe('2026-11-09'); // still Sunday 23:30
  });
});
