import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Lang, PlanSnapshotDay, RuleChange } from '../engine';
import { useAuth } from './hooks';

export interface PlanUpdateRow {
  id: string;
  rule_set_version: number;
  title: string;
  summary: Partial<Record<Lang, string>>;
  changes: RuleChange[];
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
}

export interface PlanVersionRow {
  id: string;
  user_id: string;
  version_no: number;
  rule_set_version: number;
  plan_snapshot: PlanSnapshotDay[];
  reason: 'start' | 'update' | 'rollback';
  plan_update_id: string | null;
  effective_from: string;
  created_at: string;
}

export interface PlanChoiceRow {
  user_id: string;
  plan_update_id: string;
  choice: 'applied' | 'dismissed' | 'rolled_back';
  at: string;
}

/** Published plan updates, newest first. Public: the changelog on /science uses it too. */
export function usePlanUpdates() {
  return useQuery({
    queryKey: ['plan-updates'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('plan_updates').select('*').eq('status', 'published').order('rule_set_version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlanUpdateRow[];
    },
  });
}

export function usePlanVersions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['plan-versions', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_plan_versions').select('*').eq('user_id', user!.id).order('version_no');
      if (error) throw error;
      return (data ?? []) as PlanVersionRow[];
    },
  });
}

export function usePlanChoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['plan-choices', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_plan_update_choices').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as PlanChoiceRow[];
    },
  });
}

/** The newest published update the member has neither applied nor answered and that is newer than their version. */
export function pendingUpdate(updates: PlanUpdateRow[] | undefined, choices: PlanChoiceRow[] | undefined, pin: number): PlanUpdateRow | null {
  const answered = new Set((choices ?? []).map((c) => c.plan_update_id));
  return (updates ?? []).find((u) => u.rule_set_version > pin && !answered.has(u.id)) ?? null;
}

export function usePlanUpdateActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const refresh = () => {
    for (const k of ['plan-versions', 'plan-choices', 'profile']) qc.invalidateQueries({ queryKey: [k, user?.id] });
  };
  const apply = useMutation({
    mutationFn: async (a: { updateId: string; from: string; prev: PlanSnapshotDay[]; next: PlanSnapshotDay[] }) => {
      const { error } = await supabase.rpc('apply_plan_update', { _update_id: a.updateId, _from: a.from, _prev_snapshot: a.prev, _new_snapshot: a.next });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const dismiss = useMutation({
    mutationFn: async (updateId: string) => {
      const { error } = await supabase.rpc('dismiss_plan_update', { _update_id: updateId });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const rollback = useMutation({
    mutationFn: async (a: { versionId: string; from: string; prev: PlanSnapshotDay[]; next: PlanSnapshotDay[] }) => {
      const { error } = await supabase.rpc('rollback_plan_version', { _version_id: a.versionId, _from: a.from, _prev_snapshot: a.prev, _new_snapshot: a.next });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return useMemo(() => ({ apply, dismiss, rollback }), [apply, dismiss, rollback]);
}

/** The title of an update in a language (the summary holds one per language, `title` is the fallback). */
export const updateTitle = (u: PlanUpdateRow, lang: string) => (u.summary as Record<string, string>)?.[lang] || u.title;

/** A source in the databank with its level, the rules it supports and its archive state. */
export interface SourceRow {
  id: string;
  title: string;
  category: string;
  author: string | null;
  source_url: string | null;
  level: 'A' | 'B' | 'C' | 'D' | null;
  status: 'active' | 'archived';
  archived_at: string | null;
  archived_reason: string | null;
  replaced_by: string | null;
  checked_at: string | null;
  rule_keys: string[];
}

/** All sources with the new columns; falls back to the old columns when the migration has not run yet. */
export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const full = await supabase.from('knowledge_sources').select('id,title,category,author,source_url,level,status,archived_at,archived_reason,replaced_by,checked_at,rule_keys').order('created_at');
      if (!full.error) return (full.data ?? []) as SourceRow[];
      const basic = await supabase.from('knowledge_sources').select('id,title,category,author,source_url').order('created_at');
      return ((basic.data ?? []) as Partial<SourceRow>[]).map((r) => ({ level: null, status: 'active', archived_at: null, archived_reason: null, replaced_by: null, checked_at: null, rule_keys: [], ...r })) as SourceRow[];
    },
  });
}
