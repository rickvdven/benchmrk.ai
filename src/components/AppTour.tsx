import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  GROESBEEK,
  STATION_NAMES,
  adaptForInjury,
  addDays,
  analyzeSession,
  defaultSchedule,
  evaluate,
  fmtHms,
  fmtMmss,
  generateSeason,
  mondayOf,
  phaseLabel,
  raceModel,
  stationsInText,
  todayISO,
  type Athlete,
  type Flags,
  type LoggedSession,
  type Phase,
  type Profile,
  type Session,
  type Tone,
} from '../engine';
import { useI18n } from '../lib/i18n';

/**
 * Landing: an auto-playing tour of the app in five scenes (season, whiteboard, analysis, injury, gym).
 * Every value is computed live with the engine for one example athlete, so the page cannot drift from the app.
 */

type T = (k: string) => string;
const SCENES = ['s1', 's2', 's3', 's4', 's5'] as const;
const DURATION = 9000;

const EX: Athlete = {
  name: '', sex: 'man', lthr: 175, maxHr: 190, thresholdPaceSec: 285, archetype: 'hybrid',
  flags: { achilles: false, quad: false, back: false, shin: false },
  stationStars: { skierg: 3, sledPush: 2, sledPull: 3, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 2 },
  stationTimes: {},
};

// the board a gym might write; station words are read by the same keyword reader the app uses
const BOARD = ['WOD · 4 RFT', '400 m run', '20 wall balls 6/4 kg', '20 m walking lunges', '10 burpee broad jumps', 'cap 24:00'];

const PHASE_BG: Record<Phase, string> = {
  prep: 'bg-[#e4e2dc]', base: 'bg-[#d6d3cb]', threshold: 'bg-[#a8a498]', compromised: 'bg-[#4a4843]',
  peak: 'bg-ink', taper: 'bg-accent', recovery: 'bg-[#e4e2dc]',
};
const TONE: Record<Tone, string> = { good: 'text-good', warn: 'text-warn', bad: 'text-bad', info: 'text-ink-2' };

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener?.('change', f);
    return () => m.removeEventListener?.('change', f);
  }, []);
  return r;
}

