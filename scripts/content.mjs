// Statische content-pagina's (gidsen en website-pagina's) voor SEO en AI-antwoordmachines.
// Bron: content/<taal>/**/*.md met YAML-frontmatter. Uitvoer: volledige HTML per pagina,
// plus sitemap.xml en robots.txt. Zie content/README.md voor het formaat.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Marked } from 'marked';
import YAML from 'yaml';

export const SITE = 'https://benchmrk.ai';
export const AUTHOR = {
  '@type': 'Person',
  name: 'Rick van de Ven',
  jobTitle: 'Oprichter van Benchmrk',
  description: 'Oprichter van Benchmrk en Pro-atleet in HYROX-races',
};
export const ORG = { '@type': 'Organization', name: 'Benchmrk', url: `${SITE}/`, logo: `${SITE}/favicon.svg` };

/** Per taal: padsegment voor gidsen, labels en de vaste teksten van het sjabloon. */
export const LOCALES = {
  nl: {
    guides: 'gids',
    ogLocale: 'nl_NL',
    t: {
      home: 'Home',
      guides: 'Gidsen',
      guide: 'Gids',
      page: 'Training',
      updated: 'Bijgewerkt op',
      by: 'Door',
      role: 'oprichter Benchmrk, Pro-atleet',
      answer: 'Het antwoord',
      short: 'In het kort',
      faq: 'Veelgestelde vragen',
      sources: 'Bronnen',
      accessed: 'geraadpleegd op',
      ctaKicker: 'Snelle check',
      ctaTitle: 'Wat is jouw kans op je doeltijd?',
      ctaText: 'Vul je drempeltempo, je doeltijd en je sterke en zwakke stations in. Je ziet direct je verwachte tijd per run, station en Roxzone.',
      ctaButton: 'Doe de snelle check',
      ctaNote: 'Gratis tijdens de bèta, zonder account.',
      disclaimer: 'Benchmrk is niet verbonden aan HYROX.',
      disclaimerLong: 'Benchmrk is niet verbonden aan HYROX. HYROX is een merk van de rechthebbende en wordt hier alleen beschrijvend gebruikt. Deze informatie vervangt geen medisch advies.',
      science: 'Wetenschap en bronnen',
      overviewTitle: 'Trainen voor HYROX: alle gidsen',
      overviewSeo: 'Trainen voor HYROX: gidsen en schema’s | Benchmrk',
      overviewDesc: 'Praktische gidsen over trainen voor HYROX: schema, pacing, stations, taper en compromised running. Met tabellen, voorbeeldtrainingen en bronnen.',
      overviewIntro: 'Antwoorden op de vragen die je hebt als je traint voor een HYROX-race. Elke gids begint met het korte antwoord en eindigt met bronnen.',
      overviewPages: 'Trainen',
      overviewGuides: 'Gidsen',
      months: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    },
  },
};

const LIMITS = {
  seoTitle: 60,
  description: 155,
  answer: [40, 90],
  summary: [3, 5],
  faq: [4, 6],
  benchmrk: 80,
  words: { gids: [900, 1500], pagina: [600, 1000] },
  guideLinks: 3,
  pageLinks: 1,
};

