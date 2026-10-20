import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTeam } from '../data/hooks';
import type { I18nKey } from '../lib/i18n';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { allRaces, chanceTone, daysBetween, fmtHms, isDoubles, parseRaceTime, raceModel, todayISO, type Category, type Lang, type Profile, type RaceEvent, type RacePriority } from '../engine';
import { useMutations } from '../data/hooks';
import type { ProfileRow } from '../data/mapping';
import { useI18n } from '../lib/i18n';
import { TimeInput } from './ui';

type K = 'joinAny' | 'div' | 'partner' | 'mk' | 'join' | 'codePh' | 'leave' | 'waiting' | 'with_' | 'saveFirst' | 'linked' | 'def_' | 'hint' | 'title' | 'intro' | 'main' | 'add' | 'name' | 'date' | 'goal' | 'prio' | 'A' | 'B' | 'C' | 'Ad' | 'Bd' | 'Cd' | 'save' | 'saved' | 'none' | 'manage' | 'days' | 'fc' | 'err' | 'card';
const T: Record<Lang, Record<K, string>> = {
  en: {
    joinAny: "Got a team code from a partner? Join their race directly:",
    div: "Division", partner: "Doubles partner for this race", mk: "Create team code", join: "Join", codePh: "ROX-ABC", leave: "Unlink partner", waiting: "Share this code with your partner. Waiting for them to join…", with_: "Racing with {name}", saveFirst: "Saving the race first…", linked: "Partner linked", def_: "same as main race", hint: "Each race can have its own division and partner. The plan prepares you: a doubles race gets a partner sim the weeks before, a Pro race gets Pro weights in strength.",
    title: 'Your season', intro: 'Add the other races you plan. The plan looks ahead: it builds towards every A race, adds a recovery week after it, and fits B and C races in with a mini-taper.',
    main: 'Main race (edit under Profile)', add: 'Add race', name: 'Race', date: 'Date', goal: 'Goal (optional)', prio: 'Priority',
    A: 'A · goal race', B: 'B · important', C: 'C · training race',
    Ad: 'Full build-up and taper; forecast and countdown switch to it once the race before is done.', Bd: 'Mini-taper of 2–3 days, recovery after; the build continues.', Cd: 'Counts as the hard sim of that week; no taper.',
    save: 'Save races', saved: 'Season saved — plan updated', none: 'No other races yet.', manage: 'Manage races', days: 'days', fc: 'forecast', err: 'Add a name and a future date.', card: 'Season',
  },
  nl: {
    joinAny: "Teamcode van een partner gekregen? Doe direct mee aan diens race:",
    div: "Divisie", partner: "Doubles-partner voor deze race", mk: "Teamcode maken", join: "Meedoen", codePh: "ROX-ABC", leave: "Partner ontkoppelen", waiting: "Deel deze code met je partner. Wachten tot die meedoet…", with_: "Je racet met {name}", saveFirst: "Race eerst opslaan…", linked: "Partner gekoppeld", def_: "zelfde als hoofdrace", hint: "Elke race kan een eigen divisie en partner hebben. Het schema bereidt je voor: voor een doubles-race doe je de weken ervoor een partner-sim, voor een Pro-race krachttraining met Pro-gewichten.",
    title: 'Je seizoen', intro: 'Voeg de andere races toe die je plant. Het schema kijkt vooruit: het bouwt op naar elke A-race, plant daarna een herstelweek en past B- en C-races in met een mini-taper.',
    main: 'Hoofdrace (aanpassen onder Profiel)', add: 'Race toevoegen', name: 'Race', date: 'Datum', goal: 'Doel (optioneel)', prio: 'Prioriteit',
    A: 'A · doelrace', B: 'B · belangrijk', C: 'C · trainingsrace',
    Ad: 'Volledige opbouw en taper; voorspelling en aftellen schakelen hierheen zodra de race ervoor voorbij is.', Bd: 'Mini-taper van 2–3 dagen, herstel erna; de opbouw loopt door.', Cd: 'Telt als de zware sim van die week; geen taper.',
    save: 'Races opslaan', saved: 'Seizoen opgeslagen — schema bijgewerkt', none: 'Nog geen andere races.', manage: 'Races beheren', days: 'dagen', fc: 'voorspelling', err: 'Vul een naam en een datum in de toekomst in.', card: 'Seizoen',
  },
  de: {
    joinAny: "Teamcode von einem Partner? Tritt dem Rennen direkt bei:",
    div: "Division", partner: "Doubles-Partner für dieses Rennen", mk: "Teamcode erstellen", join: "Beitreten", codePh: "ROX-ABC", leave: "Partner trennen", waiting: "Teile diesen Code mit deinem Partner. Warten auf Beitritt…", with_: "Du startest mit {name}", saveFirst: "Rennen wird zuerst gespeichert…", linked: "Partner verknüpft", def_: "wie Hauptrennen", hint: "Jedes Rennen kann eine eigene Division und einen eigenen Partner haben. Der Plan bereitet dich vor: Partner-Sim vor einem Doubles-Rennen, Pro-Gewichte vor einem Pro-Rennen.",
    title: 'Deine Saison', intro: 'Füge weitere geplante Rennen hinzu. Der Plan schaut voraus: Aufbau zu jedem A-Rennen, danach eine Erholungswoche, B- und C-Rennen mit Mini-Taper eingebaut.',
    main: 'Hauptrennen (unter Profil ändern)', add: 'Rennen hinzufügen', name: 'Rennen', date: 'Datum', goal: 'Ziel (optional)', prio: 'Priorität',
    A: 'A · Zielrennen', B: 'B · wichtig', C: 'C · Trainingsrennen',
    Ad: 'Voller Aufbau und Taper; Prognose und Countdown wechseln, sobald das Rennen davor vorbei ist.', Bd: 'Mini-Taper von 2–3 Tagen, danach Erholung; der Aufbau läuft weiter.', Cd: 'Zählt als harte Sim der Woche; kein Taper.',
    save: 'Rennen speichern', saved: 'Saison gespeichert — Plan aktualisiert', none: 'Noch keine weiteren Rennen.', manage: 'Rennen verwalten', days: 'Tage', fc: 'Prognose', err: 'Name und ein Datum in der Zukunft angeben.', card: 'Saison',
  },
  es: {
    joinAny: "¿Tienes un código de una pareja? Únete directamente a su carrera:",
    div: "División", partner: "Pareja de dobles para esta carrera", mk: "Crear código de equipo", join: "Unirse", codePh: "ROX-ABC", leave: "Desvincular pareja", waiting: "Comparte este código con tu pareja. Esperando a que se una…", with_: "Corres con {name}", saveFirst: "Guardando la carrera primero…", linked: "Pareja vinculada", def_: "igual que la principal", hint: "Cada carrera puede tener su propia división y pareja. El plan te prepara: sim en pareja antes de una carrera de dobles, pesos Pro antes de una carrera Pro.",
    title: 'Tu temporada', intro: 'Añade las otras carreras que planeas. El plan mira hacia delante: construye hacia cada carrera A, añade una semana de recuperación y encaja las B y C con un mini-taper.',
    main: 'Carrera principal (editar en Perfil)', add: 'Añadir carrera', name: 'Carrera', date: 'Fecha', goal: 'Objetivo (opcional)', prio: 'Prioridad',
    A: 'A · objetivo', B: 'B · importante', C: 'C · de entrenamiento',
    Ad: 'Bloque completo y taper; la previsión y la cuenta atrás pasan a ella al terminar la anterior.', Bd: 'Mini-taper de 2–3 días y recuperación; el bloque continúa.', Cd: 'Cuenta como el sim duro de esa semana; sin taper.',
    save: 'Guardar carreras', saved: 'Temporada guardada — plan actualizado', none: 'Aún no hay otras carreras.', manage: 'Gestionar carreras', days: 'días', fc: 'previsión', err: 'Añade un nombre y una fecha futura.', card: 'Temporada',
  },
  ko: {
    joinAny: "파트너에게 팀 코드를 받았나요? 바로 그 레이스에 참여하세요:",
    div: "디비전", partner: "이 레이스의 더블스 파트너", mk: "팀 코드 만들기", join: "참여", codePh: "ROX-ABC", leave: "파트너 연결 해제", waiting: "파트너에게 이 코드를 공유하세요. 참여를 기다리는 중…", with_: "{name}와 함께 레이스", saveFirst: "먼저 레이스를 저장하는 중…", linked: "파트너 연결됨", def_: "메인 레이스와 동일", hint: "레이스마다 디비전과 파트너를 따로 정할 수 있어요. 더블스 레이스 전에는 파트너 시뮬, 프로 레이스 전에는 프로 무게로 근력 훈련을 해요.",
    title: '시즌', intro: '계획 중인 다른 레이스를 추가하세요. 플랜은 각 A 레이스를 향해 빌드하고, 이후 회복 주를 넣으며, B·C 레이스는 미니 테이퍼로 끼워 넣습니다.',
    main: '메인 레이스 (프로필에서 수정)', add: '레이스 추가', name: '레이스', date: '날짜', goal: '목표 (선택)', prio: '우선순위',
    A: 'A · 목표 레이스', B: 'B · 중요', C: 'C · 훈련 레이스',
    Ad: '전체 빌드업과 테이퍼; 이전 레이스가 끝나면 예측과 카운트다운이 이 레이스로 바뀝니다.', Bd: '2–3일 미니 테이퍼, 이후 회복; 빌드는 계속됩니다.', Cd: '그 주의 고강도 시뮬로 계산; 테이퍼 없음.',
    save: '레이스 저장', saved: '시즌 저장됨 — 플랜 업데이트', none: '아직 다른 레이스가 없습니다.', manage: '레이스 관리', days: '일', fc: '예측', err: '이름과 미래 날짜를 입력하세요.', card: '시즌',
  },
};
const PRIO: RacePriority[] = ['A', 'B', 'C'];
const CATS: Category[] = ['solo_open', 'solo_pro', 'doubles_open', 'doubles_pro', 'doubles_mixed', 'relay_open'];
const PCLS: Record<RacePriority, string> = { A: 'bg-volt/15 text-volt', B: 'bg-sky/15 text-sky', C: 'bg-panel2 text-muted' };

