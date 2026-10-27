import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, env } from '../_lib/server';
import { send } from '../_lib/mail';
import { benchmarkMail, simpleMail, weeklyMail } from '../_lib/templates';
import { isComplete, type ProfileRow } from '../../src/data/mapping';
import { todayISO, dowOf, addDays } from '../../src/engine/index';

/** Daily job (Vercel Cron, 05:00 UTC): Monday weekly digest, benchmark reminder for tomorrow, trial ending. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization;
  if (env('CRON_SECRET') && auth !== `Bearer ${env('CRON_SECRET')}`) return res.status(401).json({ error: 'unauthorized' });
  const today = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayISO();
  const only = typeof req.query.user === 'string' ? req.query.user : null;
  const s = db();
  let q = s.from('profiles').select('*').eq('onboarded', true);
  if (only) q = q.eq('id', only);
  const { data: profiles, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  const { data: paywall } = await s.from('app_settings').select('value').eq('key', 'paywall_enabled').maybeSingle();
  // gym templates: members without their own copy follow the gym's sim build-up
  const { data: gyms } = await s.from('gyms').select('id, sim_protocols(protocol)');
  const gymProto = new Map((gyms ?? []).map((g) => [g.id as string, (g as { sim_protocols?: { protocol?: unknown } | null }).sim_protocols?.protocol ?? null]));
  const out: Record<string, number> = {};
  const bump = (k: string) => (out[k] = (out[k] ?? 0) + 1);

  for (const row of (profiles ?? []) as (ProfileRow & { email_prefs?: Record<string, boolean> })[]) {
    if (!isComplete(row) || !row.email || row.race_date! < today) continue;
    const gid = (row as { gym_id?: string | null }).gym_id;
    if (!row.sim_protocol && gid && gymProto.get(gid)) row.sim_protocol = gymProto.get(gid) as ProfileRow['sim_protocol'];
    const [{ data: entries }, { data: morning }, { data: versions }] = await Promise.all([
      s.from('session_entries').select('date,completed').eq('user_id', row.id),
      s.from('morning_checks').select('date,score').eq('user_id', row.id),
      s.from('user_plan_versions').select('rule_set_version,effective_from').eq('user_id', row.id).order('version_no'),
    ]);
    const ctx = {
      row,
      completed: Object.fromEntries((entries ?? []).filter((e) => e.completed).map((e) => [e.date, true])),
      morning: Object.fromEntries((morning ?? []).map((m) => [m.date, m.score])),
      today,
      versions,
    };
    try {
      if (dowOf(today) === 0 || req.query.force === 'weekly') {
        const m = weeklyMail(ctx);
        if (m) bump('weekly:' + (await send({ userId: row.id, to: row.email, kind: 'weekly', ref: m.ref, subject: m.subject, html: m.html, prefs: row.email_prefs })));
      }
      const b = benchmarkMail(ctx);
      if (b) bump('benchmark:' + (await send({ userId: row.id, to: row.email, kind: 'benchmark', ref: b.ref, subject: b.subject, html: b.html, prefs: row.email_prefs })));
      if (paywall?.value === true) {
        const { data: sub } = await s.from('subscriptions').select('status,valid_until').eq('user_id', row.id).maybeSingle();
        if (sub?.status === 'trial' && sub.valid_until === addDays(today, 2)) {
          const m = simpleMail(row, 'trial', { n: 2 });
          bump('trial:' + (await send({ userId: row.id, to: row.email, kind: 'trial', ref: sub.valid_until, subject: m.subject, html: m.html, prefs: row.email_prefs })));
        }
      }
    } catch (e) {
      bump('error');
      console.error(row.id, e);
    }
  }
  res.json({ date: today, users: profiles?.length ?? 0, ...out });
}
