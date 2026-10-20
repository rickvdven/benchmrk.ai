import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { fmtHms, fmtMmss, injuryImpact, stationLabel, type Lang, type Profile } from '../engine';
import { useI18n } from '../lib/i18n';
import { injuryLabels } from './InjuryEditor';

type K = 'title' | 'intro' | 'volume' | 'stations' | 'speed' | 'prehab' | 'forecast' | 'forecastSame' | 'why' | 'update' | 'cta';
const T: Record<Lang, Record<K, string>> = {
  en: {
    title: 'Your plan is adjusted for your injuries',
    intro: 'Based on what you told us:',
    volume: 'Running volume builds more gradually: peak ~{now} km/week instead of ~{base} km.',
    stations: 'Not used as strength focus for now: {list}. Benchmrk picks your next-weakest stations instead.',
    speed: 'No fast intervals or strides — threshold reps instead.',
    prehab: 'Every strength session includes prehab for: {list}.',
    forecast: 'Expectation: forecast {now} instead of {base} without injuries (+{diff}). Less running means a bit less aerobic gain — health first.',
    forecastSame: 'Your race forecast is not affected.',
    why: 'Why: load that rises faster than tissue can adapt is the main cause of running injuries. A slower build-up keeps you training — and consistency beats any single session.',
    update: 'Symptoms gone? Change the status to “Longer ago” and your plan and forecast are recalculated straight away.',
    cta: 'Update injuries',
  },
  nl: {
    title: 'Je plan is aangepast aan je blessures',
    intro: 'Op basis van wat je hebt aangegeven:',
    volume: 'Loopvolume bouwt rustiger op: piek ~{now} km/week in plaats van ~{base} km.',
    stations: 'Voorlopig geen krachtfocus op: {list}. Benchmrk kiest je volgende zwakste stations.',
    speed: 'Geen snelle intervallen of strides — drempelherhalingen in plaats daarvan.',
    prehab: 'Elke krachtsessie bevat prehab voor: {list}.',
    forecast: 'Verwachting: voorspelling {now} in plaats van {base} zonder blessures (+{diff}). Minder lopen betekent iets minder aerobe winst — gezondheid eerst.',
    forecastSame: 'Je racevoorspelling verandert hier niet door.',
    why: 'Waarom: belasting die sneller stijgt dan je weefsel kan aanpassen is de belangrijkste oorzaak van loopblessures. Rustiger opbouwen houdt je aan het trainen — en consistentie wint van elke losse training.',
    update: 'Klachten weg? Zet de status op “Langer geleden” en je plan en voorspelling worden direct herberekend.',
    cta: 'Blessures bijwerken',
  },
  de: {
    title: 'Dein Plan ist an deine Verletzungen angepasst',
    intro: 'Basierend auf deinen Angaben:',
    volume: 'Laufumfang steigt langsamer: Spitze ~{now} km/Woche statt ~{base} km.',
    stations: 'Vorerst kein Kraftfokus auf: {list}. Benchmrk wählt deine nächstschwächeren Stationen.',
    speed: 'Keine schnellen Intervalle oder Steigerungen — stattdessen Schwellenwiederholungen.',
    prehab: 'Jede Krafteinheit enthält Prehab für: {list}.',
    forecast: 'Erwartung: Prognose {now} statt {base} ohne Verletzungen (+{diff}). Weniger Laufen bedeutet etwas weniger aeroben Zuwachs — Gesundheit zuerst.',
    forecastSame: 'Deine Rennprognose ändert sich dadurch nicht.',
    why: 'Warum: Belastung, die schneller steigt, als sich Gewebe anpasst, ist die Hauptursache für Laufverletzungen. Langsamer aufbauen hält dich im Training — Konstanz schlägt jede Einzeleinheit.',
    update: 'Beschwerden weg? Setz den Status auf „Länger her“ und Plan und Prognose werden sofort neu berechnet.',
    cta: 'Verletzungen aktualisieren',
  },
  es: {
    title: 'Tu plan está ajustado a tus lesiones',
    intro: 'Según lo que indicaste:',
    volume: 'El volumen de carrera sube más gradualmente: pico ~{now} km/semana en lugar de ~{base} km.',
    stations: 'Por ahora sin foco de fuerza en: {list}. Benchmrk elige tus siguientes estaciones más débiles.',
    speed: 'Sin intervalos rápidos ni progresivos — repeticiones a umbral en su lugar.',
    prehab: 'Cada sesión de fuerza incluye prehab para: {list}.',
    forecast: 'Expectativa: previsión {now} en lugar de {base} sin lesiones (+{diff}). Correr menos supone algo menos de ganancia aeróbica — primero la salud.',
    forecastSame: 'Tu previsión de carrera no cambia.',
    why: 'Por qué: una carga que sube más rápido de lo que el tejido se adapta es la causa principal de lesiones al correr. Progresar más despacio te mantiene entrenando — la constancia gana a cualquier sesión.',
    update: '¿Sin molestias? Cambia el estado a «Hace más» y tu plan y previsión se recalculan al instante.',
    cta: 'Actualizar lesiones',
  },
  ko: {
    title: '부상에 맞춰 플랜이 조정되었습니다',
    intro: '입력하신 내용 기준:',
    volume: '러닝 볼륨을 더 천천히 늘립니다: 최대 주당 ~{base} km 대신 ~{now} km.',
    stations: '당분간 근력 포커스 제외: {list}. Benchmrk가 다음으로 약한 스테이션을 선택합니다.',
    speed: '빠른 인터벌과 스트라이드 없음 — 대신 역치 반복.',
    prehab: '모든 근력 세션에 예방 운동 포함: {list}.',
    forecast: '예상: 부상이 없을 때 {base} 대신 {now} (+{diff}). 러닝이 줄면 유산소 향상도 약간 줄어듭니다 — 건강이 먼저입니다.',
    forecastSame: '레이스 예측에는 영향이 없습니다.',
    why: '이유: 조직이 적응하는 속도보다 부하가 빨리 늘어나는 것이 러닝 부상의 주된 원인입니다. 천천히 늘리면 계속 훈련할 수 있고, 꾸준함이 어떤 단일 세션보다 중요합니다.',
    update: '증상이 사라졌나요? 상태를 ‘그 이전’으로 바꾸면 플랜과 예측이 바로 다시 계산됩니다.',
    cta: '부상 업데이트',
  },
};
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