export function RaceEditor({ row }: { row: ProfileRow }) {
  const { lang, t } = useI18n();
  const x = T[lang] ?? T.en;
  const { updateProfile } = useMutations();
  const [races, setRaces] = useState<RaceEvent[]>(() => (Array.isArray(row.season) ? row.season : []));
  const today = todayISO();
  const upd = (i: number, p: Partial<RaceEvent>) => setRaces(races.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const persist = async () => {
    if (races.some((r) => !r.name.trim() || !r.date || r.date <= today)) {
      toast.error(x.err);
      return false;
    }
    await updateProfile({ season: [...races].sort((a, b) => a.date.localeCompare(b.date)) });
    return true;
  };
  const save = async () => {
    if (await persist()) toast.success(x.saved);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{x.intro}</p>
      <div className="rounded-lg border border-volt/40 bg-volt/5 p-3 text-sm">
        <span className={clsx('chip mr-2', PCLS.A)}>A</span>
        <span className="font-semibold">{row.race_name}</span> · {row.race_date} {row.goal_sec ? `· ${fmtHms(row.goal_sec)}` : ''}
        {row.category && <span className="ml-2 text-xs text-muted">· {t(`cat.${row.category}` as I18nKey)}</span>}
        <span className="ml-2 text-xs text-muted">({x.main})</span>
      </div>
      <p className="text-xs text-muted">{x.hint}</p>
      {races.length === 0 && <p className="text-sm text-muted">{x.none}</p>}
      {races.map((r, i) => (
        <div key={r.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="text-xs text-muted">
            {x.name}
            <input className="input mt-1" value={r.name} placeholder="HYROX Rotterdam" onChange={(e) => upd(i, { name: e.target.value })} />
          </label>
          <label className="text-xs text-muted">
            {x.date}
            <input type="date" className="input mt-1" min={today} value={r.date} onChange={(e) => upd(i, { date: e.target.value })} />
          </label>
          <label className="text-xs text-muted">
            {x.goal}
            <TimeInput className="mt-1" value={r.goalSec} parse={parseRaceTime} format={fmtHms} placeholder="1:25:00" onChange={(v) => upd(i, { goalSec: v })} />
          </label>
          <button className="btn-ghost self-end text-bad" aria-label={`${r.name} ×`} onClick={() => setRaces(races.filter((_, k) => k !== i))}>
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="sm:col-span-4">
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={x.prio}>
              {PRIO.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={r.priority === p} onClick={() => upd(i, { priority: p })} className={clsx('rounded-md border px-2.5 py-1 text-xs', r.priority === p ? 'border-volt bg-volt/10 text-volt' : 'border-line text-muted hover:text-fg')}>
                  {x[p]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">{x[`${r.priority}d` as K]}</p>
          </div>
          <label className="text-xs text-muted sm:col-span-2">
            {x.div}
            <select className="input mt-1" value={r.category ?? ''} disabled={!!r.teamId} onChange={(e) => upd(i, { category: (e.target.value || undefined) as Category | undefined })}>
              <option value="">{x.def_} ({row.category ? t(`cat.${row.category}` as I18nKey) : '–'})</option>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {t(`cat.${c}` as I18nKey)}
                </option>
              ))}
            </select>
          </label>
          {isDoubles(r.category ?? (row.category as Category) ?? 'solo_open') && (
            <div className="sm:col-span-4">
              <RaceTeam race={r} x={x} persist={persist} />
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => setRaces([...races, { id: crypto.randomUUID(), name: '', date: '', goalSec: null, priority: 'B' }])}>
          <Plus className="h-4 w-4" /> {x.add}
        </button>
        <button className="btn-primary" onClick={save}>
          {x.save}
        </button>
      </div>
      <JoinByCode x={x} />
    </div>
  );
}

function JoinByCode({ x }: { x: Record<K, string> }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="rounded-lg border border-dashed border-line p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.rpc('join_race_team', { _code: code });
        setBusy(false);
        if (error) {
          const m = String((error as { message?: string }).message ?? '');
          const k = ['team_not_found', 'team_full', 'already_in_team'].find((y) => m.includes(y));
          return toast.error(k ? t(`db.err.${k}` as I18nKey) : t('common.error'));
        }
        toast.success(x.linked);
        setCode('');
        ['profile', 'team', 'partner'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      }}
    >
      <p className="mb-2 text-xs text-muted">{x.joinAny}</p>
      <div className="flex gap-2">
        <input className="input stat w-36 uppercase tracking-widest" placeholder={x.codePh} value={code} onChange={(e) => setCode(e.target.value)} aria-label={t('db.code')} />
        <button className="btn-ghost shrink-0" disabled={busy || code.replace(/[^A-Za-z0-9]/g, '').length < 6}>
          {x.join}
        </button>
      </div>
    </form>
  );
}

/** Link a doubles partner to one season race: create a code, join one, or unlink. */
function RaceTeam({ race, x, persist }: { race: RaceEvent; x: Record<K, string>; persist: () => Promise<boolean> }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { team, partner } = useTeam(race.teamId ?? null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = () => ['profile', 'team', 'partner'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const err = (e: unknown) => {
    const m = String((e as { message?: string })?.message ?? '');
    const k = ['team_not_found', 'team_full', 'already_in_team'].find((y) => m.includes(y));
    toast.error(k ? t(`db.err.${k}` as I18nKey) : t('common.error'));
  };
  const run = async (fn: () => PromiseLike<{ error: unknown }>, ok?: string) => {
    setBusy(true);
    try {
      if (!(await persist())) return;
      const { error } = await fn();
      if (error) return err(error);
      if (ok) toast.success(ok);
      refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-lg bg-panel2 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Users className="h-3.5 w-3.5 text-sky" /> {x.partner}
      </p>
      {race.teamId && team ? (
        <div className="mt-2 space-y-2 text-sm">
          {partner ? (
            <p className="text-good">{x.with_.replace('{name}', partner.display_name || '—')}</p>
          ) : (
            <>
              <span className="stat rounded-md bg-panel px-2 py-1 font-semibold tracking-widest text-volt">{team.code}</span>
              <p className="text-xs text-muted">{x.waiting}</p>
            </>
          )}
          <button type="button" className="text-xs text-muted underline hover:text-bad" disabled={busy} onClick={() => run(() => supabase.rpc('leave_race_team', { _team_id: race.teamId }))}>
            {x.leave}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy}
            onClick={() =>
              run(() =>
                supabase.rpc('create_race_team', { _race_id: race.id, _race_name: race.name, _race_date: race.date, _goal_sec: race.goalSec, _category: race.category ?? 'doubles_open' }),
              )
            }
          >
            {x.mk}
          </button>
          <input className="input stat w-32 uppercase tracking-widest" placeholder={x.codePh} value={code} onChange={(e) => setCode(e.target.value)} aria-label={t('db.code')} />
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy || code.replace(/[^A-Za-z0-9]/g, '').length < 6}
            onClick={() => run(() => supabase.rpc('join_race_team', { _code: code, _race_id: race.id }), x.linked)}
          >
            {x.join}
          </button>
        </div>
      )}
    </div>
  );
}

/** Cockpit overview of all upcoming races with countdown and forecast. */
export function SeasonCard({ profile, today }: { profile: Profile; today: string }) {
  const { lang, t } = useI18n();
  const x = T[lang] ?? T.en;
  const races = allRaces(profile).filter((r) => r.date >= today);
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-5 w-5 text-volt" aria-hidden />
        <p className="font-semibold">{x.card}</p>
        <Link to="/settings?tab=races" className="ml-auto text-xs text-volt underline">
          {races.length > 1 ? x.manage : x.add}
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {races.map((r) => {
          const m = raceModel({ ...profile, raceDate: r.date, raceName: r.name, goalSec: r.goalSec ?? profile.goalSec, category: r.category ?? profile.category }, today);
          return (
            <li key={r.date} className="flex flex-wrap items-center gap-2 text-sm">
              <span className={clsx('chip', PCLS[r.priority])}>{r.priority}</span>
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-muted">{r.date} · {daysBetween(today, r.date)} {x.days}</span>
              {r.category && r.category !== profile.category && <span className="chip bg-sky/15 text-sky">{t(`cat.${r.category}` as I18nKey)}</span>}
              {r.teamId && <Users className="h-3.5 w-3.5 text-sky" aria-label={x.partner} />}
              <span className="stat ml-auto text-xs">
                {x.fc} {fmtHms(m.projected.finishSec)}
                {r.goalSec ? <span className="text-muted"> / {fmtHms(r.goalSec)}</span> : null}
                {r.goalSec ? <span className={clsx('ml-2 font-semibold', chanceTone(m.chance))}>{m.chance}%</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
