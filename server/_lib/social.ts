import { db, env, APP_URL } from './server';
import { layout, rows, send } from './mail';
import { graphClient, metaConfig, redact, ruploadFromUrl, type MetaConfig } from './meta';
import type { RoundDeps, SocialPost } from './socialPublish';
import type { AgentDeps } from './socialAgent';
import type { SocialStatus } from '../../src/lib/socialRules';

export const BUCKET = 'social-media';
export const OPS_MAIL = 'info@benchmrk.ai';
/** Meta gets signed URLs that are valid for at most one hour. */
const SIGNED_SECONDS = 3600;

const secretsOf = (cfg: MetaConfig) => [cfg.token, cfg.appSecret, env('SOCIAL_AGENT_TOKEN'), env('SOCIAL_CRON_SECRET')];

export async function signedUrl(path: string) {
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(path, SIGNED_SECONDS);
  if (error || !data?.signedUrl) throw new Error(`file not found: ${path}`);
  return data.signedUrl;
}

export function agentDeps(): AgentDeps {
  const s = db();
  return {
    agentToken: env('SOCIAL_AGENT_TOKEN'),
    now: () => new Date(),
    rateOk: async () => {
      const { data, error } = await s.rpc('rate_hit', { _key: 'social-agent', _limit: 60, _window_seconds: 60 });
      return !error && data === true;
    },
    createUploadUrl: async (path) => {
      const { data, error } = await s.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
      if (error || !data) throw new Error('upload url failed');
      return { url: data.signedUrl, token: data.token };
    },
    fileSizes: async (paths) => {
      const out: Record<string, number | null> = Object.fromEntries(paths.map((p) => [p, null]));
      const folders = [...new Set(paths.map((p) => p.slice(0, p.lastIndexOf('/'))))];
      for (const f of folders) {
        const { data } = await s.storage.from(BUCKET).list(f, { limit: 100 });
        for (const o of data ?? []) {
          const full = `${f}/${o.name}`;
          if (full in out) out[full] = Number((o.metadata as { size?: number } | null)?.size ?? 0);
        }
      }
      return out;
    },
    findDraftBySource: async (source) => (await s.from('social_posts').select('id').eq('source', source).eq('status', 'draft').maybeSingle()).data,
    insertDraft: async (row) => {
      const { data, error } = await s.from('social_posts').insert(row).select('id').single();
      if (error) throw new Error(error.message);
      return data;
    },
    updateDraft: async (id, row) => !!(await s.from('social_posts').update(row).eq('id', id).eq('status', 'draft').select('id').maybeSingle()).data,
    list: async () =>
      ((await s.from('social_posts').select('id,source,status,scheduled_at,permalink,last_error').order('created_at', { ascending: false }).limit(50)).data ?? []) as {
        id: string;
        source: string | null;
        status: SocialStatus;
        scheduled_at: string | null;
        permalink: string | null;
        last_error: string | null;
      }[],
    cancelDraft: async (id) => !!(await s.from('social_posts').update({ status: 'cancelled' }).eq('id', id).eq('status', 'draft').select('id').maybeSingle()).data,
  };
}

const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'medium', timeStyle: 'short' }) : '–');

export function roundDeps(): RoundDeps {
  const s = db();
  const cfg = metaConfig();
  const secrets = secretsOf(cfg);
  return {
    claim: async () => {
      const { data, error } = await s.rpc('social_claim', { _limit: 5, _lease_seconds: 240 });
      if (error) throw new Error(error.message);
      return (data ?? []) as SocialPost[];
    },
    save: async (id, patch) => {
      const { error } = await s.from('social_posts').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    },
    audit: async (action, id, details) => {
      await s.from('admin_audit_log').insert({ actor: null, action, target_type: 'social_post', target_id: id, details });
    },
    mailFailed: async (post, error) => {
      const html = layout({
        title: 'Social post niet geplaatst',
        intro: 'Benchmrk heeft een post drie keer geprobeerd te plaatsen. Hij staat nu op "mislukt" in Admin → Social.',
        bodyHtml: rows([
          ['Bron', post.source ?? '–'],
          ['Gepland', fmtTime(post.scheduled_at)],
          ['Formaat', post.format],
          ['Platforms', post.platforms.join(', ')],
          ['Fout', redact(error, secrets).slice(0, 400)],
        ]),
        cta: { label: 'Open Admin → Social', url: `${APP_URL()}/admin/social` },
        footer: 'Automatische melding van Benchmrk.',
      });
      await send({ userId: null, to: OPS_MAIL, kind: 'social', subject: `Social post mislukt: ${post.source ?? post.id}`, html, force: true });
    },
    publish: {
      graph: graphClient(cfg),
      pageId: cfg.pageId,
      igUserId: cfg.igUserId,
      signedUrl,
      fbUpload: (videoId, fileUrl) => ruploadFromUrl(cfg, videoId, fileUrl),
    },
    now: () => new Date(),
    secrets,
    log: (m) => console.error(m),
  };
}

/** Body of a Vercel request as an object. */
export const jsonBody = (b: unknown) => {
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as unknown;
    } catch {
      return {};
    }
  }
  return b ?? {};
};

export { secretsOf };
