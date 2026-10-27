import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlanDiffView } from '../../components/PlanDiffView';
import { ChangeList } from '../PlanUpdate';
import { Spinner } from '../../components/ui';
import { ERA_START, defaultSchedule, mondayOf, previewPlanUpdate, ruleSet, ruleSetDef, ruleSetVersions, addDays, todayISO, type Profile, type RuleEra } from '../../engine';
import { isComplete, toProfile, type ProfileRow } from '../../data/mapping';
import { updateTitle, type PlanUpdateRow } from '../../data/planUpdates';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { usePt } from '../../lib/usePt';

type Demo = 'openMen' | 'openWomen' | 'proMen';
const DEMOS: Record<Demo, { sex: 'man' | 'woman'; category: Profile['category']; goal: number; pace: number }> = {
  openMen: { sex: 'man', category: 'solo_open', goal: 4800, pace: 285 },
  openWomen: { sex: 'woman', category: 'solo_open', goal: 5700, pace: 330 },
  proMen: { sex: 'man', category: 'solo_pro', goal: 4200, pace: 245 },
};

/** A demo athlete with a middling profile: 16 weeks to the race, 5 training days. */
function demoProfile(d: Demo, today: string): Profile {
  const x = DEMOS[d];
  const stars = { skierg: 3, sledPush: 3, sledPull: 3, burpees: 3, row: 3, farmers: 3, lunges: 3, wallballs: 3 };
  return {
    athlete: { name: d, sex: x.sex, lthr: 170, maxHr: 190, thresholdPaceSec: x.pace, archetype: 'hybrid', flags: { achilles: false, quad: false, back: false, shin: false }, stationStars: stars, stationTimes: {} },
    category: x.category,
    raceName: 'Demo',
    raceDate: addDays(mondayOf(today), 16 * 7 + 5),
    goalSec: x.goal,
    planStart: addDays(mondayOf(today), -14),
    weekSchedule: defaultSchedule(5),
  };
}

/** Admin → Plan updates: drafts from rule sets in the code, preview for demo athletes and a member, publish. */
export function PlanUpdatesAdmin() {
  const p = usePt();
  const { lang } = useI18n();
  const qc = useQueryClient();
  const rows = useQuery({
    queryKey: ['admin', 'plan-updates'],
    queryFn: async () => ((await supabase.from('plan_updates').select('*').order('rule_set_version', { ascending: false })).data ?? []) as PlanUpdateRow[],
  });
  const members = useQuery({
    queryKey: ['admin', 'athletes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_athletes');
      if (error) throw error;
      return (data ?? []) as { id: string; email: string; name: string; onboarded: boolean }[];
    },
  });
  const [sel, setSel] = useState<number | null>(null);
  const [who, setWho] = useState<string>('demo:openMen');
  const [run, setRun] = useState(0);
  const today = todayISO();
  const codeVersions = ruleSetVersions().filter((v) => v > 1);

  const member = useQuery({
    queryKey: ['admin', 'member-profile', who],
    enabled: who.startsWith('member:') && who.length > 7,
    queryFn: async () => (await supabase.from('profiles').select('*').eq('id', who.slice(7)).maybeSingle()).data as ProfileRow | null,
  });

  const selRow = rows.data?.find((r) => r.rule_set_version === sel) ?? null;
  const diff = useMemo(() => {
    if (!sel || !run || !ruleSetDef(sel)) return null;
    let profile: Profile | null = null;
    let from = ruleSet(sel - 1);
    if (who.startsWith('demo:')) profile = demoProfile(who.slice(5) as Demo, today);
    else if (isComplete(member.data)) {
      profile = toProfile(member.data);
      from = ruleSet(member.data.rule_set_version ?? 1);
    }
    if (!profile) return null;
    const eras: RuleEra[] = [{ from: ERA_START, ruleSet: from }];
    return previewPlanUpdate(profile, { lang, today }, eras, ruleSet(sel), 28);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, run, who, member.data, lang]);

  if (!rows.data) return <Spinner />;
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'plan-updates'] });
  const makeDraft = async (v: number) => {
    const d = ruleSetDef(v);
    if (!d) return;
    const { error } = await supabase.from('plan_updates').insert({ rule_set_version: v, title: d.title.en, summary: d.title, changes: d.changes, status: 'draft' });
    if (error) return toast.error(error.message);
    refresh();
  };
  const setStatus = async (r: PlanUpdateRow, status: 'draft' | 'published') => {
    if (status === 'published' && !confirm(p('pu.admin.publishConfirm'))) return;
    const { error } = await supabase.from('plan_updates').update({ status }).eq('id', r.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['plan-updates'] });
    refresh();
  };
  const versions = Array.from(new Set([...codeVersions, ...rows.data.map((r) => r.rule_set_version)])).sort((a, b) => b - a);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{p('pu.admin.intro')}</p>
      <section className="panel space-y-3 p-4">
        <h2 className="font-bold">{p('pu.admin.versions')}</h2>
        {!versions.length && <p className="text-sm text-muted">{p('pu.admin.noVersions')}</p>}
        {versions.map((v) => {
          const r = rows.data.find((x) => x.rule_set_version === v);
          const inCode = !!ruleSetDef(v);
          return (
            <div key={v} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm first:border-0 first:pt-0">
              <div>
                <span className="font-semibold">v{v}</span> {r && <>· {updateTitle(r, lang)} </>}
                {r && <span className="chip ml-1">{r.status === 'published' ? p('pu.admin.published') : p('pu.admin.draft')}</span>}
                {!inCode && <div className="text-xs text-bad">{p('pu.admin.noCode')}</div>}
              </div>
              <div className="flex gap-2">
                {!r && inCode && (
                  <button className="btn-ghost btn-sm" onClick={() => makeDraft(v)}>
                    {p('pu.admin.makeDraft', { v })}
                  </button>
                )}
                {inCode && (
                  <button className="btn-ghost btn-sm" onClick={() => setSel(v)}>
                    {p('pu.admin.preview')}
                  </button>
                )}
                {r && r.status === 'draft' && (
                  <button className="btn-primary btn-sm" onClick={() => setStatus(r, 'published')}>
                    {p('pu.admin.publish')}
                  </button>
                )}
                {r && r.status === 'published' && (
                  <button className="btn-ghost btn-sm" onClick={() => setStatus(r, 'draft')}>
                    {p('pu.admin.unpublish')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
      {sel && (
        <section className="panel space-y-4 p-4">
          <h2 className="font-bold">
            {p('pu.admin.preview')} v{sel}
          </h2>
          {selRow && <ChangeList changes={selRow.changes} />}
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted">
              {p('pu.admin.demo')} / {p('pu.admin.member')}
              <select className="input mt-1 min-w-[220px]" value={who} onChange={(e) => (setWho(e.target.value), setRun(0))}>
                {(Object.keys(DEMOS) as Demo[]).map((d) => (
                  <option key={d} value={`demo:${d}`}>
                    {p(`pu.admin.demo.${d}`)}
                  </option>
                ))}
                <option value="member:" disabled>
                  — {p('pu.admin.member')} —
                </option>
                {(members.data ?? []).filter((m) => m.onboarded).map((m) => (
                  <option key={m.id} value={`member:${m.id}`}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-primary" onClick={() => setRun((n) => n + 1)}>
              {p('pu.admin.run')}
            </button>
          </div>
          {diff && (
            <>
              <p className="stat text-sm text-volt">{p('pu.admin.changed', { n: diff.changedDays })}</p>
              <PlanDiffView diff={diff} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
