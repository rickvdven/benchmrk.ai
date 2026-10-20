import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);

// server/geo.ts
function handler(req, res) {
  const c = String(req.headers["x-vercel-ip-country"] ?? "").toUpperCase().slice(0, 2);
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).json({ country: /^[A-Z]{2}$/.test(c) ? c : null });
}
export {
  handler as default
};
