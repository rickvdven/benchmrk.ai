import { useState } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { ITEM_GROUPS, PRESET, itemLabel, type Item, type Lang, type Place, type PlaceKind } from '../engine';
import { useMutations } from '../data/hooks';
import type { ProfileRow } from '../data/mapping';
import { useI18n, type I18nKey } from '../lib/i18n';

type K = 'title' | 'intro' | 'name' | 'kind' | 'add' | 'maxKg' | 'days' | 'none' | 'save' | 'saved' | 'hyrox' | 'gym' | 'home' | 'outdoor' | 'cardio' | 'stations' | 'strength' | 'recovery' | 'draft' | 'pick' | 'pickHelp' | 'def';
const T: Record<Lang, Record<K, string>> = {
  en: {
    title: 'My places', intro: 'Where do you train, and what is there? The plan keeps the goal of each session but adapts the exercises to the place. Several gyms or a home gym are fine.',
    name: 'Name', kind: 'Type', add: 'Add place', maxKg: 'Heaviest dumbbell / kettlebell (kg)', days: 'Default place per day', none: '—', save: 'Save places', saved: 'Places saved — plan updated',
    hyrox: 'HYROX gym', gym: 'Regular gym', home: 'Home', outdoor: 'Outdoors', cardio: 'Running & cardio', stations: 'HYROX stations', strength: 'Strength', recovery: 'Recovery', draft: 'Suggestion based on your settings – adjust and save.',
    pick: 'Where do you train?', pickHelp: 'Same goal, exercises adapted to what is there.', def: 'default',
  },
  nl: {
    title: 'Mijn plekken', intro: 'Waar train je en wat is er? Het schema houdt het doel van elke training vast, maar past de oefeningen aan op de plek. Meerdere gyms of een thuisgym kan prima.',
    name: 'Naam', kind: 'Soort', add: 'Plek toevoegen', maxKg: 'Zwaarste dumbbell / kettlebell (kg)', days: 'Standaardplek per dag', none: '—', save: 'Plekken opslaan', saved: 'Plekken opgeslagen — schema bijgewerkt',
    hyrox: 'HYROX-gym', gym: 'Gewone gym', home: 'Thuis', outdoor: 'Buiten', cardio: 'Lopen & cardio', stations: 'HYROX-stations', strength: 'Kracht', recovery: 'Herstel', draft: 'Voorstel op basis van je instellingen – pas aan en sla op.',
    pick: 'Waar train je?', pickHelp: 'Zelfde doel, oefeningen aangepast aan wat er is.', def: 'standaard',
  },
  de: {
    title: 'Meine Orte', intro: 'Wo trainierst du und was gibt es dort? Der Plan behält das Ziel jeder Einheit bei, passt aber die Übungen an den Ort an.',
    name: 'Name', kind: 'Art', add: 'Ort hinzufügen', maxKg: 'Schwerste Kurzhantel / Kettlebell (kg)', days: 'Standardort pro Tag', none: '—', save: 'Orte speichern', saved: 'Orte gespeichert — Plan aktualisiert',
    hyrox: 'HYROX-Gym', gym: 'Normales Gym', home: 'Zuhause', outdoor: 'Draußen', cardio: 'Laufen & Cardio', stations: 'HYROX-Stationen', strength: 'Kraft', recovery: 'Erholung', draft: 'Vorschlag aus deinen Einstellungen – anpassen und speichern.',
    pick: 'Wo trainierst du?', pickHelp: 'Gleiches Ziel, Übungen passend zum Ort.', def: 'Standard',
  },
  es: {
    title: 'Mis lugares', intro: '¿Dónde entrenas y qué hay? El plan mantiene el objetivo de cada sesión pero adapta los ejercicios al lugar.',
    name: 'Nombre', kind: 'Tipo', add: 'Añadir lugar', maxKg: 'Mancuerna / kettlebell más pesada (kg)', days: 'Lugar por defecto por día', none: '—', save: 'Guardar lugares', saved: 'Lugares guardados — plan actualizado',
    hyrox: 'Gimnasio HYROX', gym: 'Gimnasio normal', home: 'Casa', outdoor: 'Aire libre', cardio: 'Correr y cardio', stations: 'Estaciones HYROX', strength: 'Fuerza', recovery: 'Recuperación', draft: 'Sugerencia según tus ajustes – ajusta y guarda.',
    pick: '¿Dónde entrenas?', pickHelp: 'Mismo objetivo, ejercicios adaptados a lo que hay.', def: 'por defecto',
  },
  ko: {
    title: '내 운동 장소', intro: '어디서 운동하고 무엇이 있나요? 플랜은 각 세션의 목표를 유지하고 장소에 맞게 운동을 조정해요.',
    name: '이름', kind: '종류', add: '장소 추가', maxKg: '가장 무거운 덤벨 / 케틀벨 (kg)', days: '요일별 기본 장소', none: '—', save: '장소 저장', saved: '장소 저장됨 — 플랜 업데이트',
    hyrox: 'HYROX 짐', gym: '일반 짐', home: '집', outdoor: '야외', cardio: '러닝 & 유산소', stations: 'HYROX 스테이션', strength: '근력', recovery: '회복', draft: '설정에 따른 제안 – 수정 후 저장하세요.',
    pick: '어디서 운동하나요?', pickHelp: '같은 목표, 장소에 맞춘 운동.', def: '기본',
  },
};
const KINDS: PlaceKind[] = ['hyrox', 'gym', 'home', 'outdoor'];
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()));

