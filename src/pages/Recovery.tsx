import { useI18n } from '../lib/i18n';
import de from '../locales/de.json';
import es from '../locales/es.json';
import ko from '../locales/ko.json';
import { PageHeader } from '../components/ui';

const CONTENT: Record<string, { h: string; p: string[] }[]> = {
  de: de.recovery,
  es: es.recovery,
  ko: ko.recovery,
  en: [
    { h: 'Sleep', p: ['7.5–9 hours is the biggest recovery lever you have.', 'Keep the hard days (threshold, sim) away from short nights.'] },
    { h: 'Fuel & hydration', p: ['Carbohydrate around hard sessions; protein (≈0.3 g/kg) within a couple of hours after training.', 'On sim days and long runs replace sodium as well as water — sweat rates differ a lot between athletes.', 'Practise your race-day fuelling in the dress rehearsal (Benchmark 5).'] },
    { h: 'Heat (sauna)', p: ['Optional: 15–25 min after easy days can support heat tolerance and plasma volume.', 'Skip it the day before a benchmark or race, and rehydrate afterwards.'] },
    { h: 'Tendons', p: ['Tendons adapt slower than muscles. Use the morning stiffness check honestly — the plan switches impact days to low-impact when you score high.', 'Eccentric calf raises 3 × 15 on easy days if you have an Achilles history.'] },
    { h: 'Supplements', p: ['Talk to a doctor or sports dietitian before starting supplements. Creatine and caffeine are the best-researched options for this kind of effort; choose batch-tested products.'] },
    { h: 'Weighted vest', p: ['Not for running if your Achilles or shins are sensitive.', 'Start with incline walking at 5–10% of body weight and progress slowly.'] },
  ],
  nl: [
    { h: 'Slaap', p: ['7,5–9 uur is je grootste herstelknop.', 'Plan de zware dagen (drempel, sim) niet na korte nachten.'] },
    { h: 'Voeding & vocht', p: ['Koolhydraten rond zware trainingen; eiwit (≈0,3 g/kg) binnen een paar uur na de training.', 'Vul op sim-dagen en lange duurlopen ook natrium aan, niet alleen water — zweetverlies verschilt sterk per atleet.', 'Oefen je racevoeding in de generale repetitie (benchmark 5).'] },
    { h: 'Warmte (sauna)', p: ['Optioneel: 15–25 min na rustige dagen kan hittetolerantie en plasmavolume ondersteunen.', 'Sla het over de dag vóór een benchmark of race, en drink daarna goed.'] },
    { h: 'Pezen', p: ['Pezen passen zich trager aan dan spieren. Vul de ochtendstijfheid eerlijk in — het plan zet impactdagen om naar low-impact bij een hoge score.', 'Excentrische kuitheffingen 3 × 15 op rustige dagen als je achillesklachten hebt gehad.'] },
    { h: 'Supplementen', p: ['Overleg met een arts of sportdiëtist voordat je supplementen gebruikt. Creatine en cafeïne zijn het best onderzocht voor dit soort inspanning; kies batch-geteste producten.'] },
    { h: 'Gewichtsvest', p: ['Niet hardlopen met een vest als je achilles of scheenbenen gevoelig zijn.', 'Begin met wandelen op helling met 5–10% van je lichaamsgewicht en bouw langzaam op.'] },
  ],
};

export default function Recovery() {
  const { t, lang } = useI18n();
  return (
    <>
      <PageHeader title={t('rc.title')} />
      <div className="grid gap-4 sm:grid-cols-2">
        {(CONTENT[lang] ?? CONTENT.en).map((b) => (
          <section key={b.h} className="panel p-5">
            <h2 className="mb-2 font-bold text-volt">{b.h}</h2>
            <ul className="space-y-1.5 text-sm text-muted">
              {b.p.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
