/**
 * The home page is prerendered at build time (scripts/prerender-home.mjs) into #prerender, next to #root.
 * It stays on screen until React's own landing page has mounted, or goes away at once when React shows anything else.
 */
export function dropPrerender() {
  document.getElementById('prerender')?.remove();
}
