// Statische content-pagina's (gidsen en website-pagina's) voor SEO en AI-antwoordmachines.
// Bron: content/<taal>/**/*.md met YAML-frontmatter. Uitvoer: volledige HTML per pagina,
// plus sitemap.xml en robots.txt. Zie content/README.md voor het formaat.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Marked } from 'marked';
import YAML from 'yaml';

export const SITE = 'https://benchmrk.ai';
export const authorFor = (lang) => ({
  '@type': 'Person',
  name: 'Rick van de Ven',
  jobTitle: LOCALES[lang].t.authorJob,
  description: LOCALES[lang].t.authorDesc,
});
export const ORG = { '@type': 'Organization', name: 'Benchmrk', url: `${SITE}/`, logo: `${SITE}/icon-512.png` };

import { DEFAULT_LANG, LOCALES } from './locales.mjs';
import { START_HERE, TOPICS } from './topics.mjs';
export { LOCALES, TOPICS };

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

/** Woordlimieten uit COPY_AGENT.md gelden voor NL; andere talen schalen mee (Koreaans heeft langere "woorden"). */
const scaled = (lang, [lo, hi]) => [Math.round(lo * LOCALES[lang].factor), Math.round(hi * LOCALES[lang].factor)];

export const urlOf = (lang, type, slug) => (type === 'gids' ? `/${lang}/${LOCALES[lang].guides}/${slug}` : `/${lang}/${slug}`);
export const overviewUrl = (lang) => `/${lang}/${LOCALES[lang].guides}`;
export const topicUrl = (lang, key) => `${overviewUrl(lang)}/${TOPICS[key][lang].slug}`;
/** Kerngetal op een kaart: NL-notatie, in talen met een decimale punt omgezet. */
const localizeStat = (stat, lang) => (['en', 'ko'].includes(lang) ? String(stat).replace(/(\d),(\d)/g, '$1.$2') : String(stat));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = (s) => (String(s).replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’.,:/%–-]*/gu) ?? []).length;
const sentences = (s) => String(s).split(/(?<=[.?!])\s+(?=[\p{Lu}0-9“"가-힣])/u).filter(Boolean).length;
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
const dateIn = (iso, lang) => {
  const [y, m, d] = iso.split('-').map(Number);
  return LOCALES[lang].date(y, m, d, LOCALES[lang].t);
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
  // vertaalgroepen: NL-pagina = sleutel (pad binnen content/nl zonder .md), vertalingen wijzen ernaar via translationOf
  const keyOf = (p) => (p.lang === DEFAULT_LANG ? `${p.type === 'gids' ? 'gids/' : ''}${p.slug}` : p.translationOf);
  const groups = new Map();
  for (const p of pages) {
    p.group = keyOf(p);
    if (!p.group) continue;
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group).push(p);
  }
  const order = Object.keys(LOCALES);
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const alt = Object.fromEntries(members.sort((a, b) => order.indexOf(a.lang) - order.indexOf(b.lang)).map((m) => [m.lang, m.url]));
    for (const m of members) m.alternates = alt;
  }
  // onderwerp en kerngetal staan alleen in de NL-pagina; vertalingen nemen ze over
  for (const members of groups.values()) {
    const nl = members.find((m) => m.lang === DEFAULT_LANG);
    if (!nl) continue;
    for (const m of members) {
      if (m === nl) continue;
      m.topic ??= nl.topic;
      if (m.stat == null && nl.stat != null) m.stat = localizeStat(nl.stat, m.lang);
    }
  }
  for (const p of pages) p.readMin = Math.max(1, Math.round(countWords(p) / (200 * LOCALES[p.lang].factor)));
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
    const L = LOCALES[p.lang];
    if (!L) e(`onbekende taal ${p.lang}`);
    if (p.lang !== DEFAULT_LANG) {
      const src = p.translationOf ? pages.find((o) => o.lang === DEFAULT_LANG && o.group === p.translationOf) : null;
      if (!p.translationOf) e('translationOf ontbreekt (pad van de NL-pagina, bv. gids/hyrox-taper)');
      else if (!src) e(`translationOf "${p.translationOf}" verwijst naar geen NL-pagina`);
      else {
        if (src.type !== p.type) e(`translationOf "${p.translationOf}" is een ${src.type}, deze pagina een ${p.type}`);
        if (pages.some((o) => o !== p && o.lang === p.lang && o.translationOf === p.translationOf)) e(`meerdere ${p.lang}-vertalingen van ${p.translationOf}`);
        // vertalen mag niets toevoegen of weglaten: zelfde getallen, tabellen en secties als de NL-bron
        // Koreaanse datums schrijven de maand als cijfer (1월); NL schrijft die uit, dus laat die cijfers buiten de vergelijking
        const nums = (t) => new Set((String(t).replace(/\d{1,2}월/g, ' ').replace(/(\d)[.,](\d)/g, '$1.$2').match(/\d+(?:\.\d+)?/g) ?? []));
        const miss = [...nums(src.answer)].filter((n) => !nums(p.answer).has(n));
        if (miss.length) w(`antwoordblok mist getallen uit de NL-bron: ${miss.join(', ')}`);
        const srcAll = nums(`${src.body} ${src.faq?.map((f) => f.a).join(' ')}`);
        const myAll = nums(`${p.body} ${p.faq?.map((f) => f.a).join(' ')}`);
        const miss2 = [...srcAll].filter((n) => !myAll.has(n));
        const extra = [...myAll].filter((n) => !srcAll.has(n));
        if (miss2.length) w(`getallen uit de NL-bron ontbreken: ${miss2.join(', ')}`);
        if (extra.length) w(`getallen die niet in de NL-bron staan: ${extra.join(', ')}`);
        const h2 = (t) => (t.match(/^## /gm) ?? []).length;
        if (h2(p.body) !== h2(src.body)) w(`${h2(p.body)} H2-secties, de NL-bron heeft er ${h2(src.body)}`);
        const tb = (t) => (t.match(/^\|\s*:?-{2,}/gm) ?? []).length;
        if (tb(p.body) !== tb(src.body)) w(`${tb(p.body)} tabellen, de NL-bron heeft er ${tb(src.body)}`);
        if ((p.faq ?? []).length !== (src.faq ?? []).length) w(`${(p.faq ?? []).length} FAQ-vragen, de NL-bron heeft er ${(src.faq ?? []).length}`);
        if ((p.sources ?? []).map((x) => x.url).join() !== (src.sources ?? []).map((x) => x.url).join()) w('bronnen wijken af van de NL-bron');
      }
    }
    const aw = words(p.answer ?? '');
    const [alo, ahi] = scaled(p.lang, LIMITS.answer);
    if (aw < alo || aw > ahi) e(`antwoordblok is ${aw} woorden (${alo}–${ahi})`);
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
    const zo = secs.find((s) => L.benchmrk.test(s.heading));
    const maxZo = Math.round(LIMITS.benchmrk * L.factor);
    if (!zo) e(`sectie "## ${L.benchmrkTitle}" ontbreekt`);
    else if (words(plain(zo.text)) > maxZo) e(`"${L.benchmrkTitle}" is ${words(plain(zo.text))} woorden (max ${maxZo})`);
    if (secs.length < 3) e('minimaal 3 H2-secties nodig');
    if (/^# /m.test(p.body)) e('gebruik geen H1 in de body; de H1 komt uit title');
    if (!/^\|.*\|\s*$/m.test(p.body)) e('geen tabel gevonden (praktijkblok en getallen horen in een tabel)');
    const all = [p.answer, ...(p.summary ?? []), p.body, ...fq.map((f) => `${f.q} ${f.a}`)].join('\n');
    if (/(?<!\[)![^[]/.test(all.replace(/!\[/g, ''))) w('bevat een uitroepteken');
    if (/ultieme|ultimate guide|ultimativ|definitive guide|guía definitiva|궁극의/i.test(all + p.title)) e('geen "ultieme gids"');
    const links = [...new Set(linksIn(p.body))].filter((u) => u !== p.url);
    const guideLinks = links.filter((u) => u.startsWith(`/${p.lang}/${LOCALES[p.lang].guides}/`));
    const pageLinks = links.filter((u) => u.startsWith(`/${p.lang}/`) && !guideLinks.includes(u) && u !== overviewUrl(p.lang));
    if (guideLinks.length < LIMITS.guideLinks) e(`${guideLinks.length} interne links naar andere gidsen (min ${LIMITS.guideLinks})`);
    if (pageLinks.length < LIMITS.pageLinks) e(`${pageLinks.length} links naar een website-pagina (min ${LIMITS.pageLinks})`);
    for (const u of links) if (u.startsWith(`/${p.lang}/`) && u !== overviewUrl(p.lang) && !urls.has(u)) w(`interne link ${u} bestaat (nog) niet`);
    if (p.topic != null && !TOPICS[p.topic]) e(`onbekend onderwerp "${p.topic}" (zie scripts/topics.mjs)`);
    if (p.lang === DEFAULT_LANG && p.type === 'gids' && p.topic == null) w('gids heeft geen onderwerp (topic)');
    if (p.lang === DEFAULT_LANG && p.stat != null && !/\d/.test(String(p.stat))) e('stat moet een getal bevatten');
    if (Object.keys(TOPICS).some((k) => topicUrl(p.lang, k) === p.url)) e(`slug botst met een onderwerppagina (${p.url})`);
    const n = countWords(p);
    const [lo, hi] = scaled(p.lang, LIMITS.words[p.type]);
    if (n < lo || n > hi) w(`${n} woorden (${lo}–${hi} voor een ${p.type})`);
  }
  return { errors, warnings };
}

// ---------- rendering ----------

/** Anker voor een kop: Latijnse letters zonder accenten zoals slugify, andere schriften (Koreaans) blijven staan. */
const anchor = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'sectie';

function markdown() {
  const md = new Marked({ gfm: true });
  const seen = new Map();
  md.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens);
        const base = anchor(text);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return `<h${depth} id="${n > 1 ? `${base}-${n}` : base}">${html}</h${depth}>\n`;
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

// de app kiest de taal uit ?lang=; NL is de standaard en blijft zonder parameter
const ctaHref = (slug, lang) => `/?utm_source=gids&utm_medium=organic&utm_content=${encodeURIComponent(slug)}${lang === DEFAULT_LANG ? '' : `&lang=${lang}`}#check`;
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
footer.site p{margin:0;max-width:640px}
.langs{display:flex;flex-wrap:wrap;gap:6px 14px;list-style:none;margin:0;padding:0;font-size:14px}.langs [aria-current]{font-weight:700;color:var(--ink)}
footer.site .col2{display:flex;flex-direction:column;gap:10px}
.chips{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0 0 36px;padding:0}.chips a,.chips span{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:13px;padding:6px 12px;border:1px solid var(--line);border-radius:3px;text-decoration:none;color:var(--ink-2);background:var(--surface)}.chips a:hover{border-color:var(--ink)}.chips [aria-current]{background:var(--accent);border-color:var(--accent);color:var(--ink);font-weight:600}
.lead{font-size:20px;color:var(--ink-2);max-width:760px;margin:0 0 24px}
.feature{display:grid;gap:16px;margin:0 0 48px}@media(min-width:860px){.feature{grid-template-columns:minmax(0,1.65fr) minmax(0,1fr)}}
.feat{display:block;background:var(--ink);color:#fff;border-radius:2px;padding:28px 24px;text-decoration:none}.feat:hover h2{text-decoration:underline}
.feat .kicker{color:#c3bfb3;margin:0 0 18px}.feat .kicker b{background:var(--accent);color:var(--ink);padding:1px 6px;font-weight:600;margin-right:8px}
.feat .stat{font-family:'IBM Plex Mono',monospace;font-size:clamp(30px,4.4vw,46px);font-weight:600;line-height:1.1;margin:0 0 14px;font-variant-numeric:tabular-nums}
.feat h2{color:#fff;font-weight:800;font-stretch:80%;font-size:clamp(26px,3.2vw,36px);line-height:1.08;margin:0 0 10px}.feat p{color:#e4e2dc;margin:0 0 16px}.feat .meta{color:#c3bfb3;margin:0}
.start{background:var(--surface);box-shadow:var(--shadow);border-radius:2px;padding:24px}.start .kicker{margin:0 0 12px}.start ol{margin:0;padding-left:22px}.start li{margin:8px 0;padding-left:4px}.start a{font-weight:600;text-decoration:none}.start a:hover{text-decoration:underline}
.topic{margin:0 0 44px}.topic-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;border-top:1.5px solid var(--ink);padding-top:12px;margin-bottom:16px;flex-wrap:wrap}
.topic-head h2{font-weight:800;font-stretch:80%;font-size:clamp(24px,3vw,30px);margin:0;line-height:1.1}.topic-head h2 a{text-decoration:none}.topic-head h2 a:hover{text-decoration:underline}.topic-head .all{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-3);white-space:nowrap}
.cards{display:grid;gap:14px;grid-template-columns:1fr;list-style:none;margin:0;padding:0}@media(min-width:620px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:960px){.cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
.card{display:flex;flex-direction:column;gap:8px;height:100%;background:var(--surface);border:1px solid var(--line);border-radius:2px;padding:18px 18px 16px;text-decoration:none;color:var(--ink)}.card:hover{border-color:var(--ink)}.card:hover .ct{text-decoration:underline}
.card .cs{font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.2}.card .cs.lbl{font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);line-height:1.6}
.card .ct{font-weight:700;font-size:18px;line-height:1.3}.card .cd{font-size:15px;color:var(--ink-3);line-height:1.45}.card .cm{margin-top:auto;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--muted)}.card .new{background:var(--accent);color:var(--ink);padding:1px 6px;font-weight:600;margin-right:6px}
.toc{border-left:1.5px solid var(--ink);padding:4px 0 4px 16px;margin:0 0 40px}.toc h2{font-family:'IBM Plex Mono',monospace;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 8px;font-weight:600}.toc ol{margin:0;padding-left:20px;font-size:16px}.toc li{margin:3px 0}.toc a{text-decoration:none}.toc a:hover{text-decoration:underline}
.related{margin:48px 0 0}.related h2{font-weight:800;font-stretch:80%;font-size:clamp(24px,3vw,30px);margin:0 0 16px}.related .cards{grid-template-columns:1fr}@media(min-width:620px){.related .cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
.wide{max-width:1200px}`;

/** hreflang-links in <head>: alle talen van deze pagina (incl. zichzelf) en x-default = NL. */
const hreflangTags = (alt) =>
  alt ? `\n${Object.entries(alt).map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${u}">`).join('\n')}\n<link rel="alternate" hreflang="x-default" href="${SITE}${alt[DEFAULT_LANG] ?? Object.values(alt)[0]}">` : '';
/** Zichtbare taalkiezer, zodat bezoekers en crawlers de vertalingen via gewone links vinden. */
const langSwitch = (lang, alt) =>
  alt && Object.keys(alt).length > 1
    ? `<nav aria-label="${esc(LOCALES[lang].t.langLabel)}"><ul class="langs">${Object.entries(alt).map(([l, u]) => `<li>${l === lang ? `<span aria-current="true" lang="${l}">${LOCALES[l].native}</span>` : `<a href="${u}" hreflang="${l}" lang="${l}">${LOCALES[l].native}</a>`}</li>`).join('')}</ul></nav>`
    : '';

function shell({ lang, title, description, canonical, ogType, jsonld, body, alternates }) {
  const t = LOCALES[lang].t;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">${hreflangTags(alternates)}
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#EFEEEA">
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
<nav class="site" aria-label="${esc(t.menu)}"><a href="${overviewUrl(lang)}">${t.guides}</a><a class="hide-sm" href="/science">${t.science}</a><a class="btn" href="/#check">${t.ctaKicker}</a></nav>
</div></header>
${body}
<footer class="site"><div class="wrap">
<p>${esc(t.disclaimerLong)}</p>
<div class="col2"><p><a href="${overviewUrl(lang)}">${t.guides}</a> · <a href="/science">${t.science}</a></p>${langSwitch(lang, alternates)}</div>
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

export function renderPage(p, pages = [], { now = Date.now() } = {}) {
  const t = LOCALES[p.lang].t;
  const md = markdown();
  const topicCrumb = p.topic && TOPICS[p.topic] ? [[TOPICS[p.topic][p.lang].label, topicUrl(p.lang, p.topic)]] : [];
  const crumbs = p.type === 'gids' ? [[t.home, '/'], [t.guides, overviewUrl(p.lang)], ...topicCrumb, [p.breadcrumb ?? p.title, p.url]] : [[t.home, '/'], ...topicCrumb, [p.breadcrumb ?? p.title, p.url]];
  // "Lees verder": drie andere pagina's uit hetzelfde onderwerp, nieuwste eerst
  const related = p.topic ? pages.filter((o) => o !== p && o.lang === p.lang && o.topic === p.topic).sort(newestFirst).slice(0, 3) : [];
  const relatedHtml = related.length ? `<section class="related" aria-labelledby="related-title"><h2 id="related-title">${esc(t.readMore)}</h2><ul class="cards">${related.map((o) => card(o, now, { desc: false })).join('')}</ul></section>` : '';
  // de CTA komt direct na "Zo doet Benchmrk het"; staat die sectie als laatste, dan sluit de CTA het artikel af
  const cta = `<aside class="cta" aria-labelledby="cta-title"><p class="kicker">${t.ctaKicker}</p><h2 id="cta-title">${esc(t.ctaTitle)}</h2><p>${esc(t.ctaText)}</p><a class="btn" href="${esc(ctaHref(p.slug, p.lang))}">${esc(t.ctaButton)}</a><small>${esc(t.ctaNote)}</small></aside>`;
  const parts = p.body.split(/^(?=## )/m);
  let bodyHtml = '';
  let ctaPlaced = false;
  for (const part of parts) {
    bodyHtml += md.parse(part);
    if (LOCALES[p.lang].benchmrk.test(part.replace(/^## /, ''))) {
      bodyHtml += cta;
      ctaPlaced = true;
    }
  }
  if (!ctaPlaced) bodyHtml += cta;
  // inhoudsopgave uit de gerenderde H2's (zelfde ids), zonder "Zo doet Benchmrk het" en de CTA
  const toc = [...bodyHtml.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].filter(([, id, h]) => id !== 'cta-title' && !LOCALES[p.lang].benchmrk.test(h.replace(/<[^>]+>/g, '')));
  const tocHtml = toc.length >= 4 ? `<nav class="toc" aria-labelledby="toc-title"><h2 id="toc-title">${esc(t.toc)}</h2><ol>${toc.map(([, id, h]) => `<li><a href="#${id}">${h}</a></li>`).join('')}</ol></nav>` : '';
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
      author: { ...authorFor(p.lang), worksFor: ORG },
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
<p class="meta">${t.updated} <time datetime="${p.updated}">${dateIn(p.updated, p.lang)}</time> · ${p.readMin ?? 1} ${t.min} · ${t.by} Rick van de Ven, ${t.role}</p>
<section class="answer" aria-label="${t.answer}"><span class="tag">${t.answer}</span><p>${md.parseInline(p.answer)}</p></section>
<section class="short"><h2>${t.short}</h2><ul>${p.summary.map((s) => `<li>${md.parseInline(s)}</li>`).join('')}</ul></section>
${tocHtml}
${bodyHtml}
<section class="faq"><h2 id="veelgestelde-vragen">${t.faq}</h2>
${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n')}
</section>
<section class="sources"><h2 id="bronnen">${t.sources}</h2><ol>
${(p.sources ?? []).map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>${s.note ? ` – ${esc(s.note)}` : ''} <span class="acc">(${t.accessed} ${dateIn(s.accessed, p.lang)})</span></li>`).join('\n')}
</ol></section>
<p class="meta">${esc(t.disclaimer)}</p>
</article>
${relatedHtml}
</div></main>`;
  return shell({ lang: p.lang, title: p.seoTitle, description: p.description, canonical: p.url, ogType: 'article', jsonld, body, alternates: p.alternates });
}

/** Overzichtspagina's van alle talen waarin pagina's staan, onderling gekoppeld voor hreflang. */
export const overviewAlternates = (pages) => Object.fromEntries(Object.keys(LOCALES).filter((l) => pages.some((p) => p.lang === l)).map((l) => [l, overviewUrl(l)]));

const DAY = 86400000;
const isNewPage = (p, now) => now - Date.parse(p.published ?? p.updated) < 21 * DAY;
const newestFirst = (a, b) => (b.published ?? b.updated).localeCompare(a.published ?? a.updated) || (b.order ?? 0) - (a.order ?? 0);
const byOrder = (a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title);

/** Kaart met kerngetal (of het onderwerp als er geen getal is), titel, beschrijving, "nieuw" en leestijd. */
function card(p, now, { desc = true } = {}) {
  const t = LOCALES[p.lang].t;
  const top = p.stat != null ? `<span class="cs">${esc(p.stat)}</span>` : `<span class="cs lbl">${esc(p.type === 'gids' ? t.guide : t.page)}</span>`;
  const meta = `${isNewPage(p, now) ? `<span class="new">${esc(t.isNew)}</span>` : ''}${p.readMin} ${esc(t.min)}`;
  return `<li><a class="card" href="${p.url}">${top}<span class="ct">${esc(p.title)}</span>${desc ? `<span class="cd">${esc(p.description)}</span>` : ''}<span class="cm">${meta}</span></a></li>`;
}

const topicsIn = (lang, pages) => Object.keys(TOPICS).filter((k) => pages.some((p) => p.lang === lang && p.topic === k));
const chips = (lang, pages, current) => {
  const t = LOCALES[lang].t;
  const item = (label, url, on) => `<li>${on ? `<span aria-current="page">${esc(label)}</span>` : `<a href="${url}">${esc(label)}</a>`}</li>`;
  return `<nav aria-label="${esc(t.topics)}"><ul class="chips">${item(t.all, overviewUrl(lang), !current)}${topicsIn(lang, pages).map((k) => item(TOPICS[k][lang].label, topicUrl(lang, k), current === k)).join('')}</ul></nav>`;
};
const checkBlock = (lang, slug) => {
  const t = LOCALES[lang].t;
  return `<aside class="cta" aria-labelledby="check-title"><p class="kicker">${t.ctaKicker}</p><h2 id="check-title">${esc(t.checkTitle)}</h2><p>${esc(t.checkText)}</p><a class="btn" href="${esc(ctaHref(slug, lang))}">${esc(t.ctaButton)}</a><small>${esc(t.ctaNote)}</small></aside>`;
};

/** Onderwerp van de week uit content/WEEKONDERWERP.md (nieuwste rij bovenaan): NL-sleutel, bv. gids/tempoverlies-run-1-tot-8. */
export function weekTopic(root) {
  const f = join(root, 'content', 'WEEKONDERWERP.md');
  if (!existsSync(f)) return null;
  const m = readFileSync(f, 'utf8').match(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|.*?\/nl\/gids\/([a-z0-9-]+)/m);
  return m ? `gids/${m[1]}` : null;
}

/** Gidsenoverzicht per taal: onderwerpen, uitgelicht (onderwerp van de week of nieuwste gids), start hier en kaarten per onderwerp. */
export function renderOverview(lang, pages, { featured = null, now = Date.now() } = {}) {
  const t = LOCALES[lang].t;
  const mine = pages.filter((p) => p.lang === lang);
  const url = overviewUrl(lang);
  const guides = mine.filter((p) => p.type === 'gids');
  const week = featured ? mine.find((p) => p.group === featured) : null;
  const feat = week ?? [...guides].sort(newestFirst)[0];
  const featHtml = feat
    ? `<a class="feat" href="${feat.url}"><p class="kicker"><b>${esc(week ? t.weekTopic : t.newest)}</b>${feat.topic ? esc(TOPICS[feat.topic][lang].label) : ''}</p>${feat.stat != null ? `<p class="stat">${esc(feat.stat)}</p>` : ''}<h2>${esc(feat.title)}</h2><p>${esc(feat.description)}</p><p class="meta">${t.updated} ${dateIn(feat.updated, lang)} · ${feat.readMin} ${esc(t.min)} · ${(feat.sources ?? []).length} ${esc(t.sources.toLowerCase())}</p></a>`
    : '';
  const start = START_HERE.map((k) => mine.find((p) => p.group === k)).filter(Boolean);
  const startHtml = start.length ? `<div class="start"><p class="kicker">${esc(t.startHere)}</p><ol>${start.map((p) => `<li><a href="${p.url}">${esc(p.breadcrumb ?? p.title)}</a></li>`).join('')}</ol></div>` : '';
  const topicHtml = topicsIn(lang, pages)
    .map((k) => {
      const ps = mine.filter((p) => p.topic === k);
      const show = [...ps].sort(newestFirst).filter((p) => p !== feat).slice(0, 3);
      const all = t.allIn.replace('{n}', ps.length);
      return `<section class="topic"><div class="topic-head"><h2><a href="${topicUrl(lang, k)}">${esc(TOPICS[k][lang].label)}</a></h2><a class="all" href="${topicUrl(lang, k)}">${esc(all)} →</a></div><ul class="cards">${show.map((p) => card(p, now)).join('')}</ul></section>`;
    })
    .join('\n');
  const rest = mine.filter((p) => !p.topic).sort(byOrder);
  const restHtml = rest.length ? `<section class="topic"><div class="topic-head"><h2>${esc(t.more)}</h2></div><ul class="cards">${rest.map((p) => card(p, now)).join('')}</ul></section>` : '';
  const crumbs = [[t.home, '/'], [t.guides, url]];
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: t.overviewTitle, description: t.overviewDesc, inLanguage: lang, url: `${SITE}${url}`, publisher: ORG,
      mainEntity: { '@type': 'ItemList', itemListElement: mine.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${p.url}`, name: p.title })) } },
    { '@context': 'https://schema.org', ...crumbList(crumbs) },
  ];
  const body = `<main class="wrap">
${crumbHtml(crumbs)}
<p class="kicker">${t.guides}</p>
<h1>${esc(t.overviewTitle)}</h1>
<p class="lead">${esc(t.overviewIntro)}</p>
${chips(lang, pages, null)}
<div class="feature">${featHtml}${startHtml}</div>
${topicHtml}
${restHtml}
<div class="col">${checkBlock(lang, 'gidsen-overzicht')}</div>
</main>`;
  return shell({ lang, title: t.overviewSeo, description: t.overviewDesc, canonical: url, ogType: 'website', jsonld, body, alternates: overviewAlternates(pages) });
}

/** Alle onderwerppagina's (hubs) per taal, met hreflang-alternates per onderwerp. */
export function topicHubs(pages) {
  const hubs = [];
  for (const key of Object.keys(TOPICS)) {
    const langs = Object.keys(LOCALES).filter((l) => pages.some((p) => p.lang === l && p.topic === key));
    const alternates = Object.fromEntries(langs.map((l) => [l, topicUrl(l, key)]));
    for (const lang of langs) {
      const ps = pages.filter((p) => p.lang === lang && p.topic === key);
      hubs.push({ lang, key, url: topicUrl(lang, key), alternates, updated: ps.map((p) => p.updated).sort().pop() });
    }
  }
  return hubs;
}

export function renderTopic(lang, key, pages, { now = Date.now() } = {}) {
  const t = LOCALES[lang].t;
  const T = TOPICS[key][lang];
  const url = topicUrl(lang, key);
  const ps = pages.filter((p) => p.lang === lang && p.topic === key).sort(byOrder);
  const crumbs = [[t.home, '/'], [t.guides, overviewUrl(lang)], [T.label, url]];
  const description = T.intro.length > 155 ? `${T.intro.slice(0, 152).replace(/\s+\S*$/, '')}…` : T.intro;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: T.label, description, inLanguage: lang, url: `${SITE}${url}`, publisher: ORG, isPartOf: `${SITE}${overviewUrl(lang)}`,
      mainEntity: { '@type': 'ItemList', itemListElement: ps.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${p.url}`, name: p.title })) } },
    { '@context': 'https://schema.org', ...crumbList(crumbs) },
  ];
  const alternates = topicHubs(pages).find((h) => h.lang === lang && h.key === key)?.alternates;
  const body = `<main class="wrap">
${crumbHtml(crumbs)}
<p class="kicker">${esc(t.topicKicker)}</p>
<h1>${esc(T.label)}</h1>
<p class="lead">${esc(T.intro)}</p>
${chips(lang, pages, key)}
<ul class="cards">${ps.map((p) => card(p, now)).join('')}</ul>
<div class="col">${checkBlock(lang, `onderwerp-${key}`)}</div>
</main>`;
  return shell({ lang, title: `${T.label}: HYROX ${t.guides.toLowerCase()} | Benchmrk`, description, canonical: url, ogType: 'website', jsonld, body, alternates });
}

/** Platte lijst met links voor de homepage (binnen #root): overzicht en onderwerpen per taal, en alle NL-pagina's. */
export function homeLinks(pages) {
  const langs = Object.keys(overviewAlternates(pages));
  const hubs = topicHubs(pages);
  const nl = pages.filter((p) => p.lang === DEFAULT_LANG).sort(byOrder);
  const li = (url, label) => `<li><a href="${url}">${esc(label)}</a></li>`;
  return `<nav aria-label="${esc(LOCALES[DEFAULT_LANG].t.guides)}"><ul>${langs.map((l) => li(overviewUrl(l), LOCALES[l].t.overviewTitle)).join('')}${hubs.filter((h) => h.lang === DEFAULT_LANG).map((h) => li(h.url, TOPICS[h.key][DEFAULT_LANG].label)).join('')}${nl.map((p) => li(p.url, p.title)).join('')}</ul></nav>`;
}

/** Sitemap met lastmod per pagina en hreflang-alternates zodra een pagina vertalingen heeft (frontmatter: alternates). */
export function sitemap(pages) {
  const latest = (lang) => pages.filter((p) => p.lang === lang).map((p) => p.updated).sort().pop();
  const links = (alt) => (alt ? [...Object.entries(alt), ['x-default', alt[DEFAULT_LANG] ?? Object.values(alt)[0]]] : []);
  const entry = (loc, lastmod, alt) =>
    `  <url>\n    <loc>${SITE}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}${links(alt).map(([l, u]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${u}"/>`).join('')}\n  </url>`;
  const rows = [entry('/'), entry('/science'), entry('/gym')];
  const ovAlt = overviewAlternates(pages);
  for (const lang of Object.keys(ovAlt)) rows.push(entry(overviewUrl(lang), latest(lang), ovAlt));
  for (const h of topicHubs(pages)) rows.push(entry(h.url, h.updated, h.alternates));
  for (const p of pages) rows.push(entry(p.url, p.updated, p.alternates));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

// App-routes die niet in zoekmachines horen (zie src/App.tsx)
const PRIVATE = ['/auth', '/onboarding', '/cockpit', '/plan', '/log', '/doubles', '/recovery', '/settings', '/invite', '/admin', '/api/'];
const BOTS = ['*', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended'];

export function robots() {
  return `# Benchmrk: alles mag geïndexeerd worden, behalve de app zelf.\n${BOTS.map((b) => `User-agent: ${b}`).join('\n')}\nAllow: /\n${PRIVATE.map((p) => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${SITE}/sitemap.xml\n`;
}
