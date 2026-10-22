import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { GROESBEEK, type Lang, type SimProtocol } from '../engine';
import { supabase } from '../lib/supabase';
import { useI18n, type I18nKey } from '../lib/i18n';
import { ProtocolFields } from './SimProtocolEditor';
import { Spinner } from './ui';

type K =
  | 'details' | 'name' | 'city' | 'program' | 'defaultProgram' | 'saveGym' | 'code' | 'link' | 'copy' | 'copied' | 'members' | 'inactive'
  | 'programs' | 'programsIntro' | 'newProgram' | 'noPrograms' | 'description' | 'saveProgram' | 'used' | 'use' | 'confirmDelete' | 'weeks'
  | 'templates' | 'adminNote' | 'managers' | 'managersIntro' | 'email' | 'add' | 'noManagers' | 'edit';
const T: Record<Lang, Record<K, string>> = {
  en: {
    details: 'Gym details', name: 'Name', city: 'City', program: 'Sim program your members follow', defaultProgram: 'Benchmrk default (by training phase)', saveGym: 'Save gym',
    code: 'Gym code', link: 'Invite link', copy: 'Copy', copied: 'Copied', members: '{n} members', inactive: 'inactive: the code does not work right now',
    programs: 'Your sim programs', programsIntro: 'Add your own sim build-ups. Members of your gym can pick them in their settings; the one you mark as “used by members” is followed by default.',
    newProgram: 'New program', noPrograms: 'No programs yet.', description: 'Description', saveProgram: 'Save program', used: 'Used by members', use: 'Use for my gym', confirmDelete: 'Delete this program?', weeks: '{n} weeks',
    templates: 'Benchmrk templates', adminNote: 'You are managing this gym as an admin. The gym can do the same itself under “My gym”.',
    managers: 'Accounts that manage this gym', managersIntro: 'These accounts get the “gym” label and can edit this gym and its programs.', email: 'Account email', add: 'Add', noManagers: 'No accounts yet.', edit: 'Edit',
  },
  nl: {
    details: 'Gegevens van de gym', name: 'Naam', city: 'Plaats', program: 'Simprogramma dat je leden volgen', defaultProgram: 'Benchmrk-standaard (per trainingsfase)', saveGym: 'Gym opslaan',
    code: 'Gymcode', link: 'Uitnodigingslink', copy: 'Kopieer', copied: 'Gekopieerd', members: '{n} leden', inactive: 'inactief: de code werkt nu niet',
    programs: 'Jullie simprogramma’s', programsIntro: 'Voeg je eigen sim-opbouwen toe. Leden van je gym kiezen ze in hun instellingen; het programma dat je markeert als “gebruikt door leden” volgen ze standaard.',
    newProgram: 'Nieuw programma', noPrograms: 'Nog geen programma’s.', description: 'Omschrijving', saveProgram: 'Programma opslaan', used: 'Gebruikt door leden', use: 'Gebruik voor mijn gym', confirmDelete: 'Dit programma verwijderen?', weeks: '{n} weken',
    templates: 'Benchmrk-sjablonen', adminNote: 'Je beheert deze gym als admin. De gym kan hetzelfde zelf doen onder “Mijn gym”.',
    managers: 'Accounts die deze gym beheren', managersIntro: 'Deze accounts krijgen het label “gym” en kunnen deze gym en de programma’s bewerken.', email: 'E-mailadres van het account', add: 'Toevoegen', noManagers: 'Nog geen accounts.', edit: 'Bewerken',
  },
  de: {
    details: 'Gym-Daten', name: 'Name', city: 'Ort', program: 'Sim-Programm, dem deine Mitglieder folgen', defaultProgram: 'Benchmrk-Standard (nach Trainingsphase)', saveGym: 'Gym speichern',
    code: 'Gym-Code', link: 'Einladungslink', copy: 'Kopieren', copied: 'Kopiert', members: '{n} Mitglieder', inactive: 'inaktiv: der Code funktioniert derzeit nicht',
    programs: 'Eure Sim-Programme', programsIntro: 'Füge eigene Sim-Aufbauten hinzu. Mitglieder deines Gyms wählen sie in ihren Einstellungen; das als „von Mitgliedern genutzt“ markierte Programm gilt standardmäßig.',
    newProgram: 'Neues Programm', noPrograms: 'Noch keine Programme.', description: 'Beschreibung', saveProgram: 'Programm speichern', used: 'Von Mitgliedern genutzt', use: 'Für mein Gym verwenden', confirmDelete: 'Dieses Programm löschen?', weeks: '{n} Wochen',
    templates: 'Benchmrk-Vorlagen', adminNote: 'Du verwaltest dieses Gym als Admin. Das Gym kann dasselbe selbst unter „Mein Gym“ tun.',
    managers: 'Konten, die dieses Gym verwalten', managersIntro: 'Diese Konten erhalten das Label „Gym“ und können dieses Gym und seine Programme bearbeiten.', email: 'E-Mail des Kontos', add: 'Hinzufügen', noManagers: 'Noch keine Konten.', edit: 'Bearbeiten',
  },
  es: {
    details: 'Datos del gimnasio', name: 'Nombre', city: 'Ciudad', program: 'Programa de sims que siguen tus miembros', defaultProgram: 'Estándar Benchmrk (por fase)', saveGym: 'Guardar gimnasio',
    code: 'Código del gimnasio', link: 'Enlace de invitación', copy: 'Copiar', copied: 'Copiado', members: '{n} miembros', inactive: 'inactivo: el código no funciona ahora',
    programs: 'Vuestros programas de sims', programsIntro: 'Añade tus propias progresiones de sims. Los miembros de tu gimnasio las eligen en sus ajustes; el programa marcado como «usado por los miembros» se sigue por defecto.',
    newProgram: 'Nuevo programa', noPrograms: 'Aún no hay programas.', description: 'Descripción', saveProgram: 'Guardar programa', used: 'Usado por los miembros', use: 'Usar en mi gimnasio', confirmDelete: '¿Eliminar este programa?', weeks: '{n} semanas',
    templates: 'Plantillas Benchmrk', adminNote: 'Gestionas este gimnasio como administrador. El gimnasio puede hacer lo mismo en «Mi gimnasio».',
    managers: 'Cuentas que gestionan este gimnasio', managersIntro: 'Estas cuentas reciben la etiqueta «gym» y pueden editar este gimnasio y sus programas.', email: 'Email de la cuenta', add: 'Añadir', noManagers: 'Aún no hay cuentas.', edit: 'Editar',
  },
  ko: {
    details: '체육관 정보', name: '이름', city: '도시', program: '회원이 따르는 시뮬 프로그램', defaultProgram: 'Benchmrk 기본 (훈련 단계별)', saveGym: '체육관 저장',
    code: '체육관 코드', link: '초대 링크', copy: '복사', copied: '복사됨', members: '회원 {n}명', inactive: '비활성: 지금은 코드가 작동하지 않습니다',
    programs: '우리 체육관 시뮬 프로그램', programsIntro: '나만의 시뮬 빌드업을 추가하세요. 회원은 설정에서 선택할 수 있고, “회원 사용 중”으로 표시한 프로그램이 기본으로 적용됩니다.',
    newProgram: '새 프로그램', noPrograms: '아직 프로그램이 없습니다.', description: '설명', saveProgram: '프로그램 저장', used: '회원 사용 중', use: '내 체육관에 사용', confirmDelete: '이 프로그램을 삭제할까요?', weeks: '{n}주',
    templates: 'Benchmrk 템플릿', adminNote: '관리자로서 이 체육관을 관리하고 있습니다. 체육관도 “내 체육관”에서 직접 할 수 있습니다.',
    managers: '이 체육관을 관리하는 계정', managersIntro: '이 계정에는 “gym” 라벨이 부여되며 체육관과 프로그램을 편집할 수 있습니다.', email: '계정 이메일', add: '추가', noManagers: '아직 계정이 없습니다.', edit: '편집',
  },
};
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

