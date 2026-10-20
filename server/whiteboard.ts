import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, env, userFromRequest } from './_lib/server';

const PROMPT = `You read a photo of a gym whiteboard with a HYROX / functional fitness workout.
Return ONLY JSON: {"description": string, "work": string}.
"description": the workout as written, one line per block (e.g. "4 rounds: 1 km run, 20 wall balls 6 kg, 15 cal ski").
"work": the scheme in short form (rounds/reps/loads/time cap) or "" if not visible.
If the photo is not a workout, return {"description":"","work":""}.`;

async function anthropic(b64: string, mime: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env('ANTHROPIC_MODEL') || 'claude-haiku-5-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }, { type: 'text', text: PROMPT }] }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { content: { type: string; text?: string }[] };
  return j.content.find((c) => c.type === 'text')?.text ?? '';
}

async function openai(dataUrl: string) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('OPENAI_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env('OPENAI_MODEL') || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] }],
    }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { choices: { message: { content: string } }[] };
  return j.choices[0]?.message.content ?? '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await userFromRequest(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!env('ANTHROPIC_API_KEY') && !env('OPENAI_API_KEY')) return res.status(503).json({ error: 'not_configured' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const image: string = body?.image ?? '';
  const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m || image.length > 4_500_000) return res.status(400).json({ error: 'bad_image' });
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db().from('ai_scans').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  const { data: lim } = await db().from('app_settings').select('value').eq('key', 'ai_scan_daily_limit').maybeSingle();
  if ((count ?? 0) >= Number(lim?.value ?? 20)) return res.status(429).json({ error: 'limit' });
  try {
    const text = env('ANTHROPIC_API_KEY') ? await anthropic(m[2], m[1]) : await openai(image);
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    await db().from('ai_scans').insert({ user_id: user.id, ok: true });
    res.json({ description: String(json.description ?? ''), work: String(json.work ?? '') });
  } catch (e) {
    await db().from('ai_scans').insert({ user_id: user.id, ok: false });
    res.status(502).json({ error: 'scan_failed', detail: String((e as Error).message).slice(0, 200) });
  }
}
