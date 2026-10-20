import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { write } from '../lib/queue';
import {
  applyBenchmark,
  calibrationOf,
  compliance,
  currentProfile,
  evaluate,
  generateSeason,
  raceModel,
  replay,
  teamModel,
  daysBetween,
  executionOf,
  isDoubles,
  todayISO,
  type BenchmarkEntry,
  type Calibration,
  type LoggedSession,
  type Session,
} from '../engine';
import {
  baselinesFrom,
  isComplete,
  rulesFrom,
  toAthlete,
  toBenchmark,
  toProfile,
  type BenchmarkRow,
  type EntryRow,
  type ProfileRow,
  type TeamRow,
} from './mapping';

// ---------------- auth ----------------
interface AuthCtx {
  session: AuthSession | null;
  user: User | null;
  ready: boolean;
}
const Auth = createContext<AuthCtx>({ session: null, user: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      if (evt === 'SIGNED_OUT') qc.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  return <Auth.Provider value={{ session, user: session?.user ?? null, ready }}>{children}</Auth.Provider>;
}
export const useAuth = () => useContext(Auth);

// ---------------- queries ----------------
export function useProfileRow() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });
}

export function useEntries(userId?: string | null) {
  const { user } = useAuth();
  const uid = userId ?? user?.id;
  return useQuery({
    queryKey: ['entries', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('session_entries').select('*').eq('user_id', uid!).order('date');
      if (error) throw error;
      return (data ?? []) as EntryRow[];
    },
  });
}

export function useBenchmarks(userId?: string | null) {
  const { user } = useAuth();
  const uid = userId ?? user?.id;
  return useQuery({
    queryKey: ['benchmarks', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('benchmarks').select('*').eq('user_id', uid!).order('date');
      if (error) throw error;
      return (data ?? []) as BenchmarkRow[];
    },
  });
}

export function useMorning() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['morning', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('morning_checks').select('date,score').eq('user_id', user!.id);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.date, r.score])) as Record<string, number>;
    },
  });
}

export function usePlanChanges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['changes', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('plan_changes').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRulesAndBaselines() {
  return useQuery({
    queryKey: ['rules'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [r, b] = await Promise.all([
        supabase.from('coaching_rules').select('rule_key,value'),
        supabase.from('station_baselines').select('weight_class,station,seconds'),
      ]);
      return { rules: rulesFrom(r.data ?? []), baselines: baselinesFrom(b.data ?? []) };
    },
  });
}

/** The main-race team, or a specific (season race) team when `override` is given. */
export function useTeam(override?: string | null) {
  const prof = useProfileRow();
  const { user } = useAuth();
  const teamId = override !== undefined ? override : prof.data?.team_id;
  const team = useQuery({
    queryKey: ['team', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').eq('id', teamId!).maybeSingle();
      if (error) throw error;
      return data as TeamRow | null;
    },
  });
  const partnerId = team.data ? (team.data.athlete_1 === user?.id ? team.data.athlete_2 : team.data.athlete_1) : null;
  const partner = useQuery({
    queryKey: ['partner', partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', partnerId!).maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });
  const partnerEntries = useEntries(partnerId ?? undefined);
  return {
    team: team.data ?? null,
    partnerId,
    partner: partner.data ?? null,
    partnerEntries: partnerEntries.data ?? [],
    isCaptain: !!team.data && team.data.captain_id === user?.id,
    loading: team.isLoading || partner.isLoading,
  };
}

export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sub', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_subscription');
      if (error) throw error;
      return data as {
        status: string;
        valid_until: string | null;
        bank_reference: string;
        referral_code: string;
        payment_marked_at: string | null;
        referrals: number;
        referral_months: number;
        referrals_paid: number;
        referred_by_name: string | null;
        friend_bonus_given: boolean;
        reward_months: number;
        cap_months: number;
        ambassador: { status: 'applied' | 'approved' | 'rejected' | 'paused'; kind: string; org: string; commission_pct: number } | null;
        commission: { pending: number; approved: number; paid: number } | null;
        min_payout_cents: number;
        paywall_enabled: boolean;
      } | null;
    },
  });
}

export function useIsAdmin() {
  return useAdminQuery().data === true;
}
export function useAdminQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => (await supabase.rpc('has_role', { _uid: user!.id, _role: 'admin' })).data === true,
  });
}

