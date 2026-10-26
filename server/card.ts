import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/server';
import { renderCardPng } from './_lib/cardImage';
import { cardFonts } from './_lib/cardFonts';
import { CODE_RE, type CardData, type CardFormat, type CardType } from '../src/lib/cards';

const FORMATS = new Set<CardFormat>(['story', 'square', 'og']);

/**
 * GET /api/card/<code>.png?format=story|square|og (vercel.json rewrites the .png path to ?code=).
 * Draws the card from the snapshot in share_cards. The stored data holds only the nickname, division and numbers.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = String(req.query.code ?? '').toUpperCase();
  const f = String(req.query.format ?? 'og') as CardFormat;
  if (!CODE_RE.test(code) || !FORMATS.has(f)) return void res.status(404).send('Not found');
  const { data, error } = await db().from('share_cards').select('type, data').eq('code', code).maybeSingle();
  if (error) return void res.status(500).send('Error');
  if (!data) {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return void res.status(404).send('Not found');
  }
  try {
    const png = await renderCardPng({ type: data.type as CardType, data: data.data as CardData, code }, f, cardFonts);
    res.setHeader('Content-Type', 'image/png');
    // a card is a snapshot, so it can be cached; one day keeps a deleted card from living on in the cache for long
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    if (req.query.download === '1') res.setHeader('Content-Disposition', `attachment; filename="benchmrk-${code}-${f}.png"`);
    res.status(200).send(png);
  } catch (e) {
    console.error('card render failed', code, f, e);
    res.status(500).send('Error');
  }
}
