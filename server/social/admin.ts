import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAdmin, userFromRequest } from '../_lib/server';
import { checkToken, graphClient, metaConfig, MetaError, redact } from '../_lib/meta';
import { jsonBody, secretsOf } from '../_lib/social';

/**
 * Admin → Social: connection status and "Test connection". Admin JWT only. Never returns the token: only whether it
 * is set, the page and Instagram ids, and the publishing quota.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const user = await userFromRequest(req.headers.authorization);
  if (!user || !(await isAdmin(user.id))) return res.status(401).json({ error: 'unauthorized' });
  const cfg = metaConfig();
  const secrets = secretsOf(cfg);
  const { action } = jsonBody(req.body) as { action?: string };
  const configured = { token: !!cfg.token, appSecret: !!cfg.appSecret, pageId: cfg.pageId || null, igUserId: cfg.igUserId || null };
  if (!cfg.token) return res.json({ configured, ok: false, problems: ['token_missing'] });
  try {
    const graph = graphClient(cfg);
    if (action === 'test') {
      // a user or system user token lists its pages; a page token is the page itself
      const fields = 'id,name,instagram_business_account{id,username}';
      const acc = (await graph('GET', 'me/accounts', { fields })) as { data?: { id: string; name: string; instagram_business_account?: { id: string; username?: string } }[] };
      let pages = acc.data ?? [];
      if (!pages.length) {
        const me = (await graph('GET', 'me', { fields })) as { id: string; name: string; instagram_business_account?: { id: string; username?: string } };
        pages = [me];
      }
      return res.json({
        configured,
        pages: pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username ?? null } : null })),
      });
    }
    const token = await checkToken(cfg, graph);
    let quota: { used: number; total: number } | null = null;
    if (cfg.igUserId) {
      try {
        const l = (await graph('GET', `${cfg.igUserId}/content_publishing_limit`, { fields: 'quota_usage,config' })) as { data?: { quota_usage?: number; config?: { quota_total?: number } }[] };
        const d = l.data?.[0];
        if (d) quota = { used: d.quota_usage ?? 0, total: d.config?.quota_total ?? 100 };
      } catch (e) {
        token.problems.push(e instanceof MetaError ? e.toString() : 'quota');
      }
    }
    return res.json({ configured, ok: token.ok, problems: token.problems.map((p) => redact(p, secrets)), quota });
  } catch (e) {
    return res.json({ configured, ok: false, problems: [redact(e instanceof MetaError ? e.toString() : String((e as Error).message), secrets)] });
  }
}
