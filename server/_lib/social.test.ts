import { describe, expect, it, vi } from 'vitest';
import { handleAgent, type AgentDeps } from './socialAgent';
import { runPublishRound, type RoundDeps, type SocialPost } from './socialPublish';
import { appsecretProof, graphClient, redact, type MetaConfig } from './meta';

// ---------------------------------------------------------------- agent API
const TOKEN = 'agent-token-1234567890';
const NOW = new Date('2026-11-11T10:00:00Z');

function agent(over: Partial<AgentDeps> = {}) {
  const rows: Record<string, Record<string, unknown>> = {};
  const deps: AgentDeps = {
    agentToken: TOKEN,
    now: () => NOW,
    rateOk: async () => true,
    createUploadUrl: async (path) => ({ url: `https://storage.example/upload/${path}?token=signed` }),
    fileSizes: async (paths) => Object.fromEntries(paths.map((p) => [p, p.includes('missing') ? null : p.includes('huge') ? 9 * 1024 * 1024 : 500_000])),
    findDraftBySource: async (source) => {
      const e = Object.entries(rows).find(([, r]) => r.source === source && r.status === 'draft');
      return e ? { id: e[0] } : null;
    },
    insertDraft: async (row) => {
      const id = `00000000-0000-0000-0000-${String(Object.keys(rows).length + 1).padStart(12, '0')}`;
      rows[id] = { ...row };
      return { id };
    },
    updateDraft: async (id, row) => {
      if (rows[id]?.status !== 'draft') return false;
      rows[id] = { ...rows[id], ...row };
      return true;
    },
    list: async () => Object.entries(rows).map(([id, r]) => ({ id, source: r.source as string, status: r.status as 'draft', scheduled_at: null, permalink: null, last_error: null })),
    cancelDraft: async (id) => {
      if (rows[id]?.status !== 'draft') return false;
      rows[id].status = 'cancelled';
      return true;
    },
    ...over,
  };
  return { deps, rows };
}
const auth = `Bearer ${TOKEN}`;
const carousel = {
  action: 'create',
  source: 'w5b-2-rekensom',
  format: 'carousel',
  platforms: ['instagram', 'facebook'],
  caption: 'Rekensom #hyrox',
  media: [
    { path: 'posts/w5b-2-rekensom/1.jpg', kind: 'image' },
    { path: 'posts/w5b-2-rekensom/2.jpg', kind: 'image' },
  ],
  scheduled_at: '2026-11-17T18:30:00+01:00',
};

