import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ExternalLink, Film, Image as ImageIcon, Images, Link2, Plus, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { st } from '../../lib/socialTexts';
import { errorText, readPackage } from '../../lib/socialPackage';
import { addDaysIso, amsDate, amsMonday, fmtAms, fromAmsInput, toAmsInput } from '../../lib/amsterdam';
import { captionLength, countHashtags, kindOfPath, maxBytes, SOCIAL, validateDraft, validKey, type SocialDraft, type SocialFormat, type SocialMedia, type SocialPlatform, type SocialStatus } from '../../lib/socialRules';
import { Modal, Notice, Spinner } from '../../components/ui';

const BUCKET = 'social-media';
const FORMATS: SocialFormat[] = ['image', 'carousel', 'reel', 'story'];
const PLATFORMS: SocialPlatform[] = ['instagram', 'facebook'];

export interface SocialPostRow {
  id: string;
  status: SocialStatus;
  platforms: SocialPlatform[];
  format: SocialFormat;
  caption: string;
  media: SocialMedia[];
  cover_path: string | null;
  scheduled_at: string | null;
  source: string | null;
  created_by: string;
  approved_at: string | null;
  ig_media_id: string | null;
  fb_post_id: string | null;
  permalink: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

type T = (key: string, p?: Record<string, string | number>) => string;
function useT(): T {
  const { lang } = useI18n();
  return (key, p) => st(lang, key, p);
}

async function callApi<R>(path: string, body: Record<string, unknown>): Promise<R> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify(body) });
  const json = (await r.json().catch(() => ({}))) as R & { error?: string };
  if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
  return json;
}

const rpc = async <R,>(fn: string, args: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as R;
};

function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['social-url', path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => (await supabase.storage.from(BUCKET).createSignedUrl(path!, 3600)).data?.signedUrl ?? null,
  });
}

const STATUS_TONE: Record<SocialStatus, string> = {
  draft: 'bg-panel2 text-ink-3',
  approved: 'bg-volt/30 text-ink',
  processing: 'bg-sky/15 text-sky',
  published: 'bg-good/15 text-good',
  failed: 'bg-bad/15 text-bad',
  rejected: 'bg-warn/15 text-warn',
  cancelled: 'bg-panel2 text-muted line-through',
};
function StatusBadge({ s }: { s: SocialStatus }) {
  const t = useT();
  return <span className={clsx('chip font-semibold', STATUS_TONE[s])}>{t(`status.${s}`)}</span>;
}

const FormatIcon = ({ f }: { f: SocialFormat }) => (f === 'carousel' ? <Images className="h-3.5 w-3.5" /> : f === 'reel' ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />);

