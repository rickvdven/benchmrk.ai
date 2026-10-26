import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useMyGym, useProfileRow } from '../data/hooks';
import { supabase } from '../lib/supabase';
import { NICKNAME_RE } from '../lib/cards';
import { useCt } from '../lib/useCt';
import { Dialog } from './Dialog';

type Level = 'private' | 'gym';
const ERR: Record<string, string> = { nickname_taken: 'priv.nick.taken', nickname_invalid: 'priv.nick.invalid', nickname_blocked: 'priv.nick.blocked' };

/** Settings → Privacy: the nickname that goes on cards and leaderboards, and who sees what (Private is the default). */
export function PrivacySettings() {
  const c = useCt();
  const qc = useQueryClient();
  const nav = useNavigate();
  const prof = useProfileRow();
  const gym = useMyGym();
  const row = prof.data;
  const [nick, setNick] = useState(row?.nickname ?? '');
  const [nickErr, setNickErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<null | 'consent' | 'private'>(null);
  const [agree, setAgree] = useState(false);
  const level: Level = row?.visibility === 'gym' ? 'gym' : 'private';
  if (!row) return null;

  const refresh = () => qc.invalidateQueries({ queryKey: ['profile'] });
  const saveNick = async () => {
    const n = nick.trim();
    if (!NICKNAME_RE.test(n)) return setNickErr('priv.nick.invalid');
    setBusy(true);
    setNickErr(null);
    const { error } = await supabase.rpc('set_nickname', { _nick: n });
    setBusy(false);
    if (error) return setNickErr(Object.entries(ERR).find(([k]) => error.message.includes(k))?.[1] ?? 'priv.nick.invalid');
    await refresh();
    toast.success(c('priv.nick.saved'));
    // a card offer was waiting for the nickname: back to where it started
    if (sessionStorage.getItem('rox:card-pending')) nav('/cockpit');
  };
  const setLevel = async (next: Level, consent = false) => {
    setBusy(true);
    const { error } = await supabase.rpc('set_visibility', { _level: next, _consent: consent });
    setBusy(false);
    setDlg(null);
    setAgree(false);
    if (error) return toast.error(error.message.includes('nickname_required') ? c('share.nicknameMissing') : error.message);
    await refresh();
    toast.success(c('priv.saved'));
  };

  const opts: { v: Level | 'public'; name: string; badge?: string; sees: string; extra?: string; off?: boolean }[] = [
    { v: 'private', name: c('priv.private.name'), badge: c('priv.private.badge'), sees: c('priv.private.sees'), extra: c('priv.private.notOn') },
    { v: 'gym', name: c('priv.gym.name'), sees: c('priv.gym.sees'), extra: c('priv.gym.on') },
    { v: 'public', name: c('priv.public.name'), badge: c('priv.public.badge'), sees: c('priv.public.sees'), off: true },
  ];
  const sheet = 'rounded-[2px] border border-line bg-surface p-5 shadow-paper md:p-6';
  const h2 = 'text-[22px] font-extrabold uppercase leading-none tracking-[0.01em] [font-stretch:80%]';
  return (
    <div className="space-y-5">
      <section className={sheet} aria-labelledby="nk">
        <h2 id="nk" className={h2}>
          {c('priv.nick.label')}
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-2">{c('priv.nick.help')}</p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void saveNick();
          }}
        >
          <label className="bm-field min-w-0 flex-1" htmlFor="nick">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-3">{c('priv.nick.label')}</span>
            {nickErr && (
              <span role="alert" className="flex items-start gap-2 py-0.5 text-sm text-ink">
                <b className="mt-px shrink-0 border-[1.5px] border-ink px-1.5 font-mono text-[11px]">!</b>
                {c(nickErr)}
              </span>
            )}
            <input
              id="nick"
              className={clsx('bm-input !min-h-[44px] !text-[18px]', nickErr && 'bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(20,20,19,0.05)_6px_8px)]')}
              value={nick}
              maxLength={20}
              placeholder={c('priv.nick.placeholder')}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={nickErr ? true : undefined}
              aria-describedby="nick-help"
              onChange={(e) => {
                setNick(e.target.value);
                setNickErr(null);
              }}
            />
            <span id="nick-help" className="text-[13px] text-muted">
              {c('priv.nick.rules')}
            </span>
          </label>
          <button type="submit" disabled={busy || !nick.trim() || nick.trim() === (row.nickname ?? '')} className="inline-flex min-h-[48px] items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-ink px-6 font-bold text-ground disabled:cursor-not-allowed disabled:opacity-45">
            {c('priv.nick.save')}
          </button>
        </form>
      </section>

      <section className={sheet} aria-labelledby="ws">
        <h2 id="ws" className={h2}>
          {c('priv.title')}
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-2">{c('priv.intro')}</p>
        <div className="mt-4 grid gap-2.5" role="radiogroup" aria-labelledby="ws">
          {opts.map((o) => {
            const on = !o.off && level === o.v;
            return (
              <label key={o.v} className={clsx('flex cursor-pointer gap-3.5 rounded-[3px] border p-4', on ? 'border-ink shadow-[inset_0_0_0_1px_#141413] outline outline-[0.5px] outline-ink' : 'border-line', o.off && 'cursor-not-allowed opacity-55')}>
                <input
                  type="radio"
                  name="vis"
                  value={o.v}
                  checked={on}
                  disabled={o.off || busy}
                  className="mt-1 h-[22px] w-[22px] shrink-0 accent-ink"
                  onChange={() => {
                    if (o.v === 'gym' && level !== 'gym') setDlg('consent');
                    if (o.v === 'private' && level === 'gym') setDlg('private');
                  }}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-bold">
                    {o.name}
                    {o.badge && <span className="border-[1.5px] border-ink px-1.5 py-px font-mono text-[11px] font-semibold uppercase tracking-[0.06em]">{o.badge}</span>}
                  </div>
                  <p className="text-[15px] text-ink-2">{o.sees}</p>
                  {o.extra && <p className="mt-1.5 text-[13px] text-muted">{o.extra}</p>}
                </div>
              </label>
            );
          })}
        </div>
        <p className="mt-4 rounded-[2px] bg-surface-2 p-3.5 text-[15px]">
          <b>{c('priv.never.title')}:</b> {c('priv.never.body')}
        </p>
      </section>

      <Dialog open={dlg === 'consent'} onClose={() => (setDlg(null), setAgree(false))} labelledBy="consent-title" closeLabel={c('share.btn.close')}>
        <div className="p-5 pt-4 md:p-7">
          <h2 id="consent-title" className="pr-9 text-[30px] font-extrabold uppercase leading-[0.95] [font-stretch:72%]">
            {c('consent.title')}
          </h2>
          <p className="mt-3 text-[15px] text-ink-2">{gym.data ? c('consent.body', { gym: gym.data.name }) : c('consent.bodyNoGym')}</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px]">
            <input type="checkbox" className="mt-1 h-[22px] w-[22px] shrink-0 accent-ink" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>{c('consent.check')}</span>
          </label>
          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button type="button" className="inline-flex min-h-[48px] items-center justify-center rounded-[3px] border-[1.5px] border-ink px-5 font-bold" onClick={() => (setDlg(null), setAgree(false))}>
              {c('consent.btn.cancel')}
            </button>
            <button type="button" disabled={!agree || busy} className="inline-flex min-h-[48px] items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-accent px-5 font-bold disabled:cursor-not-allowed disabled:opacity-45" onClick={() => void setLevel('gym', true)}>
              {c('consent.btn.agree')}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dlg === 'private'} onClose={() => setDlg(null)} labelledBy="priv-title" closeLabel={c('share.btn.close')}>
        <div className="p-5 pt-4 md:p-7">
          <h2 id="priv-title" className="pr-9 text-[30px] font-extrabold uppercase leading-[0.95] [font-stretch:72%]">
            {c('priv.toPrivate.title')}
          </h2>
          <p className="mt-3 text-[15px] text-ink-2">{c('priv.toPrivate.confirm')}</p>
          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button type="button" className="inline-flex min-h-[48px] items-center justify-center rounded-[3px] border-[1.5px] border-ink px-5 font-bold" onClick={() => setDlg(null)}>
              {c('priv.toPrivate.cancel')}
            </button>
            <button type="button" disabled={busy} className="inline-flex min-h-[48px] items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-ink px-5 font-bold text-ground" onClick={() => void setLevel('private')}>
              {c('priv.toPrivate.btn')}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
