import { db, env, APP_URL, unsubUrl } from './server';

export type MailKind = 'weekly' | 'benchmark' | 'team' | 'payment' | 'welcome' | 'trial' | 'test' | 'referral';
/** Which preference switch controls a mail kind ('account' mails cannot be switched off except welcome). */
export const PREF: Record<MailKind, string> = { weekly: 'weekly', benchmark: 'reminders', trial: 'reminders', team: 'team', payment: 'account', welcome: 'account', test: 'account', referral: 'account' };

async function setting(key: string) {
  const { data } = await db().from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value as unknown;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function layout(opts: { title: string; intro: string; bodyHtml: string; cta?: { label: string; url: string }; footer: string; unsub?: string; unsubLabel?: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0b0c0e;font-family:Helvetica,Arial,sans-serif;color:#eceef0">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0c0e;padding:24px 0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#14161a;border:1px solid #2c3037;border-radius:12px">
<tr><td style="padding:24px 28px 8px;font-size:18px;font-weight:800;letter-spacing:-0.3px">BENCH<span style="color:#d4ff3a">MRK</span></td></tr>
<tr><td style="padding:8px 28px 0"><h1 style="margin:0 0 8px;font-size:22px;line-height:1.25">${esc(opts.title)}</h1>
<p style="margin:0 0 16px;color:#a0a6af;font-size:15px;line-height:1.5">${esc(opts.intro)}</p>${opts.bodyHtml}</td></tr>
${opts.cta ? `<tr><td style="padding:8px 28px 24px"><a href="${opts.cta.url}" style="display:inline-block;background:#d4ff3a;color:#000;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">${esc(opts.cta.label)}</a></td></tr>` : ''}
<tr><td style="padding:16px 28px 24px;border-top:1px solid #2c3037;color:#a0a6af;font-size:12px;line-height:1.5">${esc(opts.footer)}${opts.unsub ? ` · <a href="${opts.unsub}" style="color:#a0a6af">${esc(opts.unsubLabel ?? 'Unsubscribe')}</a>` : ''}</td></tr>
</table></td></tr></table></body></html>`;
}

export const rows = (items: [string, string][]) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:0 0 12px">${items
    .map(([a, b]) => `<tr><td style="padding:7px 0;border-top:1px solid #2c3037;color:#eceef0">${esc(a)}</td><td style="padding:7px 0;border-top:1px solid #2c3037;color:#a0a6af;text-align:right">${esc(b)}</td></tr>`)
    .join('')}</table>`;

export interface SendArgs {
  userId: string | null;
  to: string;
  kind: MailKind;
  ref?: string; // dedupe key per user+kind
  subject: string;
  html: string;
  prefs?: Record<string, boolean> | null;
  force?: boolean;
}

/** Sends via Resend once per (user, kind, ref). Returns 'sent' | 'skipped' | 'disabled' | 'error'. */
export async function send(a: SendArgs): Promise<string> {
  if ((await setting('mail_enabled')) === false) return 'disabled';
  if (!env('RESEND_API_KEY')) return 'disabled';
  if (!a.force && a.prefs && a.prefs[PREF[a.kind]] === false) return 'skipped';
  const ref = a.ref ?? new Date().toISOString().slice(0, 10);
  if (a.userId && !a.force) {
    const { error } = await db().from('mail_log').insert({ user_id: a.userId, kind: a.kind, ref, status: 'sending' });
    if (error) return 'skipped'; // unique violation = already sent
  }
  const from = String((await setting('mail_from')) ?? 'Benchmrk <noreply@benchmrk.ai>');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [a.to],
      subject: a.subject,
      html: a.html,
      headers: a.userId && PREF[a.kind] !== 'account' ? { 'List-Unsubscribe': `<${unsubUrl(a.userId, PREF[a.kind])}>` } : undefined,
    }),
  });
  const ok = r.ok;
  const err = ok ? null : (await r.text()).slice(0, 300);
  if (a.userId) {
    if (a.force) await db().from('mail_log').insert({ user_id: a.userId, kind: a.kind, ref: `${ref}:${Date.now()}`, status: ok ? 'sent' : 'error', error: err });
    else await db().from('mail_log').update({ status: ok ? 'sent' : 'error', error: err }).match({ user_id: a.userId, kind: a.kind, ref });
  }
  return ok ? 'sent' : 'error';
}

export { APP_URL, unsubUrl };