/** First-time suggestion from the old single equipment setting. */
function suggest(row: ProfileRow, x: Record<K, string>): { places: Place[]; byDow: (string | null)[] } {
  const gymKind: PlaceKind = row.equipment === 'hyrox' ? 'hyrox' : row.equipment === 'home' ? 'home' : 'gym';
  const gym: Place = { id: newId(), name: gymKind === 'home' ? x.home : x[gymKind], kind: gymKind, items: [...PRESET[gymKind]] };
  const home: Place = { id: newId(), name: x.home, kind: 'home', items: [...PRESET.home] };
  const places = gymKind === 'home' ? [gym] : [gym, home];
  return { places, byDow: Array(7).fill(gym.id) };
}

export function PlacesEditor({ row }: { row: ProfileRow }) {
  const { lang, t } = useI18n();
  const x = T[lang] ?? T.en;
  const { updateProfile } = useMutations();
  const fresh = !row.places?.length;
  const [init] = useState(() => (fresh ? suggest(row, x) : { places: row.places!, byDow: row.place_by_dow ?? [] }));
  const [places, setPlaces] = useState<Place[]>(init.places);
  const [byDow, setByDow] = useState<(string | null)[]>(() => Array.from({ length: 7 }, (_, i) => init.byDow[i] ?? null));
  const upd = (i: number, p: Partial<Place>) => setPlaces(places.map((pl, k) => (k === i ? { ...pl, ...p } : pl)));
  const toggle = (i: number, item: Item) => {
    const cur = places[i].items;
    upd(i, { items: cur.includes(item) ? cur.filter((y) => y !== item) : [...cur, item] });
  };
  const save = async () => {
    const clean = places.filter((p) => p.name.trim()).map((p) => ({ ...p, name: p.name.trim() }));
    const ids = new Set(clean.map((p) => p.id));
    await updateProfile({ places: clean, place_by_dow: byDow.map((d) => (d && ids.has(d) ? d : null)) });
    toast.success(x.saved);
  };
  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <MapPin className="h-4 w-4 text-volt" /> {x.title}
        </h3>
        <p className="mt-1 text-sm text-muted">{x.intro}</p>
        {fresh && <p className="mt-1 text-xs text-sky">{x.draft}</p>}
      </div>
      {places.map((pl, i) => (
        <div key={pl.id} className="space-y-3 rounded-lg border border-line p-3">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <label className="text-xs text-muted">
              {x.name}
              <input className="input mt-1" value={pl.name} onChange={(e) => upd(i, { name: e.target.value })} />
            </label>
            <label className="text-xs text-muted">
              {x.kind}
              <select
                className="input mt-1"
                value={pl.kind}
                onChange={(e) => {
                  const k = e.target.value as PlaceKind;
                  const wasPreset = pl.items.length === 0 || PRESET[pl.kind].every((it) => pl.items.includes(it));
                  upd(i, { kind: k, items: wasPreset ? [...PRESET[k]] : pl.items });
                }}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {x[k]}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-ghost self-end text-bad" aria-label={`${pl.name} ×`} onClick={() => setPlaces(places.filter((_, k) => k !== i))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {(Object.keys(ITEM_GROUPS) as (keyof typeof ITEM_GROUPS)[]).map((g) => (
            <div key={g}>
              <p className="mb-1 text-xs font-semibold text-muted">{x[g]}</p>
              <div className="flex flex-wrap gap-1.5">
                {ITEM_GROUPS[g].map((it) => (
                  <button
                    key={it}
                    type="button"
                    aria-pressed={pl.items.includes(it)}
                    onClick={() => toggle(i, it)}
                    className={clsx('rounded-md border px-2 py-1 text-xs', pl.items.includes(it) ? 'border-volt bg-volt/10 text-volt' : 'border-line text-muted hover:text-fg')}
                  >
                    {itemLabel(lang, it)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {(pl.items.includes('dumbbells') || pl.items.includes('kettlebells')) && (
            <label className="block max-w-[16rem] text-xs text-muted">
              {x.maxKg}
              <input className="input mt-1" inputMode="numeric" value={pl.maxKg ?? ''} onChange={(e) => upd(i, { maxKg: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, '')) || null : null })} />
            </label>
          )}
        </div>
      ))}
      <button className="btn-ghost" onClick={() => setPlaces([...places, { id: newId(), name: '', kind: 'home', items: [...PRESET.home] }])}>
        <Plus className="h-4 w-4" /> {x.add}
      </button>
      <div>
        <p className="mb-2 text-sm font-semibold">{x.days}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {byDow.map((v, d) => (
            <label key={d} className="text-xs text-muted">
              {t(`dow.${d}` as I18nKey)}
              <select className="input mt-1 py-1.5 text-sm" value={v ?? ''} onChange={(e) => setByDow(byDow.map((y, k) => (k === d ? e.target.value || null : y)))}>
                <option value="">{x.none}</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || '…'}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      <button className="btn-primary" onClick={save}>
        {x.save}
      </button>
    </section>
  );
}

/** In the session dialog: pick another place for just this session. */
export function PlacePicker({ row, date, dow, chosen, onPick }: { row: ProfileRow; date: string; dow: number; chosen: string | null | undefined; onPick: (id: string | null) => void }) {
  const { lang } = useI18n();
  const x = T[lang] ?? T.en;
  const places = row.places ?? [];
  if (!places.length) return null;
  const def = places.find((p) => p.id === row.place_by_dow?.[dow]);
  return (
    <div className="mt-4 rounded-lg border border-line p-3 text-sm">
      <label className="flex flex-wrap items-center gap-2">
        <MapPin className="h-4 w-4 text-volt" aria-hidden />
        <span className="font-semibold">{x.pick}</span>
        <select className="input ml-auto w-auto py-1.5 text-sm" value={chosen ?? ''} onChange={(e) => onPick(e.target.value || null)} aria-label={`${x.pick} ${date}`}>
          <option value="">{def ? `${def.name} (${x.def})` : x.none}</option>
          {places
            .filter((p) => p.id !== def?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      <p className="mt-1 text-xs text-muted">{x.pickHelp}</p>
    </div>
  );
}
