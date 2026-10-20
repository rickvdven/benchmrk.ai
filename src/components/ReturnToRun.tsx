import { useState } from 'react';
import { toast } from 'sonner';
import { Footprints } from 'lucide-react';
import { daysBetween, injuriesOf, returnWeek, runInjury, RUN_AREAS, withInjuries, type Flags, type Lang } from '../engine';
import { useMutations } from '../data/hooks';
import { useI18n } from '../lib/i18n';

type K = 'now' | 'nowSub' | 'c1' | 'c2' | 'c3' | 'btn' | 'done' | 'ret' | 'retSub' | 'healed' | 'healedDone' | 'physio';
const T: Record<Lang, Record<K, string>> = {
  en: {
    now: 'No running for now – day {d} of your injury',
    nowSub: 'Your runs are replaced by bike/rower/SkiErg at the same heart-rate zones, with calf rehab in every session. A running calf strain usually takes ~3–5 weeks.',
    c1: 'Walking is pain-free',
    c2: '20–25 single-leg calf raises on the injured side, pain max 2/10',
    c3: '10 single-leg hops pain-free',
    btn: 'I passed the test – start walk-run',
    done: 'Return started: 3 weeks of walk-run, threshold work comes back last',
    ret: 'Return to running · week {w} of 3',
    retSub: 'Walk-run builds up; long runs and threshold come back in week 3. Pain max 5/10 and not worse next morning – otherwise step back.',
    healed: 'Fully recovered',
    healedDone: 'Marked as recovered – your normal plan is back',
    physio: 'No progress after 2 weeks, or worse week to week? See a physio.',
  },
  nl: {
    now: 'Voorlopig niet hardlopen – dag {d} van je blessure',
    nowSub: 'Je runs zijn vervangen door fiets/roeier/SkiErg in dezelfde hartslagzones, met kuitrevalidatie in elke training. Een kuitblessure bij het hardlopen duurt meestal ~3–5 weken.',
    c1: 'Wandelen gaat pijnvrij',
    c2: '20–25 keer kuitheffen op één been aan de geblesseerde kant, pijn max 2/10',
    c3: '10 hops op één been pijnvrij',
    btn: 'Test gehaald – start wandel-hardloop',
    done: 'Terugkeer gestart: 3 weken wandel-hardloop, drempelwerk komt als laatste terug',
    ret: 'Terugkeer naar hardlopen · week {w} van 3',
    retSub: 'Wandel-hardloop bouwt op; duurloop en drempel komen terug in week 3. Pijn max 5/10 en morgenochtend niet erger – anders een stap terug.',
    healed: 'Volledig hersteld',
    healedDone: 'Als hersteld gemarkeerd – je normale schema is terug',
    physio: 'Na 2 weken geen vooruitgang, of week op week erger? Ga naar een fysio.',
  },
  de: {
    now: 'Vorerst kein Laufen – Tag {d} deiner Verletzung',
    nowSub: 'Deine Läufe sind durch Rad/Rudern/SkiErg in denselben Pulszonen ersetzt, mit Wadenreha in jeder Einheit. Eine Wadenverletzung beim Laufen dauert meist ~3–5 Wochen.',
    c1: 'Gehen ist schmerzfrei', c2: '20–25 einbeinige Wadenheber auf der verletzten Seite, Schmerz max 2/10', c3: '10 einbeinige Hops schmerzfrei',
    btn: 'Test bestanden – Geh-Lauf starten', done: 'Rückkehr gestartet: 3 Wochen Geh-Lauf, Schwellenarbeit kommt zuletzt',
    ret: 'Rückkehr zum Laufen · Woche {w} von 3', retSub: 'Geh-Lauf baut auf; langer Lauf und Schwelle kommen in Woche 3 zurück. Schmerz max 5/10 und am Morgen nicht schlimmer – sonst einen Schritt zurück.',
    healed: 'Vollständig erholt', healedDone: 'Als erholt markiert – dein normaler Plan ist zurück', physio: 'Nach 2 Wochen kein Fortschritt oder schlimmer? Zum Physio.',
  },
  es: {
    now: 'De momento sin correr – día {d} de tu lesión',
    nowSub: 'Tus carreras se sustituyen por bici/remo/SkiErg en las mismas zonas de pulso, con rehab de gemelo en cada sesión. Una lesión de gemelo corriendo suele tardar ~3–5 semanas.',
    c1: 'Caminar no duele', c2: '20–25 elevaciones de gemelo a una pierna en el lado lesionado, dolor máx 2/10', c3: '10 saltos a una pierna sin dolor',
    btn: 'Test superado – empezar caminar-correr', done: 'Vuelta iniciada: 3 semanas de caminar-correr, el umbral vuelve al final',
    ret: 'Vuelta a correr · semana {w} de 3', retSub: 'Caminar-correr progresa; tirada larga y umbral vuelven en la semana 3. Dolor máx 5/10 y no peor a la mañana siguiente – si no, un paso atrás.',
    healed: 'Totalmente recuperado', healedDone: 'Marcado como recuperado – vuelve tu plan normal', physio: '¿Sin progreso tras 2 semanas o peor cada semana? Ve al fisio.',
  },
  ko: {
    now: '당분간 러닝 금지 – 부상 {d}일차',
    nowSub: '러닝은 같은 심박 존의 자전거/로잉/SkiErg로 대체되고, 모든 세션에 종아리 재활이 들어가요. 러닝 중 종아리 부상은 보통 ~3–5주 걸려요.',
    c1: '걷기에 통증 없음', c2: '다친 쪽 한 발 카프레이즈 20–25회, 통증 최대 2/10', c3: '한 발 홉 10회 통증 없음',
    btn: '테스트 통과 – 걷기-달리기 시작', done: '복귀 시작: 3주 걷기-달리기, 역치는 마지막에 돌아와요',
    ret: '러닝 복귀 · 3주 중 {w}주', retSub: '걷기-달리기가 늘어나고, 장거리와 역치는 3주차에 돌아와요. 통증 최대 5/10, 다음 날 아침 악화 없음 – 아니면 한 단계 뒤로.',
    healed: '완전히 회복', healedDone: '회복으로 표시 – 기본 플랜이 돌아왔어요', physio: '2주 후 진전이 없거나 매주 악화되면? 물리치료사에게.',
  },
};

