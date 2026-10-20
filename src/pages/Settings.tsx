import { useEffect, useState } from 'react';
import { DeviceHelp } from '../components/DeviceHelp';
import { InjuryEditor } from '../components/InjuryEditor';
import { RaceEditor } from '../components/Season';
import { PlacesEditor } from '../components/Places';
import { SimProtocolEditor } from '../components/SimProtocolEditor';
import { GymField } from '../components/Gym';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { calibrationOf, fmtHms, fmtMmss, mondayOf, parseMmss, parseRaceTime, todayISO, type Category, type DayType, type StationMap } from '../engine';
import { useMutations, useMyGym, useProfileRow, useSubscription, useTeam } from '../data/hooks';
import { toAthlete, type ProfileRow } from '../data/mapping';
import { supabase } from '../lib/supabase';
import { LANGS, useI18n, type I18nKey } from '../lib/i18n';
import { Field, NumInput, PageHeader, Segmented, Spinner, TimeInput } from '../components/ui';
import { ScheduleEditor, StationEditor } from '../components/editors';
import { PayPanel } from '../components/Paywall';

const CATS: Category[] = ['solo_open', 'solo_pro', 'doubles_open', 'doubles_pro', 'doubles_mixed', 'relay_open'];
type Tab = 'profile' | 'races' | 'physio' | 'stations' | 'schedule' | 'gym' | 'account';

