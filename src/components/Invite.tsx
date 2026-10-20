import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Copy, Gift, Mail, MessageCircle, Share2, Megaphone } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Lang } from '../engine';
import { useSubscription } from '../data/hooks';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

type K =
  | 'title' | 'sub' | 's1' | 's2' | 's3' | 'link' | 'copy' | 'copied' | 'share' | 'wa' | 'mail' | 'msg' | 'mailSubject'
  | 's3amb' | 'joined' | 'paid' | 'earned' | 'capHit' | 'more' | 'youGot' | 'how'
  | 'ambTitle' | 'ambSub' | 'ambWho' | 'ambTerms' | 'ambKind' | 'coach' | 'gym' | 'creator' | 'other' | 'org' | 'linkF' | 'audience' | 'motivation' | 'apply'
  | 'applied' | 'approved' | 'rejected' | 'paused' | 'pending' | 'approvedC' | 'paidC' | 'payout' | 'sent';
const T: Record<Lang, Record<K, string>> = {
  en: {
    s3amb: 'They become a member → they get {m} month free, you earn {pct}%',
    title: 'Invite friends, train for free', sub: 'HYROX is better together. For every friend who becomes a member you both get {m} month free.',
    s1: 'Share your personal link', s2: 'Your friend starts with a free trial', s3: 'They become a member → you both get {m} month free',
    link: 'Your invite link', copy: 'Copy', copied: 'Link copied', share: 'Share', wa: 'WhatsApp', mail: 'Email',
    msg: 'I train for HYROX with Benchmrk: a plan on your own threshold with a finish-time forecast incl. stations. Start free with my link and we both get a month free: {url}',
    mailSubject: 'Train for HYROX with me',
    joined: 'joined', paid: 'became member', earned: 'months earned', capHit: 'You reached the maximum of {cap} free months. Coach, gym owner or creator? Become an ambassador and earn commission.',
    more: 'Invite friends', youGot: '{name} invited you — you get {m} month extra when you become a member.', how: 'Your doubles partner counts too: joining your team with your team code links them to you.',
    ambTitle: 'Ambassador programme', ambSub: 'For coaches, gyms and creators who bring athletes: free Benchmrk for you, plus {pct}% commission on every paid membership, every year the athlete renews.',
    ambWho: 'Approved by hand. Payouts per quarter on invoice, from {min}.', ambTerms: 'Instead of free months you earn commission once approved.',
    ambKind: 'I am a', coach: 'Coach / PT', gym: 'Gym / box', creator: 'Creator', other: 'Other', org: 'Name / organisation', linkF: 'Website or Instagram', audience: 'Athletes or followers (approx.)', motivation: 'How will you share Benchmrk?',
    apply: 'Apply', applied: 'Application received — we will get back to you.', approved: 'You are an ambassador ({pct}% commission).', rejected: 'Application not approved. You can update it and apply again.', paused: 'Ambassadorship paused.',
    pending: 'Pending', approvedC: 'To be paid', paidC: 'Paid out', payout: 'Send an invoice once “to be paid” is over {min}.', sent: 'Application sent',
  },
  nl: {
    s3amb: 'Wordt lid → je vriend krijgt {m} maand gratis, jij verdient {pct}%',
    title: 'Nodig vrienden uit, train gratis', sub: 'HYROX is samen leuker. Voor elke vriend die lid wordt krijgen jullie allebei {m} maand gratis.',
    s1: 'Deel je persoonlijke link', s2: 'Je vriend start met een gratis proefperiode', s3: 'Wordt lid → jullie krijgen allebei {m} maand gratis',
    link: 'Jouw uitnodigingslink', copy: 'Kopieer', copied: 'Link gekopieerd', share: 'Delen', wa: 'WhatsApp', mail: 'E-mail',
    msg: 'Ik train voor HYROX met Benchmrk: een schema op je eigen drempel met een eindtijdvoorspelling inclusief stations. Start gratis via mijn link, dan krijgen we allebei een maand gratis: {url}',
    mailSubject: 'Train mee voor HYROX',
    joined: 'aangemeld', paid: 'lid geworden', earned: 'maanden verdiend', capHit: 'Je hebt het maximum van {cap} gratis maanden bereikt. Coach, gymeigenaar of creator? Word ambassadeur en verdien commissie.',
    more: 'Vrienden uitnodigen', youGot: '{name} heeft je uitgenodigd — je krijgt {m} maand extra als je lid wordt.', how: 'Ook je dubbelpartner telt: wie met jouw teamcode meedoet, wordt aan jou gekoppeld.',
    ambTitle: 'Ambassadeursprogramma', ambSub: 'Voor coaches, gyms en creators die atleten meebrengen: Benchmrk gratis voor jezelf, plus {pct}% commissie op elk betaald lidmaatschap, elk jaar dat de atleet verlengt.',
    ambWho: 'Handmatig goedgekeurd. Uitbetaling per kwartaal op factuur, vanaf {min}.', ambTerms: 'Na goedkeuring verdien je commissie in plaats van gratis maanden.',
    ambKind: 'Ik ben', coach: 'Coach / PT', gym: 'Gym / box', creator: 'Creator', other: 'Anders', org: 'Naam / organisatie', linkF: 'Website of Instagram', audience: 'Aantal atleten of volgers (ca.)', motivation: 'Hoe ga je Benchmrk delen?',
    apply: 'Aanmelden', applied: 'Aanmelding ontvangen — we nemen contact op.', approved: 'Je bent ambassadeur ({pct}% commissie).', rejected: 'Aanmelding niet goedgekeurd. Je kunt hem aanpassen en opnieuw indienen.', paused: 'Ambassadeurschap gepauzeerd.',
    pending: 'In behandeling', approvedC: 'Uit te betalen', paidC: 'Uitbetaald', payout: 'Stuur een factuur zodra “uit te betalen” boven {min} komt.', sent: 'Aanmelding verstuurd',
  },
  de: {
    s3amb: 'Wird Mitglied → dein Freund bekommt {m} Monat gratis, du verdienst {pct}%',
    title: 'Freunde einladen, gratis trainieren', sub: 'HYROX macht zusammen mehr Spaß. Für jeden Freund, der Mitglied wird, bekommt ihr beide {m} Monat gratis.',
    s1: 'Teile deinen persönlichen Link', s2: 'Dein Freund startet mit einer Gratis-Testphase', s3: 'Wird Mitglied → ihr bekommt beide {m} Monat gratis',
    link: 'Dein Einladungslink', copy: 'Kopieren', copied: 'Link kopiert', share: 'Teilen', wa: 'WhatsApp', mail: 'E-Mail',
    msg: 'Ich trainiere für HYROX mit Benchmrk: ein Plan auf deiner eigenen Schwelle mit Zielzeitprognose inkl. Stationen. Starte gratis mit meinem Link, dann bekommen wir beide einen Monat gratis: {url}',
    mailSubject: 'Trainier mit mir für HYROX',
    joined: 'angemeldet', paid: 'Mitglied geworden', earned: 'Monate verdient', capHit: 'Du hast das Maximum von {cap} Gratismonaten erreicht. Coach, Gym-Betreiber oder Creator? Werde Botschafter und verdiene Provision.',
    more: 'Freunde einladen', youGot: '{name} hat dich eingeladen — du bekommst {m} Monat extra, wenn du Mitglied wirst.', how: 'Auch dein Doppelpartner zählt: Wer mit deinem Teamcode beitritt, wird dir zugeordnet.',
    ambTitle: 'Botschafterprogramm', ambSub: 'Für Coaches, Gyms und Creator, die Athleten mitbringen: Benchmrk gratis für dich, plus {pct}% Provision auf jede bezahlte Mitgliedschaft, jedes Jahr der Verlängerung.',
    ambWho: 'Manuell freigegeben. Auszahlung quartalsweise per Rechnung, ab {min}.', ambTerms: 'Nach Freigabe verdienst du Provision statt Gratismonaten.',
    ambKind: 'Ich bin', coach: 'Coach / PT', gym: 'Gym / Box', creator: 'Creator', other: 'Sonstiges', org: 'Name / Organisation', linkF: 'Website oder Instagram', audience: 'Athleten oder Follower (ca.)', motivation: 'Wie wirst du Benchmrk teilen?',
    apply: 'Bewerben', applied: 'Bewerbung erhalten — wir melden uns.', approved: 'Du bist Botschafter ({pct}% Provision).', rejected: 'Bewerbung nicht angenommen. Du kannst sie anpassen und erneut senden.', paused: 'Botschafterschaft pausiert.',
    pending: 'In Prüfung', approvedC: 'Auszuzahlen', paidC: 'Ausgezahlt', payout: 'Schick eine Rechnung, sobald „auszuzahlen“ über {min} liegt.', sent: 'Bewerbung gesendet',
  },
  es: {
    s3amb: 'Se hace miembro → recibe {m} mes gratis y tú ganas {pct}%',
    title: 'Invita a amigos, entrena gratis', sub: 'HYROX es mejor en compañía. Por cada amigo que se haga miembro, los dos recibís {m} mes gratis.',
    s1: 'Comparte tu enlace personal', s2: 'Tu amigo empieza con una prueba gratis', s3: 'Se hace miembro → los dos recibís {m} mes gratis',
    link: 'Tu enlace de invitación', copy: 'Copiar', copied: 'Enlace copiado', share: 'Compartir', wa: 'WhatsApp', mail: 'Email',
    msg: 'Entreno para HYROX con Benchmrk: un plan basado en tu propio umbral con previsión de tiempo incluyendo estaciones. Empieza gratis con mi enlace y los dos tenemos un mes gratis: {url}',
    mailSubject: 'Entrena conmigo para HYROX',
    joined: 'registrados', paid: 'se hicieron miembros', earned: 'meses ganados', capHit: 'Has alcanzado el máximo de {cap} meses gratis. ¿Coach, gimnasio o creador? Hazte embajador y gana comisión.',
    more: 'Invitar amigos', youGot: '{name} te invitó — recibes {m} mes extra al hacerte miembro.', how: 'Tu pareja de dobles también cuenta: quien se une con tu código de equipo queda vinculado a ti.',
    ambTitle: 'Programa de embajadores', ambSub: 'Para coaches, gimnasios y creadores que traen atletas: Benchmrk gratis para ti, más {pct}% de comisión en cada membresía pagada, cada año que renueve.',
    ambWho: 'Aprobación manual. Pago trimestral con factura, desde {min}.', ambTerms: 'Una vez aprobado ganas comisión en lugar de meses gratis.',
    ambKind: 'Soy', coach: 'Coach / PT', gym: 'Gimnasio / box', creator: 'Creador', other: 'Otro', org: 'Nombre / organización', linkF: 'Web o Instagram', audience: 'Atletas o seguidores (aprox.)', motivation: '¿Cómo vas a compartir Benchmrk?',
    apply: 'Solicitar', applied: 'Solicitud recibida — te contactaremos.', approved: 'Eres embajador ({pct}% de comisión).', rejected: 'Solicitud no aprobada. Puedes editarla y volver a enviarla.', paused: 'Embajador en pausa.',
    pending: 'Pendiente', approvedC: 'Por pagar', paidC: 'Pagado', payout: 'Envía una factura cuando “por pagar” supere {min}.', sent: 'Solicitud enviada',
  },
  ko: {
    s3amb: '멤버가 되면 → 친구는 {m}개월 무료, 당신은 {pct}% 수익',
    title: '친구 초대하고 무료로 훈련하세요', sub: 'HYROX는 함께하면 더 좋습니다. 친구가 멤버가 될 때마다 두 사람 모두 {m}개월 무료.',
    s1: '개인 링크 공유', s2: '친구는 무료 체험으로 시작', s3: '멤버가 되면 → 둘 다 {m}개월 무료',
    link: '초대 링크', copy: '복사', copied: '링크 복사됨', share: '공유', wa: 'WhatsApp', mail: '이메일',
    msg: '나는 Benchmrk으로 HYROX를 준비해요: 내 역치 기반 플랜과 스테이션 포함 완주 예측. 내 링크로 무료로 시작하면 우리 둘 다 한 달 무료: {url}',
    mailSubject: '함께 HYROX 훈련해요',
    joined: '가입', paid: '멤버 전환', earned: '획득 개월', capHit: '무료 {cap}개월 한도에 도달했습니다. 코치, 체육관, 크리에이터라면 앰배서더가 되어 커미션을 받으세요.',
    more: '친구 초대', youGot: '{name}님이 초대했습니다 — 멤버가 되면 {m}개월 추가.', how: '더블스 파트너도 포함: 팀 코드로 참여하면 당신과 연결됩니다.',
    ambTitle: '앰배서더 프로그램', ambSub: '선수를 데려오는 코치, 체육관, 크리에이터: 본인은 Benchmrk 무료, 유료 멤버십마다 {pct}% 커미션 (매년 갱신 시에도).',
    ambWho: '수동 승인. 분기별 인보이스 지급, {min}부터.', ambTerms: '승인 후에는 무료 개월 대신 커미션을 받습니다.',
    ambKind: '나는', coach: '코치 / PT', gym: '체육관 / 박스', creator: '크리에이터', other: '기타', org: '이름 / 단체', linkF: '웹사이트 또는 인스타그램', audience: '선수 또는 팔로워 수 (대략)', motivation: 'Benchmrk를 어떻게 공유하실 건가요?',
    apply: '신청', applied: '신청 접수 — 연락드리겠습니다.', approved: '앰배서더입니다 ({pct}% 커미션).', rejected: '신청이 승인되지 않았습니다. 수정 후 다시 신청할 수 있습니다.', paused: '앰배서더 일시중지.',
    pending: '대기', approvedC: '지급 예정', paidC: '지급 완료', payout: '“지급 예정”이 {min}을 넘으면 인보이스를 보내세요.', sent: '신청 전송됨',
  },
};
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const eur = (c: number) => `€${(c / 100).toFixed(2).replace('.', ',')}`;