describe('social agent API', () => {
  it('refuses requests without the right token', async () => {
    const { deps } = agent();
    expect((await handleAgent(undefined, { action: 'list' }, deps)).status).toBe(401);
    expect((await handleAgent('Bearer wrong', { action: 'list' }, deps)).status).toBe(401);
    expect((await handleAgent(TOKEN, { action: 'list' }, deps)).status).toBe(401);
    expect((await handleAgent(auth, { action: 'list' }, agent({ agentToken: '' }).deps)).status).toBe(401);
  });

  it('rate limits', async () => {
    expect((await handleAgent(auth, { action: 'list' }, agent({ rateOk: async () => false }).deps)).status).toBe(429);
  });

  it('gives signed upload URLs for JPEG and MP4 only', async () => {
    const { deps } = agent();
    const ok = await handleAgent(auth, { action: 'upload-url', postKey: 'w5b-2', n: 1, mime: 'image/jpeg' }, deps);
    expect(ok.status).toBe(200);
    expect(ok.json.path).toBe('posts/w5b-2/1.jpg');
    expect((await handleAgent(auth, { action: 'upload-url', postKey: 'w5b-2', n: 1, mime: 'video/mp4' }, deps)).json.path).toBe('posts/w5b-2/1.mp4');
    expect((await handleAgent(auth, { action: 'upload-url', postKey: 'w5b-2', n: 1, mime: 'image/png' }, deps)).status).toBe(400);
    expect((await handleAgent(auth, { action: 'upload-url', postKey: '../etc', n: 1, mime: 'image/jpeg' }, deps)).status).toBe(400);
  });

  it('create always makes a draft, and the same source updates that draft', async () => {
    const { deps, rows } = agent();
    const r = await handleAgent(auth, { ...carousel, status: 'approved', approved_by: 'x' }, deps);
    expect(r.status).toBe(201);
    const row = rows[r.json.id as string];
    expect(row.status).toBe('draft');
    expect(row.created_by).toBe('social-agent');
    expect(row.approved_by).toBeUndefined();
    expect(row.scheduled_at).toBe('2026-11-17T17:30:00.000Z');
    const again = await handleAgent(auth, { ...carousel, caption: 'Nieuw' }, deps);
    expect(again.json).toMatchObject({ id: r.json.id, updated: true });
    expect(Object.keys(rows)).toHaveLength(1);
    expect(rows[r.json.id as string].caption).toBe('Nieuw');
  });

  it('cannot approve, publish or touch a post that is no longer a draft', async () => {
    const { deps, rows } = agent();
    const r = await handleAgent(auth, carousel, deps);
    const id = r.json.id as string;
    for (const action of ['approve', 'publish', 'update']) expect((await handleAgent(auth, { action, id }, deps)).status).toBe(400);
    rows[id].status = 'approved';
    // same source again: the approved post is left alone, a new draft is made
    const again = await handleAgent(auth, { ...carousel, caption: 'Anders' }, deps);
    expect(again.json.id).not.toBe(id);
    expect(rows[id].caption).toBe('Rekensom #hyrox');
    expect((await handleAgent(auth, { action: 'cancel', id }, deps)).status).toBe(409);
    expect(rows[id].status).toBe('approved');
    // a draft that got approved between lookup and update is not changed either
    const race = agent({ findDraftBySource: async () => ({ id }), updateDraft: async () => false });
    expect((await handleAgent(auth, carousel, race.deps)).status).toBe(409);
  });

  it('validates count, type, caption, time and files', async () => {
    const { deps } = agent();
    const check = async (patch: Record<string, unknown>) => (await handleAgent(auth, { ...carousel, ...patch }, deps)).json;
    expect(await check({ media: [carousel.media[0]] })).toMatchObject({ error: 'invalid', details: ['carousel_count'] });
    expect(await check({ media: [{ path: 'posts/x/1.png', kind: 'image' }, carousel.media[1]] })).toMatchObject({ error: 'invalid', details: ['media_type'] });
    expect(await check({ format: 'reel', media: carousel.media })).toMatchObject({ details: ['reel_count'] });
    expect(await check({ caption: 'x'.repeat(2201) })).toMatchObject({ details: ['caption_length'] });
    expect(await check({ scheduled_at: '2026-11-11T10:10:00Z' })).toMatchObject({ details: ['time_too_soon'] });
    expect(await check({ media: [{ path: 'posts/x/missing.jpg', kind: 'image' }, carousel.media[1]] })).toMatchObject({ error: 'missing_files' });
    expect(await check({ media: [{ path: 'posts/x/huge.jpg', kind: 'image' }, carousel.media[1]] })).toMatchObject({ error: 'file_too_large' });
    expect(await check({ source: 'bad source!' })).toMatchObject({ error: 'source' });
  });

  it('list returns only the agreed fields', async () => {
    const { deps } = agent();
    await handleAgent(auth, carousel, deps);
    const r = await handleAgent(auth, { action: 'list' }, deps);
    expect(Object.keys((r.json.posts as object[])[0]).sort()).toEqual(['id', 'last_error', 'permalink', 'scheduled_at', 'source', 'status']);
  });
});

// ---------------------------------------------------------------- publisher with a mocked Graph API
const META_TOKEN = 'EAAtestPageToken0123456789abcdefXYZ';
const CFG: MetaConfig = { token: META_TOKEN, appSecret: 'app-secret-xyz', pageId: 'PAGE1', igUserId: 'IG1' };

