import type { Lang, Session, Station } from './types';

/** Where you train and what is there. Several places per athlete (HYROX gym, regular gym, home, outdoors). */
export type PlaceKind = 'hyrox' | 'gym' | 'home' | 'outdoor';
export const ITEMS = [
  // run / cardio
  'outdoor_run', 'treadmill', 'bike', 'airbike', 'rower', 'skierg',
  // HYROX stations
  'sled', 'wallball', 'sandbag',
  // strength
  'dumbbells', 'kettlebells', 'barbell', 'bench', 'box', 'pullup', 'bands',
  // recovery
  'sauna', 'cold', 'hottub', 'foamroller',
] as const;
export type Item = (typeof ITEMS)[number];
export const ITEM_GROUPS: Record<'cardio' | 'stations' | 'strength' | 'recovery', Item[]> = {
  cardio: ['outdoor_run', 'treadmill', 'bike', 'airbike', 'rower', 'skierg'],
  stations: ['sled', 'wallball', 'sandbag'],
  strength: ['dumbbells', 'kettlebells', 'barbell', 'bench', 'box', 'pullup', 'bands'],
  recovery: ['sauna', 'cold', 'hottub', 'foamroller'],
};
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  items: Item[];
  /** heaviest dumbbell / kettlebell available (kg), optional */
  maxKg?: number | null;
}
export const PRESET: Record<PlaceKind, Item[]> = {
  hyrox: ['treadmill', 'bike', 'airbike', 'rower', 'skierg', 'sled', 'wallball', 'sandbag', 'dumbbells', 'kettlebells', 'barbell', 'bench', 'box', 'pullup', 'bands', 'foamroller'],
  gym: ['treadmill', 'bike', 'rower', 'dumbbells', 'kettlebells', 'barbell', 'bench', 'box', 'pullup', 'foamroller'],
  home: ['outdoor_run'],
  outdoor: ['outdoor_run'],
};

/** Which place applies on a date: a per-session choice, else the weekday default, else none (legacy equipment). */
export function placeFor(places: Place[] | null | undefined, byDow: (string | null)[] | null | undefined, override: string | null | undefined, dow: number): Place | null {
  if (!places?.length) return null;
  const id = override ?? byDow?.[dow] ?? null;
  return places.find((p) => p.id === id) ?? null;
}

type K =
  | 'here' | 'tread' | 'noRunT' | 'noRunD' | 'noRunZ2T' | 'noRunZ2D' | 'move' | 'subs'
  | Item;
const T: Record<'en' | 'nl', Record<K, string>> = {
  en: {
    here: '📍 {place}',
    tread: 'On the treadmill: 1 % incline so it feels like running outside.',
    noRunT: 'Threshold without running: {n} × 4 min',
    noRunD: 'No running possible at {place}: {n} × 4 min on the {kit} at threshold heart rate ({lo}–{hi} bpm), 2 min easy in between – same stimulus as the run.',
    noRunZ2T: 'Endurance on the {kit} · {min} min',
    noRunZ2D: 'No running possible at {place}: {min} min on the {kit} in zone 2 (HR ≤ {cap}).',
    move: '⚠️ This session needs running or cardio kit that {place} doesn\'t have. Move it to a day at another place, or choose another place for this session.',
    subs: 'At {place} – swap like this:',
    outdoor_run: 'running outside', treadmill: 'treadmill', bike: 'bike', airbike: 'air bike', rower: 'rower', skierg: 'SkiErg',
    sled: 'sled', wallball: 'wall ball', sandbag: 'sandbag', dumbbells: 'dumbbells', kettlebells: 'kettlebells', barbell: 'barbell + plates', bench: 'bench', box: 'box', pullup: 'pull-up bar', bands: 'resistance bands',
    sauna: 'sauna / infrared', cold: 'cold bath', hottub: 'hot tub', foamroller: 'foam roller',
  },
  nl: {
    here: '📍 {place}',
    tread: 'Op de loopband: 1 % helling, dan voelt het als buiten lopen.',
    noRunT: 'Drempel zonder lopen: {n} × 4 min',
    noRunD: 'Hardlopen kan niet bij {place}: {n} × 4 min op de {kit} op drempelhartslag ({lo}–{hi} bpm), 2 min rustig ertussen – zelfde prikkel als de run.',
    noRunZ2T: 'Duurtraining op de {kit} · {min} min',
    noRunZ2D: 'Hardlopen kan niet bij {place}: {min} min op de {kit} in zone 2 (HS ≤ {cap}).',
    move: '⚠️ Voor deze training heb je hardlopen of cardiomateriaal nodig dat {place} niet heeft. Schuif hem naar een dag op een andere plek, of kies voor deze training een andere plek.',
    subs: 'Bij {place} – vervang zo:',
    outdoor_run: 'buiten hardlopen', treadmill: 'loopband', bike: 'fiets', airbike: 'airbike', rower: 'roeier', skierg: 'SkiErg',
    sled: 'sled', wallball: 'wall ball', sandbag: 'sandbag', dumbbells: 'dumbbells', kettlebells: 'kettlebells', barbell: 'stang + schijven', bench: 'bankje', box: 'box', pullup: 'optrekstang', bands: 'weerstandsbanden',
    sauna: 'sauna / infrarood', cold: 'koud bad', hottub: 'jacuzzi', foamroller: 'foamroller',
  },
};
const L = (lang: Lang) => (lang === 'nl' ? T.nl : T.en);
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
export const itemLabel = (lang: Lang, i: Item) => L(lang)[i];