export default function SettingsPage() {
  const { t, lang, setLang, units, setUnits } = useI18n();
  const prof = useProfileRow();
  const team = useTeam();
  const sub = useSubscription();
  const gym = useMyGym();
  const qc = useQueryClient();
  const { updateProfile } = useMutations();
  if (new URLSearchParams(window.location.search).get('tab') === 'invite') window.history.replaceState(null, '', '/invite');
  const [tab, setTab] = useState<Tab>(() => {
    const q = new URLSearchParams(window.location.search).get('tab');
    return (['profile', 'races', 'physio', 'stations', 'schedule', 'gym', 'account'].includes(q ?? '') ? q : 'profile') as Tab;
  });
  const [d, setD] = useState<ProfileRow | null>(null);
  const [goalOk, setGoalOk] = useState(true);
  useEffect(() => {
    if (prof.data && !d) setD(prof.data);
  }, [prof.data, d]);
  if (!d || !prof.data) return <Spinner />;
  const set = (p: Partial<ProfileRow>) => setD({ ...d, ...p });
  const lockedByTeam = !!team.team && !team.isCaptain;

  const save = async (fields: (keyof ProfileRow)[]) => {
    if (d.lthr && d.max_hr && d.lthr >= d.max_hr) return toast.error(t('onb.hrErr'));
    if (!goalOk) return toast.error(t('onb.goalErr'));
    const patch: Partial<ProfileRow> = {};
    for (const f of fields) (patch as Record<string, unknown>)[f] = d[f];
    const physio = fields.some((f) => f === 'threshold_pace_sec' || f === 'lthr') &&
      (d.threshold_pace_sec !== prof.data!.threshold_pace_sec || d.lthr !== prof.data!.lthr);
    if (physio) {
      patch.baseline = { ...calibrationOf(toAthlete({ ...prof.data!, ...patch } as ProfileRow)), since: todayISO() } as unknown as Record<string, unknown>;
      patch.pace_adjust_sec = 0;
    }
    try {
      await updateProfile(patch);
      if (team.team && team.isCaptain && fields.includes('goal_sec')) {
        await supabase.rpc('update_team', { _race_name: d.race_name, _race_date: d.race_date, _goal_sec: d.goal_sec, _shared_sim_dow: team.team.shared_sim_dow, _captain: null });
        qc.invalidateQueries({ queryKey: ['team'] });
      }
      toast.success(t('st.saved'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const tabs: { k: Tab; l: string }[] = [
    { k: 'profile', l: t('st.profile') },
    { k: 'races', l: t('st.races') },
    { k: 'physio', l: t('st.physio') },
    { k: 'stations', l: t('st.stations') },
    { k: 'schedule', l: t('st.schedule') },
    { k: 'gym', l: t('st.gym') },
    { k: 'account', l: t('st.account') },
  ];

  return (
    <>
      <PageHeader title={t('st.title')} />
      <div className="mb-4 overflow-x-auto">
        <Segmented value={tab} onChange={setTab} options={tabs.map((x) => ({ value: x.k, label: x.l }))} />
      </div>
      <div className="panel space-y-5 p-5">
        {tab === 'profile' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('onb.name')}>
                <input className="input" value={d.display_name ?? ''} onChange={(e) => set({ display_name: e.target.value })} />
              </Field>
              <Field group label={t('onb.sex')}>
                <Segmented value={d.sex ?? 'man'} onChange={(v) => set({ sex: v })} options={[{ value: 'woman', label: t('onb.woman') }, { value: 'man', label: t('onb.man') }]} />
              </Field>
              <Field group label={t('onb.category')} className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {CATS.map((c) => (
                    <button key={c} type="button" onClick={() => set({ category: c })} className={clsx('rounded-lg border px-3 py-2 text-sm', d.category === c ? 'border-volt bg-volt/10 text-volt' : 'border-line text-muted')}>
                      {t(`cat.${c}` as I18nKey)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t('onb.raceName')}>
                <input className="input" disabled={lockedByTeam} value={d.race_name ?? ''} onChange={(e) => set({ race_name: e.target.value })} />
              </Field>
              <Field label={t('onb.raceDate')}>
                <input type="date" className="input" disabled={lockedByTeam} min={todayISO()} value={d.race_date ?? ''} onChange={(e) => set({ race_date: e.target.value })} />
              </Field>
              <Field label={t('onb.goal')} help={lockedByTeam ? t('db.captainOnly') : t('onb.goalHelp')} error={goalOk ? null : t('onb.goalErr')}>
                <TimeInput
                  value={d.goal_sec}
                  parse={parseRaceTime}
                  format={fmtHms}
                  className={lockedByTeam ? 'pointer-events-none opacity-60' : ''}
                  onChange={(v) => {
                    setGoalOk(!!v);
                    if (v) set({ goal_sec: v });
                  }}
                />
              </Field>
              <Field label={t('onb.archetype')}>
                <select className="input" value={d.archetype ?? 'hybrid'} onChange={(e) => set({ archetype: e.target.value as ProfileRow['archetype'] })}>
                  {(['fast_runner', 'diesel', 'hybrid', 'strength'] as const).map((a) => (
                    <option key={a} value={a}>
                      {t(`arch.${a}` as I18nKey)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button className="btn-primary" onClick={() => save(['display_name', 'sex', 'category', 'race_name', 'race_date', 'goal_sec', 'archetype'])}>
              {t('common.save')}
            </button>
          </>
        )}

        {tab === 'races' && <RaceEditor key={JSON.stringify(prof.data.season ?? [])} row={prof.data} />}


        {tab === 'physio' && (
          <>
            <p className="text-xs text-muted">{t('st.manualNote')}</p>
            <DeviceHelp />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('onb.lthr')}>
                <NumInput value={d.lthr} onChange={(v) => set({ lthr: v })} />
              </Field>
              <Field label={t('onb.maxHr')}>
                <NumInput value={d.max_hr} onChange={(v) => set({ max_hr: v })} />
              </Field>
              <Field label={t('onb.tp')}>
                <TimeInput value={d.threshold_pace_sec} parse={parseMmss} format={fmtMmss} onChange={(v) => v && set({ threshold_pace_sec: v })} />
              </Field>
              <Field label={t('onb.restHr')}>
                <NumInput value={d.rest_hr} onChange={(v) => set({ rest_hr: v })} />
              </Field>
              <Field label={t('onb.vo2')}>
                <NumInput value={d.vo2max} onChange={(v) => set({ vo2max: v })} />
              </Field>
              <Field label={t('onb.weeklyKm')}>
                <NumInput value={d.weekly_km} onChange={(v) => set({ weekly_km: v })} />
              </Field>
              <Field label={t('onb.weight')}>
                <NumInput value={d.weight_kg} onChange={(v) => set({ weight_kg: v })} />
              </Field>
            </div>
            <div className="border-t border-line pt-5">
              <InjuryEditor value={d.flags} onChange={(flags) => set({ flags })} />
            </div>
            <button className="btn-primary" onClick={() => save(['lthr', 'max_hr', 'threshold_pace_sec', 'rest_hr', 'vo2max', 'weekly_km', 'weight_kg', 'flags'])}>
              {t('common.save')}
            </button>
          </>
        )}

        {tab === 'stations' && (
          <>
            <p className="text-sm text-muted">{t('onb.stationsIntro')}</p>
            <StationEditor
              stars={d.station_stars}
              times={d.station_times}
              onStars={(v: StationMap<number>) => set({ station_stars: v })}
              onTimes={(v) => set({ station_times: v })}
            />
            <button className="btn-primary" onClick={() => save(['station_stars', 'station_times'])}>
              {t('common.save')}
            </button>
          </>
        )}

        {tab === 'schedule' && (
          <>
            <p className="text-sm text-muted">{t('onb.scheduleHelp')}</p>
            <ScheduleEditor value={(d.week_schedule ?? []) as DayType[]} onChange={(v) => set({ week_schedule: v })} />
            <button className="btn-primary" onClick={() => save(['week_schedule'])}>
              {t('common.save')}
            </button>
          </>
        )}

        {tab === 'gym' && (
          <>
            <p className="text-sm text-muted">{t('st.gymIntro')}</p>
            <GymField ownProtocol={!!prof.data.sim_protocol} onJoined={(g) => set({ equipment: g.equipment })} />
            {!prof.data.places?.length && (
              <>
                <Field group label={t('onb.equipment')} help={t('eq.help')}>
                  <Segmented
                    value={d.equipment ?? 'gym'}
                    onChange={(v) => set({ equipment: v })}
                    options={(['hyrox', 'gym', 'home'] as const).map((v) => ({ value: v, label: t(`eq.${v}` as I18nKey) }))}
                  />
                </Field>
                <button className="btn-primary" onClick={() => save(['equipment'])}>
                  {t('common.save')}
                </button>
              </>
            )}
            <div className="border-t border-line pt-4">
              <PlacesEditor key={JSON.stringify([prof.data.places ?? [], prof.data.place_by_dow ?? []])} row={prof.data} />
            </div>
            <SimProtocolEditor key={gym.data?.id ?? 'none'} current={prof.data.sim_protocol} raceDate={prof.data.race_date} gymName={gym.data?.name} onSave={(sp) => updateProfile({ sim_protocol: sp })} />
          </>
        )}

        {tab === 'account' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field group label={t('st.language')}>
                <Segmented
                  value={lang}
                  onChange={(v) => {
                    setLang(v);
                    void updateProfile({ lang: v });
                  }}
                  options={LANGS}
                />
              </Field>
              <Field group label={t('st.units')}>
                <Segmented
                  value={units}
                  onChange={(v) => {
                    setUnits(v);
                    void updateProfile({ units: v });
                  }}
                  options={[{ value: 'metric', label: t('st.metric') }, { value: 'imperial', label: t('st.imperial') }]}
                />
              </Field>
            </div>
            <div className="space-y-2 border-t border-line pt-4">
              <h3 className="font-semibold">{t('mail.title')}</h3>
              {(['weekly', 'reminders', 'team'] as const).map((k) => {
                const prefs = d.email_prefs ?? { weekly: true, reminders: true, team: true, account: true };
                return (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={prefs[k] !== false}
                      onChange={async (e) => {
                        const next = { ...prefs, [k]: e.target.checked };
                        set({ email_prefs: next });
                        await updateProfile({ email_prefs: next });
                      }}
                    />
                    {t(`mail.${k}` as I18nKey)}
                  </label>
                );
              })}
            </div>
            <div className="space-y-2 border-t border-line pt-4">
              <h3 className="font-semibold">{t('st.subscription')}</h3>
              {sub.data && !sub.data.paywall_enabled && <p className="text-sm text-muted">{t('st.betaFree')}</p>}
              {sub.data && (
                <p className="text-sm">
                  <span className="chip">{sub.data.status}</span>
                  {sub.data.valid_until && <span className="ml-2 text-muted">→ {sub.data.valid_until}</span>}
                </p>
              )}
              {sub.data?.paywall_enabled && sub.data.status !== 'active' && sub.data.status !== 'exempt' && <PayPanel />}
              {sub.data?.paywall_enabled && sub.data.status === 'trial' && sub.data.valid_until && (
                <p className="text-xs text-muted">{t('pay.trialLeft', { n: Math.max(0, Math.ceil((new Date(sub.data.valid_until).getTime() - Date.now()) / 864e5)) })}</p>
              )}
            </div>
            <div className="border-t border-line pt-4">
              <button
                className="btn-ghost btn-sm"
                onClick={async () => {
                  if (!confirm(t('st.dangerZone') + '?')) return;
                  await updateProfile({ plan_start: mondayOf(todayISO()) });
                  toast.success(t('st.saved'));
                }}
              >
                {t('st.dangerZone')}
              </button>
              <p className="mt-2 text-xs text-muted">{prof.data.email}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
