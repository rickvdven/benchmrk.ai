import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { db, env, userFromRequest } from './_lib/server';

const AREAS = ['achilles', 'plantar', 'shin', 'knee', 'hamstring', 'hip', 'back', 'shoulder', 'wrist'];
const LANG: Record<string, string> = { en: 'English', nl: 'Dutch', de: 'German', es: 'Spanish', ko: 'Korean' };

const prompt = (lang: string, session: string, rpe: number | null, notes: string) => `You read a HYROX athlete's own notes about one training session and extract signals for a rule-based coaching app.
Planned session: ${session}
Logged RPE: ${rpe ?? 'not given'}
Athlete's notes (verbatim, may be in any language): """${notes.slice(0, 2000)}"""

Return ONLY JSON:
{"pain": boolean, "area": one of ${JSON.stringify(AREAS)} or null, "severity": 0-10 or null, "stopped": boolean, "tooFast": boolean, "shot": boolean, "summary": string, "advice": string[]}
- pain: true only if the athlete reports pain, an injury, a strain, cramp or something that "shot in" during/after the session. Normal fatigue or "heavy legs" is NOT pain. "achilles" covers calf and Achilles.
- stopped: true if they had to stop, walk, or could not continue/finish the session as planned.
- tooFast: true if they say they started or went too fast.
- shot: true if they describe something sudden: a "shot", "pop", "kick", snap or sudden sharp pain (possible tear/rupture).
- summary: ONE short sentence in ${LANG[lang] ?? 'English'} saying what happened, in second person ("You ...").
- advice: at most 3 short, cautious, practical tips in ${LANG[lang] ?? 'English'} for the coming days, specific to what they wrote. No diagnosis, no medication. If pain: include when to see a physio.
Do not repeat the notes. Do not invent facts.`;

export const notesHash = (s: string) => crypto.createHash('sha1').update(s.trim()).digest('hex').slice(0, 16);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await userFromRequest(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!env('ANTHROPIC_API_KEY')) return res.status(503).json({ error: 'not_configured' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const date = String(body?.date ?? '');
  const lang = String(body?.lang ?? 'en');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'bad_date' });
  const { data: e } = await db().from('session_entries').select('id,notes,planned,rpe,notes_ai').eq('user_id', user.id).eq('date', date).maybeSingle();
  const notes = (e?.notes ?? '').trim();
  if (!e || notes.length < 15) return res.status(400).json({ error: 'no_notes' });
  const hash = notesHash(notes + lang);
  if (e.notes_ai?.hash === hash) return res.json(e.notes_ai);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db().from('ai_scans').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  const { data: lim } = await db().from('app_settings').select('value').eq('key', 'ai_scan_daily_limit').maybeSingle();
  if ((count ?? 0) >= Number(lim?.value ?? 20)) return res.status(429).json({ error: 'limit' });
  const p = (e.planned ?? {}) as { type?: string; title?: string; description?: string };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env('ANTHROPIC_MODEL') || 'claude-haiku-5-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt(lang, `${p.type ?? ''} – ${p.title ?? ''}: ${(p.description ?? '').slice(0, 400)}`, e.rpe, notes) }],
      }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as { content: { type: string; text?: string }[] };
    const text = j.content.find((c) => c.type === 'text')?.text ?? '';
    const x = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const out = {
      pain: !!x.pain,
      area: AREAS.includes(x.area) ? x.area : null,
      severity: Number.isFinite(x.severity) ? Math.max(0, Math.min(10, Number(x.severity))) : null,
      stopped: !!x.stopped,
      tooFast: !!x.tooFast,
      shot: !!x.shot,
      summary: String(x.summary ?? '').slice(0, 300),
      advice: (Array.isArray(x.advice) ? x.advice : []).slice(0, 3).map((a: unknown) => String(a).slice(0, 240)),
      source: 'ai',
      hash,
    };
    await db().from('session_entries').update({ notes_ai: out }).eq('id', e.id);
    await db().from('ai_scans').insert({ user_id: user.id, ok: true });
    res.json(out);
  } catch (err) {
    await db().from('ai_scans').insert({ user_id: user.id, ok: false });
    res.status(502).json({ error: 'ai_failed', detail: String((err as Error).message).slice(0, 200) });
  }
}
