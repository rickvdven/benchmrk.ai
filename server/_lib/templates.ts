import {
  addDays,
  compliance,
  fmtHms,
  fmtMmss,
  erasFromVersions,
  generateVersionedSeason,
  currentProfile,
  mondayOf,
  raceModel,
  todayISO,
  tx,
  weekMilestone,
  type Lang,
  type Session,
  type Week,
} from '../../src/engine/index';
import { toProfile, type ProfileRow } from '../../src/data/mapping';
import { layout, rows, APP_URL, unsubUrl } from './mail';
import de from '../../src/locales/de.json';
import es from '../../src/locales/es.json';
import ko from '../../src/locales/ko.json';

type Dict = Record<string, string>;
const T: Partial<Record<Lang, Dict>> & { en: Dict } = {
  en: {
    footer: 'You get this because you train with Benchmrk.',
    unsub: 'Unsubscribe from these e-mails',
    open: 'Open your plan',
    weeklySubject: 'Your week {n}: {phase} · {race}',
    weeklyTitle: 'Week {n} · {phase}',
    weeklyIntro: '{days} days to {race}. Projected finish {proj} (goal {goal}) — {chance}% chance.',
    lastWeek: 'Last week you completed {done} of {due} sessions.',
    target: 'This week',
    benchSubject: 'Tomorrow: Benchmark {n}',
    benchTitle: 'Benchmark {n} is tomorrow',
    benchIntro: 'Sleep well, eat carbs tonight and keep tomorrow’s warm-up as prescribed. Log your result in the app — it recalibrates your paces.',
    teamSubject: '{name} joined your doubles team',
    teamTitle: '{name} is your partner',
    teamIntro: 'Your team plan, shared prediction and station splits are ready. Agree on a shared sim day in the doubles lab.',
    teamCta: 'Open doubles lab',
    refSubject: 'Your friend {name} joined — you earned {months} month(s)',
    refTitle: 'Thanks for spreading the word',
    refIntro: '{name} activated a membership with your invite. Your membership is extended by {months} month(s), until {date}.',
    comSubject: 'New commission: {amount}',
    comTitle: 'A new paid membership via you',
    comIntro: '{name} paid for a membership through your ambassador link. Commission {amount} is pending and will be paid out with the next settlement.',
    paySubject: 'Your Benchmrk membership is active',
    payTitle: 'Membership active',
    payIntro: 'Thanks! Your membership is active until {date}.',
    welcomeSubject: 'Your HYROX plan is ready',
    welcomeTitle: 'Welcome, {name}',
    welcomeIntro: '{weeks} weeks to {race}. Tick sessions and log pace, heart rate and RPE — your plan adapts to what you actually do.',
    trialSubject: 'Your trial ends in {n} day(s)',
    trialTitle: 'Trial ends soon',
    trialIntro: 'Activate your membership in Settings to keep your plan and history.',
    testSubject: 'Benchmrk test e-mail',
    testTitle: 'Mail works',
    testIntro: 'This is a test from the Benchmrk admin.',
    rest: 'Rest',
  },
  nl: {
    footer: 'Je krijgt deze mail omdat je traint met Benchmrk.',
    unsub: 'Afmelden voor deze mails',
    open: 'Open je plan',
    weeklySubject: 'Jouw week {n}: {phase} · {race}',
    weeklyTitle: 'Week {n} · {phase}',
    weeklyIntro: 'Nog {days} dagen tot {race}. Verwachte eindtijd {proj} (doel {goal}) — {chance}% kans.',
    lastWeek: 'Vorige week deed je {done} van {due} trainingen.',
    target: 'Deze week',
    benchSubject: 'Morgen: benchmark {n}',
    benchTitle: 'Morgen is benchmark {n}',
    benchIntro: 'Slaap goed, eet vanavond koolhydraten en doe morgen de warming-up zoals voorgeschreven. Log je resultaat in de app — dan worden je tempo’s herberekend.',
    teamSubject: '{name} doet mee in je doubles-team',
    teamTitle: '{name} is je partner',
    teamIntro: 'Jullie teamplan, gezamenlijke voorspelling en stationverdeling staan klaar. Spreek een gedeelde sim-dag af in het doubles-lab.',
    teamCta: 'Open doubles-lab',
    refSubject: 'Je vriend {name} doet mee — je verdiende {months} maand(en)',
    refTitle: 'Bedankt voor het doorvertellen',
    refIntro: '{name} heeft via jouw uitnodiging een lidmaatschap geactiveerd. Je lidmaatschap is met {months} maand(en) verlengd, tot {date}.',
    comSubject: 'Nieuwe commissie: {amount}',
    comTitle: 'Een nieuw betaald lidmaatschap via jou',
    comIntro: '{name} heeft via jouw ambassadeurslink een lidmaatschap betaald. Commissie {amount} staat klaar en wordt bij de volgende afrekening uitbetaald.',
    paySubject: 'Je Benchmrk-lidmaatschap is actief',
    payTitle: 'Lidmaatschap actief',
    payIntro: 'Dank je! Je lidmaatschap is actief tot {date}.',
    welcomeSubject: 'Je HYROX-plan staat klaar',
    welcomeTitle: 'Welkom, {name}',
    welcomeIntro: 'Nog {weeks} weken tot {race}. Vink trainingen af en log tempo, hartslag en RPE — je plan past zich aan op wat je echt doet.',
    trialSubject: 'Je proefperiode eindigt over {n} dag(en)',
    trialTitle: 'Proefperiode loopt af',
    trialIntro: 'Activeer je lidmaatschap bij Instellingen om je plan en historie te houden.',
    testSubject: 'Benchmrk testmail',
    testTitle: 'Mail werkt',
    testIntro: 'Dit is een test vanuit de Benchmrk-admin.',
    rest: 'Rust',
  },
};

