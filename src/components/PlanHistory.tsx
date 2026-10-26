import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { generateVersionedSeason, previewPlanUpdate, ruleSet, snapshotOf } from '../engine';
import { Dialog } from './Dialog';
import { PlanDiffView } from './PlanDiffView';
import { Spinner } from './ui';
import { useCoach } from '../data/hooks';
import { updateTitle, usePlanChoices, usePlanUpdateActions, usePlanUpdates, usePlanVersions, type PlanVersionRow } from '../data/planUpdates';
import { useI18n } from '../lib/i18n';
import { usePt } from '../lib/usePt';

/** Settings → Plan history: every version of the member's plan rules, and a way back to any earlier one. */
export function PlanHistory() {
  const { lang } = useI18n();
  const p = usePt();
  const c = useCoach(lang);
  const versions = usePlanVersions();
  const updates = usePlanUpdates();
  const choices = usePlanChoices();
  const act = usePlanUpdateActions();
  const [target, setTarget] = useState<PlanVersionRow | null>(null);

  const diff = useMemo(() => {
    if (!target || !c.profile) return null;
    return previewPlanUpdate(c.fullProfile, { ...c.planOpts, today: c.today }, c.eras, ruleSet(target.rule_set_version), 28);
  }, [target, c]);

  if (versions.isLoading || !c.profile) return <Spinner />;
  const list = [...(versions.data ?? [])].reverse();
  const current = list[0];
  const date = (d: string) => new Date(d).toLocaleDateString(lang === 'nl' ? 'nl-NL' : lang, { day: 'numeric', month: 'long', year: 'numeric' });
  const title = (v: PlanVersionRow) => {
    const u = updates.data?.find((x) => x.id === v.plan_update_id);
    return u ? updateTitle(u, lang) : null;
  };
  const open = (updates.data ?? []).filter((u) => u.rule_set_version > c.pin && choices.data?.some((x) => x.plan_update_id === u.id && x.choice === 'dismissed'));

  const rollback = async () => {
    if (!target || !c.profile) return;
    const prev = snapshotOf(c.weeks, c.today);
    const after = generateVersionedSeason(c.fullProfile, c.planOpts, [...c.eras.filter((e) => e.from < c.today), { from: c.today, ruleSet: ruleSet(target.rule_set_version) }]);
    try {
      await act.rollback.mutateAsync({ versionId: target.id, from: c.today, prev, next: snapshotOf(after, c.today) });
      toast.success(p('pu.toast.rolled', { n: target.version_no }));
      setTarget(null);
    } catch {
      toast.error(p('pu.toast.error'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">{p('pu.hist.title')}</h2>
        <p className="mt-1 text-sm text-muted">{p('pu.hist.intro')}</p>
      </div>
      {!list.length ? (
        <p className="text-sm text-muted">{p('pu.hist.empty')}</p>
      ) : (
        <ol className="divide-y divide-line rounded-lg border border-line">
          {list.map((v) => {
            const isCurrent = v.id === current.id;
            const canGoBack = !isCurrent && v.rule_set_version !== c.pin;
            const name = title(v);
            return (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p('pu.hist.version', { n: v.version_no })}</span>
                    {isCurrent && <span className="chip">{p('pu.hist.current')}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {v.reason === 'start' ? p('pu.reason.start') : `${p(`pu.reason.${v.reason}`)} · ${date(v.effective_from)}`} · {p('pu.hist.rules', { v: v.rule_set_version })}
                    {name ? ` · ${name}` : ''}
                  </div>
                </div>
                {canGoBack && (
                  <button className="btn-ghost btn-sm" onClick={() => setTarget(v)}>
                    {p('pu.hist.rollback')}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div>
        <h3 className="mb-1 font-semibold">{p('pu.hist.available')}</h3>
        {open.length ? (
          <ul className="space-y-1 text-sm">
            {open.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3">
                <span>{updateTitle(u, lang)}</span>
                <Link to={`/plan/update/${u.id}`} className="text-fg underline">
                  {p('pu.hist.view')}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{p('pu.hist.none')}</p>
        )}
      </div>
      <Dialog open={!!target} onClose={() => setTarget(null)} labelledBy="rb-title" wide closeLabel={p('pu.rb.cancel')}>
        {target && (
          <div className="p-5 pt-8 md:p-7">
            <h2 id="rb-title" className="pr-10 text-xl font-bold">
              {p('pu.rb.title', { n: target.version_no })}
            </h2>
            <p className="mt-1 text-sm text-muted">{diff && diff.weeks.length ? p('pu.rb.body') : p('pu.rb.same')}</p>
            {diff && <PlanDiffView diff={diff} className="mt-4" />}
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-primary" disabled={act.rollback.isPending} onClick={rollback}>
                {p('pu.rb.confirm')}
              </button>
              <button className="btn-ghost" onClick={() => setTarget(null)}>
                {p('pu.rb.cancel')}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
