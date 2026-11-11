import crypto from 'node:crypto';
import { env } from './server';

/** Graph API version for every call to Meta. Update in one place when Meta retires it. */
export const GRAPH_VERSION = 'v26.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
export const RUPLOAD_BASE = `https://rupload.facebook.com/video-upload/${GRAPH_VERSION}`;

export interface MetaConfig {
  /** a page token that does not expire (or a system user token); never sent to the browser */
  token: string;
  appSecret: string;
  pageId: string;
  igUserId: string;
}

export const metaConfig = (): MetaConfig => ({
  token: env('META_SYSTEM_USER_TOKEN'),
  appSecret: env('META_APP_SECRET'),
  pageId: env('META_PAGE_ID'),
  igUserId: env('META_IG_USER_ID'),
});

export const appsecretProof = (token: string, secret: string) => crypto.createHmac('sha256', secret).update(token).digest('hex');

/** Error kinds the admin screen explains in plain language (stored as "[kind] detail" in social_posts.last_error). */
export type MetaErrorKind = 'token' | 'permission' | 'media' | 'limit' | 'rate' | 'config' | 'meta';

export class MetaError extends Error {
  constructor(
    public kind: MetaErrorKind,
    message: string,
    public code?: number,
  ) {
    super(message);
  }
  toString() {
    return `[${this.kind}] ${this.message}`;
  }
}

/** Removes tokens, secrets and signed URL tokens from any text before it is stored, logged or returned. */
export function redact(text: string, secrets: string[] = []): string {
  let s = String(text);
  for (const x of secrets) if (x && x.length >= 6) s = s.split(x).join('[redacted]');
  return s
    .replace(/(access_token|appsecret_proof|input_token|token)=([^&\s"']+)/gi, '$1=[redacted]')
    .replace(/(OAuth|Bearer)\s+[A-Za-z0-9._\-|]+/g, '$1 [redacted]')
    .replace(/\bEA[A-Za-z0-9]{20,}\b/g, '[redacted]');
}

function kindOf(code: number | undefined, subcode: number | undefined): MetaErrorKind {
  if (code === 190 || code === 102) return 'token';
  if (code === 10 || code === 200 || (code !== undefined && code >= 200 && code < 300)) return 'permission';
  if (code === 4 || code === 17 || code === 32 || code === 613 || code === 80001 || code === 80002) return 'rate';
  if (code === 9 && subcode === 2207042) return 'limit';
  if (code === 9004 || code === 36003 || code === 2207026 || (subcode !== undefined && subcode >= 2207000 && subcode < 2208000)) return 'media';
  return 'meta';
}

type Params = Record<string, string | number | boolean | null | undefined>;
export type Graph = (method: 'GET' | 'POST', path: string, params?: Params) => Promise<Record<string, unknown>>;

/**
 * Graph API client. Every call carries the token and appsecret_proof; errors come back as MetaError with the token
 * filtered out of the text. `fetchImpl` is replaced by a mock in the tests.
 */
export function graphClient(cfg: MetaConfig, fetchImpl: typeof fetch = fetch): Graph {
  if (!cfg.token) throw new MetaError('config', 'META_SYSTEM_USER_TOKEN is not set');
  const auth = () => ({ access_token: cfg.token, ...(cfg.appSecret ? { appsecret_proof: appsecretProof(cfg.token, cfg.appSecret) } : {}) });
  const secrets = [cfg.token, cfg.appSecret];
  return async (method, path, params = {}) => {
    const all: Record<string, string> = {};
    for (const [k, v] of Object.entries({ ...params, ...auth() })) if (v !== undefined && v !== null) all[k] = String(v);
    const url = `${GRAPH_BASE}/${path.replace(/^\//, '')}`;
    let r: Response;
    try {
      r =
        method === 'GET'
          ? await fetchImpl(`${url}${url.includes('?') ? '&' : '?'}${new URLSearchParams(all)}`)
          : await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(all).toString() });
    } catch (e) {
      throw new MetaError('meta', redact(`network error: ${(e as Error).message}`, secrets));
    }
    const body = (await r.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_subcode?: number; error_user_msg?: string } } & Record<string, unknown>;
    if (!r.ok || body.error) {
      const e = body.error ?? {};
      const msg = [e.error_user_msg, e.message].filter(Boolean).join(' – ') || `HTTP ${r.status}`;
      throw new MetaError(kindOf(e.code, e.error_subcode), redact(msg, secrets) + (e.code ? ` (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ''})` : ''), e.code);
    }
    return body;
  };
}

/** Facebook reel upload from a hosted file (Video API, "file_url" upload). */
export async function ruploadFromUrl(cfg: MetaConfig, videoId: string, fileUrl: string, fetchImpl: typeof fetch = fetch) {
  const r = await fetchImpl(`${RUPLOAD_BASE}/${videoId}`, { method: 'POST', headers: { Authorization: `OAuth ${cfg.token}`, file_url: fileUrl } });
  const body = (await r.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string; code?: number } };
  if (!r.ok || body.error || body.success === false) {
    throw new MetaError('media', redact(body.error?.message ?? `upload failed (HTTP ${r.status})`, [cfg.token, cfg.appSecret, fileUrl]), body.error?.code);
  }
}

/** Permissions the token needs for publishing on both platforms. */
export const REQUIRED_SCOPES = ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];

/** Checks the token with /debug_token: valid, not expired, and the publishing permissions present. */
export async function checkToken(cfg: MetaConfig, graph: Graph): Promise<{ ok: boolean; problems: string[]; type?: string; expires_at?: number | null }> {
  if (!cfg.token) return { ok: false, problems: ['token_missing'] };
  try {
    const r = (await graph('GET', 'debug_token', { input_token: cfg.token })) as { data?: { is_valid?: boolean; scopes?: string[]; type?: string; expires_at?: number; error?: { message?: string } } };
    const d = r.data ?? {};
    const problems: string[] = [];
    if (!d.is_valid) problems.push('token_invalid');
    const scopes = d.scopes ?? [];
    for (const s of REQUIRED_SCOPES) if (!scopes.includes(s)) problems.push(`missing:${s}`);
    if (!cfg.pageId) problems.push('page_id_missing');
    if (!cfg.igUserId) problems.push('ig_user_id_missing');
    return { ok: problems.length === 0, problems, type: d.type, expires_at: d.expires_at || null };
  } catch (e) {
    return { ok: false, problems: [e instanceof MetaError ? e.toString() : redact(String(e), [cfg.token, cfg.appSecret])] };
  }
}
