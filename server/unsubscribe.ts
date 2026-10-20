import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { db, unsubToken, APP_URL } from './_lib/server';

const KINDS = ['weekly', 'reminders', 'team'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const u = String(req.query.u ?? '');
  const k = String(req.query.k ?? '');
  const t = String(req.query.t ?? '');
  const ok = KINDS.includes(k) && t.length === 32 && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(unsubToken(u, k)));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!ok) return res.status(400).send('<p style="font-family:sans-serif">Invalid link.</p>');
  const { data } = await db().from('profiles').select('email_prefs').eq('id', u).maybeSingle();
  const prefs = { ...(data?.email_prefs ?? {}), [k]: false };
  await db().from('profiles').update({ email_prefs: prefs }).eq('id', u);
  res.send(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="background:#0b0c0e;color:#eceef0;font-family:sans-serif;padding:40px;text-align:center"><h2>✓ Unsubscribed / Afgemeld</h2><p>You can change e-mail settings any time in <a style="color:#d4ff3a" href="${APP_URL()}/settings">Settings</a>.</p></body>`);
}