/** One substitution line per station that the place can't do as-is (null = can be done as written). */
function stationLine(lang: Lang, st: Station, has: (i: Item) => boolean, canRun: boolean, kg?: number | null): string | null {
  const nl = lang === 'nl';
  const w = kg ? ` (${nl ? 'tot' : 'up to'} ${kg} kg)` : '';
  const load = has('dumbbells') ? (nl ? 'dumbbells' : 'dumbbells') + w : has('kettlebells') ? 'kettlebells' + w : has('barbell') ? (nl ? 'stang' : 'barbell') : null;
  switch (st) {
    case 'skierg':
      if (has('skierg')) return null;
      if (has('rower')) return nl ? 'SkiErg → roeier, zelfde afstand' : 'SkiErg → rower, same distance';
      if (has('airbike')) return nl ? 'SkiErg → 3–4 min hard op de airbike (armen mee)' : 'SkiErg → 3–4 min hard on the air bike (use the arms)';
      if (has('bike')) return nl ? 'SkiErg → 3–4 min hard op de fiets + 10 burpees' : 'SkiErg → 3–4 min hard on the bike + 10 burpees';
      if (has('bands')) return nl ? 'SkiErg → 2 min straight-arm pulldowns met band + 10 burpees' : 'SkiErg → 2 min band straight-arm pulldowns + 10 burpees';
      return nl ? 'SkiErg → 60 s snelle burpees' : 'SkiErg → 60 s fast burpees';
    case 'sledPush':
      if (has('sled')) return null;
      if (load) return nl ? `Sled push → 20 m zware walking lunges met ${load}` : `Sled push → 20 m heavy walking lunges with ${load}`;
      return nl ? 'Sled push → 4 × 20 s heuvelsprint of 20 m bear crawl' : 'Sled push → 4 × 20 s hill sprints or 20 m bear crawl';
    case 'sledPull':
      if (has('sled')) return null;
      if (load) return nl ? `Sled pull → 3 × 12 zware rows met ${load} + 20 m achteruit lopen` : `Sled pull → 3 × 12 heavy rows with ${load} + 20 m walking backwards`;
      if (has('bands')) return nl ? 'Sled pull → 3 × 15 band rows' : 'Sled pull → 3 × 15 band rows';
      return nl ? 'Sled pull → rows met een beladen rugzak' : 'Sled pull → rows with a loaded backpack';
    case 'burpees':
      return null;
    case 'row':
      if (has('rower')) return null;
      if (has('skierg')) return nl ? 'Roeien → SkiErg, zelfde afstand' : 'Row → SkiErg, same distance';
      if (has('bike') || has('airbike')) return nl ? 'Roeien → 2–3 min hard op de fiets' : 'Row → 2–3 min hard on the bike';
      if (canRun) return nl ? 'Roeien → 400 m hardlopen op race-inspanning' : 'Row → 400 m run at race effort';
      return nl ? 'Roeien → 60 s burpees' : 'Row → 60 s burpees';
    case 'farmers':
      if (load && load !== (nl ? 'stang' : 'barbell')) return has('kettlebells') && has('sled') ? null : nl ? `Farmers carry met ${load}` : `Farmers carry with ${load}`;
      return nl ? 'Farmers carry → twee gevulde jerrycans of tassen' : 'Farmers carry → two filled water jugs or bags';
    case 'lunges':
      if (has('sandbag')) return null;
      if (load) return nl ? `Lunges met ${load}` : `Lunges with ${load}`;
      return nl ? 'Lunges met een beladen rugzak' : 'Lunges with a loaded backpack';
    case 'wallballs':
      if (has('wallball')) return null;
      if (has('dumbbells') || has('kettlebells')) return nl ? `Wall balls → thrusters met ${has('dumbbells') ? 'dumbbells' : 'kettlebell'}${w}` : `Wall balls → thrusters with ${has('dumbbells') ? 'dumbbells' : 'a kettlebell'}${w}`;
      return nl ? 'Wall balls → squat-to-press met rugzak of zandzak' : 'Wall balls → squat-to-press with a backpack or sandbag';
  }
}

