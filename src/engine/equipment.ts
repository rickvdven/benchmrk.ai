import type { Lang, Station } from './types';

/** Where the athlete trains: a HYROX-equipped gym, a regular gym, or at home / outdoors. */
export type Equipment = 'hyrox' | 'gym' | 'home';

type Sub = Record<Station, string>;
const SUBS: Record<Lang, { gym: Sub; home: Sub; intro: string }> = {
  en: {
    intro: 'No HYROX kit? Swap like this:',
    gym: {
      skierg: 'SkiErg → 2 min band or cable straight-arm pulldowns + burpees', sledPush: 'Sled push → heavy prowler / plate push or 20 m heavy walking lunges', sledPull: 'Sled pull → heavy rope or cable rows, or backwards walking with a loaded trap bar',
      burpees: 'Burpee broad jumps (no kit needed)', row: 'Row (any rower), or assault bike', farmers: 'Farmers carry with dumbbells or kettlebells', lunges: 'Lunges with a barbell or dumbbells', wallballs: 'Wall balls → dumbbell thrusters if there is no ball',
    },
    home: {
      skierg: 'SkiErg → 60 s fast burpees or band pulldowns', sledPush: 'Sled push → uphill sprints 4 × 20 s or pushing a car in neutral (with care)', sledPull: 'Sled pull → backpack rows + walking backwards uphill',
      burpees: 'Burpee broad jumps', row: 'Row → 400 m run at race effort', farmers: 'Farmers carry → two filled water jugs or bags', lunges: 'Lunges with a loaded backpack', wallballs: 'Wall balls → squat-to-press with a backpack or sandbag',
    },
  },
  nl: {
    intro: 'Geen HYROX-materiaal? Vervang zo:',
    gym: {
      skierg: 'SkiErg → 2 min straight-arm pulldowns aan band of kabel + burpees', sledPush: 'Sled push → zware prowler/plate push of 20 m zware walking lunges', sledPull: 'Sled pull → zware rope- of kabelrows, of achteruit lopen met beladen trapbar',
      burpees: 'Burpee broad jumps (geen materiaal nodig)', row: 'Roeien (elke roeier) of assault bike', farmers: 'Farmers carry met dumbbells of kettlebells', lunges: 'Lunges met halter of dumbbells', wallballs: 'Wall balls → dumbbell thrusters als er geen bal is',
    },
    home: {
      skierg: 'SkiErg → 60 s snelle burpees of band pulldowns', sledPush: 'Sled push → heuvelsprints 4 × 20 s of (voorzichtig) een auto in z’n vrij duwen', sledPull: 'Sled pull → rows met rugzak + achteruit heuvel op lopen',
      burpees: 'Burpee broad jumps', row: 'Roeien → 400 m hardlopen op race-inspanning', farmers: 'Farmers carry → twee gevulde jerrycans of tassen', lunges: 'Lunges met beladen rugzak', wallballs: 'Wall balls → squat-to-press met rugzak of zandzak',
    },
  },
  de: {
    intro: 'Kein HYROX-Equipment? So ersetzen:',
    gym: {
      skierg: 'SkiErg → 2 Min. Straight-Arm-Pulldowns am Band/Kabel + Burpees', sledPush: 'Sled Push → schwerer Prowler/Plate Push oder 20 m schwere Walking Lunges', sledPull: 'Sled Pull → schweres Seil- oder Kabelrudern, oder rückwärts gehen mit beladener Trap Bar',
      burpees: 'Burpee Broad Jumps (kein Equipment)', row: 'Rudern (jedes Ergometer) oder Assault Bike', farmers: 'Farmers Carry mit Kurz- oder Kettlebells', lunges: 'Ausfallschritte mit Lang- oder Kurzhanteln', wallballs: 'Wall Balls → Kurzhantel-Thruster ohne Ball',
    },
    home: {
      skierg: 'SkiErg → 60 s schnelle Burpees oder Band-Pulldowns', sledPush: 'Sled Push → Bergsprints 4 × 20 s', sledPull: 'Sled Pull → Rucksack-Rudern + rückwärts bergauf gehen',
      burpees: 'Burpee Broad Jumps', row: 'Rudern → 400 m Lauf in Renntempo', farmers: 'Farmers Carry → zwei gefüllte Kanister oder Taschen', lunges: 'Ausfallschritte mit beladenem Rucksack', wallballs: 'Wall Balls → Squat-to-Press mit Rucksack oder Sandsack',
    },
  },
  es: {
    intro: '¿Sin material HYROX? Sustituye así:',
    gym: {
      skierg: 'SkiErg → 2 min jalones con brazos rectos en banda/polea + burpees', sledPush: 'Sled push → prowler/empuje de disco pesado o 20 m de zancadas pesadas', sledPull: 'Sled pull → remo pesado con cuerda o polea, o caminar hacia atrás con trap bar cargada',
      burpees: 'Burpee broad jumps (sin material)', row: 'Remo (cualquier remoergómetro) o assault bike', farmers: 'Farmers carry con mancuernas o kettlebells', lunges: 'Zancadas con barra o mancuernas', wallballs: 'Wall balls → thrusters con mancuernas si no hay balón',
    },
    home: {
      skierg: 'SkiErg → 60 s burpees rápidos o jalones con banda', sledPush: 'Sled push → sprints en cuesta 4 × 20 s', sledPull: 'Sled pull → remo con mochila + caminar hacia atrás cuesta arriba',
      burpees: 'Burpee broad jumps', row: 'Remo → 400 m corriendo a ritmo de carrera', farmers: 'Farmers carry → dos garrafas o bolsas llenas', lunges: 'Zancadas con mochila cargada', wallballs: 'Wall balls → sentadilla con press con mochila o saco',
    },
  },
  ko: {
    intro: 'HYROX 장비가 없나요? 이렇게 대체하세요:',
    gym: {
      skierg: 'SkiErg → 밴드/케이블 스트레이트암 풀다운 2분 + 버피', sledPush: '슬레드 푸시 → 무거운 프라울러/플레이트 푸시 또는 무거운 워킹 런지 20 m', sledPull: '슬레드 풀 → 무거운 로프/케이블 로우 또는 트랩바 들고 뒤로 걷기',
      burpees: '버피 브로드 점프 (장비 불필요)', row: '로잉 (아무 로잉머신) 또는 어썰트 바이크', farmers: '덤벨 또는 케틀벨 파머스 캐리', lunges: '바벨 또는 덤벨 런지', wallballs: '월볼 → 볼이 없으면 덤벨 쓰러스터',
    },
    home: {
      skierg: 'SkiErg → 60초 빠른 버피 또는 밴드 풀다운', sledPush: '슬레드 푸시 → 언덕 스프린트 4 × 20초', sledPull: '슬레드 풀 → 배낭 로우 + 언덕 뒤로 걷기',
      burpees: '버피 브로드 점프', row: '로잉 → 레이스 강도 400 m 러닝', farmers: '파머스 캐리 → 물통이나 가방 두 개', lunges: '무게 넣은 배낭 런지', wallballs: '월볼 → 배낭/샌드백 스쿼트 프레스',
    },
  },
};

/** Substitution lines for the given stations (none for a HYROX-equipped gym). */
export function substitutions(lang: Lang, eq: Equipment | undefined, stations: Station[]): string[] {
  if (!eq || eq === 'hyrox' || !stations.length) return [];
  const L = SUBS[lang] ?? SUBS.en;
  return [L.intro, ...stations.map((s) => '• ' + L[eq][s])];
}
