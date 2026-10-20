import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { GROESBEEK, addDays, mondayOf, daysBetween, protocolStep, protocolWeeks, simLoad, todayISO, type Lang, type SimProtocol } from '../engine';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

type K =
  | 'title' | 'intro' | 'default' | 'own' | 'rounds' | 'off' | 'offSub' | 'blocks' | 'blocksSub' | 'weeks' | 'run' | 'station' | 'add' | 'total'
  | 'preview' | 'wk' | 'race' | 'save' | 'saved' | 'name' | 'heavy' | 'dbl' | 'defaultSub' | 'followGym' | 'followGymSub';
const T: Record<Lang, Record<K, string>> = {
  en: {
    followGym: 'Follow my gym', followGymSub: 'Your sims follow your gym’s template; when the gym updates it, your plan follows.',
    title: 'Sim build-up', intro: 'How does your gym build sims towards a race? Pick your gym’s template or set your own; every sim in your plan follows it.',
    default: 'Benchmrk default (by training phase)', defaultSub: 'Sims follow the plan phases (technique → threshold → compromised → full rehearsal).', own: 'My own build-up',
    rounds: 'Rounds', off: 'Outside the build-up', offSub: 'Used when your race is further away than the build-up below.', blocks: 'Build-up towards the race', blocksSub: 'In order; the last block is the week before the race week.',
    weeks: 'Weeks', run: 'Run %', station: 'Stations %', add: 'Add block', total: 'Build-up: {n} weeks', preview: 'Your coming sims', wk: 'wk', race: 'race week',
    save: 'Save sim build-up', saved: 'Saved — your plan follows this build-up', name: 'Name', heavy: 'big sim → lighter week', dbl: 'Doubles: both of you do the station % — together twice that.',
  },
  nl: {
    followGym: 'Volg mijn gym', followGymSub: 'Je sims volgen het sjabloon van je gym; past de gym het aan, dan volgt je schema.',
    title: 'Sim-opbouw', intro: 'Hoe bouwt jouw gym sims op naar een race? Kies het sjabloon van je gym of stel je eigen opbouw in; elke sim in je schema volgt deze opbouw.',
    default: 'Benchmrk-standaard (per trainingsfase)', defaultSub: 'Sims volgen de fases van het schema (techniek → drempel → compromised → generale repetitie).', own: 'Eigen opbouw',
    rounds: 'Rondes', off: 'Buiten de opbouw', offSub: 'Geldt als je race verder weg is dan de opbouw hieronder.', blocks: 'Opbouw naar de race', blocksSub: 'Op volgorde; het laatste blok is de week vóór de raceweek.',
    weeks: 'Weken', run: 'Lopen %', station: 'Stations %', add: 'Blok toevoegen', total: 'Opbouw: {n} weken', preview: 'Je komende sims', wk: 'wk', race: 'raceweek',
    save: 'Sim-opbouw opslaan', saved: 'Opgeslagen — je schema volgt deze opbouw', name: 'Naam', heavy: 'grote sim → lichtere week', dbl: 'Doubles: jullie doen allebei het stationpercentage — samen het dubbele.',
  },
  de: {
    followGym: 'Meinem Gym folgen', followGymSub: 'Deine Sims folgen der Vorlage deines Gyms; ändert das Gym sie, folgt dein Plan.',
    title: 'Sim-Aufbau', intro: 'Wie baut dein Gym Sims zum Rennen auf? Wähle die Vorlage deines Gyms oder lege einen eigenen Aufbau fest; jede Sim im Plan folgt ihm.',
    default: 'Benchmrk-Standard (nach Trainingsphase)', defaultSub: 'Sims folgen den Planphasen (Technik → Schwelle → Compromised → Generalprobe).', own: 'Eigener Aufbau',
    rounds: 'Runden', off: 'Außerhalb des Aufbaus', offSub: 'Gilt, wenn dein Rennen weiter weg ist als der Aufbau unten.', blocks: 'Aufbau zum Rennen', blocksSub: 'In Reihenfolge; der letzte Block ist die Woche vor der Rennwoche.',
    weeks: 'Wochen', run: 'Laufen %', station: 'Stationen %', add: 'Block hinzufügen', total: 'Aufbau: {n} Wochen', preview: 'Deine nächsten Sims', wk: 'KW', race: 'Rennwoche',
    save: 'Sim-Aufbau speichern', saved: 'Gespeichert — dein Plan folgt diesem Aufbau', name: 'Name', heavy: 'große Sim → leichtere Woche', dbl: 'Doubles: ihr macht beide den Stations-% — zusammen das Doppelte.',
  },
  es: {
    followGym: 'Seguir a mi gimnasio', followGymSub: 'Tus sims siguen la plantilla de tu gimnasio; si la cambian, tu plan también.',
    title: 'Progresión de sims', intro: '¿Cómo progresa tu gimnasio los sims hacia una carrera? Elige la plantilla de tu gimnasio o define la tuya; cada sim del plan la sigue.',
    default: 'Estándar Benchmrk (por fase)', defaultSub: 'Los sims siguen las fases del plan (técnica → umbral → compromised → ensayo general).', own: 'Mi propia progresión',
    rounds: 'Rondas', off: 'Fuera de la progresión', offSub: 'Se usa si tu carrera está más lejos que la progresión de abajo.', blocks: 'Progresión hacia la carrera', blocksSub: 'En orden; el último bloque es la semana antes de la semana de carrera.',
    weeks: 'Semanas', run: 'Carrera %', station: 'Estaciones %', add: 'Añadir bloque', total: 'Progresión: {n} semanas', preview: 'Tus próximos sims', wk: 'sem', race: 'semana de carrera',
    save: 'Guardar progresión', saved: 'Guardado — tu plan sigue esta progresión', name: 'Nombre', heavy: 'sim grande → semana más ligera', dbl: 'Dobles: los dos hacéis el % de estación — juntos el doble.',
  },
  ko: {
    followGym: '체육관 따르기', followGymSub: '시뮬이 체육관 템플릿을 따르며, 체육관이 수정하면 플랜도 따라갑니다.',
    title: '시뮬 빌드업', intro: '체육관에서 레이스까지 시뮬을 어떻게 늘리나요? 체육관 템플릿을 고르거나 직접 설정하세요. 플랜의 모든 시뮬이 이를 따릅니다.',
    default: 'Benchmrk 기본 (훈련 단계별)', defaultSub: '시뮬이 플랜 단계를 따릅니다 (기술 → 역치 → 컴프로마이즈드 → 리허설).', own: '나만의 빌드업',
    rounds: '라운드', off: '빌드업 이전', offSub: '레이스가 아래 빌드업보다 멀 때 적용.', blocks: '레이스까지 빌드업', blocksSub: '순서대로; 마지막 블록은 레이스 주 바로 전 주.',
    weeks: '주', run: '러닝 %', station: '스테이션 %', add: '블록 추가', total: '빌드업: {n}주', preview: '다가오는 시뮬', wk: '주', race: '레이스 주',
    save: '시뮬 빌드업 저장', saved: '저장됨 — 플랜이 이 빌드업을 따릅니다', name: '이름', heavy: '큰 시뮬 → 가벼운 주', dbl: '더블스: 둘 다 스테이션 %를 수행 — 합치면 두 배.',
  },
};
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