type Program = { id: string; name: string; description: string; protocol: SimProtocol };
type GymDetail = {
  id: string;
  name: string;
  code: string;
  city: string;
  equipment: 'hyrox' | 'gym' | 'home';
  sim_protocol_id: string | null;
  active: boolean;
  members: number;
  programs: Program[];
  templates: { id: string; name: string }[];
  managers: { user_id: string; email: string | null }[] | null;
};
type Draft = { id?: string; name: string; description: string; protocol: SimProtocol };

const call = async <T,>(fn: string, args: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};
const totalWeeks = (p: SimProtocol) => p.blocks.reduce((n, b) => n + Math.max(0, b.weeks), 0);

/**
 * Edit a gym and its sim programs. Used by gym accounts under "My gym" and by admins for any gym:
 * both go through the same RPCs, which check that the caller manages the gym or is an admin.
 */
export function GymManager({ gymId, asAdmin = false }: { gymId: string; asAdmin?: boolean }) {
  const { lang, t } = useI18n();
  const x = T[lang] ?? T.en;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['gym-manage', gymId], queryFn: () => call<GymDetail>('gym_get', { _gym: gymId }) });
  const [form, setForm] = useState<{ name: string; city: string; equipment: GymDetail['equipment']; program: string } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [email, setEmail] = useState('');
  const g = q.data;
  // reset the form only when the saved values change, not on every background refetch
  const saved = g ? [g.name, g.city, g.equipment, g.sim_protocol_id ?? ''].join('|') : '';
  useEffect(() => {
    if (g) setForm({ name: g.name, city: g.city, equipment: g.equipment, program: g.sim_protocol_id ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['gym-manage', gymId] }),
      qc.invalidateQueries({ queryKey: ['managed-gyms'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'gyms'] }),
      qc.invalidateQueries({ queryKey: ['simTemplates'] }),
      qc.invalidateQueries({ queryKey: ['gym'] }),
    ]);
  const run = async (fn: () => Promise<unknown>, done = t('common.saved')) => {
    try {
      await fn();
      await refresh();
      toast.success(done);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  if (q.isError) return <p className="rounded-lg bg-bad/10 p-2 text-sm text-bad">{(q.error as Error).message}</p>;
  if (!g || !form) return <Spinner />;
  const link = `${window.location.origin}/?gym=${g.code}`;
  const saveGym = (programId = form.program) =>
    run(() => call('gym_update', { _gym: g.id, _name: form.name, _city: form.city, _equipment: form.equipment, _sim_protocol_id: programId || null }));
  return (
    <div className="space-y-5">
      {asAdmin && <p className="rounded-lg bg-panel2 p-2 text-xs text-muted">{x.adminNote}</p>}

      <section className="panel space-y-3 p-4">
        <h3 className="font-bold">{x.details}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            {x.name}
            <input className="input mt-1" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-xs text-muted">
            {x.city}
            <input className="input mt-1" maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label className="text-xs text-muted">
            {t('onb.equipment')}
            <select className="input mt-1" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value as GymDetail['equipment'] })}>
              {(['hyrox', 'gym', 'home'] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`eq.${v}` as I18nKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {x.program}
            <select className="input mt-1" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
              <option value="">{x.defaultProgram}</option>
              {g.programs.length > 0 && (
                <optgroup label={x.programs}>
                  {g.programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {g.templates.length > 0 && (
                <optgroup label={x.templates}>
                  {g.templates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        </div>
        <button className="btn-primary btn-sm" disabled={!form.name.trim()} onClick={() => saveGym()}>
          {x.saveGym}
        </button>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{x.code}</span> <span className="chip stat">{g.code}</span>
            <span className="text-xs text-muted">· {fill(x.members, { n: g.members })}</span>
            {!g.active && <span className="chip bg-bad/15 text-bad">{x.inactive}</span>}
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{x.link}</span>
            <span className="break-all text-xs text-volt">{link}</span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                void navigator.clipboard?.writeText(link).then(() => toast.success(x.copied));
              }}
            >
              <Copy className="h-3.5 w-3.5" /> {x.copy}
            </button>
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-bold">{x.programs}</h3>
          <p className="text-xs text-muted">{x.programsIntro}</p>
        </div>
        {g.programs.length === 0 && <p className="text-sm text-muted">{x.noPrograms}</p>}
        {g.programs.map((p) => {
          const used = g.sim_protocol_id === p.id;
          return (
            <div key={p.id} className="panel flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="font-semibold">{p.name}</span>
              {used && <span className="chip bg-volt/15 text-volt">{x.used}</span>}
              <span className="chip stat">{fill(x.weeks, { n: totalWeeks(p.protocol) })}</span>
              <span className="min-w-0 flex-1 text-xs text-muted">{p.description}</span>
              {!used && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setForm({ ...form, program: p.id });
                    void saveGym(p.id);
                  }}
                >
                  {x.use}
                </button>
              )}
              <button className="btn-ghost btn-sm" aria-label={x.edit} onClick={() => setDraft({ id: p.id, name: p.name, description: p.description, protocol: p.protocol })}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="btn-ghost btn-sm text-bad"
                aria-label="delete"
                onClick={() => {
                  if (confirm(`${x.confirmDelete} (${p.name})`)) void run(() => call('gym_program_delete', { _gym: g.id, _id: p.id }));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {!draft && (
          <button className="btn-ghost btn-sm" onClick={() => setDraft({ name: '', description: '', protocol: { ...GROESBEEK, name: '' } })}>
            <Plus className="h-4 w-4" /> {x.newProgram}
          </button>
        )}
        {draft && (
          <div className="panel space-y-3 p-4">
            <label className="block text-xs text-muted">
              {x.name}
              <input className="input mt-1" maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="block text-xs text-muted">
              {x.description}
              <textarea className="input mt-1 h-20 py-2" maxLength={500} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <ProtocolFields value={draft.protocol} onChange={(protocol) => setDraft({ ...draft, protocol })} />
            <div className="flex gap-2">
              <button
                className="btn-primary btn-sm"
                disabled={!draft.name.trim()}
                onClick={async () => {
                  if (await run(() => call('gym_program_save', { _gym: g.id, _id: draft.id ?? null, _name: draft.name, _description: draft.description, _protocol: { ...draft.protocol, name: draft.name.trim() } }))) setDraft(null);
                }}
              >
                {x.saveProgram}
              </button>
              <button className="btn-ghost btn-sm" onClick={() => setDraft(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </section>

      {asAdmin && g.managers && (
        <section className="panel space-y-3 p-4">
          <div>
            <h3 className="font-bold">{x.managers}</h3>
            <p className="text-xs text-muted">{x.managersIntro}</p>
          </div>
          {g.managers.length === 0 && <p className="text-sm text-muted">{x.noManagers}</p>}
          {g.managers.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 break-all">{m.email ?? m.user_id}</span>
              <button className="btn-ghost btn-sm text-bad" aria-label="remove" disabled={!m.email} onClick={() => run(() => call('admin_set_gym_manager', { _gym: g.id, _email: m.email, _on: false }))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => call('admin_set_gym_manager', { _gym: g.id, _email: email, _on: true }))) setEmail('');
            }}
          >
            <input type="email" className="input" placeholder={x.email} aria-label={x.email} value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn-primary btn-sm shrink-0" disabled={!email.includes('@')}>
              {x.add}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
