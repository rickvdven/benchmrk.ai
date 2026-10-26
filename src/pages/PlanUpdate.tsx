import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { changesBetween, freezeLogged, LATEST_RULESET_VERSION, previewPlanUpdate, seasonWithPins, type PlanPreview, type RuleChange } from '../engine';
import { useCoach, useMutations, usePlanChoices, usePlanUpdates } from '../data/hooks';
import { useI18n } from '../lib/i18n';
import { fmtDay, loc, pt } from '../lib/planupdates';
import { Notice, PageHeader, Spinner } from '../components/ui';
import { ForecastCompare, PlanDiffWeeks, RuleChangeList, useSources } from '../components/PlanUpdates';

type Coach = ReturnType<typeof useCoach>;

/** Before/after of the member's own plan when `toVersion` is pinned from today. */
function usePreview(c: Coach, toVersion: number | null) {
  return useMemo(() => {
    if (!c.profile || toVersion == null) return null;
    const preview = previewPlanUpdate({ profile: c.fullProfile, opts: c.planOpts, pins: c.pins, log: c.byDate, toVersion, today: c.today, forecast: c.profile });
    const after = () => freezeLogged(seasonWithPins(c.fullProfile, c.planOpts, [...c.pins, { from: c.today, version: toVersion }]), c.byDate);
    return { preview, after };
  }, [c, toVersion]);
}

function Body({ intro, changes, changesTitle, preview, actions }: { intro: ReactNode; changes: RuleChange[]; changesTitle: string; preview: PlanPreview; actions: ReactNode }) {
  const { lang } = useI18n();
  const sources = useSources();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="text-muted">{intro}</div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-good" aria-hidden />
        {pt(lang, 'page.safe')}
      </p>
      {changes.length > 0 && (
        <section className="panel p-5">
          <h2 className="mb-3 text-lg font-bold">{changesTitle}</h2>
          <RuleChangeList changes={changes} sources={sources.data ?? []} />
        </section>
      )}
      <section className="panel p-5">
        <h2 className="text-lg font-bold">{pt(lang, 'page.weeks')}</h2>
        <p className="mb-3 mt-1 text-sm text-muted">{preview.changedDays ? pt(lang, 'page.legend') : pt(lang, 'page.noChanges')}</p>
        <PlanDiffWeeks preview={preview} />
      </section>
      <section className="panel p-5">
        <h2 className="mb-3 text-lg font-bold">{pt(lang, 'page.forecast')}</h2>
        <ForecastCompare preview={preview} />
      </section>
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap gap-2 md:bottom-3 rounded-xl border border-line bg-panel/95 p-3 shadow-paper backdrop-blur">{actions}</div>
    </div>
  );
}

