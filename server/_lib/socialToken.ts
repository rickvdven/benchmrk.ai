import { db, APP_URL } from './server';
import { layout, rows, send } from './mail';
import { checkToken, graphClient, metaConfig, redact } from './meta';
import { OPS_MAIL, secretsOf } from './social';

/**
 * Daily check of the Meta token (/debug_token). The result goes to the admin audit log (Admin → Social shows the
 * live status); a problem is mailed to info@benchmrk.ai. Does nothing while no token is set.
 */
export async function checkSocialToken() {
  const cfg = metaConfig();
  if (!cfg.token) return null;
  const r = await checkToken(cfg, graphClient(cfg));
  const problems = r.problems.map((p) => redact(p, secretsOf(cfg)));
  await db().from('admin_audit_log').insert({ actor: null, action: 'social.token_check', target_type: 'meta_token', target_id: null, details: { ok: r.ok, problems, type: r.type ?? null } });
  if (!r.ok) {
    const html = layout({
      title: 'Meta-koppeling heeft een probleem',
      intro: 'De dagelijkse controle van het Meta-token voor Instagram en Facebook gaf een probleem. Geplande posts worden mogelijk niet geplaatst.',
      bodyHtml: rows(problems.map((p) => ['Probleem', p] as [string, string])),
      cta: { label: 'Open Admin → Social', url: `${APP_URL()}/admin/social` },
      footer: 'Automatische melding van Benchmrk.',
    });
    await send({ userId: null, to: OPS_MAIL, kind: 'social', subject: 'Meta-koppeling: token controleren', html, force: true });
  }
  return { ok: r.ok, problems };
}
