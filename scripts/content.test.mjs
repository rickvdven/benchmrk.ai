import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, renderOverview, renderPage, robots, sitemap, validate } from './content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

describe('content van de site', () => {
  const pages = loadContent(join(here, '..'));
  it('voldoet aan de afspraken uit COPY_AGENT.md', () => {
    expect(validate(pages).errors).toEqual([]);
  });
  it.each(pages.map((p) => [p.url, p]))('%s: FAQ in JSON-LD is gelijk aan de zichtbare FAQ', (_, p) => {
    const html = renderPage(p);
    const faq = ldOf(html).find((o) => o['@type'] === 'FAQPage');
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(p.faq.map((f) => [f.q, f.a]));
  });
});

describe('content-build (fixture)', () => {
  const pages = loadContent(join(here, 'fixtures'));
  const [p] = pages;
  const html = renderPage(p);
  it('leest frontmatter en route', () => {
    expect(pages).toHaveLength(1);
    expect(p.url).toBe('/nl/gids/voorbeeld');
    expect(p.updated).toBe('2026-10-20');
    expect(validate(pages).errors).toEqual([]);
  });
  it('zet kop, antwoord, FAQ en bronnen in de ruwe HTML', () => {
    expect(html).toContain('<html lang="nl">');
    expect(html).toContain('<h1>Hoe ziet een voorbeeldgids eruit?</h1>');
    expect(html).toContain('Een gids begint met een antwoord');
    expect(html).toContain('<h3>Hoeveel vragen staan in de FAQ?</h3>');
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('<link rel="canonical" href="https://benchmrk.ai/nl/gids/voorbeeld">');
    expect(html).toContain('Benchmrk is niet verbonden aan HYROX.');
  });
  it('linkt de snelle check met UTM na "Zo doet Benchmrk het"', () => {
    const cta = '/?utm_source=gids&amp;utm_medium=organic&amp;utm_content=voorbeeld#check';
    expect(html).toContain(cta);
    expect(html.indexOf(cta)).toBeGreaterThan(html.indexOf('id="zo-doet-benchmrk-het"'));
  });
  it('heeft valide Article-, FAQPage- en BreadcrumbList-JSON-LD', () => {
    const types = ldOf(html).map((o) => o['@type']);
    expect(types).toEqual(['Article', 'FAQPage', 'BreadcrumbList']);
    const art = ldOf(html)[0];
    expect(art.author).toMatchObject({ '@type': 'Person', name: 'Rick van de Ven' });
    expect(art.dateModified).toBe('2026-10-20');
  });
  it('keurt een te lang antwoord en een ontbrekende Benchmrk-sectie af', () => {
    const bad = { ...p, answer: 'woord '.repeat(120), body: p.body.replace('## Zo doet Benchmrk het', '## Iets anders') };
    const { errors } = validate([bad]);
    expect(errors.some((e) => e.includes('antwoordblok'))).toBe(true);
    expect(errors.some((e) => e.includes('Zo doet Benchmrk het'))).toBe(true);
  });
  it('maakt sitemap, robots en overzicht', () => {
    const sm = sitemap(pages);
    expect(sm).toContain('<loc>https://benchmrk.ai/nl/gids/voorbeeld</loc>\n    <lastmod>2026-10-20</lastmod>');
    const r = robots();
    for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot']) expect(r).toContain(`User-agent: ${bot}`);
    expect(r).toContain('Disallow: /admin');
    expect(r).toContain('Sitemap: https://benchmrk.ai/sitemap.xml');
    expect(renderOverview('nl', pages)).toContain('href="/nl/gids/voorbeeld"');
  });
});