export function AppTour({ l }: { l: T }) {
  const { lang } = useI18n();
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const playing = !reduced && !paused && !hover;

  const d = useMemo(() => {
    const today = todayISO();
    const start = addDays(mondayOf(today), -8 * 7); // this week = week 9 of 16: compromised running
    const p: Profile = {
      athlete: EX, category: 'solo_open', raceName: 'A', raceDate: addDays(start, 15 * 7 + 5), goalSec: 4800,
      planStart: start, weekSchedule: defaultSchedule(5),
      season: [{ id: 'b', name: 'B', date: addDays(start, 10 * 7 + 5), goalSec: null, priority: 'B' }],
    };
    const weeks = generateSeason(p, { lang, today });
    const now = weeks.findIndex((w) => today >= w.start && today <= addDays(w.start, 6));
    const week = weeks[now] ?? weeks[0];
    const sessions = week.sessions.filter((s) => s.type !== 'rest');

    // analysis: two threshold runs, both 7 s/km slower than planned at the heart-rate cap
    const thr = (w: number) => weeks[w]?.sessions.find((s) => s.type === 'threshold' && s.targetPaceSec);
    const cur = thr(now) ?? thr(now - 1);
    const prev = thr(now - 1) ?? cur;
    let analysis = null;
    if (cur?.targetPaceSec && prev?.targetPaceSec) {
      const hr = cur.hrCap ?? EX.lthr;
      const log = (s: Session): LoggedSession => ({ date: s.date, type: s.type, targetPaceSec: s.targetPaceSec, hrCap: s.hrCap, actualPaceSec: s.targetPaceSec! + 7, avgHr: hr, rpe: 8 });
      const logs = [log(prev), log(cur)];
      const adjust = evaluate(logs, {}, cur.date);
      const a = analyzeSession(
        { date: cur.date, planned: cur, actualPaceSec: cur.targetPaceSec + 7, avgHr: hr, rpe: 8 },
        { profile: p, weeks, logs, morning: {}, today: cur.date, ceiling: 4, adjust, weakest: raceModel(p, today).weakestStations, lang },
      );
      analysis = { s: cur, hr, a, adjust };
    }

    // injury: the same week with a current Achilles problem
    const flags: Flags = { ...EX.flags, injuries: { achilles: 'now' }, injurySince: { achilles: week.start } };
    const ctx = { lang, flags, lthr: EX.lthr, maxHr: EX.maxHr, T: EX.thresholdPaceSec };
    const injured = sessions
      .map((s) => ({ s, x: adaptForInjury(ctx, s, s.date, week.start) }))
      .filter((r) => r.x?.title && r.x.title !== r.s.title)
      .slice(0, 3);
    const fin = raceModel(p, today).projected.finishSec;
    const finInj = raceModel({ ...p, athlete: { ...EX, flags } }, today).projected.finishSec;

    return { weeks, now, week, sessions, analysis, injured, fin, finInj, stations: stationsInText(BOARD.join('\n')) };
  }, [lang]);

  const day = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko' : lang, { weekday: 'short' });
  const pace = (s?: number | null) => (s ? `${fmtMmss(s)}/km` : '');
  const names = STATION_NAMES[lang] ?? STATION_NAMES.en;
  const scene = SCENES[i];

  return (
    <div className="mt-9 flex flex-wrap items-start gap-x-16 gap-y-8">
      {/* scene list: works as tabs and as a progress indicator */}
      <div className="min-w-0 flex-[1_1_320px]">
        <div role="tablist" aria-label={l('tour.title')} className="flex flex-col">
          {SCENES.map((k, n) => (
            <button
              key={k}
              role="tab"
              aria-selected={n === i}
              aria-controls="tour-screen"
              onClick={() => setI(n)}
              className={clsx('group relative border-t border-line py-4 text-left', n === SCENES.length - 1 && 'border-b')}
            >
              <span className="flex items-baseline gap-4">
                <span className="w-7 font-mono text-[13px] text-muted">{String(n + 1).padStart(2, '0')}</span>
                <span className={clsx('text-[19px] font-bold leading-tight', n !== i && 'text-ink-3 group-hover:text-ink')}>{l(`tour.${k}.h`)}</span>
              </span>
              {n === i && <span className="mt-2 block pl-11 text-ink-2">{l(`tour.${k}.d`)}</span>}
              {n === i && (
                <span className="absolute -top-px left-0 h-[2px] w-full bg-transparent" aria-hidden>
                  <span
                    key={`${i}-${lang}`}
                    className="block h-full bg-ink"
                    style={{ width: reduced ? '100%' : undefined, animation: reduced ? undefined : `bm-progress ${DURATION}ms linear forwards`, animationPlayState: playing ? 'running' : 'paused' }}
                    onAnimationEnd={() => setI((x) => (x + 1) % SCENES.length)}
                  />
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {!reduced && (
            <button onClick={() => setPaused((x) => !x)} className="bm-btn-outline !min-h-[40px] !text-[14px]">
              {paused ? l('tour.play') : l('tour.pause')}
            </button>
          )}
          <p className="text-xs text-muted">{l('tour.note')}</p>
        </div>
      </div>

      {/* the "screen" */}
      <div className="flex w-full flex-[0_1_400px] justify-center max-md:order-first" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div
          id="tour-screen"
          role="tabpanel"
          aria-live="polite"
          className="relative h-[540px] w-full max-w-[380px] overflow-hidden rounded-[28px] border-[1.5px] border-ink bg-surface shadow-paper"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="text-[15px] font-extrabold uppercase tracking-[0.02em] [font-stretch:80%]">
              BENCH<span className="ml-px bg-accent px-[3px]">MRK</span>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">{l(`tour.${scene}.tab`)}</span>
          </div>
          <div key={`${scene}-${lang}`} className="bm-scene h-[calc(100%-49px)] overflow-hidden px-5 py-4 text-[14px]">
            {scene === 's1' && (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">{l('tour.s1.season')}</p>
                <div className="mt-2 flex gap-[3px]" aria-hidden>
                  {d.weeks.map((w, n) => {
                    const race = w.sessions.find((s) => s.type === 'race');
                    return (
                      <div key={w.start} className="relative flex-1">
                        <div className={clsx('h-7 rounded-[2px]', PHASE_BG[w.phase], n === d.now && 'outline outline-2 outline-offset-1 outline-ink')} />
                        {race && (
                          <span className={clsx('absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[11px] font-semibold', 'bm-pop')}>
                            {d.weeks.indexOf(w) === d.weeks.length - 1 ? 'A' : 'B'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
                  <span>A = {l('tour.s1.a')}</span>
                  <span>B = {l('tour.s1.b')}</span>
                </div>
                <div className="mt-5 flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
                  <span className="font-bold">{l('tour.s1.week').replace('{n}', String(d.week.index))}</span>
                  <span className="font-mono text-[12px] text-muted">{phaseLabel(lang, d.week.phase)}</span>
                </div>
                <ul className="m-0 list-none p-0">
                  {d.sessions.map((s, n) => (
                    <li key={s.id} className="bm-row flex gap-3 border-b border-line py-2.5" style={{ animationDelay: `${200 + n * 140}ms` }}>
                      <span className="w-8 shrink-0 font-mono text-[12px] uppercase text-muted">{day(s.date)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.title}</span>
                        <span className="block font-mono text-[12px] text-muted">
                          {[pace(s.targetPaceSec), s.hrCap ? `≤ ${s.hrCap} bpm` : '', s.rpe ? `RPE ${s.rpe}` : ''].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {scene === 's2' && (
              <>
                <div className="relative overflow-hidden rounded-[6px] border-[6px] border-[#c9c5ba] bg-white px-4 py-3 shadow-inner">
                  {BOARD.map((line, n) => (
                    <p key={n} className={clsx('font-mono leading-snug text-[#1f5c9e]', n === 0 ? 'text-[17px] font-semibold' : 'text-[15px]')} style={{ transform: `rotate(${n % 2 ? -0.6 : 0.5}deg)` }}>
                      {line}
                    </p>
                  ))}
                  <span className="bm-scan absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-[rgba(212,240,70,0.55)] to-transparent" aria-hidden />
                </div>
                <p className="bm-row mt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-muted" style={{ animationDelay: '1500ms' }}>
                  {l('tour.s2.found')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.stations.map((st, n) => (
                    <span key={st} className="bm-row rounded-[3px] bg-accent px-2 py-1 text-[13px] font-semibold" style={{ animationDelay: `${1700 + n * 160}ms` }}>
                      {names[st]}
                    </span>
                  ))}
                </div>
                <div className="bm-row mt-4 rounded-[6px] border border-line p-3" style={{ animationDelay: '2500ms' }}>
                  <p className="font-semibold">{l('tour.s2.logged')}</p>
                  <p className="mt-1 text-ink-2">{l('tour.s2.load')}</p>
                </div>
              </>
            )}

            {scene === 's3' && d.analysis && (
              <>
                <p className="font-semibold">{d.analysis.s.title}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-[13px]">
                  {[
                    [l('tour.s3.target'), pace(d.analysis.s.targetPaceSec)],
                    [l('tour.s3.done'), pace(d.analysis.s.targetPaceSec! + 7)],
                    [l('tour.s3.hr'), `${d.analysis.hr}`],
                  ].map(([k, v], n) => (
                    <div key={k} className="bm-row rounded-[6px] bg-[#efeeea] p-2" style={{ animationDelay: `${150 + n * 150}ms` }}>
                      <dt className="text-[11px] text-muted">{k}</dt>
                      <dd className="mt-0.5 font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
                  {[...d.analysis.a.findings, ...d.analysis.a.effects].slice(0, 4).map((f, n) => (
                    <li key={n} className={clsx('bm-row flex gap-2 leading-snug', TONE[f.tone])} style={{ animationDelay: `${700 + n * 250}ms` }}>
                      <span aria-hidden>{f.tone === 'good' ? '✓' : f.tone === 'info' ? '·' : '!'}</span>
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                {d.analysis.adjust?.kind === 'slow_down' && (
                  <div className="bm-row mt-3 flex items-center justify-between gap-3 rounded-[6px] border-[1.5px] border-ink p-3" style={{ animationDelay: '1900ms' }}>
                    <span className="leading-snug">{l('tour.s3.suggest').replace('{d}', String(d.analysis.adjust.sec))}</span>
                    <span className="shrink-0 rounded-[3px] bg-accent px-2.5 py-1.5 text-[13px] font-bold">{l('tour.s3.apply')}</span>
                  </div>
                )}
              </>
            )}

            {scene === 's4' && (
              <>
                <div className="flex items-center justify-between gap-3 rounded-[6px] bg-[#efeeea] p-3">
                  <span className="font-semibold">{l('tour.s4.flag')}</span>
                  <span className="bm-pop rounded-full bg-ink px-2.5 py-0.5 font-mono text-[11px] text-white">{l('tour.s4.now')}</span>
                </div>
                <ul className="m-0 mt-3 list-none space-y-2.5 p-0">
                  {d.injured.map(({ s, x }, n) => (
                    <li key={s.id} className="rounded-[6px] border border-line p-2.5">
                      <span className="block font-mono text-[11px] uppercase text-muted">{day(s.date)}</span>
                      <s className="block text-ink-3 decoration-[1.5px]">{s.title}</s>
                      <span className="bm-row mt-0.5 block font-semibold" style={{ animationDelay: `${600 + n * 350}ms` }}>
                        → {x!.title}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="bm-row mt-3 flex items-baseline justify-between border-t-[1.5px] border-ink pt-2 font-mono text-[13px]" style={{ animationDelay: '1800ms' }}>
                  <span className="text-muted">{l('tour.s4.pred')}</span>
                  <span>
                    {fmtHms(d.fin)} → <strong>{fmtHms(d.finInj)}</strong>
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-snug text-muted">{l('tour.s4.note')}</p>
              </>
            )}

            {scene === 's5' && (
              <>
                <label className="block font-mono text-[11px] uppercase tracking-[0.06em] text-muted">{l('tour.s5.code')}</label>
                <div className="mt-1 flex items-center justify-between border-b-[1.5px] border-ink pb-1.5">
                  <span className="bm-type overflow-hidden whitespace-nowrap font-mono text-[18px] font-semibold tracking-[0.08em]">JOUWGYM</span>
                  <span className="bm-pop text-good" style={{ animationDelay: '1200ms' }} aria-hidden>
                    ✓
                  </span>
                </div>
                <p className="bm-row mt-4 font-semibold" style={{ animationDelay: '1300ms' }}>
                  {l('tour.s5.template')}
                </p>
                <div className="mt-2 flex h-[150px] items-end gap-[5px]" aria-hidden>
                  {GROESBEEK.blocks.flatMap((b, bn) =>
                    Array.from({ length: b.weeks }, (_, k) => (
                      <div key={`${bn}-${k}`} className="flex flex-1 flex-col justify-end gap-[2px]">
                        <div className="bm-bar rounded-t-[2px] bg-ink" style={{ height: `${b.run * 0.55}px`, animationDelay: `${1400 + (bn * 3 + k) * 60}ms` }} />
                        <div className="bm-bar bg-[#a8a498]" style={{ height: `${b.station * 0.45}px`, animationDelay: `${1450 + (bn * 3 + k) * 60}ms` }} />
                      </div>
                    )),
                  )}
                </div>
                <div className="mt-2 flex gap-4 font-mono text-[11px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <i className="inline-block h-2.5 w-2.5 bg-ink" /> {l('tour.s5.run')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="inline-block h-2.5 w-2.5 bg-[#a8a498]" /> {l('tour.s5.st')}
                  </span>
                </div>
                <div className="bm-row mt-4 rounded-[6px] border border-line p-3" style={{ animationDelay: '2400ms' }}>
                  <p className="font-semibold">{l('tour.s5.follow')}</p>
                  <p className="mt-1 text-ink-2">{l('tour.s5.own')}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
