import { useState } from 'react';
import clsx from 'clsx';
import { HelpCircle, ChevronDown } from 'lucide-react';
import type { Lang } from '../engine';
import { useI18n } from '../lib/i18n';

type Src = 'garmin' | 'apple' | 'polar' | 'coros' | 'none';
type Row = 'lthr' | 'tp' | 'max' | 'rest' | 'vo2';
const SRCS: Src[] = ['garmin', 'apple', 'polar', 'coros', 'none'];
const ROWS: Row[] = ['lthr', 'tp', 'max', 'rest', 'vo2'];

interface Pack {
  title: string;
  intro: string;
  none: string;
  rows: Record<Row, string>;
  tip: string;
  data: Record<Src, Record<Row, string>>;
}

const P: Record<Lang, Pack> = {
  en: {
    title: 'Where do I find these numbers?',
    intro: 'Pick your watch. Only threshold HR, max HR and threshold pace are required — no watch works too.',
    none: 'No watch / test',
    rows: { lthr: 'Threshold HR', tp: 'Threshold pace', max: 'Max HR', rest: 'Resting HR', vo2: 'VO₂max' },
    tip: 'Not sure? Fill in your best guess — benchmark 1 recalibrates threshold pace and HR within a few weeks.',
    data: {
      garmin: {
        lthr: 'Garmin Connect → Performance Stats → Lactate Threshold (heart rate). The guided test needs a chest strap on most watches.',
        tp: 'Same screen: the pace shown under Lactate Threshold.',
        max: 'Highest HR at the end of a hard race or test. The value in User Settings → Heart Rate Zones is often just an age estimate.',
        rest: 'Garmin Connect → Health Stats → Heart Rate → 7-day average resting HR.',
        vo2: 'Garmin Connect → Performance Stats → VO₂ Max (running).',
      },
      apple: {
        lthr: 'Apple does not show a threshold HR. Use the 30-minute test (No watch tab) with your Watch on.',
        tp: 'Average pace of that 30-minute test, or use the 5 km estimate button.',
        max: 'Fitness app → a hard workout → Heart Rate graph → highest value.',
        rest: 'Health app → Browse → Heart → Resting Heart Rate.',
        vo2: 'Health app → Browse → Heart → Cardio Fitness.',
      },
      polar: {
        lthr: 'Do the Running Performance Test on the watch (Tests). Use the anaerobic threshold HR it reports.',
        tp: 'Same test: anaerobic threshold speed (convert km/h to min/km: 60 ÷ speed).',
        max: 'Maximal version of the Running Performance Test, or the highest HR of a hard race.',
        rest: 'Polar Flow app → Nightly Recharge → resting heart rate.',
        vo2: 'Running Performance Test or Fitness Test → VO₂max.',
      },
      coros: {
        lthr: 'COROS app → EvoLab → Threshold → Lactate Threshold HR (updates after hard runs, or run the Running Fitness test).',
        tp: 'Same screen: Lactate Threshold Pace.',
        max: 'Highest HR at the end of a hard race. The profile value is often an age estimate.',
        rest: 'COROS app → Data → Resting Heart Rate.',
        vo2: 'COROS app → EvoLab → VO₂max.',
      },
      none: {
        lthr: '30-minute test: warm up, then run 30 min alone on a flat route as hard as you can evenly. Average HR of the last 20 min = threshold HR (needs a chest strap or watch).',
        tp: 'Average pace of those 30 minutes. No test yet? Enter your 5 km time and tap the estimate.',
        max: 'Highest HR in the last minute of a hard 5 km. No HR at all? 208 − 0.7 × age is a rough start.',
        rest: 'Count your pulse for 60 s right after waking, three mornings; take the lowest.',
        vo2: 'Leave empty — it is optional.',
      },
    },
  },
  nl: {
    title: 'Waar vind ik deze gegevens?',
    intro: 'Kies je horloge. Alleen drempelhartslag, max HS en drempeltempo zijn verplicht — zonder horloge kan ook.',
    none: 'Geen horloge / test',
    rows: { lthr: 'Drempelhartslag', tp: 'Drempeltempo', max: 'Max HS', rest: 'Rusthartslag', vo2: 'VO₂max' },
    tip: 'Twijfel je? Vul je beste schatting in — benchmark 1 kalibreert drempeltempo en -hartslag binnen een paar weken.',
    data: {
      garmin: {
        lthr: 'Garmin Connect → Prestatiestatistieken → Lactaatdrempel (hartslag). De begeleide test vraagt op de meeste horloges een borstband.',
        tp: 'Zelfde scherm: het tempo onder Lactaatdrempel.',
        max: 'Hoogste HS aan het eind van een harde wedstrijd of test. De waarde bij Gebruikersinstellingen → Hartslagzones is vaak alleen een leeftijdsschatting.',
        rest: 'Garmin Connect → Gezondheidsstatistieken → Hartslag → gemiddelde rusthartslag 7 dagen.',
        vo2: 'Garmin Connect → Prestatiestatistieken → VO₂ max (hardlopen).',
      },
      apple: {
        lthr: 'Apple toont geen drempelhartslag. Doe de 30-minutentest (tab Geen horloge) met je Watch om.',
        tp: 'Gemiddeld tempo van die 30-minutentest, of gebruik de 5 km-schatting.',
        max: 'Fitness-app → een harde training → Hartslaggrafiek → hoogste waarde.',
        rest: 'Gezondheid-app → Bladeren → Hart → Rusthartslag.',
        vo2: 'Gezondheid-app → Bladeren → Hart → Cardiofitness.',
      },
      polar: {
        lthr: 'Doe de Running Performance Test op het horloge (Tests). Neem de anaerobe drempelhartslag uit het resultaat.',
        tp: 'Zelfde test: anaerobe drempelsnelheid (km/u naar min/km: 60 ÷ snelheid).',
        max: 'Maximale versie van de Running Performance Test, of de hoogste HS uit een harde wedstrijd.',
        rest: 'Polar Flow-app → Nightly Recharge → rusthartslag.',
        vo2: 'Running Performance Test of Fitness Test → VO₂max.',
      },
      coros: {
        lthr: 'COROS-app → EvoLab → Threshold → Lactaatdrempel-HS (wordt bijgewerkt na harde runs, of doe de Running Fitness-test).',
        tp: 'Zelfde scherm: Lactaatdrempeltempo.',
        max: 'Hoogste HS aan het eind van een harde wedstrijd. De waarde in je profiel is vaak een leeftijdsschatting.',
        rest: 'COROS-app → Data → Rusthartslag.',
        vo2: 'COROS-app → EvoLab → VO₂max.',
      },
      none: {
        lthr: '30-minutentest: inlopen, dan 30 min alleen op een vlak parcours zo hard als je gelijkmatig volhoudt. Gem. HS van de laatste 20 min = drempelhartslag (borstband of horloge nodig).',
        tp: 'Gemiddeld tempo van die 30 minuten. Nog geen test? Vul je 5 km-tijd in en klik op de schatting.',
        max: 'Hoogste HS in de laatste minuut van een harde 5 km. Helemaal geen HS? 208 − 0,7 × leeftijd als ruwe start.',
        rest: 'Tel 60 s je hartslag direct na het wakker worden, drie ochtenden; neem de laagste.',
        vo2: 'Leeg laten — is optioneel.',
      },
    },
  },
  de: {
    title: 'Wo finde ich diese Werte?',
    intro: 'Wähle deine Uhr. Nur Schwellen-HF, Max-HF und Schwellentempo sind Pflicht — ohne Uhr geht es auch.',
    none: 'Keine Uhr / Test',
    rows: { lthr: 'Schwellen-HF', tp: 'Schwellentempo', max: 'Max-HF', rest: 'Ruhe-HF', vo2: 'VO₂max' },
    tip: 'Unsicher? Trag deine beste Schätzung ein — Benchmark 1 kalibriert Schwellentempo und -HF in wenigen Wochen.',
    data: {
      garmin: {
        lthr: 'Garmin Connect → Leistungsstatistiken → Laktatschwelle (Herzfrequenz). Der geführte Test braucht bei den meisten Uhren einen Brustgurt.',
        tp: 'Gleicher Bildschirm: das Tempo unter Laktatschwelle.',
        max: 'Höchste HF am Ende eines harten Rennens oder Tests. Der Wert unter Benutzereinstellungen → Herzfrequenzbereiche ist oft nur eine Altersschätzung.',
        rest: 'Garmin Connect → Gesundheitsstatistiken → Herzfrequenz → 7-Tage-Durchschnitt Ruhe-HF.',
        vo2: 'Garmin Connect → Leistungsstatistiken → VO₂max (Laufen).',
      },
      apple: {
        lthr: 'Apple zeigt keine Schwellen-HF. Mach den 30-Minuten-Test (Tab Keine Uhr) mit der Watch.',
        tp: 'Durchschnittstempo dieses 30-Minuten-Tests, oder nutze die 5-km-Schätzung.',
        max: 'Fitness-App → ein hartes Training → Herzfrequenz-Grafik → höchster Wert.',
        rest: 'Health-App → Entdecken → Herz → Ruheherzfrequenz.',
        vo2: 'Health-App → Entdecken → Herz → Cardiofitness.',
      },
      polar: {
        lthr: 'Mach den Running Performance Test auf der Uhr (Tests). Nimm die anaerobe Schwellen-HF aus dem Ergebnis.',
        tp: 'Gleicher Test: anaerobe Schwellengeschwindigkeit (km/h in min/km: 60 ÷ Tempo).',
        max: 'Maximale Version des Running Performance Test oder höchste HF eines harten Rennens.',
        rest: 'Polar Flow App → Nightly Recharge → Ruhe-HF.',
        vo2: 'Running Performance Test oder Fitness Test → VO₂max.',
      },
      coros: {
        lthr: 'COROS-App → EvoLab → Threshold → Laktatschwellen-HF (aktualisiert nach harten Läufen oder mit dem Running-Fitness-Test).',
        tp: 'Gleicher Bildschirm: Laktatschwellen-Tempo.',
        max: 'Höchste HF am Ende eines harten Rennens. Der Profilwert ist oft eine Altersschätzung.',
        rest: 'COROS-App → Daten → Ruhe-HF.',
        vo2: 'COROS-App → EvoLab → VO₂max.',
      },
      none: {
        lthr: '30-Minuten-Test: einlaufen, dann 30 Min. allein auf flacher Strecke so hart wie gleichmäßig möglich. Durchschnitts-HF der letzten 20 Min. = Schwellen-HF (Brustgurt oder Uhr nötig).',
        tp: 'Durchschnittstempo dieser 30 Minuten. Noch kein Test? 5-km-Zeit eintragen und Schätzung antippen.',
        max: 'Höchste HF in der letzten Minute eines harten 5-km-Laufs. Gar keine HF? 208 − 0,7 × Alter als grober Start.',
        rest: 'Puls 60 s direkt nach dem Aufwachen zählen, drei Morgen; den niedrigsten nehmen.',
        vo2: 'Leer lassen — optional.',
      },
    },
  },
  es: {
    title: '¿Dónde encuentro estos datos?',
    intro: 'Elige tu reloj. Solo FC umbral, FC máx. y ritmo umbral son obligatorios — también sin reloj.',
    none: 'Sin reloj / test',
    rows: { lthr: 'FC umbral', tp: 'Ritmo umbral', max: 'FC máx.', rest: 'FC en reposo', vo2: 'VO₂máx' },
    tip: '¿Dudas? Pon tu mejor estimación — el benchmark 1 recalibra ritmo y FC umbral en pocas semanas.',
    data: {
      garmin: {
        lthr: 'Garmin Connect → Estadísticas de rendimiento → Umbral de lactato (frecuencia cardiaca). La prueba guiada requiere banda de pecho en la mayoría de relojes.',
        tp: 'Misma pantalla: el ritmo bajo Umbral de lactato.',
        max: 'FC más alta al final de una carrera o test duro. El valor en Ajustes de usuario → Zonas de FC suele ser una estimación por edad.',
        rest: 'Garmin Connect → Estadísticas de salud → Frecuencia cardiaca → media de 7 días en reposo.',
        vo2: 'Garmin Connect → Estadísticas de rendimiento → VO₂ máx. (carrera).',
      },
      apple: {
        lthr: 'Apple no muestra FC umbral. Haz el test de 30 minutos (pestaña Sin reloj) con el Watch puesto.',
        tp: 'Ritmo medio de ese test de 30 minutos, o usa la estimación de 5 km.',
        max: 'App Fitness → un entrenamiento duro → gráfico de FC → valor más alto.',
        rest: 'App Salud → Explorar → Corazón → Frecuencia cardiaca en reposo.',
        vo2: 'App Salud → Explorar → Corazón → Capacidad cardiorrespiratoria.',
      },
      polar: {
        lthr: 'Haz el Running Performance Test en el reloj (Tests). Usa la FC del umbral anaeróbico del resultado.',
        tp: 'Mismo test: velocidad del umbral anaeróbico (km/h a min/km: 60 ÷ velocidad).',
        max: 'Versión máxima del Running Performance Test o la FC más alta de una carrera dura.',
        rest: 'App Polar Flow → Nightly Recharge → FC en reposo.',
        vo2: 'Running Performance Test o Fitness Test → VO₂máx.',
      },
      coros: {
        lthr: 'App COROS → EvoLab → Threshold → FC de umbral de lactato (se actualiza tras carreras duras o con el test Running Fitness).',
        tp: 'Misma pantalla: ritmo de umbral de lactato.',
        max: 'FC más alta al final de una carrera dura. El valor del perfil suele ser una estimación por edad.',
        rest: 'App COROS → Datos → FC en reposo.',
        vo2: 'App COROS → EvoLab → VO₂máx.',
      },
      none: {
        lthr: 'Test de 30 minutos: calienta y corre 30 min solo en llano lo más fuerte que puedas de forma constante. FC media de los últimos 20 min = FC umbral (banda o reloj necesario).',
        tp: 'Ritmo medio de esos 30 minutos. ¿Sin test? Pon tu tiempo de 5 km y pulsa la estimación.',
        max: 'FC más alta en el último minuto de un 5 km duro. ¿Sin FC? 208 − 0,7 × edad como punto de partida.',
        rest: 'Cuenta el pulso 60 s al despertar, tres mañanas; quédate con el más bajo.',
        vo2: 'Déjalo vacío — es opcional.',
      },
    },
  },
  ko: {
    title: '이 수치는 어디서 찾나요?',
    intro: '시계를 선택하세요. 역치 심박수, 최대 심박수, 역치 페이스만 필수이며 시계가 없어도 됩니다.',
    none: '시계 없음 / 테스트',
    rows: { lthr: '역치 심박수', tp: '역치 페이스', max: '최대 심박수', rest: '안정 심박수', vo2: 'VO₂max' },
    tip: '잘 모르겠다면 최선의 추정치를 입력하세요 — 벤치마크 1이 몇 주 안에 역치 페이스와 심박수를 재보정합니다.',
    data: {
      garmin: {
        lthr: 'Garmin Connect → 퍼포먼스 통계 → 젖산 역치(심박수). 가이드 테스트는 대부분의 시계에서 가슴 스트랩이 필요합니다.',
        tp: '같은 화면: 젖산 역치 아래의 페이스.',
        max: '힘든 레이스나 테스트 마지막의 최고 심박수. 사용자 설정 → 심박수 존의 값은 나이 추정치인 경우가 많습니다.',
        rest: 'Garmin Connect → 건강 통계 → 심박수 → 7일 평균 안정 심박수.',
        vo2: 'Garmin Connect → 퍼포먼스 통계 → VO₂ Max(러닝).',
      },
      apple: {
        lthr: 'Apple은 역치 심박수를 표시하지 않습니다. Watch를 착용하고 30분 테스트(시계 없음 탭)를 하세요.',
        tp: '그 30분 테스트의 평균 페이스, 또는 5km 추정 버튼을 사용하세요.',
        max: '피트니스 앱 → 힘든 운동 → 심박수 그래프 → 최고값.',
        rest: '건강 앱 → 탐색 → 심장 → 안정 시 심박수.',
        vo2: '건강 앱 → 탐색 → 심장 → 심폐 체력.',
      },
      polar: {
        lthr: '시계에서 Running Performance Test(테스트)를 하세요. 결과의 무산소 역치 심박수를 사용합니다.',
        tp: '같은 테스트: 무산소 역치 속도 (km/h → 분/km: 60 ÷ 속도).',
        max: 'Running Performance Test 최대 버전, 또는 힘든 레이스의 최고 심박수.',
        rest: 'Polar Flow 앱 → Nightly Recharge → 안정 심박수.',
        vo2: 'Running Performance Test 또는 Fitness Test → VO₂max.',
      },
      coros: {
        lthr: 'COROS 앱 → EvoLab → Threshold → 젖산 역치 심박수 (힘든 러닝 후 갱신, 또는 Running Fitness 테스트).',
        tp: '같은 화면: 젖산 역치 페이스.',
        max: '힘든 레이스 마지막의 최고 심박수. 프로필 값은 나이 추정치인 경우가 많습니다.',
        rest: 'COROS 앱 → 데이터 → 안정 심박수.',
        vo2: 'COROS 앱 → EvoLab → VO₂max.',
      },
      none: {
        lthr: '30분 테스트: 워밍업 후 평지에서 혼자 30분간 고르게 최대한 빠르게 달리세요. 마지막 20분 평균 심박수 = 역치 심박수 (가슴 스트랩 또는 시계 필요).',
        tp: '그 30분의 평균 페이스. 아직 테스트 전이라면 5km 기록을 입력하고 추정을 누르세요.',
        max: '힘든 5km 마지막 1분의 최고 심박수. 심박 데이터가 없다면 208 − 0.7 × 나이로 대략 시작하세요.',
        rest: '기상 직후 60초간 맥박을 세고, 3일 중 가장 낮은 값을 사용하세요.',
        vo2: '비워 두세요 — 선택 항목입니다.',
      },
    },
  },
};