interface MetaMock {
  fetch: typeof fetch;
  calls: { method: string; path: string; params: Record<string, string> }[];
  /** status per container id, e.g. a reel that is still IN_PROGRESS */
  containerStatus: Record<string, string>;
  failFacebook: number;
  failInstagram: number;
}

function metaMock(): MetaMock {
  let n = 0;
  const m: MetaMock = {
    calls: [],
    containerStatus: {},
    failFacebook: 0,
    failInstagram: 0,
    fetch: (async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const params = Object.fromEntries(method === 'GET' ? url.searchParams : new URLSearchParams(String(init?.body ?? '')));
      const path = url.pathname.replace(/^\/v\d+\.\d+\//, '');
      m.calls.push({ method, path, params });
      const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
      // every call carries the token and a valid appsecret_proof
      if (params.access_token !== META_TOKEN || params.appsecret_proof !== appsecretProof(META_TOKEN, CFG.appSecret)) return json({ error: { message: 'bad auth', code: 190 } }, 400);
      if (path.startsWith('PAGE1/') && m.failFacebook > 0) {
        m.failFacebook--;
        return json({ error: { message: `Invalid parameter for token ${META_TOKEN} (access_token=${META_TOKEN})`, code: 100 } }, 400);
      }
      if (path === 'IG1/content_publishing_limit') return json({ data: [{ quota_usage: 3, config: { quota_total: 100 } }] });
      if (path === 'IG1/media' && method === 'POST') {
        if (m.failInstagram > 0) {
          m.failInstagram--;
          return json({ error: { message: 'Media download has failed. The media URI doesn’t meet our requirements.', code: 9004, error_subcode: 2207052 } }, 400);
        }
        const id = `C${++n}`;
        m.containerStatus[id] ??= params.media_type === 'REELS' ? 'IN_PROGRESS' : 'FINISHED';
        return json({ id });
      }
      if (path === 'IG1/media_publish') return json({ id: `M${params.creation_id}` });
      if (/^C\d+$/.test(path)) return json({ status_code: m.containerStatus[path], id: path });
      if (/^MC\d+$/.test(path)) return json({ permalink: `https://www.instagram.com/p/${path}/` });
      if (path === 'PAGE1/photos') return json(params.published === 'false' ? { id: `P${++n}` } : { id: `P${++n}`, post_id: `PAGE1_${n}` });
      if (path === 'PAGE1/feed') return json({ id: `PAGE1_feed${++n}` });
      if (path === 'PAGE1/video_reels') return json(params.upload_phase === 'start' ? { video_id: 'V1', upload_url: 'https://rupload.facebook.com/x' } : { success: true });
      return json({ error: { message: `unexpected ${method} ${path}`, code: 1 } }, 400);
    }) as typeof fetch,
  };
  return m;
}

function post(over: Partial<SocialPost> = {}): SocialPost {
  return {
    id: 'p1',
    status: 'approved',
    platforms: ['instagram'],
    format: 'image',
    caption: 'Hallo #hyrox',
    media: [{ path: 'posts/k/1.jpg', kind: 'image' }],
    cover_path: null,
    scheduled_at: '2026-11-11T09:00:00Z',
    source: 'k',
    ig_container_id: null,
    ig_media_id: null,
    fb_post_id: null,
    permalink: null,
    attempts: 0,
    last_error: null,
    publish_state: {},
    ...over,
  };
}

