import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeLinks, loadContent, overviewAlternates, renderOverview, renderPage, renderTopic, robots, sitemap, topicHubs, validate, TOPICS } from './content.mjs';

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
  const p = pages.find((x) => x.lang === 'nl');
  const html = renderPage(p);
  it('leest frontmatter en route', () => {
    expect(pages).toHaveLength(2);
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
  it('koppelt vertalingen via translationOf en zet hreflang in head, taalkiezer en sitemap', () => {
    const en = pages.find((x) => x.lang === 'en');
    expect(en.url).toBe('/en/guide/example');
    expect(p.alternates).toEqual({ nl: '/nl/gids/voorbeeld', en: '/en/guide/example' });
    expect(en.alternates).toEqual(p.alternates);
    const enHtml = renderPage(en);
    expect(enHtml).toContain('<html lang="en">');
    expect(enHtml).toContain('<link rel="alternate" hreflang="nl" href="https://benchmrk.ai/nl/gids/voorbeeld">');
    expect(enHtml).toContain('<link rel="alternate" hreflang="en" href="https://benchmrk.ai/en/guide/example">');
    expect(enHtml).toContain('<link rel="alternate" hreflang="x-default" href="https://benchmrk.ai/nl/gids/voorbeeld">');
    expect(enHtml).toContain('<a href="/nl/gids/voorbeeld" hreflang="nl" lang="nl">Nederlands</a>');
    expect(enHtml).toContain('utm_content=example&amp;lang=en#check');
    expect(enHtml).toContain('Benchmrk is not affiliated with HYROX.');
    expect(html).not.toContain('&amp;lang=');
    expect(ldOf(enHtml)[0].inLanguage).toBe('en');
    const sm = sitemap(pages);
    expect(sm).toContain('hreflang="en" href="https://benchmrk.ai/en/guide/example"');
    expect(sm).toContain('hreflang="x-default" href="https://benchmrk.ai/nl/gids/voorbeeld"');
    expect(Object.keys(overviewAlternates(pages))).toEqual(['nl', 'en']);
    expect(renderOverview('en', pages)).toContain('href="/en/guide/example"');
  });
  it('keurt een vertaling zonder geldige translationOf af', () => {
    const en = pages.find((x) => x.lang === 'en');
    expect(validate([p, { ...en, translationOf: undefined }]).errors.some((e) => e.includes('translationOf'))).toBe(true);
    expect(validate([p, { ...en, translationOf: 'gids/bestaat-niet' }]).errors.some((e) => e.includes('verwijst naar geen NL-pagina'))).toBe(true);
  });
});

describe('onderwerpen, overzicht en navigatie', () => {
  const pages = loadContent(join(here, '..'));
  const now = Date.parse('2026-11-13');
  it('elke NL-gids heeft een bestaand onderwerp, vertalingen nemen het over', () => {
    for (const p of pages.filter((x) => x.type === 'gids')) expect(TOPICS[p.topic], p.file).toBeTruthy();
    const en = pages.find((x) => x.translationOf === 'gids/hyrox-splits-analyseren' && x.lang === 'en');
    expect(en.topic).toBe('racedag');
    expect(en.stat).toBe('48.5 %');
  });
  it('maakt per taal en onderwerp een hubpagina met kaarten, kruimelpad en hreflang', () => {
    const hubs = topicHubs(pages);
    expect(hubs.length).toBeGreaterThanOrEqual(25);
    const h = hubs.find((x) => x.lang === 'nl' && x.key === 'lopen');
    expect(h.url).toBe('/nl/gids/lopen-en-pacing');
    const html = renderTopic('nl', 'lopen', pages, { now });
    expect(html).toContain('<h1>Lopen en pacing</h1>');
    expect(html).toContain('href="/nl/gids/tempoverlies-run-1-tot-8"');
    expect(html).toContain('hreflang="en" href="https://benchmrk.ai/en/guide/running-and-pacing"');
    expect(sitemap(pages)).toContain('<loc>https://benchmrk.ai/de/ratgeber/laufen-und-pacing</loc>');
  });
  it('overzicht: onderwerp van de week uitgelicht, start hier en onderwerpen', () => {
    const html = renderOverview('nl', pages, { featured: 'gids/tempoverlies-run-1-tot-8', now });
    expect(html).toMatch(/class="feat" href="\/nl\/gids\/tempoverlies-run-1-tot-8"/);
    expect(html).toContain('Onderwerp van de week');
    expect(html).toContain('Start hier');
    expect(html).toContain('href="/nl/gids/stations"');
    for (const p of pages.filter((x) => x.lang === 'nl' && !x.topic)) expect(html).toContain(`href="${p.url}"`);
  });
  it('gidspagina: onderwerp in kruimelpad, inhoudsopgave met bestaande ankers en lees verder', () => {
    for (const lang of ['nl', 'ko']) {
      const p = pages.find((x) => x.lang === lang && x.group === 'gids/tempoverlies-run-1-tot-8');
      const html = renderPage(p, pages, { now });
      const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      const toc = [...html.matchAll(/<nav class="toc"[\s\S]*?<\/nav>/g)][0][0];
      for (const [, id] of toc.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain(id);
      expect(html).toContain('class="related"');
      expect(ldOf(html).find((o) => o['@type'] === 'BreadcrumbList').itemListElement).toHaveLength(4);
    }
  });
  it('homepage-links bevatten overzichten, onderwerpen en alle NL-pagina\'s', () => {
    const nav = homeLinks(pages);
    expect(nav).toContain('href="/en/guide"');
    expect(nav).toContain('href="/nl/gids/races"');
    for (const p of pages.filter((x) => x.lang === 'nl')) expect(nav).toContain(`href="${p.url}"`);
  });
});
