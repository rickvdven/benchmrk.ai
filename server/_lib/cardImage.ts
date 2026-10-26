// Draws the shareable cards (story 1080x1920, feed 1080x1080, link preview 1200x630) from the stored card data.
// Layout follows docs/competitie/reference/kaarten/*.html. Satori turns the element tree into an SVG (text as paths),
// resvg turns that into a PNG. Fonts are passed in, so the same code runs in the Vercel function and in tests.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { fmtHms, fmtMmss } from '../../src/engine/time';
import { CARD_SIZE, divisionKey, fmtDelta, type CardData, type CardFormat, type CardType } from '../../src/lib/cards';
import { ct } from '../../src/lib/competition';

export interface CardFont {
  name: string;
  data: ArrayBuffer | Uint8Array;
  weight: 400 | 600 | 700 | 800;
  style: 'normal';
}

const C = {
  ground: '#EFEEEA', paper: '#FFFFFF', s2: '#E4E2DC', line: '#D6D3CB', ink: '#141413', ink2: '#3A3833', muted: '#6A675F',
  lime: '#D4F046', runs: '#141413', stations: '#77736A', rox: '#C3BFB3', dash: '#A8A498',
};
const SANS = 'Archivo';
const COND = 'Archivo Cond';
const MONO = 'IBM Plex Mono';

type Style = Record<string, string | number>;
type Node = { type: string; props: Record<string, unknown> };
type Child = Node | string | number | null | false | undefined;

/** Minimal element builder: satori accepts plain {type, props} objects, so no React is needed. */
function h(type: string, style: Style, ...children: Child[]): Node {
  const kids = children.flat().filter((c) => c !== null && c !== false && c !== undefined) as (Node | string | number)[];
  const props: Record<string, unknown> = { style: { display: 'flex', boxSizing: 'border-box', ...style } };
  if (kids.length === 1) props.children = kids[0];
  else if (kids.length > 1) props.children = kids;
  return { type, props };
}
const div = (style: Style, ...c: Child[]) => h('div', style, ...c);
const row = (style: Style, ...c: Child[]) => div({ flexDirection: 'row', ...style }, ...c);
const col = (style: Style, ...c: Child[]) => div({ flexDirection: 'column', ...style }, ...c);
const mono = (style: Style, text: string) => div({ fontFamily: MONO, ...style }, text);

function arrowSvg(size: number, color = C.ink): Node {
  return {
    type: 'svg',
    props: {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      style: { display: 'flex' },
      children: { type: 'path', props: { d: 'M3 12h17M13 5l7 7-7 7', fill: 'none', stroke: color, strokeWidth: 2.6, strokeLinecap: 'square' } },
    },
  };
}

/** The arrow glyph is not in the fonts, so every "→" in a text is drawn as a small SVG arrow. */
function arrowText(text: string, size: number, style: Style = {}): Node {
  const kids: Child[] = [];
  text.split('\u2192').forEach((part, i) => {
    if (i) kids.push(arrowSvg(Math.round(size * 0.85)));
    if (part.trim()) kids.push(div({ whiteSpace: 'pre' }, part.trim()));
  });
  return row({ alignItems: 'center', gap: Math.round(size * 0.3), ...style }, ...kids);
}

const wordmark = (size: number) =>
  row(
    { fontFamily: SANS, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: size * 0.01, alignItems: 'center' },
    'BENCH',
    div({ background: C.lime, paddingLeft: size * 0.08, paddingRight: size * 0.08, marginLeft: size * 0.05 }, 'MRK'),
  );
const tag = (text: string, size: number, padV: number, padH: number) =>
  mono({ fontSize: size, fontWeight: 600, letterSpacing: size * 0.06, border: `2px solid ${C.ink}`, lineHeight: 1, padding: `${padV}px ${padH}px`, whiteSpace: 'nowrap' }, text);
const slip = (style: Style, ...c: Child[]) =>
  div({ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 2, boxShadow: `0 1px 0 ${C.line}, 0 24px 50px rgba(20,20,19,0.14)`, ...style }, ...c);
const title = (text: string, size: number) =>
  div({ fontFamily: COND, fontWeight: 800, fontSize: size, textTransform: 'uppercase', lineHeight: 0.95, letterSpacing: size * 0.01 }, text);
