import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowRight, ExternalLink, History, Sparkles } from 'lucide-react';
import { fmtHms, type PlanPreview, type RuleChange, type Session } from '../engine';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { fieldList, fmtDay, fmtRuleValue, loc, pt, ruleLabel, weekSummary } from '../lib/planupdates';
import { chanceTone } from '../engine';
import { useMutations, useOpenPlanUpdates, usePlanChoices, usePlanUpdates, type PlanVersionRow } from '../data/hooks';

// ---------------- sources ----------------
export interface SourceRow {
  id: string;
  title: string;
  category: string;
  author: string | null;
  source_url: string | null;
  summary?: string | null;
  slug?: string | null;
  level?: 'A' | 'B' | 'C' | 'D' | null;
  status?: 'active' | 'archived';
  archived_at?: string | null;
  archived_reason?: string | null;
  replaced_by?: string | null;
  checked_at?: string | null;
  rule_keys?: string[];
  created_at?: string;
}

/** All sources with level, status and rule keys (select * so the app keeps working before migration 022 is applied). */
export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    staleTime: 30 * 60_000,
    queryFn: async () => ((await supabase.from('knowledge_sources').select('*').order('title')).data ?? []) as SourceRow[],
  });
}

/** A rule change cites sources by slug, or by title prefix like Session.sourceKey. */
export function findSource(sources: SourceRow[], ref: string) {
  return sources.find((s) => s.slug === ref) ?? sources.find((s) => s.title.startsWith(ref)) ?? null;
}
export const sourceAnchor = (s: SourceRow) => `src-${s.slug ?? s.id}`;

