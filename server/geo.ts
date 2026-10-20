import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Country of the visitor, from Vercel's edge geo-IP header. Used only to pick a default UI language. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const c = String(req.headers['x-vercel-ip-country'] ?? '').toUpperCase().slice(0, 2);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ country: /^[A-Z]{2}$/.test(c) ? c : null });
}
