import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { fmtHms } from '../engine';
import { useProfileRow } from '../data/hooks';
import { absoluteCardLink, createCard, deleteCard, downloadBlob, fetchCardImage, shareCardFile, warmCard } from '../lib/cardApi';
import type { OfferSpec } from '../lib/cardOffers';
import { captionsFor, whatsappFor } from '../lib/cardTexts';
import { CARD_SIZE, fmtDelta, cardImageUrl, type CardData, type CardFormat } from '../lib/cards';
import { useCt } from '../lib/useCt';
import { Dialog } from './Dialog';

const PENDING = 'rox:card-pending';
const FORMATS: { f: CardFormat; key: string }[] = [
  { f: 'story', key: 'share.format.story' },
  { f: 'square', key: 'share.format.square' },
  { f: 'og', key: 'share.format.link' },
];

interface Ctx {
  /** Opens the dialog that offers a card; resolves nothing, the dialog handles the rest. */
  offer: (spec: OfferSpec) => void;
}
const OfferContext = createContext<Ctx>({ offer: () => undefined });
export const useCardOffer = () => useContext(OfferContext);

/** Mounted once in the layout: any screen can offer a card, and a card offer interrupted for the nickname resumes afterwards. */
export function CardOfferProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<OfferSpec | null>(null);
  const prof = useProfileRow();
  const loc = useLocation();
  const offer = useCallback((s: OfferSpec) => setSpec(s), []);
  // after choosing a nickname in Settings the offer that was waiting for it opens again
  useEffect(() => {
    if (!prof.data?.nickname || loc.pathname === '/settings') return;
    try {
      const raw = sessionStorage.getItem(PENDING);
      if (!raw) return;
      sessionStorage.removeItem(PENDING);
      setSpec(JSON.parse(raw) as OfferSpec);
    } catch {
      /* ignore */
    }
  }, [prof.data?.nickname, loc.pathname]);
  const value = useMemo(() => ({ offer }), [offer]);
  return (
    <OfferContext.Provider value={value}>
      {children}
      {spec && <OfferDialog spec={spec} onClose={() => setSpec(null)} />}
    </OfferContext.Provider>
  );
}

