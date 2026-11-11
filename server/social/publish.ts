import type { VercelRequest, VercelResponse } from '@vercel/node';
import { env, isAdmin, userFromRequest } from '../_lib/server';
import { tokenMatches } from '../_lib/socialAgent';
import { runPublishRound } from '../_lib/socialPublish';
import { roundDeps, secretsOf } from '../_lib/social';
import { metaConfig, redact } from '../_lib/meta';

/**
 * Publishes approved, due social posts (max 5 per call). Called every 5 minutes by pg_cron with
 * "Bearer <SOCIAL_CRON_SECRET>", or by an admin's "Post now" with their Supabase JWT.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  let ok = tokenMatches(req.headers.authorization, env('SOCIAL_CRON_SECRET'));
  if (!ok) {
    const user = await userFromRequest(req.headers.authorization);
    ok = !!user && (await isAdmin(user.id));
  }
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  try {
    const processed = await runPublishRound(roundDeps());
    return res.json({ processed });
  } catch (e) {
    console.error('social publish:', redact(String((e as Error).message), secretsOf(metaConfig())));
    return res.status(500).json({ error: 'server_error' });
  }
}
