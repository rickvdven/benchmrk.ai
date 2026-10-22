import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Lang } from '../engine';
import { useIsGymAccount, useManagedGyms } from '../data/hooks';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { GymManager } from '../components/GymManager';
import { PageHeader, Spinner } from '../components/ui';

type K = 'title' | 'intro' | 'createTitle' | 'createIntro' | 'name' | 'city' | 'create' | 'pick';
const T: Record<Lang, Record<K, string>> = {
  en: { title: 'My gym', intro: 'Edit your gym and add sim programs your members can follow.', createTitle: 'Set up your gym', createIntro: 'Your account has the gym label. Create your gym to get a code and invite link for your members, and to add your own sim programs.', name: 'Gym name', city: 'City', create: 'Create gym', pick: 'Gym' },
  nl: { title: 'Mijn gym', intro: 'Bewerk je gym en voeg simprogramma’s toe die je leden kunnen volgen.', createTitle: 'Stel je gym in', createIntro: 'Je account heeft het label gym. Maak je gym aan voor een code en uitnodigingslink voor je leden, en om je eigen simprogramma’s toe te voegen.', name: 'Naam van de gym', city: 'Plaats', create: 'Gym aanmaken', pick: 'Gym' },
  de: { title: 'Mein Gym', intro: 'Bearbeite dein Gym und füge Sim-Programme hinzu, denen deine Mitglieder folgen können.', createTitle: 'Richte dein Gym ein', createIntro: 'Dein Konto hat das Gym-Label. Lege dein Gym an, um einen Code und einen Einladungslink für deine Mitglieder zu erhalten und eigene Sim-Programme hinzuzufügen.', name: 'Name des Gyms', city: 'Ort', create: 'Gym anlegen', pick: 'Gym' },
  es: { title: 'Mi gimnasio', intro: 'Edita tu gimnasio y añade programas de sims que tus miembros puedan seguir.', createTitle: 'Configura tu gimnasio', createIntro: 'Tu cuenta tiene la etiqueta de gimnasio. Crea tu gimnasio para obtener un código y un enlace de invitación para tus miembros y añadir tus propios programas de sims.', name: 'Nombre del gimnasio', city: 'Ciudad', create: 'Crear gimnasio', pick: 'Gimnasio' },
  ko: { title: '내 체육관', intro: '체육관 정보를 수정하고 회원이 따를 수 있는 시뮬 프로그램을 추가하세요.', createTitle: '체육관 설정', createIntro: '계정에 gym 라벨이 있습니다. 체육관을 만들면 회원용 코드와 초대 링크를 받고 나만의 시뮬 프로그램을 추가할 수 있습니다.', name: '체육관 이름', city: '도시', create: '체육관 만들기', pick: '체육관' },
};

/** Gym accounts manage their own gym here; admins reach the same editor from Admin → Gyms. */
export default function MyGym() {
  const { lang } = useI18n();
  const x = T[lang] ?? T.en;
  const qc = useQueryClient();
  const gyms = useManagedGyms();
  const { isGym, loading } = useIsGymAccount();
  const [sel, setSel] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  if (gyms.isLoading || loading) return <Spinner />;
  const list = gyms.data ?? [];
  if (!isGym) return <Navigate to="/cockpit" replace />;
  if (list.length === 0)
    return (
      <>
        <PageHeader title={x.createTitle} />
        <form
          className="panel max-w-lg space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { error } = await supabase.rpc('gym_create', { _name: name, _city: city });
            setBusy(false);
            if (error) return toast.error(error.message);
            await qc.invalidateQueries({ queryKey: ['managed-gyms'] });
          }}
        >
          <p className="text-sm text-muted">{x.createIntro}</p>
          <label className="block text-xs text-muted">
            {x.name}
            <input className="input mt-1" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-xs text-muted">
            {x.city}
            <input className="input mt-1" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <button className="btn-primary" disabled={busy || !name.trim()}>
            {x.create}
          </button>
        </form>
      </>
    );
  const gymId = sel && list.some((g) => g.id === sel) ? sel : list[0].id;
  return (
    <>
      <PageHeader title={x.title} />
      <p className="-mt-3 mb-5 text-sm text-muted">{x.intro}</p>
      {list.length > 1 && (
        <select className="input mb-4 max-w-xs" aria-label={x.pick} value={gymId} onChange={(e) => setSel(e.target.value)}>
          {list.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}
      <GymManager key={gymId} gymId={gymId} />
    </>
  );
}