function OfferDialog({ spec, onClose }: { spec: OfferSpec; onClose: () => void }) {
  const c = useCt();
  const nav = useNavigate();
  const prof = useProfileRow();
  const nickname = prof.data?.nickname ?? null;
  const [fmt, setFmt] = useState<CardFormat>('story');
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(nickname ? 'loading' : 'ready');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [capIx, setCapIx] = useState(0);
  const creating = useRef(false);
  const acted = useRef(false);
  const codeRef = useRef<string | null>(null);
  codeRef.current = code;

  const make = useCallback(async () => {
    if (creating.current) return;
    creating.current = true;
    setState('loading');
    try {
      const k = await createCard(spec.type, spec.data);
      setCode(k);
      setImgLoaded(false);
      setState('ready');
    } catch {
      setState('error');
    } finally {
      creating.current = false;
    }
  }, [spec]);
  useEffect(() => {
    if (nickname && !codeRef.current) void make();
  }, [nickname, make]);

  // a card nobody shared, saved or copied is removed again when the dialog closes
  const close = useCallback(() => {
    if (codeRef.current && !acted.current) void deleteCard(codeRef.current);
    onClose();
  }, [onClose]);

  const data = spec.data as CardData;
  const dataFull: CardData = { ...data, nickname: nickname ?? '', division: '' };
  const titleKey = { prediction: 'share.offer.pred.title', benchmark_pr: 'share.offer.pr.title', progress: 'share.offer.prog.title', challenge: 'share.offer.ch.title' }[spec.type];
  const bodyKey = { prediction: 'share.offer.pred.body', benchmark_pr: 'share.offer.pr.body', progress: 'share.offer.prog.body', challenge: 'share.offer.ch.body.pr' }[spec.type];
  const params = {
    time: fmtHms(data.time),
    n: data.n ?? '',
    delta: spec.type === 'benchmark_pr' ? fmtDelta((data.new ?? 0) - (data.old ?? 0)) : fmtDelta((data.time ?? 0) - (data.start ?? 0)),
    weeks: data.week ?? '',
    week: data.week ?? '',
    result: data.result ?? '',
  };
  const link = code ? absoluteCardLink(code) : '';
  const [W, H] = CARD_SIZE[fmt];
  const ready = state === 'ready' && !!code;

  const act = async (fn: () => Promise<void> | void) => {
    if (!acted.current && codeRef.current) warmCard(codeRef.current);
    acted.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      toast.error(c('share.error.render'));
    } finally {
      setBusy(false);
    }
  };
  const file = () => `benchmrk-${code}-${fmt}.png`;

  const goNickname = () => {
    try {
      sessionStorage.setItem(PENDING, JSON.stringify(spec));
    } catch {
      /* ignore */
    }
    onClose();
    nav('/settings?tab=privacy');
  };

  const nickMissing = !nickname;
  return (
    <Dialog open onClose={close} labelledBy="share-title" wide closeLabel={c('share.btn.close')}>
      <div className="grid gap-5 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-8 md:p-7">
        <div className="flex min-h-0 items-center justify-center rounded-[2px] bg-surface-2 p-3.5 md:min-h-[420px] md:p-6">
          {nickMissing || state === 'error' ? (
            <div className="max-w-[260px] py-6 text-center">
              <h3 className="text-[22px] font-extrabold uppercase leading-none [font-stretch:80%]">{c('share.error.title')}</h3>
              <p className="mt-2 text-sm text-ink-2">{nickMissing ? c('share.nicknameMissing') : c('share.error.render')}</p>
              {state === 'error' && (
                <button type="button" className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-[3px] border-[1.5px] border-ink px-5 font-bold" onClick={() => void make()}>
                  {c('share.error.retry')}
                </button>
              )}
            </div>
          ) : (
            <div className="relative w-full overflow-hidden shadow-[0_10px_30px_rgba(20,20,19,0.18)]" style={{ aspectRatio: `${W} / ${H}`, maxWidth: fmt === 'story' ? 250 : fmt === 'square' ? 360 : 420 }}>
              {(!ready || !imgLoaded) && (
                <div className="absolute inset-0 flex flex-col gap-3.5 border border-line bg-surface p-5" role="status" aria-label={c('share.loading')}>
                  <span className="block h-4 w-3/5 bg-surface-2" />
                  <span className="block h-14 bg-surface-2" />
                  <span className="block h-3 w-4/5 bg-surface-2" />
                  <span className="mt-auto font-mono text-[13px] text-muted">{c('share.loading')}</span>
                </div>
              )}
              {ready && (
                <img
                  key={`${code}-${fmt}`}
                  src={cardImageUrl(code!, fmt)}
                  alt={c('share.preview.title', { format: c(FORMATS.find((x) => x.f === fmt)!.key) })}
                  width={W}
                  height={H}
                  className={clsx('absolute inset-0 h-full w-full', imgLoaded ? 'opacity-100' : 'opacity-0')}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setState('error')}
                />
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h2 id="share-title" className="pr-9 text-[28px] font-extrabold uppercase leading-[0.95] [font-stretch:72%] md:text-[34px]">
            {c(titleKey, params)}
          </h2>
          <p className="mt-1.5 text-ink-2">{c(bodyKey, params)}</p>

          {!nickMissing && (
            <>
              <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-ink-3">{c('share.format.label')}</p>
              <div role="tablist" aria-label={c('share.format.label')} className="mt-1.5 flex overflow-hidden rounded-[3px] border-[1.5px] border-ink">
                {FORMATS.map((x) => (
                  <button
                    key={x.f}
                    role="tab"
                    type="button"
                    aria-selected={fmt === x.f}
                    onClick={() => {
                      setFmt(x.f);
                      setImgLoaded(false);
                    }}
                    className={clsx('min-h-[44px] flex-1 whitespace-nowrap px-3.5 py-2.5 font-bold', fmt === x.f ? 'bg-ink text-ground' : 'text-ink')}
                  >
                    {c(x.key)}
                  </button>
                ))}
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[15px]">
                <span>{c('share.nicknameHint', { name: nickname })}</span>
                <button type="button" className="inline-flex min-h-[44px] items-center underline underline-offset-4" onClick={goNickname}>
                  {c('share.nicknameChange')}
                </button>
              </p>
            </>
          )}

          {nickMissing ? (
            <>
              <p className="mt-4 flex items-start gap-2 text-sm">
                <b className="mt-px shrink-0 border-[1.5px] border-ink px-1.5 font-mono text-[11px]">!</b>
                <span>{c('share.nicknameMissing')}</span>
              </p>
              <button type="button" className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-[3px] bg-ink font-bold text-ground" onClick={goNickname}>
                {c('share.nicknameBtn')}
              </button>
            </>
          ) : (
            <div className="sticky bottom-0 -mx-4 mt-5 grid grid-cols-2 gap-2.5 bg-ground px-4 py-2.5 md:static md:mx-0 md:bg-transparent md:p-0">
              <button
                type="button"
                disabled={!ready || busy}
                className="inline-flex min-h-[52px] items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-accent px-5 font-bold disabled:cursor-not-allowed disabled:opacity-45 md:min-h-[48px]"
                onClick={() =>
                  act(async () => {
                    const blob = await fetchCardImage(code!, fmt);
                    const shared = await shareCardFile(blob, file(), whatsappFor(spec.type, dataFull, link));
                    if (!shared) toast(c('share.error.noShare'));
                  })
                }
              >
                {c('share.btn.share')}
              </button>
              <button
                type="button"
                disabled={!ready || busy}
                className="inline-flex min-h-[52px] items-center justify-center rounded-[3px] border-[1.5px] border-ink px-5 font-bold disabled:cursor-not-allowed disabled:opacity-45 md:min-h-[48px]"
                onClick={() =>
                  act(async () => {
                    downloadBlob(await fetchCardImage(code!, fmt), file());
                    toast.success(c('share.toast.saved'));
                  })
                }
              >
                {c('share.btn.save')}
              </button>
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap gap-x-5">
            {!nickMissing && (
              <>
                <button
                  type="button"
                  disabled={!ready}
                  className="min-h-[44px] py-2.5 text-ink-2 underline underline-offset-4 disabled:opacity-45"
                  onClick={() =>
                    act(async () => {
                      await navigator.clipboard.writeText(link);
                      toast.success(c('share.toast.linkCopied'));
                    })
                  }
                >
                  {c('share.btn.copyLink')}
                </button>
                <button
                  type="button"
                  disabled={!ready}
                  className="min-h-[44px] py-2.5 text-ink-2 underline underline-offset-4 disabled:opacity-45"
                  onClick={() =>
                    act(async () => {
                      const caps = captionsFor(spec.type, dataFull, { weeksAgo: spec.weeksAgo });
                      await navigator.clipboard.writeText(caps[capIx % caps.length]);
                      setCapIx((i) => i + 1);
                      toast.success(c('share.toast.captionCopied'));
                    })
                  }
                >
                  {c('share.btn.copyCaption')}
                </button>
              </>
            )}
            <button type="button" className="ml-auto min-h-[44px] py-2.5 text-ink-2 underline underline-offset-4" onClick={close}>
              {c('share.btn.later')}
            </button>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">{c('share.private')}</p>
        </div>
      </div>
    </Dialog>
  );
}