/** Cockpit: while running is off – the return test; during the walk-run return – progress and "fully recovered". */
export function ReturnToRun({ flags, today }: { flags: Flags | null | undefined; today: string }) {
  const { lang } = useI18n();
  const x = T[lang] ?? T.en;
  const { updateProfile } = useMutations();
  const [ok, setOk] = useState([false, false, false]);
  const ri = runInjury(flags, today);
  const w = returnWeek(flags, today);
  if (!flags || (!ri && !w)) return null;
  const inj = injuriesOf(flags);
  const set = async (to: 'recent' | 'past', msg: string) => {
    const next = { ...inj };
    for (const a of RUN_AREAS) if (next[a] === (to === 'recent' ? 'now' : 'recent')) next[a] = to;
    await updateProfile({ flags: withInjuries(flags, next, undefined, today) });
    toast.success(msg);
  };
  if (ri) {
    const d = daysBetween(ri.since, today) + 1;
    return (
      <div className="panel border-warn/50 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <Footprints className="h-5 w-5 text-warn" aria-hidden /> {x.now.replace('{d}', String(d))}
        </p>
        <p className="mt-1 text-muted">{x.nowSub}</p>
        <div className="mt-3 space-y-1.5">
          {[x.c1, x.c2, x.c3].map((c, i) => (
            <label key={i} className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 accent-[rgb(var(--volt))]" checked={ok[i]} onChange={(e) => setOk(ok.map((v, k) => (k === i ? e.target.checked : v)))} />
              <span>{c}</span>
            </label>
          ))}
        </div>
        <button className="btn-primary btn-sm mt-3" disabled={!ok.every(Boolean)} onClick={() => set('recent', x.done)}>
          {x.btn}
        </button>
        {d >= 14 && <p className="mt-2 text-xs text-warn">{x.physio}</p>}
      </div>
    );
  }
  return (
    <div className="panel border-sky/50 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Footprints className="h-5 w-5 text-sky" aria-hidden /> {x.ret.replace('{w}', String(w))}
      </p>
      <p className="mt-1 text-muted">{x.retSub}</p>
      <button className="btn-ghost btn-sm mt-3" onClick={() => set('past', x.healedDone)}>
        {x.healed}
      </button>
    </div>
  );
}