/** /plan/update/:id – what a plan update changes for this member, with Apply and Not now. */
export default function PlanUpdatePage() {
  const { lang } = useI18n();
  const { id } = useParams();
  const c = useCoach(lang);
  const updates = usePlanUpdates();
  const choices = usePlanChoices();
  const { applyPlanUpdate, dismissPlanUpdate } = useMutations();
  const [busy, setBusy] = useState(false);
  const upd = updates.data?.find((u) => u.id === id && u.status === 'published') ?? null;
  const known = !!upd && upd.rule_set_version <= LATEST_RULESET_VERSION;
  const pv = usePreview(c, known ? upd!.rule_set_version : null);
  if (!c.profile || updates.isLoading) return <Spinner />;
  if (!upd || !pv)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Notice tone="warn">{pt(lang, 'page.notFound')}</Notice>
        <Link to="/cockpit" className="btn-ghost btn-sm">
          {pt(lang, 'page.back')}
        </Link>
      </div>
    );
  const pinned = c.row.rule_set_version ?? 1;
  const inForce = pinned === upd.rule_set_version;
  const choice = choices.data?.find((x) => x.plan_update_id === upd.id) ?? null;
  const title = loc(upd.title, lang);
  const date = fmtDay(lang, upd.published_at ?? upd.created_at);

  const apply = async () => {
    setBusy(true);
    try {
      await applyPlanUpdate(upd, c.today, c.weeks, pv.after(), pt(lang, 'page.change', { date, title }));
      toast.success(pt(lang, 'page.toastApplied'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const notNow = async () => {
    setBusy(true);
    try {
      await dismissPlanUpdate(upd);
      toast.success(pt(lang, 'page.toastDismissed'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const status = inForce
    ? choice?.choice === 'applied'
      ? pt(lang, 'page.applied', { date: fmtDay(lang, choice.at) })
      : pt(lang, 'page.alreadyIn')
    : choice?.choice === 'dismissed'
      ? pt(lang, 'page.dismissed')
      : choice?.choice === 'rolled_back'
        ? pt(lang, 'page.rolledBack')
        : null;

  return (
    <>
      <PageHeader eyebrow={`${pt(lang, 'page.eyebrow')} · ${date}`} title={title} />
      {status && (
        <div className="mx-auto mb-4 max-w-4xl">
          <Notice>{status}</Notice>
        </div>
      )}
      <Body
        intro={
          <>
            {loc(upd.summary, lang) && <span className="mb-2 block text-base text-fg">{loc(upd.summary, lang)}</span>}
            {pt(lang, 'page.intro')}
          </>
        }
        changes={upd.changes ?? []}
        changesTitle={pt(lang, 'page.changes')}
        preview={pv.preview}
        actions={
          inForce ? (
            <Link to="/cockpit" className="btn-ghost">
              {pt(lang, 'page.back')}
            </Link>
          ) : (
            <>
              <button className="btn-primary" disabled={busy} onClick={apply}>
                {pt(lang, 'page.apply')}
              </button>
              {!choice && (
                <button className="btn-ghost" disabled={busy} onClick={notNow}>
                  {pt(lang, 'page.notNow')}
                </button>
              )}
              {choice && (
                <Link to="/cockpit" className="btn-ghost">
                  {pt(lang, 'page.back')}
                </Link>
              )}
            </>
          )
        }
      />
    </>
  );
}

/** /plan/history/:versionId – before/after of restoring an earlier plan version, then confirm. */
export function PlanRollbackPage() {
  const { lang } = useI18n();
  const { versionId } = useParams();
  const nav = useNavigate();
  const c = useCoach(lang);
  const { rollbackPlan } = useMutations();
  const [busy, setBusy] = useState(false);
  const target = c.profile ? (c.versions?.find((v) => v.id === versionId) ?? null) : null;
  const pv = usePreview(c, target?.rule_set_version ?? null);
  if (!c.profile || !c.versions) return <Spinner />;
  if (!target || !pv)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Notice tone="warn">{pt(lang, 'rollback.notFound')}</Notice>
        <Link to="/settings?tab=history" className="btn-ghost btn-sm">
          {pt(lang, 'rollback.cancel')}
        </Link>
      </div>
    );
  const pinned = c.row.rule_set_version ?? 1;
  const same = target.rule_set_version === pinned;
  const changes = changesBetween(pinned, target.rule_set_version);
  const restore = async () => {
    setBusy(true);
    try {
      const msg = pt(lang, 'rollback.done', { n: target.version_no });
      await rollbackPlan(target, c.today, c.weeks, pv.after(), msg);
      toast.success(msg);
      nav('/settings?tab=history');
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader eyebrow={pt(lang, 'rollback.eyebrow')} title={pt(lang, 'rollback.title', { n: target.version_no })} />
      <Body
        intro={same ? pt(lang, 'rollback.same', { n: target.version_no }) : pt(lang, 'rollback.intro', { n: target.version_no, v: target.rule_set_version })}
        changes={changes}
        changesTitle={pt(lang, 'rollback.changes')}
        preview={pv.preview}
        actions={
          <>
            <button className="btn-primary" disabled={busy || same} onClick={restore}>
              {pt(lang, 'rollback.confirm')}
            </button>
            <Link to="/settings?tab=history" className="btn-ghost">
              {pt(lang, 'rollback.cancel')}
            </Link>
          </>
        }
      />
    </>
  );
}
