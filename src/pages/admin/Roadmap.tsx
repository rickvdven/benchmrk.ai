import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { Spinner } from '../../components/ui';

type Status = 'backlog' | 'todo' | 'doing' | 'done';
interface Todo {
  id: string;
  title: string;
  detail: string | null;
  status: Status;
  area: string | null;
  owner: string | null;
  sort: number;
  updated_at: string;
}
const COLS: Status[] = ['backlog', 'todo', 'doing', 'done'];
const L = {
  en: { backlog: 'Backlog', todo: 'Next', doing: 'In progress', done: 'Done', add: 'Task', title: 'Title', detail: 'Details (optional)', area: 'Area', owner: 'Who', save: 'Save', del: 'Delete this task?', all: 'All', intro: 'Roadmap for Benchmrk. Claude keeps this board up to date too.' },
  nl: { backlog: 'Backlog', todo: 'Volgende', doing: 'Bezig', done: 'Klaar', add: 'Taak', title: 'Titel', detail: 'Details (optioneel)', area: 'Onderdeel', owner: 'Wie', save: 'Opslaan', del: 'Deze taak verwijderen?', all: 'Alles', intro: 'Roadmap voor Benchmrk. Claude houdt dit bord ook bij.' },
};
const AREA_CLS: Record<string, string> = {
  Lancering: 'bg-volt/15 text-volt',
  Marketing: 'bg-sky/15 text-sky',
  Product: 'bg-good/15 text-good',
  App: 'bg-warn/15 text-warn',
  Techniek: 'bg-panel2 text-muted',
  Juridisch: 'bg-bad/15 text-bad',
};
const AREAS = Object.keys(AREA_CLS);
const OWNERS = ['Rick', 'Claude'];

/** Admin kanban: backlog → next → in progress → done. */
export function Roadmap() {
  const { lang } = useI18n();
  const x = lang === 'nl' ? L.nl : L.en;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'todos'],
    queryFn: async () => ((await supabase.from('admin_todos').select('*').order('sort').order('created_at')).data ?? []) as Todo[],
  });
  const [owner, setOwner] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [edit, setEdit] = useState<Partial<Todo> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'todos'] });
  const upd = async (id: string, patch: Partial<Todo>) => {
    qc.setQueryData<Todo[]>(['admin', 'todos'], (old = []) => old.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from('admin_todos').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message);
    refresh();
  };
  const move = (t: Todo, dir: -1 | 1) => {
    const i = COLS.indexOf(t.status) + dir;
    if (i < 0 || i >= COLS.length) return;
    const target = (q.data ?? []).filter((y) => y.status === COLS[i]);
    void upd(t.id, { status: COLS[i], sort: dir > 0 ? Math.min(0, ...target.map((y) => y.sort)) - 10 : Math.max(0, ...target.map((y) => y.sort)) + 10 });
  };
  const save = async () => {
    if (!edit?.title?.trim()) return;
    const row = { title: edit.title.trim(), detail: edit.detail?.trim() || null, area: edit.area || null, owner: edit.owner || null, status: edit.status ?? 'todo' };
    const { error } = edit.id
      ? await supabase.from('admin_todos').update({ ...row, updated_at: new Date().toISOString() }).eq('id', edit.id)
      : await supabase.from('admin_todos').insert({ ...row, sort: Math.max(0, ...(q.data ?? []).filter((t) => t.status === row.status).map((t) => t.sort)) + 10 });
    if (error) return toast.error(error.message);
    setEdit(null);
    refresh();
  };
  if (q.isLoading) return <Spinner />;
  const items = (q.data ?? []).filter((t) => (!owner || t.owner === owner) && (!area || t.area === area));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p className="mr-auto text-muted">{x.intro}</p>
        <select className="input max-w-[12rem] py-1.5 text-sm" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label={x.owner}>
          <option value="">{x.owner}: {x.all}</option>
          {OWNERS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select className="input max-w-[12rem] py-1.5 text-sm" value={area} onChange={(e) => setArea(e.target.value)} aria-label={x.area}>
          <option value="">{x.area}: {x.all}</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((col) => {
          const list = items.filter((t) => t.status === col);
          return (
            <section key={col} className={clsx('rounded-xl border border-line bg-panel/60 p-3', col === 'doing' && 'border-volt/40')}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {x[col]} <span className="stat ml-1 text-xs text-muted">{list.length}</span>
                </h3>
                <button className="btn-ghost btn-sm" onClick={() => setEdit({ status: col, owner: 'Rick' })}>
                  <Plus className="h-3.5 w-3.5" /> {x.add}
                </button>
              </div>
              <ul className="space-y-2">
                {edit && !edit.id && edit.status === col && <Editor x={x} edit={edit} setEdit={setEdit} save={save} />}
                {list.map((t) =>
                  edit?.id === t.id ? (
                    <Editor key={t.id} x={x} edit={edit} setEdit={setEdit} save={save} />
                  ) : (
                    <li key={t.id} className={clsx('group rounded-lg border border-line bg-panel p-3', col === 'done' && 'opacity-60')}>
                      <p className={clsx('text-sm font-medium leading-snug', col === 'done' && 'line-through')}>{t.title}</p>
                      {t.detail && <p className="mt-1 text-xs text-muted">{t.detail}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {t.area && <span className={clsx('chip text-[11px]', AREA_CLS[t.area] ?? 'bg-panel2 text-muted')}>{t.area}</span>}
                        {t.owner && <span className="chip bg-panel2 text-[11px] text-muted">{t.owner}</span>}
                        <span className="ml-auto flex gap-0.5 opacity-70 group-hover:opacity-100">
                          <button className="rounded p-1 hover:bg-panel2 disabled:opacity-30" disabled={col === 'backlog'} onClick={() => move(t, -1)} aria-label="←">
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button className="rounded p-1 hover:bg-panel2 disabled:opacity-30" disabled={col === 'done'} onClick={() => move(t, 1)} aria-label="→">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                          <button className="rounded p-1 hover:bg-panel2" onClick={() => setEdit(t)} aria-label="edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded p-1 text-bad hover:bg-panel2"
                            aria-label="delete"
                            onClick={async () => {
                              if (!confirm(x.del)) return;
                              await supabase.from('admin_todos').delete().eq('id', t.id);
                              refresh();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Editor({ x, edit, setEdit, save }: { x: (typeof L)['nl']; edit: Partial<Todo>; setEdit: (t: Partial<Todo> | null) => void; save: () => void }) {
  return (
    <li className="space-y-2 rounded-lg border border-volt/50 bg-panel p-3">
      <input className="input text-sm" autoFocus placeholder={x.title} value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} />
      <textarea className="input min-h-[60px] text-xs" placeholder={x.detail} value={edit.detail ?? ''} onChange={(e) => setEdit({ ...edit, detail: e.target.value })} />
      <div className="flex gap-2">
        <select className="input py-1 text-xs" value={edit.area ?? ''} onChange={(e) => setEdit({ ...edit, area: e.target.value })} aria-label={x.area}>
          <option value="">{x.area}</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select className="input py-1 text-xs" value={edit.owner ?? ''} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} aria-label={x.owner}>
          <option value="">{x.owner}</option>
          {OWNERS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-1">
        <button className="btn-ghost btn-sm" onClick={() => setEdit(null)} aria-label="cancel">
          <X className="h-3.5 w-3.5" />
        </button>
        <button className="btn-primary btn-sm" onClick={save}>
          <Check className="h-3.5 w-3.5" /> {x.save}
        </button>
      </div>
    </li>
  );
}