export const urlOf = (lang, type, slug) => (type === 'gids' ? `/${lang}/${LOCALES[lang].guides}/${slug}` : `/${lang}/${slug}`);
export const overviewUrl = (lang) => `/${lang}/${LOCALES[lang].guides}`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = (s) => (String(s).replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’.,:/%–-]*/gu) ?? []).length;
const sentences = (s) => String(s).split(/(?<=[.?!])\s+(?=[A-ZÀ-Ý0-9“"])/).filter(Boolean).length;
const plain = (md) =>
  String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\|?\s*:?-{2,}.*$/gm, ' ')
    .replace(/[#*_`>|]/g, ' ');
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const dateNl = (iso, lang) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${LOCALES[lang].t.months[m - 1]} ${y}`;
};

/** Leest frontmatter + body. Datums blijven strings (YAML zou er Date-objecten van maken). */
export function parseFile(file, root) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${relative(root, file)}: frontmatter ontbreekt`);
  const fm = YAML.parse(m[1], { schema: 'core' }) ?? {};
  for (const k of ['updated', 'published']) if (fm[k] instanceof Date) fm[k] = fm[k].toISOString().slice(0, 10);
  if (Array.isArray(fm.sources)) for (const s of fm.sources) if (s.accessed instanceof Date) s.accessed = s.accessed.toISOString().slice(0, 10);
  return { fm, body: m[2] };
}

/** Alle pagina's: content/<taal>/<slug>.md (website-pagina) en content/<taal>/<gidsmap>/<slug>.md (gids). */
export function loadContent(root) {
  const pages = [];
  for (const lang of Object.keys(LOCALES)) {
    const dir = join(root, 'content', lang);
    if (!existsSync(dir)) continue;
    const add = (file, type) => {
      const { fm, body } = parseFile(file, root);
      const slug = file.split('/').pop().replace(/\.md$/, '');
      pages.push({ ...fm, lang, type, slug, url: urlOf(lang, type, slug), body, file: relative(root, file) });
    };
    for (const f of readdirSync(dir)) if (f.endsWith('.md')) add(join(dir, f), 'pagina');
    const gdir = join(dir, LOCALES[lang].guides);
    if (existsSync(gdir)) for (const f of readdirSync(gdir)) if (f.endsWith('.md')) add(join(gdir, f), 'gids');
  }
  return pages.sort((a, b) => a.url.localeCompare(b.url));
}

/** Splitst de body op H2-secties, zodat we "Zo doet Benchmrk het" kunnen vinden en meten. */
const sections = (body) => {
  const out = [];
  for (const part of body.split(/^(?=## )/m)) {
    const m = part.match(/^## (.+)\n([\s\S]*)$/);
    if (m) out.push({ heading: m[1].trim(), text: m[2] });
  }
  return out;
};
const linksIn = (md) => [...md.matchAll(/\]\((\/[^)\s#]*)(?:#[^)\s]*)?\)/g)].map((m) => m[1].replace(/\/$/, '') || '/');

export function countWords(p) {
  return words(p.answer ?? '') + (p.summary ?? []).reduce((n, s) => n + words(s), 0) + words(plain(p.body)) + (p.faq ?? []).reduce((n, f) => n + words(f.q) + words(f.a), 0);
}

/** Controleert alle afspraken uit COPY_AGENT.md. errors laten de build falen, warnings niet. */
export function validate(pages) {
  const errors = [];
  const warnings = [];
  const urls = new Map(pages.map((p) => [p.url, p]));
  for (const p of pages) {
    const e = (m) => errors.push(`${p.file}: ${m}`);
    const w = (m) => warnings.push(`${p.file}: ${m}`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) e(`slug "${p.slug}" mag alleen kleine letters, cijfers en streepjes bevatten`);
    if (!p.title) e('title (H1) ontbreekt');
    if (!p.seoTitle) e('seoTitle ontbreekt');
    else if (p.seoTitle.length > LIMITS.seoTitle) e(`seoTitle is ${p.seoTitle.length} tekens (max ${LIMITS.seoTitle})`);
    if (!p.description) e('description ontbreekt');
    else if (p.description.length > LIMITS.description) e(`description is ${p.description.length} tekens (max ${LIMITS.description})`);
    if (!isDate(p.updated ?? '')) e('updated moet een datum JJJJ-MM-DD zijn');
    if (p.published && !isDate(p.published)) e('published moet een datum JJJJ-MM-DD zijn');
    const aw = words(p.answer ?? '');
    if (aw < LIMITS.answer[0] || aw > LIMITS.answer[1]) e(`antwoordblok is ${aw} woorden (${LIMITS.answer.join('–')})`);
    if (p.answer && !/\d/.test(p.answer)) w('antwoordblok bevat geen getal');
    const sn = (p.summary ?? []).length;
    if (sn < LIMITS.summary[0] || sn > LIMITS.summary[1]) e(`"In het kort" heeft ${sn} bullets (${LIMITS.summary.join('–')})`);
    const fq = p.faq ?? [];
    if (fq.length < LIMITS.faq[0] || fq.length > LIMITS.faq[1]) e(`FAQ heeft ${fq.length} vragen (${LIMITS.faq.join('–')})`);
    for (const f of fq) {
      if (!f.q || !f.a) e('elke FAQ-vraag heeft q en a nodig');
      else if (sentences(f.a) > 3) w(`FAQ-antwoord "${f.q}" is langer dan 3 zinnen`);
    }
    const src = p.sources ?? [];
    if (!src.length) e('bronnen ontbreken');
    for (const s of src) {
      if (!s.title || !/^https:\/\//.test(s.url ?? '')) e(`bron "${s.title ?? s.url}" heeft title en een https-url nodig`);
      if (!isDate(s.accessed ?? '')) e(`bron "${s.title}" heeft een peildatum (accessed) nodig`);
    }
    const secs = sections(p.body);
    const zo = secs.find((s) => /^zo doet benchmrk het/i.test(s.heading));
    if (!zo) e('sectie "## Zo doet Benchmrk het" ontbreekt');
    else if (words(plain(zo.text)) > LIMITS.benchmrk) e(`"Zo doet Benchmrk het" is ${words(plain(zo.text))} woorden (max ${LIMITS.benchmrk})`);
    if (secs.length < 3) e('minimaal 3 H2-secties nodig');
    if (/^# /m.test(p.body)) e('gebruik geen H1 in de body; de H1 komt uit title');
    if (!/^\|.*\|\s*$/m.test(p.body)) e('geen tabel gevonden (praktijkblok en getallen horen in een tabel)');
    const all = [p.answer, ...(p.summary ?? []), p.body, ...fq.map((f) => `${f.q} ${f.a}`)].join('\n');
    if (/(?<!\[)![^[]/.test(all.replace(/!\[/g, ''))) w('bevat een uitroepteken');
    if (/ultieme/i.test(all + p.title)) e('geen "ultieme gids"');
    const links = [...new Set(linksIn(p.body))].filter((u) => u !== p.url);
    const guideLinks = links.filter((u) => u.startsWith(`/${p.lang}/${LOCALES[p.lang].guides}/`));
    const pageLinks = links.filter((u) => u.startsWith(`/${p.lang}/`) && !guideLinks.includes(u) && u !== overviewUrl(p.lang));
    if (guideLinks.length < LIMITS.guideLinks) e(`${guideLinks.length} interne links naar andere gidsen (min ${LIMITS.guideLinks})`);
    if (pageLinks.length < LIMITS.pageLinks) e(`${pageLinks.length} links naar een website-pagina (min ${LIMITS.pageLinks})`);
    for (const u of links) if (u.startsWith(`/${p.lang}/`) && u !== overviewUrl(p.lang) && !urls.has(u)) w(`interne link ${u} bestaat (nog) niet`);
    const n = countWords(p);
    const [lo, hi] = LIMITS.words[p.type];
    if (n < lo || n > hi) w(`${n} woorden (${lo}–${hi} voor een ${p.type})`);
  }
  return { errors, warnings };
}

// ---------- rendering ----------

function markdown() {
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens);
        return `<h${depth} id="${slugify(text)}">${html}</h${depth}>\n`;
      },
      table(token) {
        return `<div class="table-wrap">${this.constructor.prototype.table.call(this, token)}</div>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const ext = /^https?:\/\//.test(href);
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' rel="noopener"' : ''}>${text}</a>`;
      },
    },
  });
  return md;
}

const ctaHref = (slug) => `/?utm_source=gids&utm_medium=organic&utm_content=${encodeURIComponent(slug)}#check`;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

const FONTS = `
@font-face{font-family:'Archivo Variable';font-style:normal;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(/content-assets/archivo-latin-wdth-normal.woff2) format('woff2-variations')}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-display:swap;font-weight:400;src:url(/content-assets/ibm-plex-mono-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-display:swap;font-weight:600;src:url(/content-assets/ibm-plex-mono-latin-600-normal.woff2) format('woff2')}`;
export const FONT_FILES = [
  ['@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2', 'archivo-latin-wdth-normal.woff2'],
  ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', 'ibm-plex-mono-latin-400-normal.woff2'],
  ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2', 'ibm-plex-mono-latin-600-normal.woff2'],
];

// Design A licht: tokens uit src/index.css. Lime alleen als vlak, nooit als tekstkleur.
const CSS = `${FONTS}
:root{--ground:#efeeea;--surface:#fff;--surface-2:#e4e2dc;--line:#d6d3cb;--ink:#141413;--ink-2:#3a3833;--ink-3:#4a4843;--muted:#6a675f;--accent:#d4f046;--shadow:0 1px 0 #d6d3cb,0 18px 40px rgba(20,20,19,.12);color-scheme:light}
*{box-sizing:border-box}html,body{margin:0;background:var(--ground);color:var(--ink)}
body{font-family:'Archivo Variable',Archivo,system-ui,sans-serif;font-size:18px;line-height:1.6;-webkit-font-smoothing:antialiased}
::selection{background:var(--accent);color:var(--ink)}:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
a{color:var(--ink);text-underline-offset:3px}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}@media(min-width:640px){.wrap{padding:0 24px}}
.col{max-width:760px}
.mono,.kicker,.meta,table,.crumbs{font-family:'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}
header.site{border-bottom:1px solid var(--line)}header.site .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px;flex-wrap:wrap}
.wordmark{font-weight:800;text-transform:uppercase;letter-spacing:.02em;font-stretch:80%;font-size:22px;text-decoration:none;color:var(--ink)}.wordmark span{background:var(--accent);padding:0 3px;margin-left:1px}
nav.site{display:flex;gap:20px;align-items:center;font-size:15px}nav.site a{text-decoration:none;color:var(--ink-3);white-space:nowrap}@media(max-width:520px){nav.site .hide-sm{display:none}}nav.site a:hover{color:var(--ink)}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 26px;border-radius:3px;background:var(--accent);color:var(--ink);font-weight:700;text-decoration:none;font-size:17px}.btn:hover{background:#c8e43a}
nav.site .btn{min-height:40px;padding:8px 16px;font-size:15px;color:var(--ink)}
.crumbs{font-size:13px;color:var(--muted);margin:32px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}.crumbs li+li:before{content:'/';margin-right:6px}.crumbs a{color:var(--muted)}
.kicker{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:40px 0 12px}
h1{font-weight:800;font-stretch:75%;text-transform:uppercase;line-height:.98;font-size:clamp(34px,5.4vw,58px);margin:0 0 20px;overflow-wrap:break-word;hyphens:auto}
.meta{font-size:13px;color:var(--muted);margin:0 0 28px}
.answer{background:var(--surface);border-radius:2px;box-shadow:var(--shadow);padding:24px 24px 20px;margin:0 0 32px;font-size:19px;line-height:1.55}
.answer .tag{display:inline-block;background:var(--accent);font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;margin-bottom:10px}
.answer p{margin:0}
.short{border-top:1.5px solid var(--ink);border-bottom:1px solid var(--line);padding:16px 0;margin:0 0 40px}.short h2{font-family:'IBM Plex Mono',monospace;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 8px;font-weight:600}
.short ul{margin:0;padding-left:20px}.short li{margin:4px 0}
article h2{font-weight:800;font-stretch:80%;font-size:clamp(26px,3.2vw,34px);line-height:1.08;margin:48px 0 12px}
article h3{font-size:20px;margin:28px 0 8px}
article p,article ul,article ol{margin:0 0 16px}article li{margin:4px 0}
.table-wrap{overflow-x:auto;margin:8px 0 24px;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;font-size:14px;min-width:420px}
th{border-bottom:1.5px solid var(--ink);padding:10px 12px;text-align:left;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);vertical-align:bottom}
td{border-bottom:1px solid var(--line);padding:10px 12px;vertical-align:top}th:first-child,td:first-child{padding-left:0}th:last-child,td:last-child{padding-right:0}
blockquote{margin:0 0 16px;padding:12px 16px;background:var(--surface-2);border-radius:2px}blockquote p{margin:0}
.cta{background:var(--ink);color:#fff;border-radius:2px;padding:28px 24px;margin:40px 0}.cta .kicker{color:#c3bfb3;margin:0 0 8px}
.cta h2{color:#fff;margin:0 0 10px;font-size:clamp(26px,3.2vw,34px)}.cta p{margin:0 0 20px;color:#e4e2dc}.cta small{display:block;margin-top:12px;color:#c3bfb3;font-size:14px}
.faq h3{font-size:19px;margin:24px 0 6px}.faq p{margin:0}
.sources ol{padding-left:22px;font-size:15px}.sources li{margin:6px 0;overflow-wrap:anywhere}.sources .acc{color:var(--muted);font-family:'IBM Plex Mono',monospace;font-size:13px}
.list{list-style:none;margin:0 0 48px;padding:0;border-top:1.5px solid var(--ink)}.list li{border-bottom:1px solid var(--line);padding:16px 0}
.list a{font-weight:700;font-size:20px;text-decoration:none}.list a:hover{text-decoration:underline}.list p{margin:4px 0 0;color:var(--ink-3);font-size:16px}
footer.site{border-top:1px solid var(--line);margin-top:64px}footer.site .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;padding-top:28px;padding-bottom:48px;font-size:14px;color:var(--muted)}footer.site a{color:var(--ink-3)}
footer.site p{margin:0;max-width:640px}`;

function shell({ lang, title, description, canonical, ogType, jsonld, body }) {
  const t = LOCALES[lang].t;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#efeeea">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Benchmrk">
<meta property="og:locale" content="${LOCALES[lang].ogLocale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}/benchmrk-app-benchmark-log.png">
<meta name="twitter:card" content="summary">
<link rel="preload" href="/content-assets/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
${jsonld.map(ld).join('\n')}
</head>
<body>
<header class="site"><div class="wrap">
<a class="wordmark" href="/" aria-label="Benchmrk home">BENCH<span>MRK</span></a>
<nav class="site" aria-label="Hoofdmenu"><a href="${overviewUrl(lang)}">${t.guides}</a><a class="hide-sm" href="/science">${t.science}</a><a class="btn" href="/#check">${t.ctaKicker}</a></nav>
</div></header>
${body}
<footer class="site"><div class="wrap">
<p>${esc(t.disclaimerLong)}</p>
<p><a href="${overviewUrl(lang)}">${t.guides}</a> · <a href="/science">${t.science}</a></p>
</div></footer>
</body>
</html>
`;
}

const crumbList = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${url}` })),
});
const crumbHtml = (items) =>
  `<ol class="crumbs">${items.map(([name, url], i) => `<li>${i < items.length - 1 ? `<a href="${url}">${esc(name)}</a>` : `<span aria-current="page">${esc(name)}</span>`}</li>`).join('')}</ol>`;

export function renderPage(p) {
  const t = LOCALES[p.lang].t;
  const md = markdown();
  const crumbs = p.type === 'gids' ? [[t.home, '/'], [t.guides, overviewUrl(p.lang)], [p.breadcrumb ?? p.title, p.url]] : [[t.home, '/'], [p.breadcrumb ?? p.title, p.url]];
  // de CTA komt direct na "Zo doet Benchmrk het"; staat die sectie als laatste, dan sluit de CTA het artikel af
  const cta = `<aside class="cta" aria-labelledby="cta-title"><p class="kicker">${t.ctaKicker}</p><h2 id="cta-title">${esc(t.ctaTitle)}</h2><p>${esc(t.ctaText)}</p><a class="btn" href="${esc(ctaHref(p.slug))}">${esc(t.ctaButton)}</a><small>${esc(t.ctaNote)}</small></aside>`;
  const parts = p.body.split(/^(?=## )/m);
  let bodyHtml = '';
  let ctaPlaced = false;
  for (const part of parts) {
    bodyHtml += md.parse(part);
    if (/^## zo doet benchmrk het/i.test(part)) {
      bodyHtml += cta;
      ctaPlaced = true;
    }
  }
  if (!ctaPlaced) bodyHtml += cta;
  const faq = p.faq ?? [];
  const published = p.published ?? p.updated;
  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.title,
      description: p.description,
      inLanguage: p.lang,
      datePublished: published,
      dateModified: p.updated,
      mainEntityOfPage: `${SITE}${p.url}`,
      author: { ...AUTHOR, worksFor: ORG },
      publisher: ORG,
      image: `${SITE}/benchmrk-app-benchmark-log.png`,
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', ...crumbList(crumbs) },
  ];
  const body = `<main class="wrap"><div class="col">
${crumbHtml(crumbs)}
<article>
<p class="kicker">${p.type === 'gids' ? t.guide : t.page}</p>
<h1>${esc(p.title)}</h1>
<p class="meta">${t.updated} <time datetime="${p.updated}">${dateNl(p.updated, p.lang)}</time> · ${t.by} Rick van de Ven, ${t.role}</p>
<section class="answer" aria-label="${t.answer}"><span class="tag">${t.answer}</span><p>${md.parseInline(p.answer)}</p></section>
<section class="short"><h2>${t.short}</h2><ul>${p.summary.map((s) => `<li>${md.parseInline(s)}</li>`).join('')}</ul></section>
${bodyHtml}
<section class="faq"><h2 id="veelgestelde-vragen">${t.faq}</h2>
${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n')}
</section>
<section class="sources"><h2 id="bronnen">${t.sources}</h2><ol>
${(p.sources ?? []).map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>${s.note ? ` – ${esc(s.note)}` : ''} <span class="acc">(${t.accessed} ${dateNl(s.accessed, p.lang)})</span></li>`).join('\n')}
</ol></section>
<p class="meta">${esc(t.disclaimer)}</p>
</article>
</div></main>`;
  return shell({ lang: p.lang, title: p.seoTitle, description: p.description, canonical: p.url, ogType: 'article', jsonld, body });
}

export function renderOverview(lang, pages) {
  const t = LOCALES[lang].t;
  const mine = pages.filter((p) => p.lang === lang);
  const url = overviewUrl(lang);
  const item = (p) => `<li><a href="${p.url}">${esc(p.title)}</a><p>${esc(p.description)}</p></li>`;
  const group = (type, label) => {
    const ps = mine.filter((p) => p.type === type).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title));
    return ps.length ? `<h2>${label}</h2><ul class="list">${ps.map(item).join('')}</ul>` : '';
  };
  const crumbs = [[t.home, '/'], [t.guides, url]];
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: t.overviewTitle, description: t.overviewDesc, inLanguage: lang, url: `${SITE}${url}`, publisher: ORG,
      mainEntity: { '@type': 'ItemList', itemListElement: mine.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${p.url}`, name: p.title })) } },
    { '@context': 'https://schema.org', ...crumbList(crumbs) },
  ];
  const body = `<main class="wrap"><div class="col">
${crumbHtml(crumbs)}
<article>
<p class="kicker">${t.guides}</p>
<h1>${esc(t.overviewTitle)}</h1>
<p>${esc(t.overviewIntro)}</p>
${group('pagina', t.overviewPages)}
${group('gids', t.overviewGuides)}
</article>
</div></main>`;
  return shell({ lang, title: t.overviewSeo, description: t.overviewDesc, canonical: url, ogType: 'website', jsonld, body });
}

