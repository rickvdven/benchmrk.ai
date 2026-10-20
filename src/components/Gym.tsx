import { useState } from 'react';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Lang } from '../engine';
import { useMyGym, type MyGym } from '../data/hooks';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

type K = 'title' | 'sub' | 'code' | 'join' | 'joined' | 'member' | 'follows' | 'leave' | 'left' | 'notFound' | 'own';
const T: Record<Lang, Record<K, string>> = {
  en: { title: 'Your gym', sub: 'Got a gym code? Your sims then follow your gym’s build-up and equipment.', code: 'Gym code', join: 'Join', joined: 'Linked to {name}', member: 'Member of {name}', follows: 'Your sims follow the {name} build-up.', leave: 'Leave gym', left: 'No longer linked to a gym', notFound: 'Gym code not found', own: 'You use your own build-up (see below); choose “Follow my gym” there to switch back.' },
  nl: { title: 'Je gym', sub: 'Heb je een gymcode? Dan volgen je sims de opbouw en het materiaal van je gym.', code: 'Gymcode', join: 'Koppelen', joined: 'Gekoppeld aan {name}', member: 'Lid van {name}', follows: 'Je sims volgen de opbouw van {name}.', leave: 'Gym ontkoppelen', left: 'Niet meer gekoppeld aan een gym', notFound: 'Gymcode niet gevonden', own: 'Je gebruikt een eigen opbouw (zie hieronder); kies daar “Volg mijn gym” om terug te gaan.' },
  de: { title: 'Dein Gym', sub: 'Hast du einen Gym-Code? Dann folgen deine Sims dem Aufbau und Equipment deines Gyms.', code: 'Gym-Code', join: 'Verbinden', joined: 'Verbunden mit {name}', member: 'Mitglied bei {name}', follows: 'Deine Sims folgen dem Aufbau von {name}.', leave: 'Gym trennen', left: 'Mit keinem Gym mehr verbunden', notFound: 'Gym-Code nicht gefunden', own: 'Du nutzt einen eigenen Aufbau (unten); wähle dort „Meinem Gym folgen“, um zurückzuwechseln.' },
  es: { title: 'Tu gimnasio', sub: '¿Tienes un código de gimnasio? Tus sims seguirán la progresión y el material de tu gimnasio.', code: 'Código de gimnasio', join: 'Vincular', joined: 'Vinculado a {name}', member: 'Miembro de {name}', follows: 'Tus sims siguen la progresión de {name}.', leave: 'Desvincular gimnasio', left: 'Ya no estás vinculado a un gimnasio', notFound: 'Código no encontrado', own: 'Usas tu propia progresión (abajo); elige allí «Seguir a mi gimnasio» para volver.' },
  ko: { title: '내 체육관', sub: '체육관 코드가 있나요? 시뮬이 체육관의 빌드업과 장비를 따릅니다.', code: '체육관 코드', join: '연결', joined: '{name}에 연결됨', member: '{name} 회원', follows: '시뮬이 {name}의 빌드업을 따릅니다.', leave: '체육관 연결 해제', left: '체육관 연결 해제됨', notFound: '체육관 코드를 찾을 수 없음', own: '나만의 빌드업을 사용 중입니다 (아래); “체육관 따르기”를 선택하면 돌아갑니다.' },
};
const fill = (s: string, p: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '');
export const gymText = (lang: Lang) => T[lang] ?? T.en;

export async function joinGym(code: string): Promise<{ name: string } | null> {
  const { data, error } = await supabase.rpc('join_gym', { _code: code });
  if (error) return null;
  return data as { name: string };
}

/** Join / show / leave a gym. `onJoined` lets the intake update its draft (equipment). */
export function GymField({ onJoined, ownProtocol }: { onJoined?: (g: MyGym) => void; ownProtocol?: boolean }) {
  const { lang } = useI18n();
  const x = gymText(lang);
  const gym = useMyGym();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ['gym'] }), qc.invalidateQueries({ queryKey: ['profile'] })]);
    return (await qc.fetchQuery({ queryKey: ['gym', (await supabase.auth.getUser()).data.user?.id] })) as MyGym | null;
  };
  const g = gym.data;
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Building2 className="h-4 w-4 text-volt" aria-hidden /> {x.title}
      </p>
      {g ? (
        <>
          <p className="text-sm">{fill(x.member, { name: g.name })}</p>
          <p className="text-xs text-muted">{ownProtocol ? x.own : fill(x.follows, { name: g.name })}</p>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={async () => {
              await supabase.rpc('leave_gym');
              await refresh();
              toast.success(x.left);
            }}
          >
            {x.leave}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted">{x.sub}</p>
          <div className="flex gap-2">
            <input className="input stat uppercase tracking-widest" value={code} placeholder="GROESBEEK" aria-label={x.code} onChange={(e) => setCode(e.target.value)} />
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={busy || code.trim().length < 3}
              onClick={async () => {
                setBusy(true);
                const r = await joinGym(code);
                setBusy(false);
                if (!r) return toast.error(x.notFound);
                const fresh = await refresh();
                toast.success(fill(x.joined, { name: r.name }));
                if (fresh) onJoined?.(fresh);
              }}
            >
              {x.join}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
