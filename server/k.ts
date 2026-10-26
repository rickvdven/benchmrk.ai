import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from './_lib/server';
import { CODE_RE, type CardData, type CardType } from '../src/lib/cards';
import { ogFallback, ogFor } from '../src/lib/cardTexts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The built app shell: from the deployment's files when they are bundled, otherwise fetched from the site itself. */
async function appShell(origin: string): Promise<string> {
  try {
    return await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  } catch {
    const r = await fetch(`${origin}/index.html`);
    if (!r.ok) throw new Error(`index.html ${r.status}`);
    return r.text();
  }
}

/**
 * GET /k/<code> (vercel.json rewrites it here). Serves the app, with the Open Graph tags of the card in the <head>,
 * so WhatsApp, Instagram and others show the card as the link preview. The app itself renders the page in the browser.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = String(req.query.code ?? '').toUpperCase();
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? 'benchmrk.ai');
  const origin = `https://${host}`;
  let card: { type: CardType; data: CardData } | null = null;
  if (CODE_RE.test(code)) {
    const { data } = await db().from('share_cards').select('type, data').eq('code', code).maybeSingle();
    if (data) card = { type: data.type as CardType, data: data.data as CardData };
  }
  const og = card ? ogFor(card.type, card.data) : ogFallback('en');
  const lang = card?.data.lang ?? 'en';
  const url = `${origin}/k/${code}`;
  const tags = [
    `<title>${esc(og.title)}</title>`,
    `<meta name="description" content="${esc(og.desc)}">`,
    `<meta name="robots" content="noindex, nofollow">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Benchmrk">`,
    `<meta property="og:title" content="${esc(og.title)}">`,
    `<meta property="og:description" content="${esc(og.desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    ...(card
      ? [
          `<meta property="og:image" content="${esc(`${origin}/api/card/${code}.png?format=og`)}">`,
          `<meta property="og:image:width" content="1200">`,
          `<meta property="og:image:height" content="630">`,
          `<meta name="twitter:card" content="summary_large_image">`,
          `<meta name="twitter:image" content="${esc(`${origin}/api/card/${code}.png?format=og`)}">`,
        ]
      : []),
    `<meta name="twitter:title" content="${esc(og.title)}">`,
    `<meta name="twitter:description" content="${esc(og.desc)}">`,
  ].join('\n    ');
  try {
    let html = await appShell(origin);
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/<meta\s+name="description"[^>]*>/i, '')
      .replace(/<link\s+rel="canonical"[^>]*>/i, '')
      .replace(/<html lang="[^"]*"/i, `<html lang="${esc(lang)}"`)
      .replace('</head>', `    ${tags}\n  </head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', card ? 'public, s-maxage=300, stale-while-revalidate=600' : 'public, s-maxage=60');
    res.status(card ? 200 : 404).send(html);
  } catch (e) {
    console.error('k page failed', code, e);
    res.redirect(302, '/');
  }
}
