import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { defaultSchedule, fmtHms, raceModel, trainingDays, type BaselineTable, type Lang, type Profile } from '../engine';
import { useI18n } from '../lib/i18n';

const T: Record<Lang, { title: string; body: string; with: string; cta: string; src: string }> = {
  en: { title: '{n} training day(s) per week', body: 'Fewer sessions mean less volume and fewer stimuli, so Benchmrk expects less improvement. The plan puts the most important sessions first.', with: 'Forecast with {n} days: {t} ({c}% chance)', src: 'Based on Montero & Lundby 2017, Lenk 2025, Wenger & Bell 1986, ACSM 1998, Grgic 2018', cta: 'Change my week' },
  nl: { title: '{n} trainingsdag(en) per week', body: 'Minder trainingen betekent minder volume en minder prikkels, dus Benchmrk verwacht minder verbetering. Het schema zet de belangrijkste trainingen voorop.', with: 'Voorspelling met {n} dagen: {t} ({c}% kans)', src: 'Gebaseerd op Montero & Lundby 2017, Lenk 2025, Wenger & Bell 1986, ACSM 1998, Grgic 2018', cta: 'Mijn week aanpassen' },
  de: { title: '{n} Trainingstag(e) pro Woche', body: 'Weniger Einheiten bedeuten weniger Umfang und Reize, daher erwartet Benchmrk weniger Fortschritt. Der Plan setzt die wichtigsten Einheiten zuerst.', with: 'Prognose mit {n} Tagen: {t} ({c}% Chance)', src: 'Basierend auf Montero & Lundby 2017, Lenk 2025, Wenger & Bell 1986, ACSM 1998, Grgic 2018', cta: 'Woche ändern' },
  es: { title: '{n} día(s) de entrenamiento por semana', body: 'Menos sesiones significan menos volumen y estímulos, así que Benchmrk espera menos mejora. El plan prioriza las sesiones clave.', with: 'Previsión con {n} días: {t} ({c}% de probabilidad)', src: 'Basado en Montero y Lundby 2017, Lenk 2025, Wenger y Bell 1986, ACSM 1998, Grgic 2018', cta: 'Cambiar mi semana' },
  ko: { title: '주 {n}일 훈련', body: '세션이 적으면 볼륨과 자극이 줄어 Benchmrk는 향상을 더 적게 예상합니다. 플랜은 가장 중요한 세션을 우선합니다.', with: '{n}일 기준 예측: {t} ({c}% 확률)', src: '근거: Montero & Lundby 2017, Lenk 2025, Wenger & Bell 1986, ACSM 1998, Grgic 2018', cta: '내 주간 변경' },
};
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

/** Shown when the athlete trains fewer than 3 days: what more days would do to the forecast. */
export function FrequencyNote({ profile, today, baselines }: { profile: Profile; today: string; baselines?: BaselineTable }) {
  const { lang } = useI18n();
  const n = trainingDays(profile);
  if (n >= 3) return null;
  const x = T[lang] ?? T.en;
  const alt = [3, 4].map((d) => ({ d, m: raceModel({ ...profile, weekSchedule: defaultSchedule(d) }, today, baselines) }));
  return (
    <div className="panel border-sky/40 p-4 text-sm">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-sky" aria-hidden />
        <p className="font-semibold">{fill(x.title, { n })}</p>
        <Link to="/settings?tab=schedule" className="ml-auto text-xs text-volt underline">
          {x.cta}
        </Link>
      </div>
      <p className="mt-1 text-muted">{x.body}</p>
      <ul className="mt-2 space-y-0.5 text-xs">
        {alt.map(({ d, m }) => (
          <li key={d} className="stat">
            {fill(x.with, { n: d, t: fmtHms(m.projected.finishSec), c: m.chance })}
          </li>
        ))}
      </ul>
      <a href="/science#frequency" className="mt-2 inline-block text-xs text-muted underline hover:text-volt">
        {x.src}
      </a>
    </div>
  );
}
