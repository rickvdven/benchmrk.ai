import { MetaError, redact, type Graph } from './meta';
import type { SocialFormat, SocialMedia, SocialPlatform, SocialStatus } from '../../src/lib/socialRules';

export interface SocialPost {
  id: string;
  status: SocialStatus;
  platforms: SocialPlatform[];
  format: SocialFormat;
  caption: string;
  media: SocialMedia[];
  cover_path: string | null;
  scheduled_at: string | null;
  source: string | null;
  ig_container_id: string | null;
  ig_media_id: string | null;
  fb_post_id: string | null;
  permalink: string | null;
  attempts: number;
  last_error: string | null;
  publish_state: PublishState;
}

/** Intermediate state between cron rounds. */
export interface PublishState {
  /** Instagram carousel child containers, in order */
  ig_children?: string[];
  /** Facebook reel: video id from the start phase, and whether the file was uploaded */
  fb_reel_video_id?: string;
  fb_reel_uploaded?: boolean;
}

export interface PublishDeps {
  graph: Graph;
  pageId: string;
  igUserId: string;
  /** signed URL (≤ 1 hour) Meta can fetch the file from */
  signedUrl: (path: string) => Promise<string>;
  /** Facebook reel upload from a hosted file */
  fbUpload: (videoId: string, fileUrl: string) => Promise<void>;
}

export type Outcome = 'published' | 'pending' | 'retry' | 'failed';
export const MAX_ATTEMPTS = 3;
export const RETRY_MINUTES = 10;

export interface StepResult {
  outcome: Outcome;
  /** columns to write back (status, locks and attempts are set by the caller) */
  patch: Partial<SocialPost>;
  error?: string;
}

const str = (v: unknown) => (v == null ? '' : String(v));