export function useSimTemplates() {
  return useQuery({
    queryKey: ['simTemplates'],
    queryFn: async () => (await supabase.from('sim_protocols').select('id, name, description, protocol').order('name')).data ?? [],
  });
}

/** Edits a protocol (used by athletes in Settings and by admins for gym templates). */
export function ProtocolFields({ value, onChange, raceDate, showName = false }: { value: SimProtocol; onChange: (p: SimProtocol) => void; raceDate?: string | null; showName?: boolean }) {
  const { lang } = useI18n();
  const x = T[lang] ?? T.en;
  const v = value;
  const num = (n: string, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
  const setBlock = (i: number, b: Partial<SimProtocol['blocks'][number]>) => onChange({ ...v, blocks: v.blocks.map((x, k) => (k === i ? { ...x, ...b } : x)) });
  const move = (i: number, d: number) => {
    const b = [...v.blocks];
    const j = i + d;
    if (j < 0 || j >= b.length) return;
    [b[i], b[j]] = [b[j], b[i]];
    onChange({ ...v, blocks: b });
  };
  const today = todayISO();
  const raceWeek = raceDate ? mondayOf(raceDate) : null;
  const preview = raceWeek
    ? Array.from({ length: Math.min(16, Math.max(0, Math.floor(daysBetween(mondayOf(today), raceWeek) / 7) + 1)) }, (_, i) => {
        const wk = addDays(mondayOf(today), i * 7);
        const left = Math.round(daysBetween(wk, raceWeek) / 7);
        return { wk, left, step: protocolStep(v, left) };
      })
    : [];
  return (
    <div className="space-y-4">
      {showName && (
        <label className="block text-xs text-muted">
          {x.name}
          <input className="input mt-1" value={v.name} onChange={(e) => onChange({ ...v, name: e.target.value })} />
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted">
          {x.rounds}
          <input type="number" min={1} max={8} className="input mt-1" value={v.rounds} onChange={(e) => onChange({ ...v, rounds: num(e.target.value, 1, 8) })} />
        </label>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted">{x.off}</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              {x.run}
              <input type="number" min={10} max={200} step={5} className="input mt-1" value={v.offSeason.run} onChange={(e) => onChange({ ...v, offSeason: { ...v.offSeason, run: num(e.target.value, 10, 200) } })} />
            </label>
            <label className="text-xs text-muted">
              {x.station}
              <input type="number" min={10} max={200} step={5} className="input mt-1" value={v.offSeason.station} onChange={(e) => onChange({ ...v, offSeason: { ...v.offSeason, station: num(e.target.value, 10, 200) } })} />
            </label>
          </div>
          <p className="mt-1 text-[11px] text-muted">{x.offSub}</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">{x.blocks}</p>
        <p className="text-[11px] text-muted">{x.blocksSub}</p>
        <div className="mt-2 space-y-2">
          {v.blocks.map((b, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-end gap-2 rounded-lg border border-line p-2">
              <span className="pb-2 text-xs text-muted">{i + 1}</span>
              <label className="text-[11px] text-muted">
                {x.weeks}
                <input type="number" min={1} max={12} className="input mt-1 h-9" value={b.weeks} onChange={(e) => setBlock(i, { weeks: num(e.target.value, 1, 12) })} />
              </label>
              <label className="text-[11px] text-muted">
                {x.run}
                <input type="number" min={10} max={200} step={5} className="input mt-1 h-9" value={b.run} onChange={(e) => setBlock(i, { run: num(e.target.value, 10, 200) })} />
              </label>
              <label className="text-[11px] text-muted">
                {x.station}
                <input type="number" min={10} max={200} step={5} className="input mt-1 h-9" value={b.station} onChange={(e) => setBlock(i, { station: num(e.target.value, 10, 200) })} />
              </label>
              <div className="flex gap-1 pb-1">
                <button type="button" className="rounded p-1 text-muted hover:text-fg" aria-label="up" onClick={() => move(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" className="rounded p-1 text-muted hover:text-fg" aria-label="down" onClick={() => move(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" className="rounded p-1 text-bad" aria-label="remove" onClick={() => onChange({ ...v, blocks: v.blocks.filter((_, k) => k !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button type="button" className="btn-ghost btn-sm" onClick={() => onChange({ ...v, blocks: [...v.blocks, { weeks: 1, run: 100, station: 100 }] })}>
            <Plus className="h-4 w-4" /> {x.add}
          </button>
          <span className="text-xs text-muted">{fill(x.total, { n: protocolWeeks(v) })}</span>
        </div>
      </div>
      {preview.length > 0 && (
        <div>
          <p className="text-sm font-semibold">{x.preview}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {preview.map((p) => (
              <span key={p.wk} className={clsx('rounded-md border px-2 py-1 text-[11px]', p.left === 0 ? 'border-volt text-volt' : simLoad(p.step) >= 1 ? 'border-warn/60 text-warn' : p.step.inBuild ? 'border-sky/50 text-sky' : 'border-line text-muted')} title={simLoad(p.step) >= 1 ? x.heavy : undefined}>
                {p.wk.slice(8)}/{p.wk.slice(5, 7)} · {p.left === 0 ? x.race : `${p.step.run}/${p.step.station}`}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">{x.dbl}</p>
        </div>
      )}
    </div>
  );
}

/** Athlete settings: choose default / gym template / own build-up. */
export function SimProtocolEditor({ current, raceDate, onSave, gymName }: { current: SimProtocol | null | undefined; raceDate?: string | null; onSave: (p: SimProtocol | null) => Promise<void>; gymName?: string | null }) {
  const { lang } = useI18n();
  const x = T[lang] ?? T.en;
  const tpl = useSimTemplates();
  const [p, setP] = useState<SimProtocol | null>(current ?? null);
  const [mode, setMode] = useState<string>(current ? 'custom' : 'default');
  const choose = (m: string) => {
    setMode(m);
    if (m === 'default') setP(null);
    else if (m === 'gym') setP(null);
    else if (m === 'own') setP({ ...(p ?? GROESBEEK), name: x.own });
    else {
      const t = (tpl.data ?? []).find((r) => r.id === m);
      if (t) setP(t.protocol as SimProtocol);
    }
  };
  return (
    <div className="space-y-3 border-t border-line pt-5">
      <p className="font-semibold">{x.title}</p>
      <p className="text-xs text-muted">{x.intro}</p>
      <select className="input" value={mode} onChange={(e) => choose(e.target.value)} aria-label={x.title}>
        <option value="default">{gymName ? `${x.followGym} (${gymName})` : x.default}</option>
        {(tpl.data ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
        <option value="own">{x.own}</option>
        {mode === 'custom' && p && <option value="custom">{p.name}</option>}
      </select>
      {mode !== 'default' && mode !== 'own' && mode !== 'custom' && (
        <p className="text-xs text-muted">{(tpl.data ?? []).find((t) => t.id === mode)?.description}</p>
      )}
      {!p && <p className="text-xs text-muted">{gymName ? x.followGymSub : x.defaultSub}</p>}
      {p && <ProtocolFields value={p} onChange={setP} raceDate={raceDate} />}
      <button
        className="btn-primary"
        onClick={async () => {
          await onSave(p);
          toast.success(x.saved);
        }}
      >
        {x.save}
      </button>
    </div>
  );
}
