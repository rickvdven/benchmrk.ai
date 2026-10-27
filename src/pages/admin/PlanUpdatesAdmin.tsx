import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { demoAthletes, pinsOf, previewPlanUpdate, todayISO, VERSIONS, LATEST_RULESET_VERSION, type Localized, type RulePin } from '../../engine';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { fmtDay, loc } from '../../lib/planupdates';
import { useRulesAndBaselines, type PlanUpdateRow, type PlanVersionRow } from '../../data/hooks';
import { isComplete, toProfile, type EntryRow, type ProfileRow } from '../../data/mapping';
import { Notice, Segmented, Spinner } from '../../components/ui';
import { ForecastCompare, PlanDiffWeeks, RuleChangeList, useSources } from '../../components/PlanUpdates';

const LANGS = ['nl', 'en', 'de', 'es', 'ko'] as const;

function useAllUpdates() {
  return useQuery({
    queryKey: ['plan-updates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plan_updates').select('*').order('rule_set_version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlanUpdateRow[];
    },
  });
}

/** Admin → Plan updates: drafts come from the rule-set metadata in the repo; preview on demo athletes or a member; publish. */
export function PlanUpdatesAdmin() {
  const qc = useQueryClient();
  const ups = useAllUpdates();
  const [sel, setSel] = useState<number | null>(null);
  if (ups.isError) return <Notice tone="warn">Table plan_updates not found – apply migration 022_plan_updates.sql first.</Notice>;
  if (!ups.data) return <Spinner />;
  const inDb = new Map(ups.data.map((u) => [u.rule_set_version, u]));
  const missing = VERSIONS.filter((v) => !inDb.has(v.version));
  const current = sel ?? ups.data[0]?.rule_set_version ?? null;
  const upd = current != null ? (inDb.get(current) ?? null) : null;

  const createDraft = async (version: number) => {
    const v = VERSIONS.find((x) => x.version === version)!;
    const { error } = await supabase.from('plan_updates').insert({ rule_set_version: v.version, title: v.title, summary: {}, changes: v.changes, status: 'draft' });
    if (error) return toast.error(error.message);
    toast.success(`Draft for rule set v${version} created`);
    setSel(version);
    qc.invalidateQueries({ queryKey: ['plan-updates'] });
  };

  return (
    <div className="space-y-4">
      <Notice>
        Rule sets live in the repo (<span className="stat">src/engine/rules/versions.ts</span>, newest in code: v{LATEST_RULESET_VERSION}). A plan update offers one version to the
        members; nobody's plan changes until they press Apply. Publishing sends no mail.
      </Notice>
      {missing.length > 0 && (
        <section className="panel flex flex-wrap items-center gap-2 p-4 text-sm">
          <span className="flex-1">Rule-set versions without a plan update:</span>
          {missing.map((v) => (
            <button key={v.version} className="btn-primary btn-sm" onClick={() => createDraft(v.version)}>
              Create draft from rule set v{v.version}
            </button>
          ))}
        </section>
      )}
      {!ups.data.length && !missing.length && <p className="text-sm text-muted">No plan updates yet. All members follow rule set 1.</p>}
      {ups.data.length > 0 && (
        <div className="overflow-x-auto">
          <Segmented
            value={String(current)}
            onChange={(v) => setSel(Number(v))}
            options={ups.data.map((u) => ({ value: String(u.rule_set_version), label: `v${u.rule_set_version} · ${u.status}` }))}
          />
        </div>
      )}
      {upd && <UpdateEditor key={upd.id} upd={upd} />}
    </div>
  );
}