// ---------------- cockpit notice ----------------
/** "New: Plan update 12 Nov. See what changes." for a published update the member has not chosen on yet. */
export function PlanUpdateNotice({ pinned }: { pinned: number }) {
  const { lang } = useI18n();
  const open = useOpenPlanUpdates(pinned);
  const u = open[0];
  if (!u) return null;
  return (
    <Link to={`/plan/update/${u.id}`} className="panel flex items-center gap-3 border-volt/60 bg-volt/10 p-4 hover:bg-volt/15">
      <Sparkles className="h-5 w-5 shrink-0 text-volt" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{pt(lang, 'notice.title', { date: fmtDay(lang, u.published_at ?? u.created_at) })}</p>
        <p className="text-sm text-muted">
          {loc(u.title, lang)} · {pt(lang, 'notice.body')}
        </p>
      </div>
      <span className="btn-primary btn-sm shrink-0">
        {pt(lang, 'notice.cta')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  );
}

/** Stores the future plan with the start version once, so every version in the history has a snapshot. */
export function usePlanSnapshotBackfill(c: { versions: PlanVersionRow[] | null; weeks?: import('../engine').Week[]; today: string } | null) {
  const { recordPlanSnapshot } = useMutations();
  const done = useRef(false);
  const latest = c?.versions?.[c.versions.length - 1];
  useEffect(() => {
    if (done.current || !c?.weeks?.length || !latest || latest.plan_snapshot) return;
    done.current = true;
    recordPlanSnapshot(c.weeks, c.today).catch(() => {
      done.current = false;
    });
  }, [c, latest, recordPlanSnapshot]);
}

// ---------------- what changes ----------------
export function RuleChangeList({ changes, sources }: { changes: RuleChange[]; sources: SourceRow[] }) {
  const { lang } = useI18n();
  return (
    <ul className="space-y-3">
      {changes.map((ch, i) => (
        <li key={`${ch.key}-${i}`} className="rounded-lg border border-line bg-panel2/50 p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold">{ruleLabel(lang, ch.key)}</span>
            <span className="stat text-xs">
              <span className="text-muted line-through">{fmtRuleValue(lang, ch.before)}</span>
              <ArrowRight className="mx-1 inline h-3 w-3 text-muted" aria-hidden />
              <span className="font-semibold">{fmtRuleValue(lang, ch.after)}</span>
            </span>
          </div>
          <p className="mt-1.5">
            <span className="label mr-1">{pt(lang, 'page.why')}:</span>
            {loc(ch.why, lang)}
          </p>
          {ch.sourceIds.length > 0 && (
            <p className="mt-1.5 text-xs text-muted">
              <span className="label mr-1">{pt(lang, 'page.sources')}:</span>
              {ch.sourceIds.map((ref, k) => {
                const s = findSource(sources, ref);
                return (
                  <span key={ref}>
                    {k > 0 && ' · '}
                    <Link to={`/science#${s ? sourceAnchor(s) : 'sources'}`} className="underline hover:text-fg">
                      {s?.title ?? ref}
                    </Link>
                  </span>
                );
              })}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------- before / after ----------------
function SessionCell({ s, struck }: { s: Session | null; struck?: boolean }) {
  const { pace, dist } = useI18n();
  if (!s) return <span className="text-muted">–</span>;
  const meta = [s.km ? dist(s.km) : '', s.targetPaceSec && s.type !== 'easy' && s.type !== 'long' && s.type !== 'rest' ? pace(s.targetPaceSec) : '', s.hrCap ? `≤ ${s.hrCap} bpm` : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <span className={clsx('block min-w-0', struck && 'text-muted line-through decoration-bad/70')}>
      <span className="block break-words">{s.title}</span>
      {meta && <span className="stat block text-xs text-muted">{meta}</span>}
    </span>
  );
}

export function PlanDiffWeeks({ preview }: { preview: PlanPreview }) {
  const { lang } = useI18n();
  return (
    <div className="space-y-4">
      {preview.weeks.map((w) => (
        <section key={w.start} className="rounded-lg border border-line">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-panel2/60 px-3 py-2">
            <h3 className="text-sm font-semibold">{pt(lang, 'week.of', { date: fmtDay(lang, w.start) })}</h3>
            <span className={clsx('stat text-xs', w.changed ? 'font-semibold text-fg' : 'text-muted')}>{weekSummary(lang, w)}</span>
          </header>
          <ol className="divide-y divide-line">
            {w.days.map((d) => {
              const changed = d.fields.length > 0;
              const day = new Date(d.date + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang, { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <li key={d.date} className={clsx('grid gap-x-3 gap-y-1 px-3 py-2 text-sm sm:grid-cols-[8rem_1fr_1fr]', changed ? 'bg-volt/10' : 'text-muted')}>
                  <span className="stat text-xs leading-5">
                    {day}
                    {d.frozen && <span className="chip ml-1">{pt(lang, 'day.logged')}</span>}
                  </span>
                  {changed ? (
                    <>
                      <SessionCell s={d.before} struck />
                      <div className="min-w-0">
                        <SessionCell s={d.after} />
                        <span className="mt-0.5 block text-[11px] font-medium text-ink-3">{pt(lang, 'day.changed', { fields: fieldList(lang, d.fields) })}</span>
                      </div>
                    </>
                  ) : (
                    <span className="min-w-0 sm:col-span-2">
                      <span className="block break-words">{d.before?.title ?? '–'}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function ForecastCompare({ preview }: { preview: PlanPreview }) {
  const { lang } = useI18n();
  const { before, after } = preview.model;
  if (!preview.forecastChanged) return <p className="text-sm text-muted">{pt(lang, 'page.forecastSame')}</p>;
  const row = (label: string, a: string, b: string, tone?: [string, string]) => (
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-t border-line py-2 text-sm first:border-t-0">
      <span className="text-muted">{label}</span>
      <span className={clsx('stat text-right', tone?.[0])}>{a}</span>
      <span className={clsx('stat text-right font-semibold', tone?.[1])}>{b}</span>
    </div>
  );
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-1 text-xs text-muted">
        <span />
        <span className="text-right">{pt(lang, 'page.now')}</span>
        <span className="text-right">{pt(lang, 'page.afterUpdate')}</span>
      </div>
      {row(pt(lang, 'page.finish'), fmtHms(before.projected.finishSec), fmtHms(after.projected.finishSec))}
      {row(pt(lang, 'page.chance'), `${before.chance} %`, `${after.chance} %`, [chanceTone(before.chance), chanceTone(after.chance)])}
    </div>
  );
}

// ---------------- settings → plan history ----------------
export function PlanHistory({ versions, pinned }: { versions: PlanVersionRow[] | null; pinned: number }) {
  const { lang } = useI18n();
  const updates = usePlanUpdates();
  const choices = usePlanChoices();
  const byId = new Map((updates.data ?? []).map((u) => [u.id, u]));
  const choiceOf = new Map((choices.data ?? []).map((c) => [c.plan_update_id, c.choice]));
  const list = [...(versions ?? [])].reverse();
  const published = (updates.data ?? []).filter((u) => u.status === 'published');
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <History className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
        <p className="text-sm text-muted">{pt(lang, 'history.intro')}</p>
      </div>
      {!list.length && <p className="text-sm text-muted">{pt(lang, 'history.empty')}</p>}
      <ol className="divide-y divide-line rounded-lg border border-line">
        {list.map((v, i) => {
          const current = i === 0;
          const upd = v.plan_update_id ? byId.get(v.plan_update_id) : null;
          const reason =
            v.reason === 'rollback' ? pt(lang, 'history.reason.rollback', { n: v.restored_version_no ?? '?' }) : pt(lang, `history.reason.${v.reason}`);
          return (
            <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {pt(lang, 'history.version', { n: v.version_no })}
                  {current && <span className="chip ml-2 bg-volt/20 text-ink">{pt(lang, 'history.current')}</span>}
                </p>
                <p className="text-muted">
                  {reason}
                  {upd ? ` · ${loc(upd.title, lang)}` : ''}
                </p>
                <p className="stat text-xs text-muted">
                  {fmtDay(lang, v.created_at, true)} · {pt(lang, 'history.ruleSet', { v: v.rule_set_version })}
                  {v.effective_from ? ` · ${pt(lang, 'history.from', { date: fmtDay(lang, v.effective_from) })}` : ''}
                </p>
              </div>
              {!current && (
                <Link to={`/plan/history/${v.id}`} className="btn-ghost btn-sm">
                  {pt(lang, 'history.restore')}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {published.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{pt(lang, 'history.updates')}</h3>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {published.map((u) => {
              const ch = choiceOf.get(u.id);
              const state = u.rule_set_version === pinned ? 'applied' : (ch ?? 'open');
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{loc(u.title, lang)}</p>
                    <p className="stat text-xs text-muted">
                      {fmtDay(lang, u.published_at ?? u.created_at, true)} · {pt(lang, 'history.ruleSet', { v: u.rule_set_version })} · {pt(lang, `history.choice.${state}`)}
                    </p>
                  </div>
                  <Link to={`/plan/update/${u.id}`} className="btn-ghost btn-sm">
                    {pt(lang, 'history.view')}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SourceLink({ s }: { s: SourceRow }) {
  return s.source_url ? (
    <a href={s.source_url} target="_blank" rel="noreferrer" className="group inline-flex gap-1.5 hover:text-volt">
      <span>{s.title}</span>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-volt" aria-hidden />
    </a>
  ) : (
    <span>{s.title}</span>
  );
}