export interface KnowledgeRow {
  id: string;
  title: string;
  category: string;
  author: string | null;
  source_url: string | null;
}
export function useKnowledge() {
  return useQuery({
    queryKey: ['knowledge'],
    staleTime: 30 * 60_000,
    queryFn: async () => ((await supabase.from('knowledge_sources').select('id,title,category,author,source_url')).data ?? []) as KnowledgeRow[],
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    staleTime: 10 * 60_000,
    queryFn: async () => Object.fromEntries(((await supabase.from('app_settings').select('key,value')).data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>,
  });
}

// ---------------- realtime ----------------
export function useRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`rox-${user.id}`);
    const inv = (key: string) => () => qc.invalidateQueries({ queryKey: [key] });
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'session_entries' }, inv('entries'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'morning_checks', filter: `user_id=eq.${user.id}` }, inv('morning'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'benchmarks' }, inv('benchmarks'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        qc.invalidateQueries({ queryKey: ['profile'] });
        qc.invalidateQueries({ queryKey: ['partner'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, inv('team'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_changes', filter: `user_id=eq.${user.id}` }, inv('changes'))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);
}

export interface MyGym {
  id: string;
  name: string;
  city: string;
  code: string;
  equipment: 'hyrox' | 'gym' | 'home';
  protocol: import('../engine').SimProtocol | null;
}
export function useMyGym() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gym', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_gym');
      if (error) throw error;
      return (data ?? null) as MyGym | null;
    },
  });
}

// ---------------- derived coach state ----------------
/** Completed entries as input for the adaptive rules and the session analysis. */
export function logsOf(byDate: Record<string, EntryRow>): LoggedSession[] {
  return Object.values(byDate)
    .filter((e) => e.completed && e.planned)
    .map((e) => ({
      date: e.date,
      type: String((e.planned as { type?: string }).type),
      targetPaceSec: (e.planned as { targetPaceSec?: number }).targetPaceSec,
      hrCap: (e.planned as { hrCap?: number }).hrCap,
      actualPaceSec: e.actual_pace_sec,
      avgHr: e.avg_hr,
      rpe: e.rpe,
    }));
}

export function useCoach(lang: import('../engine').Lang) {
  const prof = useProfileRow();
  const entries = useEntries();
  const morning = useMorning();
  const rb = useRulesAndBaselines();
  const today = todayISO();
  // the doubles team that belongs to the race the forecast is about (main race or a season race)
  const targetTeamId = useMemo(() => {
    const r = prof.data;
    if (!isComplete(r)) return (r as ProfileRow | null | undefined)?.team_id ?? null;
    const full = toProfile(r);
    const cur = currentProfile(full, today);
    if (cur.raceDate === full.raceDate) return r.team_id ?? null;
    return (full.season ?? []).find((x) => x.date === cur.raceDate)?.teamId ?? null;
  }, [prof.data, today]);
  const team = useTeam(targetTeamId);
  const gym = useMyGym();
  return useMemo(() => {
    const raw = prof.data;
    // follow the gym's sim template unless the athlete saved an own build-up
    const row = raw && !raw.sim_protocol && gym.data?.protocol ? { ...raw, sim_protocol: gym.data.protocol } : raw;
    if (!isComplete(row)) return { ready: !prof.isLoading, row, profile: null } as const;
    const profile = toProfile(row);
    const rules = rb.data?.rules;
    const baselines = rb.data?.baselines;
    const flare = morning.data ?? {};
    const plan = generateSeason(profile, {
      lang,
      rules,
      baselines,
      flare,
      today,
      sharedSimDow: team.team?.shared_sim_dow ?? null,
      placeByDate: Object.fromEntries((entries.data ?? []).filter((e) => e.place).map((e) => [e.date, e.place!])),
    });
    const byDate: Record<string, EntryRow> = Object.fromEntries((entries.data ?? []).map((e) => [e.date, e]));
    // completed sessions show their frozen snapshot, so history is never rewritten
    const weeks = plan.map((w) => ({
      ...w,
      sessions: w.sessions.map((s) => {
        const e = byDate[s.date];
        if (e?.planned && (e.completed || (e.planned as { extra?: boolean }).extra || (e.planned as { alt?: boolean }).alt))
          return { ...(e.planned as unknown as Session), id: s.id, date: s.date, dow: s.dow, frozen: !!e.completed } as Session & { frozen?: boolean };
        return s;
      }),
    }));
    const completed = Object.fromEntries((entries.data ?? []).filter((e) => e.completed).map((e) => [e.date, true]));
    // forecast and countdown follow the next A race once the main race is behind you
    const logs = logsOf(byDate);
    const comp = compliance(weeks, completed, today, row.created_at.slice(0, 10));
    // the log feeds the chance: skipped sessions and missed target paces lower it, hitting them raises it
    const cur = { ...currentProfile(profile, today), adherence: comp == null || daysBetween(row.created_at.slice(0, 10), today) < 14 ? null : comp / 100, execution: executionOf(logs, today) };
    const model = raceModel(cur, today, baselines);
    const adjust = evaluate(logs, flare, today, rules?.achillesStiffnessCeiling ?? 4);
    const tm =
      team.partner && isComplete(team.partner) && isDoubles(cur.category)
        ? teamModel(toAthlete(row), toAthlete(team.partner), cur.category, cur.goalSec, cur.raceDate, today, baselines)
        : null;
    return {
      ready: true,
      row,
      profile: cur,
      fullProfile: profile,
      weeks,
      byDate,
      completed,
      compliance: comp,
      model,
      teamModel: tm,
      rules: rules!,
      baselines: baselines!,
      morning: flare,
      today,
      team,
      logs,
      adjust,
    } as const;
  }, [prof.data, prof.isLoading, entries.data, morning.data, rb.data, team, gym.data, lang, today]);
}