export function useInviteText() {
  const { lang } = useI18n();
  return T[lang] ?? T.en;
}

/** Clear invite block: how it works, link + share buttons, progress towards the cap. */
export function InviteCard({ compact = false }: { compact?: boolean }) {
  const x = useInviteText();
  const sub = useSubscription();
  const s = sub.data;
  if (!s) return null;
  const m = s.reward_months ?? 1;
  const cap = s.cap_months ?? 12;
  const amb = s.ambassador?.status === 'approved';
  const url = `${window.location.origin}/?ref=${s.referral_code}`;
  const text = fill(x.msg, { url });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(x.copied);
    } catch {
      toast.error(url);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Benchmrk', text, url });
      } catch {
        /* cancelled */
      }
    } else void copy();
  };
  const earned = s.referral_months ?? 0;
  if (compact)
    return (
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <Gift className="h-5 w-5 text-volt" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{x.title}</p>
          <p className="text-xs text-muted">{fill(x.sub, { m })}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={share}>
          <Share2 className="h-4 w-4" /> {x.share}
        </button>
        <Link to="/invite" className="btn-ghost btn-sm">
          {x.more}
        </Link>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Gift className="mt-0.5 h-6 w-6 shrink-0 text-volt" aria-hidden />
        <div>
          <p className="text-lg font-bold">{x.title}</p>
          <p className="text-sm text-muted">{amb ? x.ambTerms : fill(x.sub, { m })}</p>
        </div>
      </div>
      {s.referred_by_name && !s.friend_bonus_given && <p className="rounded-lg bg-sky/10 p-2.5 text-xs text-sky">{fill(x.youGot, { name: s.referred_by_name, m })}</p>}
      <ol className="grid gap-2 sm:grid-cols-3">
        {[x.s1, x.s2, amb ? fill(x.s3amb, { m, pct: s.ambassador?.commission_pct ?? 20 }) : fill(x.s3, { m })].map((st, i) => (
          <li key={i} className="flex gap-2 rounded-lg border border-line p-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-volt text-xs font-bold text-black">{i + 1}</span>
            {st}
          </li>
        ))}
      </ol>
      <div>
        <p className="label">{x.link}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <input className="input flex-1 font-mono text-xs" readOnly value={url} onFocus={(e) => e.target.select()} aria-label={x.link} />
          <button className="btn-ghost" onClick={copy}>
            <Copy className="h-4 w-4" /> {x.copy}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-primary btn-sm" onClick={share}>
            <Share2 className="h-4 w-4" /> {x.share}
          </button>
          <a className="btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> {x.wa}
          </a>
          <a className="btn-ghost btn-sm" href={`mailto:?subject=${encodeURIComponent(x.mailSubject)}&body=${encodeURIComponent(text)}`}>
            <Mail className="h-4 w-4" /> {x.mail}
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">{x.how}</p>
      </div>
      {!amb && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-panel2 p-3">
            <div className="stat text-2xl font-bold">{s.referrals ?? 0}</div>
            <div className="text-xs text-muted">{x.joined}</div>
          </div>
          <div className="rounded-lg bg-panel2 p-3">
            <div className="stat text-2xl font-bold">{s.referrals_paid ?? 0}</div>
            <div className="text-xs text-muted">{x.paid}</div>
          </div>
          <div className="rounded-lg bg-panel2 p-3">
            <div className="stat text-2xl font-bold">
              {earned}
              <span className="text-sm text-muted">/{cap}</span>
            </div>
            <div className="text-xs text-muted">{x.earned}</div>
            <div className="mt-1.5 h-1.5 rounded-full bg-line" aria-hidden>
              <div className="h-full rounded-full bg-volt" style={{ width: `${Math.min(100, (earned / cap) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}
      {!amb && earned >= cap && <p className="text-xs text-warn">{fill(x.capHit, { cap })}</p>}
    </div>
  );
}

/** Ambassador application and commission overview. */
export function AmbassadorPanel() {
  const x = useInviteText();
  const sub = useSubscription();
  const qc = useQueryClient();
  const s = sub.data;
  const [f, setF] = useState({ kind: 'coach', org: '', link: '', audience: '', motivation: '' });
  const [busy, setBusy] = useState(false);
  if (!s) return null;
  const a = s.ambassador;
  const pct = a?.commission_pct ?? 20;
  const min = eur(s.min_payout_cents ?? 2500);
  const apply = async () => {
    if (!f.org.trim() || !f.motivation.trim()) return toast.error(x.org);
    setBusy(true);
    const { error } = await supabase.rpc('ambassador_apply', { _kind: f.kind, _org: f.org, _link: f.link, _audience: f.audience, _motivation: f.motivation });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(x.sent);
    qc.invalidateQueries({ queryKey: ['sub'] });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Megaphone className="mt-0.5 h-6 w-6 shrink-0 text-sky" aria-hidden />
        <div>
          <p className="text-lg font-bold">{x.ambTitle}</p>
          <p className="text-sm text-muted">{fill(x.ambSub, { pct })}</p>
          <p className="text-xs text-muted">{fill(x.ambWho, { min })}</p>
        </div>
      </div>
      {a && <p className={clsx('rounded-lg p-2.5 text-sm', a.status === 'approved' ? 'bg-good/10 text-good' : a.status === 'rejected' ? 'bg-bad/10 text-bad' : 'bg-sky/10 text-sky')}>{fill(x[a.status], { pct })}</p>}
      {a?.status === 'approved' && s.commission && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['pending', s.commission.pending],
                ['approvedC', s.commission.approved],
                ['paidC', s.commission.paid],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-panel2 p-3">
                <div className="stat text-xl font-bold">{eur(v)}</div>
                <div className="text-xs text-muted">{x[k]}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">{fill(x.payout, { min })}</p>
        </>
      )}
      {(!a || a.status === 'rejected') && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            {x.ambKind}
            <select className="input mt-1" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {(['coach', 'gym', 'creator', 'other'] as const).map((k) => (
                <option key={k} value={k}>
                  {x[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {x.org}
            <input className="input mt-1" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} />
          </label>
          <label className="text-xs text-muted">
            {x.linkF}
            <input className="input mt-1" value={f.link} placeholder="https://" onChange={(e) => setF({ ...f, link: e.target.value })} />
          </label>
          <label className="text-xs text-muted">
            {x.audience}
            <input className="input mt-1" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} />
          </label>
          <label className="text-xs text-muted sm:col-span-2">
            {x.motivation}
            <textarea className="input mt-1 h-20 py-2" value={f.motivation} onChange={(e) => setF({ ...f, motivation: e.target.value })} />
          </label>
          <button className="btn-primary sm:col-span-2" disabled={busy} onClick={apply}>
            {x.apply}
          </button>
        </div>
      )}
    </div>
  );
}
