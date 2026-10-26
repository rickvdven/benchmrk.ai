import { describe, expect, it } from 'vitest';
import { CODE_RE, divisionCode, divisionKey, fmtDelta, validNickname } from './cards';
import { ct } from './competition';
import { altFor, captionsFor, ogFor, whatsappFor } from './cardTexts';

describe('nickname', () => {
  it.each(['sledpusher', 'lunge_lotte', 'a.b-c', 'ABC', 'x'.repeat(20)])('accepts %s', (n) => expect(validNickname(n)).toBe(true));
  it.each(['ab', 'x'.repeat(21), 'sled pusher', 'sled@pusher', 'søren', '한국어', '', '  '])('rejects %j', (n) => expect(validNickname(n)).toBe(false));
});

describe('divisions and deltas', () => {
  it('maps category and sex to the stored division code', () => {
    expect(divisionCode('solo_open', 'man')).toBe('open_men');
    expect(divisionCode('solo_open', 'woman')).toBe('open_women');
    expect(divisionCode('solo_pro', 'man')).toBe('pro_men');
    expect(divisionCode('solo_pro', 'woman')).toBe('pro_women');
    expect(divisionCode('doubles_open', 'woman')).toBe('doubles_open');
    expect(divisionCode('doubles_pro', 'man')).toBe('doubles_pro');
    expect(divisionCode(null, null)).toBe('open_men');
  });
  it('points every division code at an existing text', () => {
    for (const code of ['open_men', 'open_women', 'pro_men', 'pro_women', 'doubles_open', 'doubles_pro']) {
      expect(ct('en', divisionKey(code))).not.toBe(divisionKey(code));
      expect(ct('en', divisionKey(code, true))).not.toBe(divisionKey(code, true));
    }
    expect(ct('nl', divisionKey('open_women'))).toBe('Open · Women');
    expect(ct('nl', divisionKey('doubles_pro'))).toBe('Doubles · Pro');
  });
  it('writes a change with a real minus sign', () => {
    expect(fmtDelta(-46)).toBe('−0:46');
    expect(fmtDelta(12)).toBe('+0:12');
    expect(fmtDelta(0)).toBe('0:00');
  });
  it('accepts only codes without look-alike characters', () => {
    expect(CODE_RE.test('R4MW3B')).toBe(true);
    for (const bad of ['R4MW3', 'r4mw3b', 'R4MWOB', 'R4MWIB', 'R4MW10', '../etc']) expect(CODE_RE.test(bad)).toBe(false);
  });
});

describe('texts with a card', () => {
  const pred = { v: 1, lang: 'nl', nickname: 'sledpusher', division: 'open_men', time: 4721, goal: 4800, chance: 96, runs: 2544, stations: 1852, roxzone: 325, weeks: 16 };
  const pr = { v: 1, lang: 'en', nickname: 'lunge_lotte', division: 'open_women', n: 2, week: 7, old: 292, new: 286, time: 5191, goal: 5280, chance_old: 74, chance_new: 83 };
  it('fills the link preview from the card numbers only', () => {
    const og = ogFor('prediction', pred);
    expect(og.title).toBe('sledpusher: verwacht 1:18:41 · Open · Men');
    expect(og.desc).toContain('1:20:00');
    expect(og.desc).toContain('96 %');
    expect(ogFor('benchmark_pr', pr).title).toBe('lunge_lotte: −0:06 on benchmark 2');
  });
  it('has no unfilled placeholders in any text', () => {
    const all = [
      ...Object.values(ogFor('prediction', pred)),
      ...Object.values(ogFor('benchmark_pr', pr)),
      ...captionsFor('prediction', pred),
      ...captionsFor('benchmark_pr', pr, { weeksAgo: 4 }),
      whatsappFor('prediction', pred, 'https://benchmrk.ai/k/ABCDE2', 'Amsterdam 2027'),
      whatsappFor('benchmark_pr', pr, 'https://benchmrk.ai/k/ABCDE2'),
      altFor('prediction', pred),
      altFor('benchmark_pr', pr),
    ];
    for (const t of all) expect(t).not.toMatch(/\{\w+\}/);
  });
  it('shows the "four weeks ago" caption only after about four weeks', () => {
    expect(captionsFor('benchmark_pr', pr, { weeksAgo: 4 })).toHaveLength(3);
    expect(captionsFor('benchmark_pr', pr, { weeksAgo: 3 })).toHaveLength(2);
    expect(captionsFor('benchmark_pr', pr)).toHaveLength(2);
  });
  it('writes the benchmark gain in the WhatsApp text without a minus sign', () => {
    expect(whatsappFor('benchmark_pr', pr, 'L')).toContain('0:06 faster');
    expect(whatsappFor('benchmark_pr', pr, 'L')).not.toContain('−');
  });
  it('leaves the race out of the WhatsApp text when there is none', () => {
    expect(whatsappFor('prediction', pred, 'L')).toContain('HYROX-tijd');
  });
});