/** Substitution lines for these stations at this place. */
export function placeSubstitutions(lang: Lang, place: Place, stations: Station[]): string[] {
  const has = (i: Item) => place.items.includes(i);
  const canRun = has('outdoor_run') || has('treadmill');
  const lines = stations.map((s) => stationLine(lang, s, has, canRun, place.maxKg)).filter(Boolean) as string[];
  return lines.length ? [fill(L(lang).subs, { place: place.name }), ...lines.map((l) => '• ' + l)] : [];
}

const RUN_TYPES: Session['type'][] = ['threshold', 'intervals', 'easy', 'long'];

/** Adapt a running session to the place: treadmill tip, or cross-training at the same HR zone when you can't run there. */
export function adaptRunToPlace(
  lang: Lang,
  s: Partial<Session>,
  place: Place,
  hr: { lthr: number; maxHr: number; T: number; z2: number },
): Partial<Session> | null {
  if (!s.type || !RUN_TYPES.includes(s.type) || s.cross) return null;
  const has = (i: Item) => place.items.includes(i);
  const here = fill(L(lang).here, { place: place.name });
  if (has('outdoor_run')) return { ...s, description: [here, s.description ?? ''].join('\n') };
  if (has('treadmill')) return { ...s, description: [here, L(lang).tread, s.description ?? ''].join('\n') };
  const kitItem = (['bike', 'airbike', 'rower', 'skierg'] as Item[]).find(has);
  if (!kitItem) return { ...s, description: [here, fill(L(lang).move, { place: place.name }), s.description ?? ''].join('\n') };
  const kit = L(lang)[kitItem];
  const lo = Math.round(hr.lthr * 0.95);
  const hi = Math.min(hr.lthr, hr.maxHr);
  if (s.type === 'threshold' || s.type === 'intervals') {
    const n = 5;
    return { ...s, type: 'threshold', title: fill(L(lang).noRunT, { n }), description: [here, fill(L(lang).noRunD, { n, kit, lo, hi, place: place.name })].join('\n'), targetPaceSec: null, km: undefined, hrCap: hi, cross: true, benchmark: undefined, benchmarkText: undefined };
  }
  const min = Math.max(25, Math.min(90, Math.round(((s.km ?? 6) * hr.T * 1.22) / 60 / 5) * 5));
  return { ...s, title: fill(L(lang).noRunZ2T, { kit, min }), description: [here, fill(L(lang).noRunZ2D, { kit, min, cap: hr.z2, place: place.name })].join('\n'), targetPaceSec: null, km: undefined, hrCap: hr.z2, cross: true };
}
