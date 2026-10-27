import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { generateVersionedSeason, previewPlanUpdate, ruleSet, snapshotOf, type RuleChange } from '../engine';
import { PlanDiffView } from '../components/PlanDiffView';
import { PageHeader, Spinner } from '../components/ui';
import { useCoach, useKnowledge } from '../data/hooks';
import { updateTitle, usePlanChoices, usePlanUpdateActions, usePlanUpdates } from '../data/planUpdates';
import { useI18n } from '../lib/i18n';
import { usePt } from '../lib/usePt';

const GROUPS = ['zones', 'threshold', 'volume', 'longRun', 'sim', 'taper', 'forecast'];
const groupOf = (key: string) => GROUPS.find((g) => key === g || key.startsWith(`${g}.`)) ?? 'other';
const show = (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

export function ChangeList({ changes }: { changes: RuleChange[] }) {
  const { lang } = useI18n();
  const p = usePt();
  const knowledge = useKnowledge();
  return (
    <ul className="space-y-3">
      {changes.map((c) => (
        <li key={c.key} className="panel p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{p(`pu.group.${groupOf(c.key)}`)}</h3>
            <code className="stat text-xs text-muted">{c.key}</code>
          </div>
          <p className="mt-2 text-sm">
            <span className="text-muted">{p('pu.change.was')}</span> <span className="stat text-muted line-through">{show(c.before)}</span>
            <span className="mx-2 text-muted" aria-hidden>
              →
            </span>
            <span className="text-muted">{p('pu.change.becomes')}</span> <span className="stat font-semibold">{show(c.after)}</span>
          </p>
          <p className="mt-2 text-sm">
            <span className="font-semibold">{p('pu.change.why')}: </span>
            {c.why[lang] || c.why.en}
          </p>
          {c.sourceIds.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {p('pu.change.sources')}:{' '}
              {c.sourceIds.map((id, i) => (
                <span key={id}>
                  {i > 0 && ', '}
                  <Link to={`/science#source-${id}`} className="text-fg underline">
                    {knowledge.data?.find((k) => k.id === id)?.title ?? id}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PlanUpdate() {
  const { id } = useParams();
  const { lang } = useI18n();
  const p = usePt();
  const nav = useNavigate();
  const c = useCoach(lang);
  const updates = usePlanUpdates();
  const choices = usePlanChoices();
  const act = usePlanUpdateActions();
  const u = updates.data?.find((x) => x.id === id) ?? null;
  const choice = choices.data?.find((x) => x.plan_update_id === id) ?? null;

  const preview = useMemo(() => {
    if (!u || !c.profile) return null;
    return previewPlanUpdate(c.fullProfile, { ...c.planOpts, today: c.today }, c.eras, ruleSet(u.rule_set_version), 28);
  }, [u, c]);

  if (updates.isLoading || !c.ready) return <Spinner />;
  if (!u || !c.profile || !preview) {
    return (
      <>
        <PageHeader eyebrow={p('pu.page.eyebrow')} title={p('pu.state.notFound')} />
        <Link to="/plan" className="btn-ghost">
          {p('pu.page.back')}
        </Link>
      </>
    );
  }

  const isCurrent = u.rule_set_version <= c.pin;
  const date = (d: string) => new Date(d).toLocaleDateString(lang === 'nl' ? 'nl-NL' : lang, { day: 'numeric', month: 'long', year: 'numeric' });
  const next = ruleSet(u.rule_set_version);

  const apply = async () => {
    const prev = snapshotOf(c.weeks, c.today);
    const after = generateVersionedSeason(c.fullProfile, c.planOpts, [...c.eras.filter((e) => e.from < c.today), { from: c.today, ruleSet: next }]);
    try {
      await act.apply.mutateAsync({ updateId: u.id, from: c.today, prev, next: snapshotOf(after, c.today) });
      toast.success(p('pu.toast.applied'));
      nav('/plan');
    } catch {
      toast.error(p('pu.toast.error'));
    }
  };
  const later = async () => {
    try {
      await act.dismiss.mutateAsync(u.id);
      toast(p('pu.toast.dismissed'));
      nav('/cockpit');
    } catch {
      toast.error(p('pu.toast.error'));
    }
  };

  const state = isCurrent
    ? choice?.choice === 'applied'
      ? p('pu.state.applied', { date: date(choice.at) })
      : p('pu.state.current')
    : choice?.choice === 'dismissed'
      ? p('pu.state.dismissed')
      : choice?.choice === 'rolled_back'
        ? p('pu.state.rolledBack')
        : null;

  return (
    <>
      <PageHeader eyebrow={p('pu.page.eyebrow')} title={updateTitle(u, lang)}>
        <span className="text-xs text-muted">{p('pu.page.published', { date: date(u.published_at ?? u.created_at) })}</span>
      </PageHeader>
      <div className="space-y-6">
        <p className="text-sm text-muted">{p('pu.page.intro')}</p>
        {state && <p className="rounded-lg border border-line bg-panel2 p-3 text-sm">{state}</p>}
        <section>
          <h2 className="mb-2 text-lg font-bold">{p('pu.changes.title')}</h2>
          <ChangeList changes={u.changes} />
        </section>
        <section>
          <h2 className="mb-2 text-lg font-bold">{p('pu.preview.title')}</h2>
          <div className="panel p-4">
            <PlanDiffView diff={preview} />
          </div>
        </section>
        {!isCurrent && (
          <section className="panel sticky bottom-[76px] z-10 md:bottom-2 space-y-2 border-ink/20 p-4 shadow-lg">
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" disabled={act.apply.isPending || act.dismiss.isPending} onClick={apply}>
                {act.apply.isPending ? p('pu.btn.applying') : p('pu.btn.apply')}
              </button>
              {choice?.choice !== 'dismissed' && (
                <button className="btn-ghost" disabled={act.apply.isPending || act.dismiss.isPending} onClick={later}>
                  {p('pu.btn.later')}
                </button>
              )}
            </div>
            <p className="text-xs text-muted">{p('pu.apply.note')}</p>
          </section>
        )}
      </div>
    </>
  );
}