async function instagram(post: SocialPost, d: PublishDeps, patch: Partial<SocialPost>, state: PublishState): Promise<'done' | 'pending'> {
  if (!d.igUserId) throw new MetaError('config', 'META_IG_USER_ID is not set');
  let container = post.ig_container_id;
  if (!container) {
    const lim = (await d.graph('GET', `${d.igUserId}/content_publishing_limit`, { fields: 'quota_usage,config' })) as { data?: { quota_usage?: number; config?: { quota_total?: number } }[] };
    const l = lim.data?.[0];
    if (l && l.config?.quota_total != null && (l.quota_usage ?? 0) >= l.config.quota_total) throw new MetaError('limit', `publishing limit reached (${l.quota_usage}/${l.config.quota_total} in 24 h)`);
    const media = post.media;
    if (post.format === 'carousel') {
      let children = state.ig_children ?? [];
      if (children.length !== media.length) {
        children = [];
        for (const m of media) {
          const url = await d.signedUrl(m.path);
          const c = await d.graph('POST', `${d.igUserId}/media`, m.kind === 'video' ? { media_type: 'VIDEO', video_url: url, is_carousel_item: true } : { image_url: url, is_carousel_item: true });
          children.push(str(c.id));
        }
        state.ig_children = children;
      }
      // video items must be processed before the carousel container can be made
      for (const [i, m] of media.entries()) {
        if (m.kind !== 'video') continue;
        const s = await d.graph('GET', children[i], { fields: 'status_code' });
        if (s.status_code === 'IN_PROGRESS') return 'pending';
        if (s.status_code !== 'FINISHED') {
          delete state.ig_children;
          throw new MetaError('media', `carousel video ${i + 1}: ${str(s.status_code)}`);
        }
      }
      container = str((await d.graph('POST', `${d.igUserId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: post.caption })).id);
    } else {
      const m = media[0];
      const url = await d.signedUrl(m.path);
      const params =
        post.format === 'reel'
          ? { media_type: 'REELS', video_url: url, caption: post.caption, share_to_feed: true, ...(post.cover_path ? { cover_url: await d.signedUrl(post.cover_path) } : {}) }
          : post.format === 'story'
            ? { media_type: 'STORIES', ...(m.kind === 'video' ? { video_url: url } : { image_url: url }) }
            : { image_url: url, caption: post.caption };
      container = str((await d.graph('POST', `${d.igUserId}/media`, params)).id);
    }
    patch.ig_container_id = container;
  }
  const s = await d.graph('GET', container, { fields: 'status_code' });
  if (s.status_code === 'IN_PROGRESS') return 'pending';
  if (s.status_code !== 'FINISHED' && s.status_code !== 'PUBLISHED') {
    // a container that failed or expired is made again on the next attempt
    patch.ig_container_id = null;
    delete state.ig_children;
    throw new MetaError('media', `Instagram container ${str(s.status_code) || 'unknown'}`);
  }
  const pub = await d.graph('POST', `${d.igUserId}/media_publish`, { creation_id: container });
  patch.ig_media_id = str(pub.id);
  try {
    const p = await d.graph('GET', str(pub.id), { fields: 'permalink' });
    if (p.permalink) patch.permalink = str(p.permalink);
  } catch {
    // published; the permalink is a nice-to-have
  }
  return 'done';
}

async function facebook(post: SocialPost, d: PublishDeps, patch: Partial<SocialPost>, state: PublishState): Promise<void> {
  if (!d.pageId) throw new MetaError('config', 'META_PAGE_ID is not set');
  if (post.format === 'image') {
    const r = await d.graph('POST', `${d.pageId}/photos`, { url: await d.signedUrl(post.media[0].path), caption: post.caption });
    patch.fb_post_id = str(r.post_id || r.id);
  } else if (post.format === 'carousel') {
    // a Facebook post with several photos: upload them unpublished, then one feed post with all of them
    const images = post.media.filter((m) => m.kind === 'image');
    if (!images.length) throw new MetaError('media', 'a Facebook album needs at least one image');
    const ids: string[] = [];
    for (const m of images) ids.push(str((await d.graph('POST', `${d.pageId}/photos`, { url: await d.signedUrl(m.path), published: false })).id));
    const r = await d.graph('POST', `${d.pageId}/feed`, { message: post.caption, attached_media: JSON.stringify(ids.map((id) => ({ media_fbid: id }))) });
    patch.fb_post_id = str(r.id);
  } else if (post.format === 'reel') {
    // Reels API for pages: start → upload (hosted file) → finish
    if (!state.fb_reel_video_id) state.fb_reel_video_id = str((await d.graph('POST', `${d.pageId}/video_reels`, { upload_phase: 'start' })).video_id);
    if (!state.fb_reel_uploaded) {
      await d.fbUpload(state.fb_reel_video_id, await d.signedUrl(post.media[0].path));
      state.fb_reel_uploaded = true;
    }
    await d.graph('POST', `${d.pageId}/video_reels`, { upload_phase: 'finish', video_id: state.fb_reel_video_id, video_state: 'PUBLISHED', description: post.caption });
    patch.fb_post_id = state.fb_reel_video_id;
    delete state.fb_reel_video_id;
    delete state.fb_reel_uploaded;
  }
  // stories: Instagram only
}

/**
 * One publishing round for one claimed post. A platform that already succeeded (ig_media_id / fb_post_id set) is
 * never published again. Instagram containers still IN_PROGRESS make the outcome 'pending'.
 */
export async function publishStep(post: SocialPost, d: PublishDeps, secrets: string[] = []): Promise<StepResult> {
  const patch: Partial<SocialPost> = {};
  const state: PublishState = { ...(post.publish_state ?? {}) };
  const errors: string[] = [];
  let pending = false;
  const wantIg = post.platforms.includes('instagram') && !post.ig_media_id;
  const wantFb = post.platforms.includes('facebook') && !post.fb_post_id && post.format !== 'story';
  if (wantIg) {
    try {
      pending = (await instagram(post, d, patch, state)) === 'pending';
    } catch (e) {
      errors.push(`Instagram: ${e instanceof MetaError ? e.toString() : `[meta] ${(e as Error).message}`}`);
    }
  }
  if (wantFb) {
    try {
      await facebook(post, d, patch, state);
    } catch (e) {
      errors.push(`Facebook: ${e instanceof MetaError ? e.toString() : `[meta] ${(e as Error).message}`}`);
    }
  }
  patch.publish_state = state;
  if (!patch.permalink && !post.permalink && (patch.fb_post_id || post.fb_post_id) && !post.platforms.includes('instagram')) {
    patch.permalink = `https://www.facebook.com/${patch.fb_post_id || post.fb_post_id}`;
  }
  if (errors.length) {
    const error = redact(errors.join(' · '), secrets).slice(0, 1000);
    return { outcome: post.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'retry', patch, error };
  }
  return { outcome: pending ? 'pending' : 'published', patch };
}

/** Columns for the row after a round (attempts, status, retry time, lease). */
export function finalPatch(post: SocialPost, r: StepResult, now: Date): Partial<SocialPost> & { status: SocialStatus; locked_until: string | null } {
  const base = { ...r.patch };
  if (r.outcome === 'published') return { ...base, status: 'published', last_error: null, locked_until: null };
  // still processing at Meta: look again in the next cron round (every 5 minutes)
  if (r.outcome === 'pending') return { ...base, status: 'processing', locked_until: new Date(now.getTime() + 60_000).toISOString() };
  const attempts = post.attempts + 1;
  if (r.outcome === 'failed') return { ...base, status: 'failed', attempts, last_error: r.error ?? null, locked_until: null };
  return { ...base, status: 'approved', attempts, last_error: r.error ?? null, scheduled_at: new Date(now.getTime() + RETRY_MINUTES * 60_000).toISOString(), locked_until: null };
}

export interface RoundDeps {
  /** atomically claims due posts (social_claim) */
  claim: () => Promise<SocialPost[]>;
  save: (id: string, patch: Record<string, unknown>) => Promise<void>;
  audit: (action: string, id: string, details: Record<string, unknown>) => Promise<void>;
  /** mail to info@benchmrk.ai when a post failed for good */
  mailFailed: (post: SocialPost, error: string) => Promise<void>;
  publish: PublishDeps;
  now: () => Date;
  /** strings that may never appear in output or logs (token, app secret) */
  secrets: string[];
  log?: (msg: string) => void;
}

/** One cron round: claim up to 5 due posts and take each one step further. Returns only ids and outcomes. */
export async function runPublishRound(d: RoundDeps): Promise<{ id: string; outcome: Outcome }[]> {
  const out: { id: string; outcome: Outcome }[] = [];
  const posts = await d.claim();
  for (const post of posts) {
    let r: StepResult;
    try {
      r = await publishStep(post, d.publish, d.secrets);
    } catch (e) {
      r = { outcome: post.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'retry', patch: {}, error: redact(`[meta] ${(e as Error).message}`, d.secrets) };
    }
    const patch = finalPatch(post, r, d.now());
    await d.save(post.id, patch as Record<string, unknown>);
    if (r.outcome === 'published') await d.audit('social.published', post.id, { platforms: post.platforms, ig_media_id: patch.ig_media_id ?? post.ig_media_id, fb_post_id: patch.fb_post_id ?? post.fb_post_id });
    if (r.outcome === 'failed') {
      await d.audit('social.failed', post.id, { error: r.error });
      await d.mailFailed(post, r.error ?? '');
    }
    if (r.error) d.log?.(redact(`social ${post.id} ${r.outcome}: ${r.error}`, d.secrets));
    out.push({ id: post.id, outcome: r.outcome });
  }
  return out;
}
