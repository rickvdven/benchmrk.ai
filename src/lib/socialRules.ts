// Rules for social posts, shared by the agent API (server/social/agent.ts) and Admin → Social (manual add, package import).

export const SOCIAL = {
  captionMax: 2200,
  hashtagsMax: 30,
  carouselMin: 2,
  carouselMax: 10,
  imageMaxBytes: 8 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
  /** the agent must plan at least this far ahead */
  minLeadMinutes: 15,
} as const;

export type SocialFormat = 'image' | 'carousel' | 'reel' | 'story';
export type SocialPlatform = 'instagram' | 'facebook';
export type SocialStatus = 'draft' | 'approved' | 'processing' | 'published' | 'failed' | 'rejected' | 'cancelled';
export interface SocialMedia {
  path: string;
  kind: 'image' | 'video';
}
export interface SocialDraft {
  format: SocialFormat;
  platforms: SocialPlatform[];
  caption: string;
  media: SocialMedia[];
  cover_path?: string | null;
  scheduled_at?: string | null;
  source?: string | null;
}

/** Instagram only takes JPEG for images; video is MP4. */
export const MIME_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'video/mp4': 'mp4' };
export const kindOfPath = (path: string): 'image' | 'video' | null => (/\.jpe?g$/i.test(path) ? 'image' : /\.mp4$/i.test(path) ? 'video' : null);
export const maxBytes = (kind: 'image' | 'video') => (kind === 'image' ? SOCIAL.imageMaxBytes : SOCIAL.videoMaxBytes);

export const countHashtags = (caption: string) => (caption.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
/** Characters as Instagram counts them (code points, so an emoji counts once). */
export const captionLength = (caption: string) => [...caption].length;

/** A key the agent uses for its files and as `source`: letters, digits, dash and underscore. */
export const validKey = (k: unknown): k is string => typeof k === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(k);

/**
 * Checks a draft. Returns error codes (empty = valid). `now` and `minLeadMinutes` check the time; pass
 * minLeadMinutes: 0 for an admin, who may plan anything in the future.
 */
export function validateDraft(d: Partial<SocialDraft>, opts: { now: Date; minLeadMinutes?: number }): string[] {
  const e: string[] = [];
  const formats: SocialFormat[] = ['image', 'carousel', 'reel', 'story'];
  if (!d.format || !formats.includes(d.format)) e.push('format');
  const platforms = Array.isArray(d.platforms) ? d.platforms : [];
  if (!platforms.length || platforms.some((p) => p !== 'instagram' && p !== 'facebook') || new Set(platforms).size !== platforms.length) e.push('platforms');
  if (d.format === 'story' && platforms.includes('facebook')) e.push('story_instagram_only');
  const caption = typeof d.caption === 'string' ? d.caption : '';
  if (typeof d.caption !== 'string' && d.caption !== undefined) e.push('caption');
  if (captionLength(caption) > SOCIAL.captionMax) e.push('caption_length');
  if (countHashtags(caption) > SOCIAL.hashtagsMax) e.push('hashtags');
  const media = Array.isArray(d.media) ? d.media : [];
  for (const m of media) {
    if (!m || typeof m.path !== 'string' || !m.path.startsWith('posts/') || m.path.includes('..')) e.push('media_path');
    else if (kindOfPath(m.path) !== m.kind) e.push('media_type');
  }
  const images = media.filter((m) => m?.kind === 'image').length;
  const videos = media.filter((m) => m?.kind === 'video').length;
  if (d.format === 'image' && !(media.length === 1 && images === 1)) e.push('image_count');
  if (d.format === 'carousel' && (media.length < SOCIAL.carouselMin || media.length > SOCIAL.carouselMax)) e.push('carousel_count');
  if (d.format === 'reel' && !(media.length === 1 && videos === 1)) e.push('reel_count');
  if (d.format === 'story' && media.length !== 1) e.push('story_count');
  if (d.cover_path != null) {
    if (d.format !== 'reel') e.push('cover_reel_only');
    else if (!d.cover_path.startsWith('posts/') || kindOfPath(d.cover_path) !== 'image') e.push('cover_type');
  }
  if (d.scheduled_at != null) {
    const t = Date.parse(d.scheduled_at);
    if (!Number.isFinite(t)) e.push('time');
    else if (t < opts.now.getTime() + (opts.minLeadMinutes ?? SOCIAL.minLeadMinutes) * 60_000) e.push('time_too_soon');
  }
  return [...new Set(e)];
}