export function registerMailDict(lang: Lang, d: Dict) {
  T[lang] = d;
}
registerMailDict('de', de.mail);
registerMailDict('es', es.mail);
registerMailDict('ko', ko.mail);

const tr = (lang: Lang, k: string, p: Record<string, string | number> = {}) =>
  ((T[lang] ?? T.en)[k] ?? T.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => String(p[x] ?? ''));

const langOf = (r: ProfileRow): Lang => (['en', 'nl', 'de', 'es', 'ko'].includes(r.lang) ? (r.lang as Lang) : 'en');

const sessionLine = (s: Session, lang: Lang): [string, string] => {
  const dow = new Date(s.date + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const meta = [s.targetPaceSec && s.type !== 'easy' && s.type !== 'long' ? `${fmtMmss(s.targetPaceSec)}/km` : '', s.hrCap ? `≤ ${s.hrCap} bpm` : '', s.benchmark ? `B${s.benchmark}` : ''].filter(Boolean).join(' · ');
  return [`${dow} — ${s.title}`, meta];
};

export interface Ctx {
  row: ProfileRow;
  completed: Record<string, boolean>;
  morning: Record<string, number>;
  today?: string;
  /** user_plan_versions rows (oldest first): which rule set the plan follows from which date */
  versions?: { rule_set_version: number; effective_from: string }[] | null;
}

function planFor(c: Ctx) {
  const lang = langOf(c.row);
  const p = toProfile(c.row);
  const today = c.today ?? todayISO();
  const weeks = generateVersionedSeason(p, { lang, flare: c.morning, today }, erasFromVersions(c.versions, (c.row as { rule_set_version?: number }).rule_set_version ?? 1));
  return { lang, p: currentProfile(p, today), today, weeks };
}

export function weeklyMail(c: Ctx) {
  const { lang, p, today, weeks } = planFor(c);
  const monday = mondayOf(today);
  const w = weeks.find((x) => x.start === monday) as Week | undefined;
  if (!w) return null;
  const m = raceModel(p, today);
  const lastWeekDue = weeks.find((x) => x.start === addDays(monday, -7));
  const due = lastWeekDue ? lastWeekDue.sessions.filter((s) => s.type !== 'rest' && s.type !== 'race').length : 0;
  const done = lastWeekDue ? lastWeekDue.sessions.filter((s) => c.completed[s.date]).length : 0;
  const phase = tx(lang, `phase.${w.phase}`);
  const ms = weekMilestone(w, p, lang);
  const days = Math.max(0, Math.round((new Date(p.raceDate).getTime() - new Date(today).getTime()) / 864e5));
  const body =
    (lastWeekDue && due ? `<p style="margin:0 0 12px;font-size:14px;color:#eceef0">${tr(lang, 'lastWeek', { done, due })}</p>` : '') +
    (ms ? `<p style="margin:0 0 12px;padding:10px 12px;background:#202612;border-radius:8px;font-size:14px;color:#d4ff3a">${tr(lang, 'target')}: ${ms}</p>` : '') +
    rows(w.sessions.filter((s) => s.type !== 'rest').map((s) => sessionLine(s, lang)));
  return {
    subject: tr(lang, 'weeklySubject', { n: w.index, phase, race: p.raceName }),
    ref: monday,
    html: layout({
      title: tr(lang, 'weeklyTitle', { n: w.index, phase }),
      intro: tr(lang, 'weeklyIntro', { days, race: p.raceName, proj: fmtHms(m.projected.finishSec), goal: fmtHms(p.goalSec), chance: m.chance }),
      bodyHtml: body,
      cta: { label: tr(lang, 'open'), url: `${APP_URL()}/plan` },
      footer: tr(lang, 'footer'),
      unsub: unsubUrl(c.row.id, 'weekly'),
      unsubLabel: tr(lang, 'unsub'),
    }),
    _compliance: compliance(weeks, c.completed, today, c.row.created_at.slice(0, 10)),
  };
}

export function benchmarkMail(c: Ctx) {
  const { lang, today, weeks } = planFor(c);
  const tomorrow = addDays(today, 1);
  const s = weeks.flatMap((w) => w.sessions).find((x) => x.date === tomorrow && x.benchmark && !x.guard);
  if (!s || !s.benchmark) return null;
  return {
    subject: tr(lang, 'benchSubject', { n: s.benchmark }),
    ref: tomorrow,
    html: layout({
      title: tr(lang, 'benchTitle', { n: s.benchmark }),
      intro: tr(lang, 'benchIntro'),
      bodyHtml: rows([sessionLine(s, lang)]) + (s.benchmarkText ? `<p style="font-size:14px;color:#ffb84d">${s.benchmarkText}</p>` : ''),
      cta: { label: tr(lang, 'open'), url: `${APP_URL()}/plan` },
      footer: tr(lang, 'footer'),
      unsub: unsubUrl(c.row.id, 'reminders'),
      unsubLabel: tr(lang, 'unsub'),
    }),
  };
}

export function simpleMail(row: ProfileRow, kind: 'team' | 'payment' | 'welcome' | 'trial' | 'test' | 'referral' | 'commission', p: Record<string, string | number> = {}) {
  const lang = langOf(row);
  const map = {
    team: { s: 'teamSubject', t: 'teamTitle', i: 'teamIntro', cta: 'teamCta', url: '/doubles', unsub: 'team' },
    payment: { s: 'paySubject', t: 'payTitle', i: 'payIntro', cta: 'open', url: '/cockpit', unsub: null },
    welcome: { s: 'welcomeSubject', t: 'welcomeTitle', i: 'welcomeIntro', cta: 'open', url: '/plan', unsub: null },
    trial: { s: 'trialSubject', t: 'trialTitle', i: 'trialIntro', cta: 'open', url: '/settings', unsub: 'reminders' },
    test: { s: 'testSubject', t: 'testTitle', i: 'testIntro', cta: 'open', url: '/cockpit', unsub: null },
    referral: { s: 'refSubject', t: 'refTitle', i: 'refIntro', cta: 'open', url: '/invite', unsub: null },
    commission: { s: 'comSubject', t: 'comTitle', i: 'comIntro', cta: 'open', url: '/invite', unsub: null },
  }[kind];
  return {
    subject: tr(lang, map.s, p),
    html: layout({
      title: tr(lang, map.t, p),
      intro: tr(lang, map.i, p),
      bodyHtml: '',
      cta: { label: tr(lang, map.cta), url: `${APP_URL()}${map.url}` },
      footer: tr(lang, 'footer'),
      unsub: map.unsub ? unsubUrl(row.id, map.unsub) : undefined,
      unsubLabel: tr(lang, 'unsub'),
    }),
  };
}