function UpdateEditor({ upd }: { upd: PlanUpdateRow }) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const sources = useSources();
  const [title, setTitle] = useState<Partial<Localized>>(upd.title ?? {});
  const [summary, setSummary] = useState<Partial<Localized>>(upd.summary ?? {});
  const published = upd.status === 'published';
  const save = async (patch: Partial<PlanUpdateRow>) => {
    const { error } = await supabase.from('plan_updates').update(patch).eq('id', upd.id);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: ['plan-updates'] });
  };
  const inCode = upd.rule_set_version <= LATEST_RULESET_VERSION;
  return (
    <div className="space-y-4">
      <section className="panel space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">
            {loc(upd.title, lang)} <span className="chip ml-1">rule set v{upd.rule_set_version}</span>
            <span className={clsx('chip ml-1', published ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn')}>{upd.status}</span>
          </h2>
          {published ? (
            <span className="text-xs text-muted">published {upd.published_at ? fmtDay(lang, upd.published_at, true) : ''}</span>
          ) : (
            <button
              className="btn-primary btn-sm"
              disabled={!inCode}
              onClick={() => {
                if (confirm(`Publish rule set v${upd.rule_set_version}? Members see the notice in their cockpit and choose themselves. New members start on this version.`))
                  void save({ status: 'published' });
              }}
            >
              Publish
            </button>
          )}
        </div>
        {!inCode && <Notice tone="warn">This app version does not know rule set v{upd.rule_set_version} yet. Deploy the rule set first.</Notice>}
        <div className="grid gap-2 sm:grid-cols-2">
          {LANGS.map((l) => (
            <label key={l} className="block space-y-1">
              <span className="label">Title {l.toUpperCase()}</span>
              <input className="input" value={title[l] ?? ''} onChange={(e) => setTitle({ ...title, [l]: e.target.value })} />
              <textarea className="input h-16 py-2" placeholder={`Summary ${l.toUpperCase()} (optional)`} value={summary[l] ?? ''} onChange={(e) => setSummary({ ...summary, [l]: e.target.value })} />
            </label>
          ))}
        </div>
        <button className="btn-ghost btn-sm" onClick={() => save({ title, summary })}>
          Save texts
        </button>
        <h3 className="pt-2 font-semibold">Changes</h3>
        <RuleChangeList changes={upd.changes ?? []} sources={sources.data ?? []} />
      </section>
      {inCode && <PreviewPanel version={upd.rule_set_version} />}
    </div>
  );
}

interface AthleteRow {
  id: string;
  name: string;
  email: string;
  onboarded: boolean;
}

function PreviewPanel({ version }: { version: number }) {
  const { lang } = useI18n();
  const today = todayISO();
  const rb = useRulesAndBaselines();
  const demos = useMemo(() => demoAthletes(today), [today]);
  const [who, setWho] = useState<string>(demos[0].id);
  const [member, setMember] = useState<string>('');
  const athletes = useQuery({
    queryKey: ['admin', 'athletes'],
    queryFn: async () => ((await supabase.rpc('admin_list_athletes')).data ?? []) as AthleteRow[],
  });
  const m = useQuery({
    queryKey: ['admin', 'plan-preview', member],
    enabled: !!member,
    queryFn: async () => {
      const [a, v] = await Promise.all([
        supabase.rpc('admin_get_athlete', { _uid: member }),
        supabase.from('user_plan_versions').select('*').eq('user_id', member).order('version_no'),
      ]);
      if (a.error) throw a.error;
      return { d: a.data as { profile: ProfileRow; sessions: EntryRow[] }, versions: (v.data ?? []) as PlanVersionRow[] };
    },
  });

  const preview = useMemo(() => {
    // raw coaching_rules: generatePlan mixes them with the rule set of each version
    const opts = { lang, today, rules: rb.data?.rules, baselines: rb.data?.baselines };
    if (who === 'member') {
      if (!m.data || !isComplete(m.data.d.profile)) return null;
      const row = m.data.d.profile;
      const pins: RulePin[] = pinsOf(m.data.versions, row.rule_set_version ?? 1);
      const log = Object.fromEntries((m.data.d.sessions ?? []).map((e) => [e.date, e]));
      return previewPlanUpdate({ profile: toProfile(row), opts, pins, log, toVersion: version, today });
    }
    const demo = demos.find((d) => d.id === who)!;
    return previewPlanUpdate({ profile: demo.profile, opts, pins: [{ from: null, version: version - 1 }], toVersion: version, today });
  }, [who, m.data, demos, version, lang, today, rb.data]);

  return (
    <section className="panel space-y-4 p-5">
      <h2 className="text-lg font-bold">Preview</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={who} onChange={setWho} size="sm" options={[...demos.map((d) => ({ value: d.id, label: d.label })), { value: 'member', label: 'Member…' }]} />
        {who === 'member' && (
          <select className="input h-9 w-auto max-w-full" value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="">Choose a member</option>
            {(athletes.data ?? [])
              .filter((a) => a.onboarded)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.email}
                </option>
              ))}
          </select>
        )}
      </div>
      {who !== 'member' && <p className="text-xs text-muted">Demo athlete: plan started 4 weeks ago, race in 12 weeks, from rule set v{version - 1}.</p>}
      {who === 'member' && member && m.data && !isComplete(m.data.d.profile) && <Notice tone="warn">This member has not finished onboarding.</Notice>}
      {preview ? (
        <>
          <p className="text-sm">
            <span className="font-semibold">{preview.changedDays}</span> changed days in the next 4 weeks · rule set v{preview.fromVersion} → v{preview.toVersion}
          </p>
          <PlanDiffWeeks preview={preview} />
          <h3 className="font-semibold">Forecast and chance</h3>
          <ForecastCompare preview={preview} />
        </>
      ) : (
        who === 'member' && member && <Spinner />
      )}
    </section>
  );
}