/** Sitemap met lastmod per pagina en hreflang-alternates zodra een pagina vertalingen heeft (frontmatter: alternates). */
export function sitemap(pages) {
  const latest = (lang) => pages.filter((p) => p.lang === lang).map((p) => p.updated).sort().pop();
  const entry = (loc, lastmod, alternates) =>
    `  <url>\n    <loc>${SITE}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}${(alternates ?? []).map(([l, u]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${u}"/>`).join('')}\n  </url>`;
  const rows = [entry('/'), entry('/science')];
  for (const lang of Object.keys(LOCALES)) rows.push(entry(overviewUrl(lang), latest(lang)));
  for (const p of pages) {
    const alt = p.alternates ? [[p.lang, p.url], ...Object.entries(p.alternates)] : null;
    rows.push(entry(p.url, p.updated, alt));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

// App-routes die niet in zoekmachines horen (zie src/App.tsx)
const PRIVATE = ['/auth', '/onboarding', '/cockpit', '/plan', '/log', '/doubles', '/recovery', '/settings', '/invite', '/admin', '/api/'];
const BOTS = ['*', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended'];

export function robots() {
  return `# Benchmrk: alles mag geïndexeerd worden, behalve de app zelf.\n${BOTS.map((b) => `User-agent: ${b}`).join('\n')}\nAllow: /\n${PRIVATE.map((p) => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${SITE}/sitemap.xml\n`;
}