/** In-memory table + the round's dependencies. claim() mimics social_claim: approved & due, or processing with an expired lease. */
function round(meta: MetaMock, posts: SocialPost[], clock = { t: NOW.getTime() }) {
  const table = new Map(posts.map((p) => [p.id, { ...p, locked_until: null as string | null }]));
  const mails: { post: SocialPost; error: string }[] = [];
  const audit: { action: string; id: string; details: Record<string, unknown> }[] = [];
  const logs: string[] = [];
  const deps: RoundDeps = {
    claim: async () => {
      const due = [...table.values()].filter(
        (p) => (p.status === 'approved' && p.scheduled_at! <= new Date(clock.t).toISOString()) || (p.status === 'processing' && (!p.locked_until || p.locked_until < new Date(clock.t).toISOString())),
      );
      for (const p of due) Object.assign(p, { status: 'processing', locked_until: new Date(clock.t + 240_000).toISOString() });
      return due.map((p) => structuredClone(p));
    },
    save: async (id, patch) => void Object.assign(table.get(id)!, patch),
    audit: async (action, id, details) => void audit.push({ action, id, details }),
    mailFailed: async (p, error) => void mails.push({ post: p, error }),
    publish: {
      graph: graphClient(CFG, meta.fetch),
      pageId: 'PAGE1',
      igUserId: 'IG1',
      signedUrl: async (p) => `https://storage.example/sign/${p}?token=short`,
      fbUpload: async () => {},
    },
    now: () => new Date(clock.t),
    secrets: [CFG.token, CFG.appSecret],
    log: (m) => logs.push(m),
  };
  return { deps, table, mails, audit, logs, clock };
}
const later = (r: ReturnType<typeof round>, minutes: number) => (r.clock.t += minutes * 60_000);