const dashLine = (style: Style = {}) => div({ borderTop: `2px dashed ${C.dash}`, ...style });
const limeBox = (style: Style, text: string, size: number) =>
  mono({ background: C.lime, color: C.ink, fontSize: size, fontWeight: 600, letterSpacing: -size * 0.04, lineHeight: 1, ...style }, text);
const strike = (style: Style, text: string) => mono({ color: C.muted, textDecoration: 'line-through', ...style }, text);
const cta = (text: string, size: number, padV: number, padH: number, withArrow: boolean) =>
  row(
    { width: '100%', background: C.lime, color: C.ink, justifyContent: 'space-between', alignItems: 'center', fontFamily: SANS, fontWeight: 700, fontSize: size, padding: `${padV}px ${padH}px`, borderRadius: 3, lineHeight: 1.15 },
    div({}, text),
    withArrow ? arrowSvg(Math.round(size * 0.9)) : null,
  );

/** Nickname: Archivo 700, shrinks for long names and ends in an ellipsis instead of wrapping. */
const nick = (name: string, size: number) =>
  div({ fontFamily: SANS, fontWeight: 700, fontSize: name.length > 14 ? Math.round(size * 0.78) : size, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '72%' }, name);

/** Runs / stations / Roxzone as three grey segments, with legend and times. */
function splitsBar(d: CardData, o: { bar: number; legend: number; time: number; sq: number; gap: number; top: number; legendTop: number; compact?: boolean }, lang: string) {
  const parts = [
    { label: ct(lang, 'card.pred.runs'), v: d.runs ?? 0, color: C.runs },
    { label: ct(lang, 'card.pred.stations'), v: d.stations ?? 0, color: C.stations },
    { label: ct(lang, 'card.pred.roxzone'), v: d.roxzone ?? 0, color: C.rox },
  ];
  return col(
    { marginTop: o.top, width: '100%' },
    row({ height: o.bar, gap: o.gap, width: '100%' }, ...parts.map((p) => div({ flexGrow: p.v, flexBasis: 0, background: p.color, height: '100%' }))),
    row(
      { justifyContent: 'space-between', gap: o.legendTop, marginTop: o.legendTop, width: '100%' },
      ...parts.map((p) =>
        col(
          { gap: 4 },
          row({ alignItems: 'center', gap: 10, fontFamily: SANS, fontSize: o.legend, color: C.ink2 }, div({ width: o.sq, height: o.sq, background: p.color }), p.label),
          mono({ fontSize: o.time, fontWeight: 600 }, fmtMmss(p.v)),
        ),
      ),
    ),
  );
}

