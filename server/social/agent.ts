import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAgent } from '../_lib/socialAgent';
import { agentDeps, jsonBody } from '../_lib/social';
import { redact } from '../_lib/meta';
import { env } from '../_lib/server';

/** API for the social agent: drafts only (upload-url, create, list, cancel). See server/_lib/socialAgent.ts. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const r = await handleAgent(req.headers.authorization, jsonBody(req.body), agentDeps());
    return res.status(r.status).json(r.json);
  } catch (e) {
    console.error('social agent:', redact(String((e as Error).message), [env('SOCIAL_AGENT_TOKEN')]));
    return res.status(500).json({ error: 'server_error' });
  }
}
