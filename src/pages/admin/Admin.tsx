import { useMemo, useState } from 'react';
import { GROESBEEK, injuriesOf, type SimProtocol } from '../../engine';
import { ProtocolFields } from '../../components/SimProtocolEditor';
import { GymManager } from '../../components/GymManager';
import { Roadmap } from './Roadmap';
import { SourcesAdmin } from './SourcesAdmin';
import { PlanUpdatesAdmin } from './PlanUpdatesAdmin';
import { pt } from '../../lib/planupdate';
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import { useI18n, type I18nKey } from '../../lib/i18n';
import { PageHeader, Spinner, Stat, Notice } from '../../components/ui';
import { STATIONS, stationLabel, fmtHms, fmtMmss, generateSeason, raceModel, todayISO } from '../../engine';
import { isComplete, toProfile, type ProfileRow } from '../../data/mapping';

const rpc = async <T,>(fn: string, args?: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
};

interface AthleteListRow {
  id: string;
  email: string;
  name: string;
  category: string | null;
  sex: string | null;
  race_name: string | null;
  race_date: string | null;
  goal_sec: number | null;
  threshold_pace_sec: number | null;
  onboarded: boolean;
  created_at: string;
  team_id: string | null;
  status: string;
  valid_until: string | null;
  bank_reference: string;
  payment_marked_at: string | null;
  referral_code: string;
  is_admin: boolean;
  sessions_done: number;
  benchmarks: number;
  last_activity: string | null;
}

function useAthletes() {
  return useQuery({ queryKey: ['admin', 'athletes'], queryFn: () => rpc<AthleteListRow[]>('admin_list_athletes') });
}