export function InjuryImpactCard({ profile, today, sharedSimDow }: { profile: Profile; today: string; sharedSimDow?: number | null }) {
  const { lang } = useI18n();
  const imp = useMemo(() => injuryImpact(profile, today, { lang, sharedSimDow }), [profile, today, lang, sharedSimDow]);
  if (!imp || imp.areas.every((a) => a.status === 'past')) return null;
  const tt = T[lang] ?? T.en;
  const L = injuryLabels(lang);
  const diff = imp.forecast - imp.forecastBase;
  const lines = [
    imp.peakKm < imp.peakKmBase - 1 && fill(tt.volume, { now: imp.peakKm, base: imp.peakKmBase }),
    imp.avoided.length > 0 && fill(tt.stations, { list: imp.avoided.map((s) => stationLabel(lang, s)).join(', ') }),
    imp.noSpeed && tt.speed,
    fill(tt.prehab, { list: imp.areas.map((a) => L.areas[a.area].toLowerCase()).join(', ') }),
  ].filter(Boolean) as string[];
  return (
    <div className="panel border-warn/50 p-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-warn" aria-hidden />
        <p className="font-semibold">{tt.title}</p>
      </div>
      <p className="mt-2 text-xs text-muted">
        {tt.intro}{' '}
        {imp.areas.map((a) => (
          <span key={a.area} className="chip mr-1">
            {L.areas[a.area]} · {L.status[a.status]}
          </span>
        ))}
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-panel2 p-2.5 text-sm">
        {diff >= 5 ? fill(tt.forecast, { now: fmtHms(imp.forecast), base: fmtHms(imp.forecastBase), diff: fmtMmss(diff) }) : tt.forecastSame}
      </p>
      <p className="mt-2 text-xs text-muted">{tt.why}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="flex-1 text-xs text-muted">{tt.update}</p>
        <Link to="/settings?tab=physio" className="btn-ghost btn-sm">
          {tt.cta}
        </Link>
      </div>
    </div>
  );
}