const BRAND: Record<Exclude<Src, 'none'>, string> = { garmin: 'Garmin', apple: 'Apple Watch', polar: 'Polar', coros: 'COROS' };

/** Collapsible "where do I find this" guide per watch brand. Remembers the chosen brand. */
export function DeviceHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { lang } = useI18n();
  const p = P[lang] ?? P.en;
  const [open, setOpen] = useState(defaultOpen);
  const [src, setSrc] = useState<Src>(() => {
    try {
      return (localStorage.getItem('rox:device') as Src) || 'garmin';
    } catch {
      return 'garmin';
    }
  });
  const pick = (s: Src) => {
    setSrc(s);
    try {
      localStorage.setItem('rox:device', s);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="rounded-lg border border-line bg-panel2/50">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold">
        <HelpCircle className="h-4 w-4 text-volt" aria-hidden />
        <span className="flex-1">{p.title}</span>
        <ChevronDown className={clsx('h-4 w-4 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          <p className="text-xs text-muted">{p.intro}</p>
          <div role="tablist" className="flex flex-wrap gap-1">
            {SRCS.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={src === s}
                onClick={() => pick(s)}
                className={clsx('rounded-md border px-2.5 py-1 text-xs font-medium', src === s ? 'border-volt bg-volt/10 text-volt' : 'border-line text-muted hover:text-fg')}
              >
                {s === 'none' ? p.none : BRAND[s]}
              </button>
            ))}
          </div>
          <dl className="divide-y divide-line text-sm">
            {ROWS.map((r) => (
              <div key={r} className="grid gap-1 py-2 sm:grid-cols-[9rem_1fr] sm:gap-3">
                <dt className="font-medium text-fg">{p.rows[r]}</dt>
                <dd className="text-muted">{p.data[src][r]}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">{p.tip}</p>
        </div>
      )}
    </div>
  );
}