/** Predicted finish per week: grey area, dashed goal line, ink line, last point as a lime square. */
function chart(series: number[], goal: number, w: number, hgt: number, f: { stroke: number; dash: number; square: number; label: number; labelGap: number }, lang: string, week: number): Node {
  const all = [...series, goal];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const top = hgt * 0.132;
  const bottom = hgt * 0.9;
  const y = (v: number) => (hi === lo ? (top + bottom) / 2 : top + ((v - lo) / (hi - lo)) * (bottom - top));
  const pts = series.map((v, i) => [(i / (series.length - 1)) * w, y(v)] as const);
  const line = pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${hgt} L0 ${hgt} Z`;
  const gy = y(goal);
  const [lx, ly] = pts[pts.length - 1];
  const svg: Node = {
    type: 'svg',
    props: {
      width: w,
      height: hgt,
      viewBox: `0 0 ${w} ${hgt}`,
      style: { display: 'flex' },
      children: [
        { type: 'path', props: { d: area, fill: C.s2 } },
        { type: 'line', props: { x1: 0, y1: gy, x2: w, y2: gy, stroke: C.ink, strokeWidth: f.stroke * 0.35, strokeDasharray: `${f.dash} ${f.dash}` } },
        { type: 'path', props: { d: line, fill: 'none', stroke: C.ink, strokeWidth: f.stroke, strokeLinejoin: 'round', strokeLinecap: 'round' } },
        { type: 'rect', props: { x: lx - f.square / 2 - 2, y: ly - f.square / 2 - 2, width: f.square, height: f.square, fill: C.lime, stroke: C.ink, strokeWidth: f.stroke * 0.45 } },
      ],
    },
  };
  return div(
    { position: 'relative', width: w, height: hgt + f.labelGap + f.label },
    svg,
    mono({ position: 'absolute', left: 4, top: gy - f.label - 6, fontSize: f.label, color: C.ink2 }, ct(lang, 'card.prog.goal', { goal: fmtHms(goal) })),
    mono({ position: 'absolute', left: 0, top: hgt + f.labelGap, fontSize: f.label, color: C.muted }, ct(lang, 'card.prog.wk', { week: 1 })),
    mono({ position: 'absolute', right: 0, top: hgt + f.labelGap, fontSize: f.label, color: C.muted }, ct(lang, 'card.prog.wk', { week })),
  );
}

export interface CardInput {
  type: CardType;
  data: CardData;
  code: string;
  /** Draws the VOORBEELD label (reference cards only). */
  example?: boolean;
}

const twoLines = (s: string) => {
  const w = s.split(' ');
  return w.length < 3 ? [s] : [w.slice(0, 2).join(' '), w.slice(2).join(' ')];
};

function build(card: CardInput, format: CardFormat): Node {
  const d = card.data;
  const lang = d.lang ?? 'en';
  const t = (k: string, p: Record<string, string | number> = {}) => ct(lang, k, p);
  const [W, H] = CARD_SIZE[format];
  const story = format === 'story';
  const link = format === 'og';
  const division = t(divisionKey(d.division));
  const exLabel = card.example ? t('card.example').toUpperCase() : null;
  const chanceBlock = d.chance !== undefined && d.chance !== null;
  const goalStr = d.goal ? fmtHms(d.goal) : '';

  // ---- shared pieces per format
  const S = story
    ? { pad: '240px 72px 280px', wm: 52, tagS: 24, tagV: 10, tagH: 14, slipTop: 44, nick: 46, div: 30, ctaS: 44, ctaV: 34, ctaH: 40 }
    : link
      ? { pad: '44px 52px', wm: 34, tagS: 16, tagV: 6, tagH: 10, slipTop: 26, nick: 26, div: 20, ctaS: 26, ctaV: 18, ctaH: 20 }
      : { pad: '56px 60px 52px', wm: 40, tagS: 20, tagV: 8, tagH: 12, slipTop: 36, nick: 34, div: 24, ctaS: 34, ctaV: 24, ctaH: 30 };
  const head = row({ justifyContent: 'space-between', alignItems: 'center' }, wordmark(S.wm), exLabel ? tag(exLabel, S.tagS, S.tagV, S.tagH) : div({}));
  const nickRow = (padding: string, marginTop = 0) =>
    row({ justifyContent: 'space-between', alignItems: 'baseline', padding, marginTop }, nick(d.nickname, S.nick), mono({ fontSize: S.div, color: C.ink2 }, division));
  const footer = story
    ? col({ marginTop: 44 }, cta(t('card.cta'), S.ctaS, S.ctaV, S.ctaH, true), row({ marginTop: 20, justifyContent: 'space-between', fontFamily: MONO, fontSize: 32 }, div({}, t('card.ctaUrl')), div({ color: C.muted }, `/k/${card.code}`)))
    : link
      ? null
      : div({ marginTop: 28, display: 'flex' }, cta(card.type === 'challenge' ? t('card.ch.ctaLine') : t('card.ctaLine'), S.ctaS, S.ctaV, S.ctaH, true));
  const linkCta = cta(card.type === 'challenge' ? t('card.ch.ctaLine') : t('card.ctaLine'), S.ctaS, S.ctaV, S.ctaH, false);

  let body: Node;

  if (card.type === 'prediction') {
    const time = fmtHms(d.time);
    if (story) {
      const lbl = twoLines(t('card.pred.chanceLabel'));
      body = slip(
        { marginTop: S.slipTop, transform: 'rotate(-0.6deg)', flexGrow: 1, flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 52 },
        row({ padding: '44px 52px 30px' }, title(t('card.pred.title'), 60)),
        dashLine({ margin: '0 52px' }),
        nickRow('30px 52px 0'),
        mono({ padding: '40px 52px 0', fontSize: 30, color: C.muted }, t('card.pred.expected')),
        mono({ padding: '4px 52px 0', fontSize: 204, fontWeight: 600, letterSpacing: -6, lineHeight: 1 }, time),
        row(
          { padding: '34px 52px 0', alignItems: 'center', gap: 28 },
          mono({ fontSize: 40 }, t('card.pred.goal', { goal: goalStr })),
          chanceBlock ? limeBox({ padding: '2px 18px', letterSpacing: 0 }, `${d.chance}%`, 64) : null,
          chanceBlock ? col({ fontFamily: SANS, fontSize: 30, color: C.ink2, lineHeight: 1.15 }, ...lbl.map((x) => div({}, x))) : null,
        ),
        div({ padding: '52px 52px 0', display: 'flex' }, div({ width: '100%', display: 'flex' }, splitsBar(d, { bar: 34, legend: 33, time: 42, sq: 25, gap: 4, top: 0, legendTop: 26 }, lang))),
      );
    } else if (!link) {
      body = slip(
        { marginTop: S.slipTop, padding: '30px 44px 38px', flexGrow: 1, flexDirection: 'column', justifyContent: 'space-between' },
        title(t('card.pred.title'), 44),
        nickRow('0', 14),
        dashLine({ marginTop: 20 }),
        row(
          { marginTop: 18, alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 },
          mono({ fontSize: 168, fontWeight: 600, letterSpacing: -5, lineHeight: 1 }, time),
          chanceBlock
            ? col({ alignItems: 'flex-end', paddingBottom: 10 }, limeBox({ padding: '0 12px', letterSpacing: 0 }, `${d.chance}%`, 52), mono({ fontSize: 22, color: C.ink2, marginTop: 8 }, t('card.pred.chanceGoal', { goal: goalStr })))
            : null,
        ),
        splitsBar(d, { bar: 24, legend: 25, time: 32, sq: 19, gap: 4, top: 30, legendTop: 18 }, lang),
      );
    } else {
      const lbl = twoLines(`${t('card.pred.chanceShort')} ${t('card.pred.goal', { goal: goalStr })}`);
      body = slip(
        { marginTop: S.slipTop, flexGrow: 1, padding: '30px 36px', gap: 40 },
        col(
          { flexGrow: 1.35, flexBasis: 0 },
          title(t('card.pred.title'), 34),
          row({ marginTop: 8, alignItems: 'baseline', gap: 10 }, nick(d.nickname, 26), mono({ fontSize: 20, color: C.ink2 }, division)),
          mono({ marginTop: 'auto', fontSize: 124, fontWeight: 600, letterSpacing: -4, lineHeight: 0.95 }, time),
        ),
        col(
          { flexGrow: 1, flexBasis: 0, justifyContent: 'space-between', borderLeft: `2px dashed ${C.dash}`, paddingLeft: 36 },
          chanceBlock
            ? row({ alignItems: 'center', gap: 14 }, limeBox({ padding: '0 10px', letterSpacing: 0 }, `${d.chance}%`, 46), col({ fontFamily: MONO, fontSize: 20, color: C.ink2, lineHeight: 1.2 }, ...lbl.map((x) => div({}, x))))
            : div({}),
          col({}, row({ height: 16, gap: 3 }, ...[d.runs, d.stations, d.roxzone].map((v, i) => div({ flexGrow: v ?? 0, flexBasis: 0, background: [C.runs, C.stations, C.rox][i], height: '100%' }))), row({ justifyContent: 'space-between', fontFamily: MONO, fontSize: 24, marginTop: 10 }, div({}, fmtMmss(d.runs)), div({}, fmtMmss(d.stations)), div({}, fmtMmss(d.roxzone)))),
          linkCta,
        ),
      );
    }
  } else if (card.type === 'benchmark_pr') {
    const delta = fmtDelta((d.new ?? 0) - (d.old ?? 0));
    const pred = fmtHms(d.time);
    const chance = d.chance_old !== undefined && d.chance_new !== undefined ? `${d.chance_old}% → ${d.chance_new}%` : null;
    const chanceFull = chance ? t('card.pr.chance', { chanceOld: d.chance_old ?? '', chanceNew: d.chance_new ?? '' }) : null;
    const ptitle = t('card.pr.title');
    if (story) {
      body = slip(
        { marginTop: S.slipTop, transform: 'rotate(0.5deg)', flexGrow: 1, flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 52 },
        col({ padding: '44px 52px 30px' }, title(ptitle, 60), mono({ marginTop: 14, fontSize: 30, color: C.ink2 }, t('card.pr.sub', { n: d.n ?? 1, week: d.week ?? 1 }))),
        dashLine({ margin: '0 52px' }),
        nickRow('30px 52px 0'),
        div({ margin: '44px 52px 0', background: C.lime, justifyContent: 'center' }, mono({ fontSize: 250, fontWeight: 600, letterSpacing: -10, lineHeight: 1, padding: '28px 24px 22px' }, delta)),
        row({ padding: '40px 52px 0', alignItems: 'baseline', gap: 24, fontFamily: MONO, fontSize: 44 }, strike({}, fmtMmss(d.old)), arrowSvg(44), mono({ fontWeight: 600, fontSize: 64 }, fmtMmss(d.new))),
        row({ padding: '30px 52px 0', justifyContent: 'space-between', fontFamily: MONO, fontSize: 34 }, div({ color: C.ink2 }, t('card.pr.newPred')), div({ fontWeight: 600 }, pred)),
        chance ? row({ padding: '14px 52px 0', justifyContent: 'space-between', alignItems: 'center', fontFamily: MONO, fontSize: 34 }, div({ color: C.ink2 }, t('card.pr.chanceGoal', { goal: goalStr })), arrowText(chance, 34, { fontWeight: 600 })) : null,
      );
    } else if (!link) {
      body = slip(
        { marginTop: S.slipTop, padding: '30px 44px 36px', flexGrow: 1, flexDirection: 'column', justifyContent: 'space-between' },
        row({ justifyContent: 'space-between', alignItems: 'baseline' }, title(ptitle, 44), mono({ fontSize: 22, color: C.ink2 }, t('card.pr.subShort', { n: d.n ?? 1 }))),
        nickRow('0', 14),
        row(
          { marginTop: 24, alignItems: 'stretch', gap: 28 },
          limeBox({ padding: '18px 20px 14px' }, delta, 150),
          col({ justifyContent: 'center', gap: 10, fontFamily: MONO }, strike({ fontSize: 30 }, fmtMmss(d.old)), mono({ fontWeight: 600, fontSize: 46 }, fmtMmss(d.new))),
        ),
        row({ marginTop: 26, fontSize: 26, justifyContent: 'space-between', paddingTop: 18, borderTop: `2px dashed ${C.dash}`, fontFamily: MONO }, div({ color: C.ink2 }, t('card.pr.pred', { time: pred })), chanceFull ? arrowText(chanceFull, 26, { fontWeight: 600 }) : null),
      );
    } else {
      body = slip(
        { marginTop: S.slipTop, flexGrow: 1, padding: '30px 36px', gap: 36, alignItems: 'stretch' },
        col(
          { flexGrow: 1.2, flexBasis: 0 },
          title(ptitle, 34),
          row({ marginTop: 8, alignItems: 'baseline', gap: 10 }, nick(d.nickname, 26), mono({ fontSize: 20, color: C.ink2 }, division)),
          div({ marginTop: 'auto', alignSelf: 'flex-start' }, limeBox({ padding: '12px 18px 8px' }, delta, 118)),
        ),
        col(
          { flexGrow: 1, flexBasis: 0, justifyContent: 'space-between', borderLeft: `2px dashed ${C.dash}`, paddingLeft: 36 },
          row({ fontFamily: MONO, fontSize: 28, gap: 16, alignItems: 'baseline' }, strike({}, fmtMmss(d.old)), arrowSvg(28), mono({ fontWeight: 600, fontSize: 40 }, fmtMmss(d.new))),
          col({ fontFamily: MONO, fontSize: 26, color: C.ink2, lineHeight: 1.45 }, div({}, t('card.pr.pred', { time: pred })), chanceFull ? arrowText(chanceFull, 26) : null),
          linkCta,
        ),
      );
    }
  } else {
    // progress since the start
    const series = d.series && d.series.length >= 2 ? d.series : [d.start ?? 0, d.time ?? 0];
    const delta = fmtDelta((d.time ?? 0) - (d.start ?? 0));
    const week = d.week ?? series.length;
    const ptitle = t('card.prog.title');
    if (story) {
      body = slip(
        { marginTop: S.slipTop, transform: 'rotate(-0.4deg)', flexGrow: 1, flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 52 },
        col({ padding: '44px 52px 30px' }, title(ptitle, 60), mono({ marginTop: 14, fontSize: 30, color: C.ink2 }, t('card.prog.sub', { week, total: d.total ?? week }))),
        dashLine({ margin: '0 52px' }),
        nickRow('30px 52px 0'),
        row({ padding: '38px 52px 0', alignItems: 'center' }, limeBox({ padding: '18px 22px 12px' }, delta, 230)),
        row({ padding: '30px 52px 0', alignItems: 'baseline', gap: 22, fontFamily: MONO, fontSize: 40 }, strike({}, fmtHms(d.start)), arrowSvg(40), mono({ fontWeight: 600, fontSize: 60 }, fmtHms(d.time))),
        div({ padding: '44px 52px 0' }, chart(series, d.goal ?? series[series.length - 1], 828, 300, { stroke: 9, dash: 14, square: 23.4, label: 28, labelGap: 18 }, lang, week)),
      );
    } else if (!link) {
      body = slip(
        { marginTop: S.slipTop, padding: '30px 44px 30px', flexGrow: 1, flexDirection: 'column', justifyContent: 'space-between' },
        row({ justifyContent: 'space-between', alignItems: 'baseline' }, title(ptitle, 44), mono({ fontSize: 22, color: C.ink2 }, t('card.prog.subShort', { week, total: d.total ?? week }))),
        nickRow('0', 14),
        row({ marginTop: 22, gap: 30, alignItems: 'center' }, limeBox({ padding: '12px 16px 8px' }, delta, 128), col({ fontFamily: MONO, fontSize: 28, lineHeight: 1.4 }, strike({}, fmtHms(d.start)), mono({ fontWeight: 600, fontSize: 44 }, fmtHms(d.time)))),
        div({ marginTop: 22 }, chart(series, d.goal ?? series[series.length - 1], 872, 230, { stroke: 6, dash: 10, square: 15.6, label: 22, labelGap: 12 }, lang, week)),
      );
    } else {
      body = slip(
        { marginTop: S.slipTop, flexGrow: 1, padding: '30px 36px', gap: 36 },
        col(
          { flexGrow: 1, flexBasis: 0 },
          title(ptitle, 34),
          row({ marginTop: 8, alignItems: 'baseline', gap: 10 }, nick(d.nickname, 26), mono({ fontSize: 20, color: C.ink2 }, division)),
          row({ marginTop: 'auto', gap: 20, alignItems: 'flex-end' }, limeBox({ padding: '10px 14px 6px' }, delta, 104), col({ fontFamily: MONO, fontSize: 22, lineHeight: 1.35, paddingBottom: 6 }, strike({}, fmtHms(d.start)), mono({ fontWeight: 600, fontSize: 32 }, fmtHms(d.time)))),
        ),
        col(
          { flexGrow: 1, flexBasis: 0, justifyContent: 'space-between', borderLeft: `2px dashed ${C.dash}`, paddingLeft: 36 },
          chart(series, d.goal ?? series[series.length - 1], 430, 150, { stroke: 5, dash: 8, square: 13, label: 17, labelGap: 10 }, lang, week),
          linkCta,
        ),
      );
    }
  }

  return col({ width: W, height: H, background: C.ground, color: C.ink, fontFamily: SANS, padding: S.pad, overflow: 'hidden' }, head, body, footer);
}

export function renderCardSvg(card: CardInput, format: CardFormat, fonts: CardFont[]): Promise<string> {
  const [width, height] = CARD_SIZE[format];
  return satori(build(card, format) as never, { width, height, fonts: fonts as never });
}

export async function renderCardPng(card: CardInput, format: CardFormat, fonts: CardFont[]): Promise<Buffer> {
  const svg = await renderCardSvg(card, format, fonts);
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: CARD_SIZE[format][0] } }).render().asPng());
}
