import type { VercelRequest, VercelResponse } from '@vercel/node';
import { env, isAdmin, userFromRequest } from './_lib/server';

/** Text-to-speech via Gemini TTS. Admin only (costs money). Returns audio/wav. */
const VOICES = ['Kore', 'Sulafat', 'Achird', 'Puck', 'Charon', 'Aoede'] as const;
const MAX_CHARS = 2500; // ~2–3 min of speech; keeps the WAV under Vercel's 4.5 MB response limit

/** Gemini returns raw 16-bit PCM (mono, 24 kHz by default) — wrap it in a WAV header. */
function pcmToWav(pcm: Buffer, rate = 24000, channels = 1, bits = 16) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE((rate * channels * bits) / 8, 28);
  h.writeUInt16LE((channels * bits) / 8, 32);
  h.writeUInt16LE(bits, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const PRIMARY = () => env('GEMINI_TTS_MODEL') || 'gemini-3.8-flash-tts';
const FALLBACK = 'gemini-2.5-flash-preview-tts';

/** Style first, then the text. 2.5 understands "{style}: {text}"; newer models read that aloud, so they get "[style]\n{text}". */
function buildPrompt(model: string, style: string, text: string) {
  const s = style.replace(/[:.\s]+$/, '') || 'Spreek in het Nederlands';
  return model.startsWith('gemini-2.5') ? `${s}: ${text}` : `[${s}]\n${text}`;
}

async function gemini(model: string, style: string, text: string, voice: string, withLang: boolean) {
  const speechConfig: Record<string, unknown> = { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } };
  if (withLang) speechConfig.languageCode = 'nl-NL';
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(model, style, text) }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig } }),
  });
}

/** Tries the primary model (with retries on overload), then the 2.5 preview model. */
async function synthesize(style: string, text: string, voice: string) {
  let last = '';
  for (const model of [PRIMARY(), FALLBACK]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let r = await gemini(model, style, text, voice, true);
      if (r.status === 400) {
        const msg = await r.text();
        if (!/language/i.test(msg)) return { error: `gemini 400: ${msg.slice(0, 300)}` };
        r = await gemini(model, style, text, voice, false);
      }
      if (r.ok) {
        const j = (await r.json()) as { candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] };
        const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
        if (part?.data) return { part, model };
        last = 'no audio in response';
        break;
      }
      last = `${model} ${r.status}: ${(await r.text()).slice(0, 200)}`;
      if (![429, 500, 503].includes(r.status)) break;
      await new Promise((ok) => setTimeout(ok, 1500 * (attempt + 1)));
    }
  }
  return { error: last };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const user = await userFromRequest(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!(await isAdmin(user.id))) return res.status(403).json({ error: 'forbidden' });
  if (!env('GEMINI_API_KEY')) return res.status(503).json({ error: 'GEMINI_API_KEY is not configured' });

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};
  const text = String(body.text ?? '').trim();
  const style = String(body.style ?? '').trim();
  const voice = VOICES.includes(body.voice) ? String(body.voice) : 'Kore';
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (text.length > MAX_CHARS) return res.status(400).json({ error: `text too long (max ${MAX_CHARS} characters)` });

  const out = await synthesize(style, text, voice);
  if ('error' in out) return res.status(502).json({ error: out.error });
  const raw = Buffer.from(out.part.data!, 'base64');
  // newer models already return a WAV file; older ones return raw 16-bit PCM
  const isWav = raw.subarray(0, 4).toString() === 'RIFF';
  const rate = Number(/rate=(\d+)/.exec(out.part.mimeType ?? '')?.[1] ?? 24000);
  const wav = isWav ? raw : pcmToWav(raw, rate);
  res.setHeader('X-TTS-Model', out.model);
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Disposition', `inline; filename="roxengine-${voice.toLowerCase()}.wav"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(wav);
}