function Overview() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => rpc<Record<string, unknown>>('admin_stats') });
  if (!q.data) return <Spinner />;
  const s = q.data as {
    athletes: number;
    onboarded: number;
    active_7d: number;
    sessions_done: number;
    benchmarks: number;
    teams: number;
    pending_payments: number;
    by_category: Record<string, number>;
    signups_by_week: { week: string; n: number }[];
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('ad.athletes')} value={s.athletes} sub={`${s.onboarded} onboarded`} />
        <Stat label="Active 7 days" value={s.active_7d} />
        <Stat label="Sessions done" value={s.sessions_done} sub={`${s.benchmarks} benchmarks`} />
        <Stat label={t('ad.payments')} value={s.pending_payments} sub={`${s.teams} doubles teams`} tone={s.pending_payments ? 'warn' : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 font-bold">Sign-ups per week</h2>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={s.signups_by_week} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip cursor={{ fill: 'rgb(var(--panel2))' }} contentStyle={{ background: 'rgb(var(--panel2))', border: '1px solid rgb(var(--line))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="n" name="Sign-ups" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-bold">Category</h2>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(s.by_category).map(([k, v]) => (
                <tr key={k} className="border-t border-line">
                  <td className="py-1.5">{k === 'none' ? '—' : t(`cat.${k}` as I18nKey)}</td>
                  <td className="stat py-1.5 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Athletes({ paymentsOnly = false }: { paymentsOnly?: boolean }) {
  const { t } = useI18n();
  const q = useAthletes();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(paymentsOnly ? 'pending' : 'all');
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (!s || [r.name, r.email, r.bank_reference, r.referral_code].some((x) => x?.toLowerCase().includes(s))),
    );
  }, [q.data, search, status]);
  if (!q.data) return <Spinner />;
  const setSub = async (id: string, st: string, until: string | null) => {
    try {
      await rpc('admin_set_subscription', { _uid: id, _status: st, _valid_until: until });
      if (st === 'active') void notify('payment_approved', id);
      toast.success(t('common.saved'));
      qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const year = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-sm" placeholder={t('ad.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          {['all', 'trial', 'pending', 'active', 'exempt', 'inactive'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {['Athlete', 'Category', 'Race', 'Goal', 'Thr.', 'Done', 'Status', 'Ref.', ''].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">
                    {r.name} {r.is_admin && <span className="chip text-volt">admin</span>}
                  </div>
                  <div className="text-xs text-muted">{r.email}</div>
                </td>
                <td className="px-3 py-2 text-xs">{r.category ? t(`cat.${r.category}` as I18nKey) : '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {r.race_name}
                  <div className="text-muted">{r.race_date}</div>
                </td>
                <td className="stat px-3 py-2">{r.goal_sec ? fmtHms(r.goal_sec) : '–'}</td>
                <td className="stat px-3 py-2">{r.threshold_pace_sec ? fmtMmss(r.threshold_pace_sec) : '–'}</td>
                <td className="stat px-3 py-2">
                  {r.sessions_done} / B{r.benchmarks}
                </td>
                <td className="px-3 py-2">
                  <span className={clsx('chip', r.status === 'pending' && 'bg-warn/15 text-warn', r.status === 'active' && 'bg-good/15 text-good')}>{r.status}</span>
                  {r.valid_until && <div className="mt-0.5 text-xs text-muted">→ {r.valid_until}</div>}
                  {r.payment_marked_at && <div className="text-xs text-warn">paid? {r.payment_marked_at.slice(0, 10)}</div>}
                </td>
                <td className="stat px-3 py-2 text-xs">{r.bank_reference}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button className="btn-ghost btn-sm" onClick={() => nav(`/admin/athletes/${r.id}`)}>
                      {t('ad.view')}
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => setSub(r.id, 'active', year)}>
                      {t('ad.approve')}
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => setSub(r.id, 'exempt', null)}>
                      {t('ad.exempt')}
                    </button>
                    <button className="btn-ghost btn-sm text-bad" onClick={() => setSub(r.id, 'inactive', null)}>
                      {t('ad.deactivate')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AthleteDetail() {
  const { t, lang, pace } = useI18n();
  const { id } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'athlete', id], queryFn: () => rpc<Record<string, unknown>>('admin_get_athlete', { _uid: id }) });
  const roles = useQuery({ queryKey: ['admin', 'roles', id], queryFn: async () => ((await supabase.from('user_roles').select('role').eq('user_id', id!)).data ?? []).map((r) => r.role as string) });
  if (!q.data) return <Spinner />;
  const d = q.data as {
    profile: ProfileRow;
    subscription: Record<string, unknown> | null;
    sessions: { date: string; completed: boolean; planned: { title?: string; targetPaceSec?: number } | null; actual_pace_sec: number | null; avg_hr: number | null; rpe: number | null; notes: string | null }[];
    benchmarks: { id: string; number: number; date: string; pace_sec: number; avg_hr: number; effect: { notes?: string[] } | null }[];
    morning: { date: string; score: number }[];
    changes: { id: string; created_at: string; message: string }[];
    team: { code: string } | null;
  };
  const p = d.profile;
  const complete = isComplete(p);
  const model = complete ? raceModel(toProfile(p), todayISO()) : null;
  const plan = complete ? generateSeason(toProfile(p), { lang, today: todayISO() }) : [];
  const isAdmin = (qc.getQueryData<AthleteListRow[]>(['admin', 'athletes']) ?? []).find((x) => x.id === id)?.is_admin;
  const isGym = (roles.data ?? []).includes('gym');
  return (
    <div className="space-y-4">
      <Notice>{t('ad.readOnly')}</Notice>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{p.display_name}</h2>
          <p className="text-sm text-muted">
            {p.email} · {p.category ? t(`cat.${p.category}` as I18nKey) : '—'} · {p.race_name} {p.race_date} {d.team ? `· team ${d.team.code}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <button
          className="btn-ghost btn-sm"
          onClick={async () => {
            try {
              await rpc('admin_set_role', { _uid: id, _role: 'gym', _on: !isGym });
              qc.invalidateQueries({ queryKey: ['admin'] });
              toast.success(t('common.saved'));
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          {isGym ? t('ad.removeGym') : t('ad.makeGym')}
        </button>
        <button
          className="btn-ghost btn-sm"
          onClick={async () => {
            try {
              await rpc('admin_set_role', { _uid: id, _role: 'admin', _on: !isAdmin });
              qc.invalidateQueries({ queryKey: ['admin'] });
              toast.success(t('common.saved'));
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          {isAdmin ? t('ad.removeAdmin') : t('ad.makeAdmin')}
        </button>
        </div>
      </div>
      {model && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t('ck.goal')} value={fmtHms(p.goal_sec!)} />
          <Stat label={t('ck.projected')} value={fmtHms(model.projected.finishSec)} />
          <Stat label={t('ck.chance')} value={`${model.chance}%`} sub={t(`ck.status.${model.status}` as I18nKey)} />
          <Stat label={t('ck.threshold')} value={pace(p.threshold_pace_sec)} sub={`LTHR ${p.lthr} · max ${p.max_hr}`} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5 text-sm">
          <h3 className="mb-2 font-bold">Profile & physiology</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              ['Sex', p.sex],
              ['Archetype', p.archetype],
              ['VO₂max', p.vo2max],
              ['Rest HR', p.rest_hr],
              ['Weekly km', p.weekly_km],
              ['Weight', p.weight_kg],
              ['Compromised ratio', p.compromised_ratio],
              ['Pace adjust', p.pace_adjust_sec],
              ['Injuries', Object.entries(injuriesOf(p.flags)).map(([k, v]) => `${k} (${v})`).join(', ') || '—'],
              ['Injury note', p.flags?.note || '—'],
              ['Plan start', p.plan_start],
            ].map(([k, v]) => (
              <div key={String(k)} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="stat">{v ?? '–'}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mb-2 mt-4 font-bold">Stations</h3>
          <table className="w-full">
            <tbody>
              {STATIONS.map((s) => (
                <tr key={s} className="border-t border-line">
                  <td className="py-1">{stationLabel(lang, s)}</td>
                  <td className="py-1">{'★'.repeat(p.station_stars?.[s] ?? 3)}</td>
                  <td className="stat py-1 text-right">{p.station_times?.[s] ? fmtMmss(p.station_times[s]!) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel p-5 text-sm">
          <h3 className="mb-2 font-bold">Benchmarks</h3>
          {d.benchmarks.length === 0 && <p className="text-muted">{t('ad.noData')}</p>}
          {d.benchmarks.map((b) => (
            <div key={b.id} className="border-t border-line py-1.5">
              <span className="font-semibold">B{b.number}</span> <span className="stat">{b.date}</span> · <span className="stat">{fmtMmss(b.pace_sec)}</span> · {b.avg_hr} bpm
              {b.effect?.notes?.length ? <span className="ml-1 text-xs text-muted">({b.effect.notes.join(', ')})</span> : null}
            </div>
          ))}
          <h3 className="mb-2 mt-4 font-bold">Morning stiffness</h3>
          <p className="stat text-xs text-muted">{d.morning.slice(0, 14).map((m) => `${m.date.slice(5)}: ${m.score}`).join(' · ') || '–'}</p>
          <h3 className="mb-2 mt-4 font-bold">Plan changes</h3>
          {d.changes.map((c) => (
            <p key={c.id} className="text-xs">
              <span className="stat text-muted">{c.created_at.slice(0, 10)}</span> {c.message}
            </p>
          ))}
        </section>
      </div>
      <section className="panel overflow-x-auto p-5 text-sm">
        <h3 className="mb-2 font-bold">Sessions</h3>
        <table className="w-full min-w-[600px]">
          <tbody>
            {d.sessions.map((s) => (
              <tr key={s.date} className="border-t border-line">
                <td className="stat py-1.5 pr-2">{s.date}</td>
                <td className="py-1.5 pr-2">{s.completed ? '✓' : '·'}</td>
                <td className="py-1.5 pr-2">{s.planned?.title ?? '—'}</td>
                <td className="stat py-1.5 pr-2 text-muted">{s.planned?.targetPaceSec ? fmtMmss(s.planned.targetPaceSec) : ''}</td>
                <td className="stat py-1.5 pr-2">{s.actual_pace_sec ? fmtMmss(s.actual_pace_sec) : ''}</td>
                <td className="stat py-1.5 pr-2">{s.avg_hr ?? ''}</td>
                <td className="stat py-1.5">{s.rpe ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {plan.length > 0 && <p className="mt-3 text-xs text-muted">Plan: {plan.length} weeks · {plan.map((w) => w.phase[0].toUpperCase()).join('')}</p>}
      </section>
    </div>
  );
}

function Rules() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'rules'], queryFn: async () => (await supabase.from('coaching_rules').select('*').order('rule_key')).data ?? [] });
  const [vals, setVals] = useState<Record<string, string>>({});
  if (!q.data) return <Spinner />;
  return (
    <div className="space-y-3">
      <Notice>Rules are relative (e.g. × LTHR) and apply to every athlete. Changes take effect on the next page load for everyone.</Notice>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <tbody>
            {q.data.map((r: { rule_key: string; value: number; unit: string; description: string }) => (
              <tr key={r.rule_key} className="border-t border-line">
                <td className="px-3 py-2">
                  <div className="stat font-semibold">{r.rule_key}</div>
                  <div className="text-xs text-muted">{r.description}</div>
                </td>
                <td className="px-3 py-2">
                  <input className="input stat h-9 w-28" value={vals[r.rule_key] ?? String(r.value)} onChange={(e) => setVals({ ...vals, [r.rule_key]: e.target.value })} />
                </td>
                <td className="px-3 py-2 text-xs text-muted">{r.unit}</td>
                <td className="px-3 py-2">
                  <button
                    className="btn-ghost btn-sm"
                    disabled={vals[r.rule_key] === undefined}
                    onClick={async () => {
                      const v = Number(vals[r.rule_key]?.replace(',', '.'));
                      if (!Number.isFinite(v)) return toast.error('Not a number');
                      const { error } = await supabase.from('coaching_rules').update({ value: v, updated_at: new Date().toISOString() }).eq('rule_key', r.rule_key);
                      if (error) return toast.error(error.message);
                      toast.success('Saved');
                      qc.invalidateQueries({ queryKey: ['admin', 'rules'] });
                      qc.invalidateQueries({ queryKey: ['rules'] });
                    }}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Baselines() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'baselines'], queryFn: async () => (await supabase.from('station_baselines').select('*')).data ?? [] });
  const [edit, setEdit] = useState<Record<string, number | null>>({});
  if (!q.data) return <Spinner />;
  const get = (c: string, s: string) => (q.data as { weight_class: string; station: string; seconds: number }[]).find((r) => r.weight_class === c && r.station === s)?.seconds;
  const classes = [
    ['light', 'Open women'],
    ['medium', 'Open men · Pro women · Mixed'],
    ['heavy', 'Pro men'],
  ];
  return (
    <div className="space-y-3">
      <Notice>Mid-pack (3★) solo station times. Star ratings scale these (1★ ×1.32 … 5★ ×0.78); doubles teams ×0.82. Logged benchmark splits always win.</Notice>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Station</th>
              {classes.map(([c, l]) => (
                <th key={c} className="px-3 py-2 font-medium">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATIONS.map((s) => (
              <tr key={s} className="border-t border-line">
                <td className="px-3 py-2">{stationLabel(lang, s)}</td>
                {classes.map(([c]) => {
                  const k = `${c}:${s}`;
                  return (
                    <td key={c} className="px-3 py-2">
                      <input
                        className="input stat h-8 w-20 text-xs"
                        value={edit[k] !== undefined ? (edit[k] ? fmtMmss(edit[k]!) : '') : fmtMmss(get(c, s) ?? 0)}
                        onChange={(e) => {
                          const m = e.target.value.match(/^(\d{1,2}):(\d{2})$/);
                          setEdit({ ...edit, [k]: m ? +m[1] * 60 + +m[2] : null });
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="btn-primary"
        disabled={!Object.values(edit).some((v) => v)}
        onClick={async () => {
          const rows = Object.entries(edit)
            .filter(([, v]) => v)
            .map(([k, v]) => ({ weight_class: k.split(':')[0], station: k.split(':')[1], seconds: v }));
          const { error } = await supabase.from('station_baselines').upsert(rows);
          if (error) return toast.error(error.message);
          setEdit({});
          toast.success('Saved');
          qc.invalidateQueries({ queryKey: ['admin', 'baselines'] });
          qc.invalidateQueries({ queryKey: ['rules'] });
        }}
      >
        Save
      </button>
    </div>
  );
}

function AppSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'settings'], queryFn: async () => (await supabase.from('app_settings').select('*').order('key')).data ?? [] });
  const [vals, setVals] = useState<Record<string, string>>({});
  if (!q.data) return <Spinner />;
  return (
    <div className="space-y-4">
    <MailAdmin />
    <div className="panel divide-y divide-line">
      {q.data.map((r: { key: string; value: unknown }) => (
        <div key={r.key} className="flex flex-wrap items-center gap-3 p-3">
          <span className="stat w-48 text-sm font-semibold">{r.key}</span>
          <input className="input stat h-9 flex-1" value={vals[r.key] ?? JSON.stringify(r.value)} onChange={(e) => setVals({ ...vals, [r.key]: e.target.value })} />
          <button
            className="btn-ghost btn-sm"
            disabled={vals[r.key] === undefined}
            onClick={async () => {
              let v: unknown;
              try {
                v = JSON.parse(vals[r.key]);
              } catch {
                return toast.error('Must be JSON, e.g. true or "text"');
              }
              const { error } = await supabase.from('app_settings').update({ value: v }).eq('key', r.key);
              if (error) return toast.error(error.message);
              toast.success('Saved');
              qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
            }}
          >
            Save
          </button>
        </div>
      ))}
    </div>
    </div>
  );
}

function MailAdmin() {
  const q = useQuery({ queryKey: ['admin', 'mail'], queryFn: async () => (await supabase.from('mail_log').select('kind,ref,status,error,created_at,user_id').order('created_at', { ascending: false }).limit(30)).data ?? [] });
  return (
    <section className="panel p-4 text-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">E-mail (Resend)</h3>
        <button
          className="btn-ghost btn-sm"
          onClick={async () => {
            const r = await notify('test');
            toast[r === 'sent' ? 'success' : 'error'](`Test mail: ${r ?? 'failed'}`);
            q.refetch();
          }}
        >
          Send test mail to me
        </button>
      </div>
      {(q.data ?? []).length === 0 ? (
        <p className="text-muted">No mails sent yet.</p>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {(q.data ?? []).map((m: { kind: string; ref: string; status: string; error: string | null; created_at: string }, i: number) => (
              <tr key={i} className="border-t border-line">
                <td className="stat py-1">{m.created_at.slice(0, 16).replace('T', ' ')}</td>
                <td className="py-1">{m.kind}</td>
                <td className="stat py-1 text-muted">{m.ref}</td>
                <td className={clsx('py-1', m.status === 'sent' ? 'text-good' : 'text-warn')}>{m.status}</td>
                <td className="py-1 text-muted">{m.error?.slice(0, 60)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}


type AmbRow = {
  user_id: string; name: string | null; email: string; status: string; kind: string; org: string; link: string; audience: string; motivation: string;
  commission_pct: number; created_at: string; referrals: number; paid: number; pending_cents: number; approved_cents: number; paid_cents: number;
};
const eur = (c: number) => `€${(c / 100).toFixed(2).replace('.', ',')}`;

function Ambassadors() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'amb'], queryFn: () => rpc<AmbRow[]>('admin_list_ambassadors') });
  const [pct, setPct] = useState<Record<string, number>>({});
  if (!q.data) return <Spinner />;
  const act = async (fn: string, args: Record<string, unknown>) => {
    try {
      await rpc(fn, args);
      toast.success(t('common.saved'));
      qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('ad.ambIntro')}</p>
      {q.data.length === 0 && <p className="text-sm text-muted">{t('ad.ambNone')}</p>}
      {q.data.map((a) => (
        <div key={a.user_id} className="panel space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{a.org || a.name}</span>
            <span className="chip">{a.kind}</span>
            <span className={clsx('chip', a.status === 'approved' ? 'bg-good/15 text-good' : a.status === 'applied' ? 'bg-sky/15 text-sky' : 'bg-bad/15 text-bad')}>{a.status}</span>
            <span className="text-xs text-muted">{a.name} · {a.email} · {a.created_at.slice(0, 10)}</span>
          </div>
          {a.link && (
            <a href={/^https?:/.test(a.link) ? a.link : `https://${a.link}`} target="_blank" rel="noreferrer" className="break-all text-xs text-volt underline">
              {a.link}
            </a>
          )}
          <p className="text-xs text-muted">{a.audience} — {a.motivation}</p>
          <p className="stat text-xs">
            {t('ad.ambStats', { r: a.referrals, p: a.paid })} · {t('ad.ambPending')} {eur(a.pending_cents)} · {t('ad.ambToPay')} {eur(a.approved_cents)} · {t('ad.ambPaid')} {eur(a.paid_cents)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted">
              %
              <input type="number" min={0} max={50} className="input h-8 w-16" value={pct[a.user_id] ?? a.commission_pct} onChange={(e) => setPct({ ...pct, [a.user_id]: +e.target.value })} />
            </label>
            {a.status !== 'approved' && (
              <button className="btn-primary btn-sm" onClick={() => act('admin_set_ambassador', { _uid: a.user_id, _status: 'approved', _pct: pct[a.user_id] ?? a.commission_pct })}>
                {t('ad.ambApprove')}
              </button>
            )}
            {a.status === 'approved' && (
              <button className="btn-ghost btn-sm" onClick={() => act('admin_set_ambassador', { _uid: a.user_id, _status: 'approved', _pct: pct[a.user_id] ?? a.commission_pct })}>
                {t('common.save')} %
              </button>
            )}
            {a.status === 'applied' && (
              <button className="btn-ghost btn-sm" onClick={() => act('admin_set_ambassador', { _uid: a.user_id, _status: 'rejected', _pct: null })}>
                {t('ad.ambReject')}
              </button>
            )}
            {a.status === 'approved' && (
              <button className="btn-ghost btn-sm" onClick={() => act('admin_set_ambassador', { _uid: a.user_id, _status: 'paused', _pct: null })}>
                {t('ad.ambPause')}
              </button>
            )}
            {a.pending_cents > 0 && (
              <button className="btn-ghost btn-sm" onClick={() => act('admin_settle_commissions', { _uid: a.user_id, _to: 'approved' })}>
                {t('ad.ambApproveCom')}
              </button>
            )}
            {a.approved_cents > 0 && (
              <button className="btn-ghost btn-sm" onClick={() => act('admin_settle_commissions', { _uid: a.user_id, _to: 'paid' })}>
                {t('ad.ambMarkPaid')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


type TplRow = { id?: string; name: string; description: string; protocol: SimProtocol; is_public?: boolean };
function SimTemplates() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'simTpl'], queryFn: async () => ((await supabase.from('sim_protocols').select('*').order('name')).data ?? []) as TplRow[] });
  const [edit, setEdit] = useState<TplRow | null>(null);
  if (!q.data) return <Spinner />;
  const saveTpl = async () => {
    if (!edit) return;
    const row = { name: edit.protocol.name || edit.name, description: edit.description, protocol: { ...edit.protocol, name: edit.protocol.name || edit.name }, is_public: true };
    const { error } = edit.id ? await supabase.from('sim_protocols').update(row).eq('id', edit.id) : await supabase.from('sim_protocols').insert(row);
    if (error) return toast.error(error.message);
    toast.success(t('common.saved'));
    setEdit(null);
    qc.invalidateQueries({ queryKey: ['admin', 'simTpl'] });
    qc.invalidateQueries({ queryKey: ['simTemplates'] });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('ad.simIntro')}</p>
      {q.data.map((r) => (
        <div key={r.id} className="panel flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="font-semibold">{r.name}</span>
          <span className="flex-1 text-xs text-muted">{r.description}</span>
          <button className="btn-ghost btn-sm" onClick={() => setEdit(r)}>{t('ad.edit')}</button>
          <button
            className="btn-ghost btn-sm text-bad"
            onClick={async () => {
              if (!confirm(r.name + ' ×?')) return;
              await supabase.from('sim_protocols').delete().eq('id', r.id!);
              qc.invalidateQueries({ queryKey: ['admin', 'simTpl'] });
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button className="btn-ghost btn-sm" onClick={() => setEdit({ name: 'New gym', description: '', protocol: { ...GROESBEEK, name: 'New gym' } })}>+ {t('ad.simNew')}</button>
      {edit && (
        <div className="panel space-y-3 p-4">
          <ProtocolFields value={edit.protocol} onChange={(p) => setEdit({ ...edit, protocol: p })} showName />
          <label className="block text-xs text-muted">
            Description
            <textarea className="input mt-1 h-20 py-2" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" onClick={saveTpl}>{t('common.save')}</button>
            <button className="btn-ghost btn-sm" onClick={() => setEdit(null)}>{t('common.back')}</button>
          </div>
        </div>
      )}
    </div>
  );
}


type GymRow = { id?: string; name: string; code: string; city: string; equipment: 'hyrox' | 'gym' | 'home'; sim_protocol_id: string | null; active: boolean; members?: number; programs?: number; managers?: (string | null)[] };
function Gyms() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'gyms'], queryFn: () => rpc<GymRow[]>('admin_list_gyms') });
  const tpl = useQuery({ queryKey: ['admin', 'simTpl'], queryFn: async () => ((await supabase.from('sim_protocols').select('id, name').order('name')).data ?? []) as { id: string; name: string }[] });
  const [edit, setEdit] = useState<GymRow | null>(null);
  const [manage, setManage] = useState<string | null>(null);
  if (!q.data) return <Spinner />;
  const saveGym = async () => {
    if (!edit) return;
    const row = { name: edit.name, code: edit.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, ''), city: edit.city, equipment: edit.equipment, sim_protocol_id: edit.sim_protocol_id || null, active: edit.active };
    if (row.code.length < 3) return toast.error('Code ≥ 3');
    const { error } = edit.id ? await supabase.from('gyms').update(row).eq('id', edit.id) : await supabase.from('gyms').insert(row);
    if (error) return toast.error(error.message);
    toast.success(t('common.saved'));
    setEdit(null);
    qc.invalidateQueries({ queryKey: ['admin', 'gyms'] });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('ad.gymIntro')}</p>
      {q.data.map((g) => (
        <div key={g.id} className="panel space-y-1 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{g.name}</span>
            <span className="chip stat">{g.code}</span>
            {!g.active && <span className="chip bg-bad/15 text-bad">off</span>}
            <span className="text-xs text-muted">{g.city} · {g.members ?? 0} {t('ad.gymMembers')} · {g.programs ?? 0} {t('ad.gymPrograms')} · {(g.managers ?? []).length} {t('ad.gymManagers')} · {(tpl.data ?? []).find((x) => x.id === g.sim_protocol_id)?.name ?? '—'}</span>
            <button className="btn-ghost btn-sm ml-auto" onClick={() => setManage(manage === g.id ? null : g.id!)}>{manage === g.id ? t('ad.gymClose') : t('ad.gymManage')}</button>
            <button className="btn-ghost btn-sm" onClick={() => setEdit(g)}>{t('ad.edit')}</button>
          </div>
          <p className="break-all text-xs text-volt">{window.location.origin}/?gym={g.code}</p>
          {manage === g.id && <div className="border-t border-line pt-3"><GymManager key={g.id} gymId={g.id!} asAdmin /></div>}
        </div>
      ))}
      <button className="btn-ghost btn-sm" onClick={() => setEdit({ name: '', code: '', city: '', equipment: 'hyrox', sim_protocol_id: null, active: true })}>+ {t('ad.gymNew')}</button>
      {edit && (
        <div className="panel grid gap-3 p-4 sm:grid-cols-2">
          <label className="text-xs text-muted">Name<input className="input mt-1" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
          <label className="text-xs text-muted">Code<input className="input stat mt-1 uppercase" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></label>
          <label className="text-xs text-muted">City<input className="input mt-1" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></label>
          <label className="text-xs text-muted">
            {t('onb.equipment')}
            <select className="input mt-1" value={edit.equipment} onChange={(e) => setEdit({ ...edit, equipment: e.target.value as GymRow['equipment'] })}>
              {(['hyrox', 'gym', 'home'] as const).map((v) => <option key={v} value={v}>{t(`eq.${v}` as I18nKey)}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted sm:col-span-2">
            {t('ad.sims')}
            <select className="input mt-1" value={edit.sim_protocol_id ?? ''} onChange={(e) => setEdit({ ...edit, sim_protocol_id: e.target.value || null })}>
              <option value="">— Benchmrk default —</option>
              {(tpl.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> active</label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary btn-sm" onClick={saveGym}>{t('common.save')}</button>
            <button className="btn-ghost btn-sm" onClick={() => setEdit(null)}>{t('common.back')}</button>
          </div>
        </div>
      )}
    </div>
  );
}


const TTS_VOICES = ['Kore', 'Sulafat', 'Achird', 'Puck', 'Charon', 'Aoede'] as const;
function TtsTest() {
  const [text, setText] = useState('HYROX draait niet om je tijd zien. Het draait om je tijd halen. Benchmrk traint jouw leden, week na week, naar hun doeltijd.');
  const [style, setStyle] = useState('Spreek in het Nederlands, energiek, warm en zelfverzekerd, in een vlot tempo, als een sportieve presentatrice die een nieuw trainingsplatform enthousiast aanprijst');
  const [voice, setVoice] = useState<(typeof TTS_VOICES)[number]>('Kore');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const generate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text, style, voice }) });
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${r.status}`);
      const blob = await r.blob();
      if (url) URL.revokeObjectURL(url);
      const u = URL.createObjectURL(blob);
      setUrl(u);
      setTimeout(() => (document.getElementById('tts-audio') as HTMLAudioElement | null)?.play(), 50);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel max-w-3xl space-y-4 p-5">
      <p className="text-sm text-muted">Gemini TTS (gemini-3.8-flash-tts, fallback gemini-2.5-flash-preview-tts). De stijlinstructie staat vóór de tekst in de prompt.</p>
      <label className="block text-sm">
        <span className="label">Tekst</span>
        <textarea className="input mt-1 h-40 py-2" maxLength={2500} value={text} onChange={(e) => setText(e.target.value)} />
        <span className="text-[11px] text-muted">{text.length}/2500</span>
      </label>
      <label className="block text-sm">
        <span className="label">Stijl</span>
        <textarea className="input mt-1 h-20 py-2" value={style} onChange={(e) => setStyle(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="label">Stem</span>
        <select className="input mt-1" value={voice} onChange={(e) => setVoice(e.target.value as (typeof TTS_VOICES)[number])}>
          {TTS_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" disabled={busy || !text.trim()} onClick={generate}>{busy ? 'Bezig…' : '▶ Afspelen'}</button>
        {url && (
          <a className="btn-ghost" href={url} download={`roxengine-${voice.toLowerCase()}.wav`}>Download audio</a>
        )}
      </div>
      {err && <p className="rounded-lg bg-bad/10 p-2 text-sm text-bad">{err}</p>}
      {url && <audio id="tts-audio" controls src={url} className="w-full" />}
    </div>
  );
}

export default function Admin() {
  const { t, lang } = useI18n();
  const links: [string, I18nKey][] = [
    ['/admin', 'ad.overview'],
    ['/admin/roadmap', 'ad.roadmap'],
    ['/admin/athletes', 'ad.athletes'],
    ['/admin/payments', 'ad.payments'],
    ['/admin/ambassadors', 'ad.ambassadors'],
    ['/admin/gyms', 'ad.gyms'],
    ['/admin/sims', 'ad.sims'],
    ['/admin/tts', 'ad.tts'],
    ['/admin/knowledge', 'ad.knowledge'],
    ['/admin/rules', 'ad.rules'],
    ['/admin/baselines', 'ad.baselines'],
    ['/admin/settings', 'ad.settings'],
  ];
  return (
    <>
      <PageHeader title={t('ad.title')} />
      <nav className="mb-5 flex gap-1 overflow-x-auto">
        {links.map(([to, k]) => (
          <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => clsx('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm', isActive ? 'bg-volt text-black' : 'text-muted hover:bg-panel2 hover:text-fg')}>
            {t(k)}
          </NavLink>
        ))}
        <NavLink to="/admin/planupdates" className={({ isActive }) => clsx('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm', isActive ? 'bg-volt text-black' : 'text-muted hover:bg-panel2 hover:text-fg')}>
          {pt(lang, 'pu.admin.title')}
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="athletes" element={<Athletes />} />
        <Route path="athletes/:id" element={<AthleteDetail />} />
        <Route path="payments" element={<Athletes paymentsOnly />} />
        <Route path="ambassadors" element={<Ambassadors />} />
        <Route path="sims" element={<SimTemplates />} />
        <Route path="gyms" element={<Gyms />} />
        <Route path="tts" element={<TtsTest />} />
        <Route path="knowledge" element={<SourcesAdmin />} />
        <Route path="planupdates" element={<PlanUpdatesAdmin />} />
        <Route path="rules" element={<Rules />} />
        <Route path="baselines" element={<Baselines />} />
        <Route path="settings" element={<AppSettings />} />
      </Routes>
    </>
  );
}
