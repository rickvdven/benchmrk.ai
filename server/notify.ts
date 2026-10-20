import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, isAdmin, userFromRequest } from './_lib/server';
import { send } from './_lib/mail';
import { simpleMail } from './_lib/templates';
import { toProfile, type ProfileRow } from '../src/data/mapping';
import { daysBetween, mondayOf, todayISO } from '../src/engine/index';

/** App-triggered mails. Body: { kind: 'welcome' | 'team_joined' | 'payment_approved' | 'test', userId? } */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await userFromRequest(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { kind, userId } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};
  const s = db();
  const prof = async (id: string) => (await s.from('profiles').select('*').eq('id', id).maybeSingle()).data as (ProfileRow & { email_prefs?: Record<string, boolean> }) | null;

  if (kind === 'welcome') {
    const row = await prof(user.id);
    if (!row?.email || !row.onboarded) return res.json({ result: 'skipped' });
    const p = toProfile(row);
    const weeks = Math.max(1, Math.floor(daysBetween(mondayOf(todayISO()), p.raceDate) / 7) + 1);
    const m = simpleMail(row, 'welcome', { name: row.display_name ?? '', weeks, race: p.raceName });
    return res.json({ result: await send({ userId: row.id, to: row.email, kind: 'welcome', ref: 'once', subject: m.subject, html: m.html, prefs: row.email_prefs }) });
  }
  if (kind === 'team_joined') {
    const me = await prof(user.id);
    if (!me?.team_id) return res.json({ result: 'skipped' });
    const { data: team } = await s.from('teams').select('*').eq('id', me.team_id).maybeSingle();
    const partnerId = team ? (team.athlete_1 === user.id ? team.athlete_2 : team.athlete_1) : null;
    const partner = partnerId ? await prof(partnerId) : null;
    if (!partner?.email) return res.json({ result: 'skipped' });
    const m = simpleMail(partner, 'team', { name: me.display_name ?? '' });
    return res.json({ result: await send({ userId: partner.id, to: partner.email, kind: 'team', ref: team!.id, subject: m.subject, html: m.html, prefs: partner.email_prefs }) });
  }
  if (kind === 'payment_approved' || kind === 'test') {
    if (!(await isAdmin(user.id))) return res.status(403).json({ error: 'forbidden' });
    const target = await prof(kind === 'test' ? user.id : userId);
    if (!target?.email) return res.json({ result: 'skipped' });
    if (kind === 'test') {
      const m = simpleMail(target, 'test');
      return res.json({ result: await send({ userId: target.id, to: target.email, kind: 'test', subject: m.subject, html: m.html, force: true }) });
    }
    const { data: sub } = await s.from('subscriptions').select('valid_until').eq('user_id', target.id).maybeSingle();
    const m = simpleMail(target, 'payment', { date: sub?.valid_until ?? '' });
    const result = await send({ userId: target.id, to: target.email, kind: 'payment', ref: sub?.valid_until ?? 'x', subject: m.subject, html: m.html });
    // tell the referrer what they earned (months or commission) — once per reward event
    const { data: ev } = await s.from('referral_events').select('id, referrer, kind, months, amount_cents').eq('friend', target.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (ev) {
      const referrer = await prof(ev.referrer);
      const { data: rs } = await s.from('subscriptions').select('valid_until').eq('user_id', ev.referrer).maybeSingle();
      if (referrer?.email) {
        const amount = `€${(ev.amount_cents / 100).toFixed(2).replace('.', ',')}`;
        const rm = simpleMail(referrer, ev.kind === 'commission' ? 'commission' : 'referral', { name: target.display_name ?? '', months: ev.months, date: rs?.valid_until ?? '', amount });
        await send({ userId: referrer.id, to: referrer.email, kind: 'referral', ref: ev.id, subject: rm.subject, html: rm.html });
      }
    }
    return res.json({ result });
  }
  res.status(400).json({ error: 'unknown kind' });
}