describe('social publisher (mocked Graph API)', () => {
  it('publishes an image on Instagram with appsecret_proof and stores the permalink', async () => {
    const meta = metaMock();
    const r = round(meta, [post()]);
    expect(await runPublishRound(r.deps)).toEqual([{ id: 'p1', outcome: 'published' }]);
    const p = r.table.get('p1')!;
    expect(p).toMatchObject({ status: 'published', ig_container_id: 'C1', ig_media_id: 'MC1', permalink: 'https://www.instagram.com/p/MC1/' });
    expect(meta.calls.find((c) => c.path === 'IG1/media')!.params).toMatchObject({ image_url: 'https://storage.example/sign/posts/k/1.jpg?token=short', caption: 'Hallo #hyrox' });
    expect(r.audit.map((a) => a.action)).toEqual(['social.published']);
    // nothing left to do in the next round
    expect(await runPublishRound(r.deps)).toEqual([]);
  });

  it('publishes a carousel on Instagram and as one post with several photos on Facebook', async () => {
    const meta = metaMock();
    const media = [1, 2, 3].map((i) => ({ path: `posts/k/${i}.jpg`, kind: 'image' as const }));
    const r = round(meta, [post({ format: 'carousel', media, platforms: ['instagram', 'facebook'] })]);
    expect((await runPublishRound(r.deps))[0].outcome).toBe('published');
    const ig = meta.calls.filter((c) => c.path === 'IG1/media');
    expect(ig).toHaveLength(4);
    expect(ig.slice(0, 3).every((c) => c.params.is_carousel_item === 'true')).toBe(true);
    expect(ig[3].params).toMatchObject({ media_type: 'CAROUSEL', children: 'C1,C2,C3', caption: 'Hallo #hyrox' });
    const photos = meta.calls.filter((c) => c.path === 'PAGE1/photos');
    expect(photos).toHaveLength(3);
    expect(photos.every((c) => c.params.published === 'false')).toBe(true);
    const feed = meta.calls.find((c) => c.path === 'PAGE1/feed')!;
    expect(JSON.parse(feed.params.attached_media)).toHaveLength(3);
    expect(r.table.get('p1')!.fb_post_id).toMatch(/^PAGE1_feed/);
  });

  it('a reel waits while the container is IN_PROGRESS and is published in the next round', async () => {
    const meta = metaMock();
    const r = round(meta, [post({ format: 'reel', media: [{ path: 'posts/k/reel.mp4', kind: 'video' }], cover_path: 'posts/k/cover.jpg' })]);
    expect((await runPublishRound(r.deps))[0].outcome).toBe('pending');
    expect(r.table.get('p1')).toMatchObject({ status: 'processing', ig_container_id: 'C1', ig_media_id: null });
    // during its short lease it is left alone
    expect(await runPublishRound(r.deps)).toEqual([]);
    meta.containerStatus.C1 = 'FINISHED';
    later(r, 5);
    expect((await runPublishRound(r.deps))[0].outcome).toBe('published');
    // the container was made once, with the reel settings
    const made = meta.calls.filter((c) => c.path === 'IG1/media');
    expect(made).toHaveLength(1);
    expect(made[0].params).toMatchObject({ media_type: 'REELS', share_to_feed: 'true', cover_url: 'https://storage.example/sign/posts/k/cover.jpg?token=short' });
    expect(r.table.get('p1')).toMatchObject({ status: 'published', ig_media_id: 'MC1' });
  });

  it('Facebook fails but Instagram succeeds: Instagram is not posted again on the retry', async () => {
    const meta = metaMock();
    meta.failFacebook = 1;
    const r = round(meta, [post({ platforms: ['instagram', 'facebook'] })]);
    expect((await runPublishRound(r.deps))[0].outcome).toBe('retry');
    const p = r.table.get('p1')!;
    expect(p).toMatchObject({ status: 'approved', attempts: 1, ig_media_id: 'MC1', fb_post_id: null });
    expect(p.last_error).toMatch(/^Facebook: \[meta\]/);
    expect(p.scheduled_at).toBe(new Date(NOW.getTime() + 10 * 60_000).toISOString());
    later(r, 10);
    expect((await runPublishRound(r.deps))[0].outcome).toBe('published');
    expect(meta.calls.filter((c) => c.path === 'IG1/media_publish')).toHaveLength(1);
    expect(meta.calls.filter((c) => c.path === 'IG1/media')).toHaveLength(1);
    expect(r.table.get('p1')!.fb_post_id).toMatch(/^PAGE1_/);
  });

  it('three failures: failed, mailed once, nothing tried after that', async () => {
    const meta = metaMock();
    meta.failInstagram = 99;
    const r = round(meta, [post()]);
    for (const expected of ['retry', 'retry', 'failed']) {
      expect((await runPublishRound(r.deps))[0].outcome).toBe(expected);
      later(r, 10);
    }
    expect(r.table.get('p1')).toMatchObject({ status: 'failed', attempts: 3 });
    expect(r.table.get('p1')!.last_error).toContain('[media]');
    expect(r.mails).toHaveLength(1);
    expect(r.mails[0].post.source).toBe('k');
    expect(r.audit.map((a) => a.action)).toEqual(['social.failed']);
    expect(await runPublishRound(r.deps)).toEqual([]);
  });

  it('never lets the token reach a response, a stored error, a mail or a log', async () => {
    const meta = metaMock();
    meta.failFacebook = 99;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = round(meta, [post({ platforms: ['facebook'], attempts: 2 })]);
    const out = await runPublishRound(r.deps);
    const everything = JSON.stringify({ out, table: [...r.table.values()], mails: r.mails, audit: r.audit, logs: r.logs, console: spy.mock.calls });
    spy.mockRestore();
    expect(out[0].outcome).toBe('failed');
    expect(everything).toContain('[redacted]');
    expect(everything).not.toContain(META_TOKEN);
    expect(everything).not.toContain(CFG.appSecret);
  });

  it('redact removes tokens in every shape', () => {
    const s = redact(`x ${META_TOKEN} access_token=abc123&y=1 Bearer abc.def OAuth zzz EAAanotherTokenThatLooksReal123`, [META_TOKEN]);
    expect(s).not.toContain(META_TOKEN);
    expect(s).not.toContain('abc123');
    expect(s).not.toContain('abc.def');
    expect(s).not.toContain('zzz');
    expect(s).not.toContain('EAAanother');
  });
});
