import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import type { Lang } from '../engine';
import { useI18n } from '../lib/i18n';
import { PageHeader } from '../components/ui';
import { AmbassadorPanel, InviteCard } from '../components/Invite';

const T: Record<Lang, { title: string; partner: string; partnerSub: string; cta: string }> = {
  en: { title: 'Invite & partners', partner: 'Racing doubles?', partnerSub: 'Link your partner with a team code: one shared forecast, station split and sim day — and they count as your invite.', cta: 'Go to Doubles' },
  nl: { title: 'Uitnodigen & partners', partner: 'Race je dubbel?', partnerSub: 'Koppel je partner met een teamcode: één gezamenlijke voorspelling, stationverdeling en sim-dag — en hij of zij telt als jouw uitnodiging.', cta: 'Naar Dubbel' },
  de: { title: 'Einladen & Partner', partner: 'Startest du im Doppel?', partnerSub: 'Verbinde deinen Partner per Teamcode: gemeinsame Prognose, Stationsaufteilung und Sim-Tag — und er zählt als deine Einladung.', cta: 'Zu Doubles' },
  es: { title: 'Invitar y partners', partner: '¿Corres en dobles?', partnerSub: 'Vincula a tu pareja con un código de equipo: previsión común, reparto de estaciones y día de sim — y cuenta como tu invitación.', cta: 'Ir a Dobles' },
  ko: { title: '초대 & 파트너', partner: '더블스로 출전하나요?', partnerSub: '팀 코드로 파트너를 연결하세요: 공동 예측, 스테이션 분담, 시뮬 데이 — 그리고 초대로도 계산됩니다.', cta: '더블스로 이동' },
};

export default function InvitePage() {
  const { lang } = useI18n();
  const x = T[lang] ?? T.en;
  return (
    <>
      <PageHeader title={x.title} />
      <div className="space-y-4">
        <section className="panel p-5">
          <InviteCard />
        </section>
        <section className="panel flex flex-wrap items-center gap-3 p-5">
          <Users className="h-6 w-6 text-sky" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{x.partner}</p>
            <p className="text-sm text-muted">{x.partnerSub}</p>
          </div>
          <Link to="/doubles" className="btn-ghost btn-sm">
            {x.cta}
          </Link>
        </section>
        <section className="panel p-5">
          <AmbassadorPanel />
        </section>
      </div>
    </>
  );
}
