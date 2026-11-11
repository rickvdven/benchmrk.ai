import crypto from 'node:crypto';
import { MIME_EXT, maxBytes, validateDraft, validKey, type SocialDraft, type SocialStatus } from '../../src/lib/socialRules';

/** Everything the agent API touches, so the tests can replace it. */
export interface AgentDeps {
  agentToken: string;
  now: () => Date;
  /** true while under 60 requests per minute */
  rateOk: () => Promise<boolean>;
  /** signed upload URL for a path in the social-media bucket */
  createUploadUrl: (path: string) => Promise<{ url: string; token?: string }>;
  /** size in bytes per path, null when the file does not exist */
  fileSizes: (paths: string[]) => Promise<Record<string, number | null>>;
  findDraftBySource: (source: string) => Promise<{ id: string } | null>;
  insertDraft: (row: Record<string, unknown>) => Promise<{ id: string }>;
  /** updates only while the post is a draft; false when it is not (anymore) */
  updateDraft: (id: string, row: Record<string, unknown>) => Promise<boolean>;
  list: () => Promise<{ id: string; source: string | null; status: SocialStatus; scheduled_at: string | null; permalink: string | null; last_error: string | null }[]>;
  /** cancels only a draft; false when it is not one */
  cancelDraft: (id: string) => Promise<boolean>;
}

export interface AgentResponse {
  status: number;
  json: Record<string, unknown>;
}

/** Constant-time comparison of the bearer token (hashes first, so different lengths leak nothing either). */
export function tokenMatches(header: string | string[] | undefined, expected: string) {
  const h = Array.isArray(header) ? header[0] : header;
  if (!expected || !h?.startsWith('Bearer ')) return false;
  const a = crypto.createHash('sha256').update(h.slice(7)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const bad = (error: string, details?: unknown): AgentResponse => ({ status: 400, json: { error, ...(details ? { details } : {}) } });

/**
 * The social agent's API: upload-url, create, list, cancel. It only ever makes or changes drafts; approving and
 * publishing are admin-only and do not exist here.
 */
export async function handleAgent(auth: string | string[] | undefined, body: unknown, d: AgentDeps): Promise<AgentResponse> {
  if (!tokenMatches(auth, d.agentToken)) return { status: 401, json: { error: 'unauthorized' } };
  if (!(await d.rateOk())) return { status: 429, json: { error: 'rate_limited', retry_after_seconds: 60 } };
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  switch (b.action) {
    case 'upload-url': {
      const n = Number(b.n);
      const ext = MIME_EXT[String(b.mime)];
      if (!validKey(b.postKey)) return bad('postKey');
      if (!ext) return bad('mime', 'only image/jpeg and video/mp4');
      if (!Number.isInteger(n) || n < 1 || n > 10) return bad('n');
      const path = `posts/${b.postKey}/${b.cover === true ? 'cover' : n}.${ext}`;
      const u = await d.createUploadUrl(path);
      return { status: 200, json: { path, upload_url: u.url, method: 'PUT', content_type: b.mime, max_bytes: maxBytes(ext === 'jpg' ? 'image' : 'video'), expires_in_seconds: 7200 } };
    }
    case 'create': {
      if (b.source != null && !validKey(b.source)) return bad('source');
      const draft: SocialDraft = {
        format: b.format as SocialDraft['format'],
        platforms: b.platforms as SocialDraft['platforms'],
        caption: (b.caption ?? '') as string,
        media: b.media as SocialDraft['media'],
        cover_path: (b.cover_path ?? null) as string | null,
        scheduled_at: (b.scheduled_at ?? null) as string | null,
        source: (b.source ?? null) as string | null,
      };
      const errors = validateDraft(draft, { now: d.now() });
      if (errors.length) return bad('invalid', errors);
      const paths = [...draft.media.map((m) => m.path), ...(draft.cover_path ? [draft.cover_path] : [])];
      const sizes = await d.fileSizes(paths);
      const missing = paths.filter((p) => sizes[p] == null);
      if (missing.length) return bad('missing_files', missing);
      const tooBig = [...draft.media.map((m) => [m.path, m.kind] as const), ...(draft.cover_path ? [[draft.cover_path, 'image'] as const] : [])].filter(([p, k]) => (sizes[p] ?? 0) > maxBytes(k)).map(([p]) => p);
      if (tooBig.length) return bad('file_too_large', tooBig);
      const row = {
        format: draft.format,
        platforms: draft.platforms,
        caption: draft.caption,
        media: draft.media.map((m) => ({ path: m.path, kind: m.kind })),
        cover_path: draft.cover_path,
        scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null,
        source: draft.source,
      };
      // the same source again updates its draft; a post that is no longer a draft is never touched
      const existing = draft.source ? await d.findDraftBySource(draft.source) : null;
      if (existing) {
        if (!(await d.updateDraft(existing.id, row))) return { status: 409, json: { error: 'not_a_draft' } };
        return { status: 200, json: { id: existing.id, status: 'draft', updated: true } };
      }
      const created = await d.insertDraft({ ...row, status: 'draft', created_by: 'social-agent' });
      return { status: 201, json: { id: created.id, status: 'draft', updated: false } };
    }
    case 'list':
      return { status: 200, json: { posts: await d.list() } };
    case 'cancel': {
      if (typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.id)) return bad('id');
      if (!(await d.cancelDraft(b.id))) return { status: 409, json: { error: 'not_a_draft' } };
      return { status: 200, json: { id: b.id, status: 'cancelled' } };
    }
    default:
      return bad('unknown_action', 'upload-url, create, list or cancel');
  }
}