function Thumb({ p }: { p: SocialPostRow }) {
  const first = p.media[0];
  const path = first?.kind === 'video' ? p.cover_path : first?.path;
  const url = useSignedUrl(path);
  return (
    <div className="relative h-16 w-[52px] shrink-0 overflow-hidden rounded-md bg-panel2">
      {url.data ? <img src={url.data} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-muted"><FormatIcon f={p.format} /></div>}
      {p.format === 'carousel' && <span className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white">{p.media.length}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- connection header
interface StatusResponse {
  configured: { token: boolean; appSecret: boolean; pageId: string | null; igUserId: string | null };
  ok: boolean;
  problems: string[];
  quota?: { used: number; total: number } | null;
}
interface TestResponse {
  pages: { id: string; name: string; instagram: { id: string; username: string | null } | null }[];
}

function problemText(t: T, p: string) {
  if (p.startsWith('missing:')) return t('problem.missing', { scope: p.slice(8) });
  if (['token_missing', 'token_invalid', 'page_id_missing', 'ig_user_id_missing'].includes(p)) return t(`problem.${p}`);
  return errorText(t, p)[0] ?? p;
}

function Connection() {
  const t = useT();
  const s = useQuery({ queryKey: ['social-status'], staleTime: 5 * 60_000, retry: false, queryFn: () => callApi<StatusResponse>('/api/social/admin', { action: 'status' }) });
  const [test, setTest] = useState<TestResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const runTest = async () => {
    setBusy(true);
    try {
      setTest(await callApi<TestResponse>('/api/social/admin', { action: 'test' }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const left = s.data?.quota ? Math.max(0, s.data.quota.total - s.data.quota.used) : null;
  return (
    <section className="panel space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          {s.isLoading ? (
            <span className="text-muted">{t('conn.checking')}</span>
          ) : s.data?.ok ? (
            <span className="font-semibold text-good">{t('conn.ok')}</span>
          ) : (
            <span className="font-semibold text-bad">{t('conn.problem')}</span>
          )}
          {left !== null && <span className="ml-2 text-muted">· {t('conn.quota', { n: left, total: s.data!.quota!.total })}</span>}
        </div>
        <button className="btn-ghost btn-sm" disabled={busy} onClick={runTest}>
          {busy ? t('conn.testing') : t('conn.test')}
        </button>
      </div>
      {s.isError && <p className="text-bad">{(s.error as Error).message}</p>}
      {!!s.data?.problems?.length && (
        <ul className="list-disc space-y-0.5 pl-5 text-bad">
          {s.data.problems.map((p) => (
            <li key={p}>{problemText(t, p)}</li>
          ))}
        </ul>
      )}
      {test && (
        <div className="rounded-lg border border-line bg-panel2/50 p-3">
          {!test.pages.length && <p>{t('conn.none')}</p>}
          {test.pages.map((p) => (
            <div key={p.id} className="grid gap-1 py-1 sm:grid-cols-2">
              <div>
                <span className="label mr-1">{t('conn.page')}:</span>
                {p.name} · <span className="stat">META_PAGE_ID = {p.id}</span>
              </div>
              <div>
                <span className="label mr-1">{t('conn.ig')}:</span>
                {p.instagram ? (
                  <>
                    @{p.instagram.username ?? '?'} · <span className="stat">META_IG_USER_ID = {p.instagram.id}</span>
                  </>
                ) : (
                  <span className="text-warn">{t('conn.noIg')}</span>
                )}
              </div>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted">{t('conn.hint')}</p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- errors in plain language
// ---------------------------------------------------------------- preview
function MediaItem({ m }: { m: SocialMedia }) {
  const url = useSignedUrl(m.path);
  if (!url.data) return <div className="flex aspect-[4/5] w-full items-center justify-center bg-panel2"><Spinner /></div>;
  return m.kind === 'video' ? (
    <video src={url.data} controls playsInline preload="metadata" className="aspect-[9/16] max-h-[70vh] w-full bg-black object-contain" />
  ) : (
    <img src={url.data} alt="" className="aspect-[4/5] w-full bg-panel2 object-cover" />
  );
}

/** The caption as Instagram shows it: account name in bold, line breaks kept, hashtags in blue. */
function CaptionPreview({ text }: { text: string }) {
  const t = useT();
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">
      <span className="mr-1 font-semibold">{t('preview.username')}</span>
      {parts.map((p, i) => (p.startsWith('#') ? <span key={i} className="text-[#00376b]">{p}</span> : <span key={i}>{p}</span>))}
    </p>
  );
}

function Preview({ p, caption }: { p: SocialPostRow; caption: string }) {
  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-xl border border-line bg-white text-black">
      <div className="flex snap-x snap-mandatory overflow-x-auto">
        {p.media.map((m) => (
          <div key={m.path} className="w-full shrink-0 snap-center">
            <MediaItem m={m} />
          </div>
        ))}
      </div>
      {p.media.length > 1 && <div className="py-1 text-center text-[11px] text-neutral-500">{p.media.map((_, i) => (i === 0 ? '●' : '○')).join(' ')} · swipe</div>}
      {p.format !== 'story' && (
        <div className="p-3">
          <CaptionPreview text={caption} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- detail
function Detail({ p, onClose }: { p: SocialPostRow; onClose: () => void }) {
  const t = useT();
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [caption, setCaption] = useState(p.caption);
  const [time, setTime] = useState(p.scheduled_at ? toAmsInput(p.scheduled_at) : '');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(p.platforms);
  const [busy, setBusy] = useState(false);
  const editable = p.status === 'draft' || p.status === 'approved' || p.status === 'failed';
  const nothingPublished = !p.ig_media_id && !p.fb_post_id;
  const scheduledIso = time ? fromAmsInput(time) : null;
  const dirty = caption !== p.caption || (scheduledIso ?? null) !== (p.scheduled_at ? new Date(p.scheduled_at).toISOString() : null) || platforms.join() !== p.platforms.join();
  const chars = captionLength(caption);
  const tags = countHashtags(caption);
  const refresh = () => qc.invalidateQueries({ queryKey: ['social-posts'] });

  const run = async (f: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await f();
      if (ok) toast.success(ok);
      await refresh();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = () => rpc('social_update', { _id: p.id, _caption: caption, _scheduled_at: scheduledIso, _platforms: platforms });
  const saveIfDirty = async () => {
    if (dirty && editable) await save();
  };
  const approve = () => {
    if (!scheduledIso) return toast.error(t('msg.needTime'));
    return run(async () => {
      await saveIfDirty();
      await rpc('social_approve', { _id: p.id, _scheduled_at: scheduledIso });
    }, t('msg.approved', { time: fmtAms(scheduledIso, lang) }));
  };
  const postNow = () => {
    if (!confirm(t('confirm.now', { platforms: platforms.map((x) => t(`platform.${x}`)).join(' + ') }))) return;
    return run(async () => {
      const now = new Date().toISOString();
      if (p.status === 'approved' || p.status === 'failed') await rpc('social_update', { _id: p.id, _caption: caption, _scheduled_at: now, _platforms: platforms });
      else {
        await saveIfDirty();
        await rpc('social_approve', { _id: p.id, _scheduled_at: now });
      }
      if (p.status === 'failed') await rpc('social_set_status', { _id: p.id, _action: 'retry' });
      toast.message(t('msg.publishing'));
      const r = await callApi<{ processed: { id: string; outcome: string }[] }>('/api/social/publish', {});
      const mine = r.processed.find((x) => x.id === p.id);
      if (mine?.outcome === 'published') toast.success(t('msg.published'));
      else if (mine?.outcome === 'pending') toast.message(t('msg.pending'));
    });
  };
  const setStatus = (action: string, ok?: string) => run(() => rpc('social_set_status', { _id: p.id, _action: action }), ok);

  const togglePlatform = (x: SocialPlatform) => setPlatforms((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]));
  const disabled = !editable || busy;

  return (
    <Modal open onClose={onClose} xl title={<span className="flex flex-wrap items-center gap-2">{t(`format.${p.format}`)} <StatusBadge s={p.status} /> {p.source && <span className="stat text-xs font-normal text-muted">{p.source}</span>}</span>}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,360px)_1fr]">
        <div>
          <div className="label mb-1.5">{t('detail.preview')}</div>
          <Preview p={p} caption={caption} />
        </div>
        <div className="space-y-4">
          {p.status === 'failed' && p.last_error && (
            <Notice tone="bad">
              <p className="font-semibold">{t('error.title')}</p>
              <ul className="mt-1 list-disc pl-5">
                {errorText(t, p.last_error).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <details className="mt-1 text-xs">
                <summary className="cursor-pointer">{t('error.details')}</summary>
                <p className="mt-1 break-words">{p.last_error}</p>
              </details>
            </Notice>
          )}
          {p.status === 'approved' && p.last_error && (
            <Notice tone="warn">
              {t('detail.attempts', { n: p.attempts + 1 })}: {errorText(t, p.last_error).join(' · ')}
            </Notice>
          )}
          {p.status === 'processing' && <Notice>{t('processing.note')}</Notice>}
          {p.permalink && (
            <a href={p.permalink} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              {t('act.open')} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
          <label className="block space-y-1.5">
            <span className="label block">{t('detail.caption')}</span>
            <textarea className="input py-2 leading-snug" style={{ height: '14rem' }} value={caption} disabled={disabled} onChange={(e) => setCaption(e.target.value)} />
            <span className={clsx('stat block text-xs', chars > SOCIAL.captionMax || tags > SOCIAL.hashtagsMax ? 'text-bad' : 'text-muted')}>{t('detail.count', { chars, tags })}</span>
          </label>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="label block">{t('detail.time')}</span>
              <input type="datetime-local" className="input" value={time} disabled={disabled} onChange={(e) => setTime(e.target.value)} />
            </label>
            <div className="space-y-1.5">
              <span className="label block">{t('detail.platforms')}</span>
              <div className="flex gap-3 pt-2">
                {PLATFORMS.map((x) => (
                  <label key={x} className={clsx('flex items-center gap-1.5 text-sm', p.format === 'story' && x === 'facebook' && 'opacity-40')}>
                    <input type="checkbox" checked={platforms.includes(x)} disabled={disabled || (p.format === 'story' && x === 'facebook')} onChange={() => togglePlatform(x)} />
                    {t(`platform.${x}`)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {p.approved_at && <p className="text-xs text-muted">{t('detail.approvedBy', { date: fmtAms(p.approved_at, lang) })}</p>}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {(p.status === 'draft' || p.status === 'rejected') && (
              <button className="btn-primary" disabled={busy || !platforms.length} onClick={approve}>
                {t('act.approve')}
              </button>
            )}
            {(p.status === 'draft' || p.status === 'approved' || (p.status === 'failed' && nothingPublished)) && (
              <button className="btn-ghost" disabled={busy || !platforms.length} onClick={postNow}>
                {t('act.now')}
              </button>
            )}
            {editable && dirty && (
              <button className="btn-ghost" disabled={busy} onClick={() => run(save, t('msg.saved'))}>
                {t('detail.save')}
              </button>
            )}
            {p.status === 'failed' && (
              <button className="btn-primary" disabled={busy} onClick={() => setStatus('retry')}>
                {t('act.retry')}
              </button>
            )}
            {p.status === 'draft' && (
              <button className="btn-ghost" disabled={busy} onClick={() => setStatus('reject')}>
                {t('act.reject')}
              </button>
            )}
            {(p.status === 'approved' || p.status === 'rejected' || p.status === 'failed') && nothingPublished && (
              <button className="btn-ghost" disabled={busy} onClick={() => setStatus('to_draft')}>
                {t('act.toDraft')}
              </button>
            )}
            {['draft', 'approved', 'failed', 'rejected'].includes(p.status) && (
              <button
                className="btn-ghost text-bad"
                disabled={busy}
                onClick={() => {
                  if (confirm(t('confirm.cancel'))) void setStatus('cancel');
                }}
              >
                {t('act.cancel')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- new post and package import
const validationText = (t: T, codes: string[]) => codes.map((c) => t(`val.${c}`)).join(' ');
const randomKey = () => `manual-${Math.random().toString(36).slice(2, 10)}`;

async function uploadFile(path: string, data: Blob, contentType: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(error.message);
}

/** Inserts a draft, or updates the open draft with the same source (like the agent API). */
async function saveDraft(d: SocialDraft): Promise<'created' | 'updated'> {
  const row = { format: d.format, platforms: d.platforms, caption: d.caption, media: d.media, cover_path: d.cover_path ?? null, scheduled_at: d.scheduled_at ?? null, source: d.source ?? null };
  if (d.source) {
    const { data: open } = await supabase.from('social_posts').select('id').eq('source', d.source).eq('status', 'draft').maybeSingle();
    if (open) {
      const { error } = await supabase.from('social_posts').update(row).eq('id', open.id).eq('status', 'draft');
      if (error) throw new Error(error.message);
      return 'updated';
    }
  }
  const { error } = await supabase.from('social_posts').insert({ ...row, status: 'draft', created_by: 'admin' });
  if (error) throw new Error(error.message);
  return 'created';
}

function NewPost({ onClose }: { onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [format, setFormat] = useState<SocialFormat>('image');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['instagram']);
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    const key = randomKey();
    const bad = files.find((f) => !kindOfPath(f.name.toLowerCase().replace(/\.jpeg$/, '.jpg')));
    if (bad) return toast.error(t('val.file_type', { name: bad.name }));
    const media: SocialMedia[] = files.map((f, i) => {
      const kind = kindOfPath(f.name)!;
      return { path: `posts/${key}/${i + 1}.${kind === 'image' ? 'jpg' : 'mp4'}`, kind };
    });
    const big = files.find((f, i) => f.size > maxBytes(media[i].kind));
    if (big) return toast.error(t('val.file_size', { name: big.name }));
    const draft: SocialDraft = { format, platforms, caption, media, cover_path: cover ? `posts/${key}/cover.jpg` : null, scheduled_at: time ? fromAmsInput(time) : null, source: key };
    const errors = validateDraft(draft, { now: new Date(), minLeadMinutes: 0 });
    if (errors.length) return toast.error(validationText(t, errors));
    setBusy(true);
    try {
      for (const [i, f] of files.entries()) await uploadFile(media[i].path, f, media[i].kind === 'image' ? 'image/jpeg' : 'video/mp4');
      if (cover) await uploadFile(draft.cover_path!, cover, 'image/jpeg');
      await saveDraft(draft);
      toast.success(t('msg.saved'));
      await qc.invalidateQueries({ queryKey: ['social-posts'] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={t('new.title')} wide>
      <div className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="label block">{t('new.format')}</span>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value as SocialFormat)}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`format.${f}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1.5">
            <span className="label block">{t('detail.platforms')}</span>
            <div className="flex gap-3 pt-2">
              {PLATFORMS.map((x) => (
                <label key={x} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={platforms.includes(x)} onChange={() => setPlatforms((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))} />
                  {t(`platform.${x}`)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="label block">{t('new.files')}</span>
          <input type="file" multiple accept="image/jpeg,video/mp4,.jpg,.jpeg,.mp4" onChange={(e) => setFiles([...(e.target.files ?? [])])} />
          {files.length > 0 && <span className="block text-xs text-muted">{files.map((f) => f.name).join(', ')}</span>}
        </label>
        {format === 'reel' && (
          <label className="block space-y-1.5">
            <span className="label block">{t('new.cover')}</span>
            <input type="file" accept="image/jpeg,.jpg,.jpeg" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </label>
        )}
        <label className="block space-y-1.5">
          <span className="label block">{t('detail.caption')}</span>
          <textarea className="input py-2" style={{ height: '9rem' }} value={caption} onChange={(e) => setCaption(e.target.value)} />
          <span className="stat block text-xs text-muted">{t('detail.count', { chars: captionLength(caption), tags: countHashtags(caption) })}</span>
        </label>
        <label className="block space-y-1.5 sm:w-1/2">
          <span className="label block">{t('detail.time')}</span>
          <input type="datetime-local" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <button className="btn-primary" disabled={busy || !files.length} onClick={create}>
          {busy ? t('new.uploading') : t('new.create')}
        </button>
      </div>
    </Modal>
  );
}

interface ImportResult {
  source: string;
  ok: boolean;
  text: string;
}

function ImportPackage({ onClose }: { onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const run = async (file: File) => {
    setBusy(true);
    const out: ImportResult[] = [];
    try {
      const posts = readPackage(new Uint8Array(await file.arrayBuffer()));
      if (!posts.length) out.push({ source: file.name, ok: false, text: t('import.none') });
      for (const p of posts) {
        const source = p.source;
        try {
          if (!validKey(source)) throw new Error(t('val.media_path'));
          const name = (m: unknown) => String(typeof m === 'string' ? m : ((m as { path?: string; file?: string })?.file ?? (m as { path?: string })?.path ?? '')).split('/').pop()!;
          const items = (Array.isArray(p.json.media) ? p.json.media : []).map(name);
          const coverName = p.json.cover_path || p.json.cover ? name(p.json.cover_path ?? p.json.cover) : null;
          for (const n of [...items, ...(coverName ? [coverName] : [])]) {
            if (!p.files[n]) throw new Error(t('val.file_missing', { name: n }));
            const kind = kindOfPath(n);
            if (!kind) throw new Error(t('val.file_type', { name: n }));
            if (p.files[n].byteLength > maxBytes(kind)) throw new Error(t('val.file_size', { name: n }));
          }
          const media: SocialMedia[] = items.map((n) => ({ path: `posts/${source}/${n.replace(/\.jpeg$/i, '.jpg')}`, kind: kindOfPath(n)! }));
          const draft: SocialDraft = {
            format: p.json.format as SocialFormat,
            platforms: (p.json.platforms ?? ['instagram']) as SocialPlatform[],
            caption: String(p.json.caption ?? ''),
            media,
            cover_path: coverName ? `posts/${source}/${coverName.replace(/\.jpeg$/i, '.jpg')}` : null,
            scheduled_at: p.json.scheduled_at ? new Date(String(p.json.scheduled_at)).toISOString() : null,
            source,
          };
          const errors = validateDraft(draft, { now: new Date(), minLeadMinutes: 0 });
          if (errors.length) throw new Error(validationText(t, errors));
          const { data: done } = await supabase.from('social_posts').select('id,status').eq('source', source).neq('status', 'draft').neq('status', 'cancelled').neq('status', 'rejected').limit(1);
          if (done?.length) throw new Error(t('import.notDraft'));
          for (const [i, n] of items.entries()) await uploadFile(media[i].path, new Blob([p.files[n]]), media[i].kind === 'image' ? 'image/jpeg' : 'video/mp4');
          if (coverName) await uploadFile(draft.cover_path!, new Blob([p.files[coverName]]), 'image/jpeg');
          const r = await saveDraft(draft);
          out.push({ source, ok: true, text: t(r === 'created' ? 'import.created' : 'import.updated', { source }) });
        } catch (e) {
          out.push({ source, ok: false, text: t('import.failed', { source, error: (e as Error).message }) });
        }
      }
    } catch (e) {
      out.push({ source: file.name, ok: false, text: (e as Error).message });
    }
    setResults(out);
    setBusy(false);
    await qc.invalidateQueries({ queryKey: ['social-posts'] });
  };
  return (
    <Modal open onClose={onClose} title={t('import.title')}>
      <div className="space-y-3 text-sm">
        <p className="text-muted">{t('import.help')}</p>
        <label className="btn-primary cursor-pointer">
          <Upload className="h-4 w-4" aria-hidden /> {busy ? t('new.uploading') : t('import.choose')}
          <input type="file" accept=".zip,application/zip" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
        </label>
        {results && (
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? 'text-good' : 'text-bad'}>
                {r.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- list
function PostRow({ p, onOpen }: { p: SocialPostRow; onOpen: () => void }) {
  const t = useT();
  const { lang } = useI18n();
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-panel2/60">
        <Thumb p={p} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge s={p.status} />
            <span className="chip">
              <FormatIcon f={p.format} /> {t(`format.${p.format}`)}
            </span>
            {p.platforms.map((x) => (
              <span key={x} className="chip">
                {t(`platform.${x}`)}
              </span>
            ))}
          </div>
          <p className="mt-1 truncate text-sm">{p.caption.split('\n')[0] || '–'}</p>
          <p className="stat mt-0.5 truncate text-xs text-muted">
            {p.scheduled_at ? fmtAms(p.scheduled_at, lang) : '–'}
            {p.source ? ` · ${t('source')}: ${p.source}` : ''} · {t(`by.${p.created_by}`)}
          </p>
        </div>
      </button>
    </li>
  );
}

/** Admin → Social: the queue of posts for Instagram and Facebook. Nothing goes live without approval here. */
export function SocialAdmin() {
  const t = useT();
  const { lang } = useI18n();
  const [week, setWeek] = useState(() => amsMonday(new Date()));
  const [open, setOpen] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'new' | 'import' | null>(null);
  const q = useQuery({
    queryKey: ['social-posts'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('social_posts').select('*').order('scheduled_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as SocialPostRow[];
    },
  });
  const end = addDaysIso(week, 6);
  const inWeek = useMemo(() => (q.data ?? []).filter((p) => p.scheduled_at && amsDate(p.scheduled_at) >= week && amsDate(p.scheduled_at) <= end), [q.data, week, end]);
  const noTime = useMemo(() => (q.data ?? []).filter((p) => !p.scheduled_at && (p.status === 'draft' || p.status === 'rejected')), [q.data]);
  const current = (q.data ?? []).find((p) => p.id === open) ?? null;
  const thisWeek = amsMonday(new Date());
  // "approve the week": every draft in this week with a time still ahead; each one is approved (and audited) on its own
  const qc = useQueryClient();
  const [approving, setApproving] = useState(false);
  const drafts = inWeek.filter((p) => p.status === 'draft');
  const approvable = drafts.filter((p) => Date.parse(p.scheduled_at!) > Date.now() + 60_000 && p.platforms.length > 0);
  const approveWeek = async () => {
    if (!confirm(t('confirm.approveWeek', { n: approvable.length }))) return;
    setApproving(true);
    let ok = 0;
    for (const p of approvable) {
      try {
        await rpc('social_approve', { _id: p.id, _scheduled_at: p.scheduled_at });
        ok++;
      } catch (e) {
        toast.error(`${p.source ?? p.id}: ${(e as Error).message}`);
      }
    }
    setApproving(false);
    if (ok) toast.success(t('msg.approvedWeek', { n: ok }));
    await qc.invalidateQueries({ queryKey: ['social-posts'] });
  };
  const weekLabel = new Date(week + 'T12:00:00Z').toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  if (q.isError) return <Notice tone="warn">Table social_posts not found – apply migration 024_social_posts.sql first. ({(q.error as Error).message})</Notice>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('intro')}</p>
      <Connection />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button className="btn-ghost btn-sm px-2" aria-label={t('week.prev')} onClick={() => setWeek(addDaysIso(week, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold">{t('week.of', { date: weekLabel })}</span>
          <button className="btn-ghost btn-sm px-2" aria-label={t('week.next')} onClick={() => setWeek(addDaysIso(week, 7))}>
            <ChevronRight className="h-4 w-4" />
          </button>
          {week !== thisWeek && (
            <button className="btn-ghost btn-sm" onClick={() => setWeek(thisWeek)}>
              {t('week.this')}
            </button>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost btn-sm" onClick={() => setDialog('import')}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> {t('import')}
          </button>
          <button className="btn-primary btn-sm" onClick={() => setDialog('new')}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> {t('new')}
          </button>
        </div>
      </div>
      {drafts.length > 0 && (
        <div className="panel flex flex-wrap items-center gap-3 border-volt/60 bg-volt/10 p-3 text-sm">
          <span className="flex-1">
            {t('week.drafts', { n: drafts.length })}
            {drafts.length > approvable.length && <span className="ml-1 text-muted">{t('week.pastDrafts', { n: drafts.length - approvable.length })}</span>}
          </span>
          {approvable.length > 0 && (
            <button className="btn-primary btn-sm" disabled={approving} onClick={approveWeek}>
              {t('act.approveWeek', { n: approvable.length })}
            </button>
          )}
        </div>
      )}
      {!q.data ? (
        <Spinner />
      ) : (
        <>
          <section className="panel overflow-hidden">
            {inWeek.length ? (
              <ul className="divide-y divide-line">
                {inWeek.map((p) => (
                  <PostRow key={p.id} p={p} onOpen={() => setOpen(p.id)} />
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted">{t('week.empty')}</p>
            )}
          </section>
          <section>
            <h2 className="mb-2 font-semibold">{t('noTime')}</h2>
            <div className="panel overflow-hidden">
              {noTime.length ? (
                <ul className="divide-y divide-line">
                  {noTime.map((p) => (
                    <PostRow key={p.id} p={p} onOpen={() => setOpen(p.id)} />
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-muted">{t('noTime.empty')}</p>
              )}
            </div>
          </section>
        </>
      )}
      {current && <Detail key={current.id + current.status} p={current} onClose={() => setOpen(null)} />}
      {dialog === 'new' && <NewPost onClose={() => setDialog(null)} />}
      {dialog === 'import' && <ImportPackage onClose={() => setDialog(null)} />}
    </div>
  );
}