// ---------------- mutations ----------------
export function useMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id;

  const patchEntries = (date: string, patch: Partial<EntryRow>) =>
    qc.setQueryData<EntryRow[]>(['entries', uid], (old = []) => {
      const i = old.findIndex((e) => e.date === date);
      const base: EntryRow = { user_id: uid!, date, completed: false, planned: null, actual_pace_sec: null, avg_hr: null, max_hr: null, rpe: null, notes: null, wod: null };
      const next = { ...(i >= 0 ? old[i] : base), ...patch };
      return i >= 0 ? old.map((e, k) => (k === i ? next : e)) : [...old, next];
    });

  const api = {
    async saveEntry(date: string, patch: Partial<EntryRow>) {
      const cur = (qc.getQueryData<EntryRow[]>(['entries', uid]) ?? []).find((e) => e.date === date);
      patchEntries(date, patch);
      const row = { ...(cur ?? {}), ...patch, user_id: uid, date, updated_at: new Date().toISOString() };
      delete (row as { id?: string }).id;
      await write(`entry:${date}`, { kind: 'upsert', table: 'session_entries', row, onConflict: 'user_id,date' });
    },
    async setMorning(date: string, score: number) {
      qc.setQueryData<Record<string, number>>(['morning', uid], (old = {}) => ({ ...old, [date]: score }));
      await write(`morning:${date}`, { kind: 'upsert', table: 'morning_checks', row: { user_id: uid, date, score }, onConflict: 'user_id,date' });
    },
    async updateProfile(patch: Partial<ProfileRow>) {
      qc.setQueryData<ProfileRow | null>(['profile', uid], (old) => (old ? { ...old, ...patch } : old));
      const { error } = await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', uid!);
      if (error) {
        qc.invalidateQueries({ queryKey: ['profile'] });
        throw error;
      }
    },
    async addChange(kind: string, message: string, payload?: unknown) {
      await supabase.from('plan_changes').insert({ user_id: uid, kind, message, payload });
      qc.invalidateQueries({ queryKey: ['changes'] });
    },
    /** Saves a benchmark and recalibrates the athlete by replaying all benchmarks over the intake baseline. */
    async saveBenchmark(row: ProfileRow, b: BenchmarkEntry, allRows: BenchmarkRow[]) {
      const baseline = (row.baseline as Calibration | null) ?? calibrationOf(toAthlete(row));
      const since = (row.baseline as { since?: string } | null)?.since ?? '0000';
      const others = allRows.filter((x) => x.id !== b.id && x.date >= since).map(toBenchmark);
      const before = replay(baseline, others);
      const effect = applyBenchmark(before, b);
      const after = replay(baseline, [...others, b]);
      const { error } = await supabase.from('benchmarks').upsert({
        id: b.id,
        user_id: uid,
        number: b.number,
        date: b.date,
        pace_sec: b.paceSec,
        avg_hr: b.avgHr,
        rpe: b.rpe ?? null,
        new_lt_pace_sec: b.newLtPaceSec ?? null,
        new_lthr: b.newLthr ?? null,
        new_vo2: b.newVo2 ?? null,
        station_splits: b.stationSplits ?? null,
        run_splits: b.runSplits ?? null,
        effect: { before: effect.before, after: effect.after, notes: effect.notes },
      });
      if (error) throw error;
      await api.updateProfile({
        baseline: baseline as unknown as Record<string, unknown>,
        threshold_pace_sec: after.thresholdPaceSec,
        lthr: after.lthr,
        vo2max: after.vo2max,
        compromised_ratio: after.compromisedRatio,
        station_times: after.stationTimes,
        decay_sec: after.decaySec,
      });
      qc.invalidateQueries({ queryKey: ['benchmarks'] });
      return effect;
    },
    async deleteBenchmark(row: ProfileRow, id: string, allRows: BenchmarkRow[]) {
      const baseline = (row.baseline as Calibration | null) ?? calibrationOf(toAthlete(row));
      const since = (row.baseline as { since?: string } | null)?.since ?? '0000';
      const rest = allRows.filter((x) => x.id !== id && x.date >= since).map(toBenchmark);
      const after = replay(baseline, rest);
      const { error } = await supabase.from('benchmarks').delete().eq('id', id);
      if (error) throw error;
      await api.updateProfile({
        threshold_pace_sec: after.thresholdPaceSec,
        lthr: after.lthr,
        vo2max: after.vo2max,
        compromised_ratio: after.compromisedRatio,
        station_times: after.stationTimes,
        decay_sec: after.decaySec,
      });
      qc.invalidateQueries({ queryKey: ['benchmarks'] });
    },
  };
  return api;
}
