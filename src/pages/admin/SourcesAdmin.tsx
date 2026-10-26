import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Spinner } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { usePt } from '../../lib/usePt';
import type { SourceRow } from '../../data/planUpdates';

type Row = SourceRow & { summary: string | null; takeaways: string[] };

/** Admin → Knowledge: sources with level, supported rules and archiving. Sources are never deleted. */
export function SourcesAdmin() {
  const p = usePt();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'knowledge'],
    queryFn: async () => (await supabase.from('knowledge_sources').select('*').order('created_at')).data as Row[] | null,
  });
  const [edit, setEdit] = useState<string | null>(null);
  const [f, setF] = useState({ level: '', rules: '', checked: '', reason: '', replacedBy: '' });
  const [draft, setDraft] = useState({ title: '', category: 'science', author: '', source_url: '', summary: '', takeaways: '' });
  if (!q.data) return <Spinner />;
  const all = q.data;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'knowledge'] });
    qc.invalidateQueries({ queryKey: ['sources'] });
  };
  const start = (k: Row) => {
    setEdit(k.id);
    setF({ level: k.level ?? '', rules: (k.rule_keys ?? []).join(', '), checked: k.checked_at ?? '', reason: k.archived_reason ?? '', replacedBy: k.replaced_by ?? '' });
  };
  const save = async (k: Row) => {
    const patch = {
      level: f.level || null,
      rule_keys: f.rules.split(',').map((s) => s.trim()).filter(Boolean),
      checked_at: f.checked || null,
      ...(k.status === 'archived' ? { archived_reason: f.reason || null, replaced_by: f.replacedBy || null } : {}),
    };
    const { error } = await supabase.from('knowledge_sources').update(patch).eq('id', k.id);
    if (error) return toast.error(error.message);
    setEdit(null);
    refresh();
  };
  const setStatus = async (k: Row, status: 'active' | 'archived') => {
    const { error } = await supabase.from('knowledge_sources').update({ status, ...(status === 'archived' ? { archived_reason: f.reason || k.archived_reason || null } : {}) }).eq('id', k.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">{p('pu.admin.sources.noDelete')}</p>
      {all.map((k) => (
        <section key={k.id} className={`panel p-4 text-sm ${k.status === 'archived' ? 'opacity-70' : ''}`}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              {k.level && <span className="chip mr-2">{k.level}</span>}
              <span className="chip mr-2">{k.category}</span>
              {k.status === 'archived' && <span className="chip mr-2">{p('pu.sci.archived')}</span>}
              <span className="font-semibold">{k.title}</span>
              <div className="text-xs text-muted">{k.author}</div>
            </div>
            <div className="flex gap-3 text-xs">
              <button className="underline" onClick={() => (edit === k.id ? setEdit(null) : start(k))}>
                {p('pu.admin.sources.edit')}
              </button>
              {k.status === 'active' ? (
                <button
                  className="text-bad underline"
                  onClick={() => {
                    if (edit !== k.id) start(k);
                    else void setStatus(k, 'archived');
                  }}
                >
                  {p('pu.admin.sources.archive')}
                </button>
              ) : (
                <button className="underline" onClick={() => void setStatus(k, 'active')}>
                  {p('pu.admin.sources.restore')}
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-muted">{k.summary}</p>
          {(k.rule_keys?.length ?? 0) > 0 && <p className="stat mt-1 text-xs text-muted">{k.rule_keys.join(', ')}</p>}
          {k.source_url && (
            <a className="mt-1 inline-block break-all text-xs text-volt underline" href={k.source_url} target="_blank" rel="noreferrer">
              {k.source_url}
            </a>
          )}
          {edit === k.id && (
            <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
              <label className="text-xs text-muted">
                {p('pu.admin.sources.level')}
                <select className="input mt-1" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
                  <option value="">–</option>
                  {['A', 'B', 'C', 'D'].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted">
                {p('pu.admin.sources.checked')}
                <input type="date" className="input mt-1" value={f.checked} onChange={(e) => setF({ ...f, checked: e.target.value })} />
              </label>
              <label className="text-xs text-muted sm:col-span-2">
                {p('pu.admin.sources.rules')}
                <input className="input mt-1" value={f.rules} onChange={(e) => setF({ ...f, rules: e.target.value })} placeholder="taper.lastSimDays, zones.z2CapPct" />
              </label>
              <label className="text-xs text-muted">
                {p('pu.admin.sources.reason')}
                <input className="input mt-1" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
              </label>
              <label className="text-xs text-muted">
                {p('pu.admin.sources.replacedBy')}
                <select className="input mt-1" value={f.replacedBy} onChange={(e) => setF({ ...f, replacedBy: e.target.value })}>
                  <option value="">–</option>
                  {all.filter((r) => r.id !== k.id).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title.slice(0, 70)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button className="btn-primary btn-sm" onClick={() => save(k)}>
                  {p('pu.admin.sources.save')}
                </button>
                {k.status === 'active' && (
                  <button className="btn-ghost btn-sm" onClick={() => setStatus(k, 'archived')}>
                    {p('pu.admin.sources.archive')}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      ))}
      <section className="panel space-y-2 p-4">
        <h3 className="font-bold">New source</h3>
        {(['title', 'author', 'source_url', 'category'] as const).map((k) => (
          <input key={k} className="input" placeholder={k} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
        ))}
        <textarea className="input h-20 py-2" placeholder="summary" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
        <textarea className="input h-20 py-2" placeholder="takeaways (one per line)" value={draft.takeaways} onChange={(e) => setDraft({ ...draft, takeaways: e.target.value })} />
        <button
          className="btn-primary"
          disabled={!draft.title}
          onClick={async () => {
            const { error } = await supabase.from('knowledge_sources').insert({ ...draft, takeaways: draft.takeaways.split('\n').map((s) => s.trim()).filter(Boolean) });
            if (error) return toast.error(error.message);
            setDraft({ title: '', category: 'science', author: '', source_url: '', summary: '', takeaways: '' });
            refresh();
          }}
        >
          Add
        </button>
      </section>
    </div>
  );
}
