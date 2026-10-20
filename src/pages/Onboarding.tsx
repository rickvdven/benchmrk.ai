import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  STATIONS,
  calibrationOf,
  defaultSchedule,
  fmtHms,
  fmtMmss,
  mondayOf,
  parseMmss,
  parseRaceTime,
  todayISO,
  type Archetype,
  type Category,
  type DayType,
  type Flags,
  type SimProtocol,
  type StationMap,
} from '../engine';
import { useMutations, useMyGym, useProfileRow } from '../data/hooks';
import { toAthlete, type ProfileRow } from '../data/mapping';
import { useI18n, type I18nKey } from '../lib/i18n';
import { Field, NumInput, Segmented, Spinner, TimeInput } from '../components/ui';
import { ScheduleEditor, StationEditor } from '../components/editors';
import { TeamPair } from '../components/TeamPair';
import { DeviceHelp } from '../components/DeviceHelp';
import { InjuryEditor } from '../components/InjuryEditor';
import { DISCLAIMER } from '../components/Disclaimer';
import { useSimTemplates } from '../components/SimProtocolEditor';
import { GymField } from '../components/Gym';
import { notify } from '../lib/notify';

const CATS: Category[] = ['solo_open', 'solo_pro', 'doubles_open', 'doubles_pro', 'doubles_mixed', 'relay_open'];
const ARCH: Archetype[] = ['fast_runner', 'diesel', 'hybrid', 'strength'];

interface Draft {
  display_name: string;
  sex: 'woman' | 'man' | null;
  category: Category | null;
  race_name: string;
  race_date: string;
  goal_sec: number | null;
  archetype: Archetype;
  weight_kg: number | null;
  birth_year: number | null;
  lthr: number | null;
  max_hr: number | null;
  rest_hr: number | null;
  threshold_pace_sec: number | null;
  pr5k_sec: number | null;
  vo2max: number | null;
  weekly_km: number | null;
  flags: Flags;
  station_stars: StationMap<number>;
  station_times: Partial<StationMap<number>>;
  week_schedule: DayType[];
  equipment: 'hyrox' | 'gym' | 'home';
  sim_protocol: SimProtocol | null;
}

const fromRow = (r: ProfileRow | null | undefined): Draft => ({
  display_name: r?.display_name && r.display_name !== r.email?.split('@')[0] ? r.display_name : '',
  sex: r?.sex ?? null,
  category: r?.category ?? null,
  race_name: r?.race_name ?? '',
  race_date: r?.race_date ?? '',
  goal_sec: r?.goal_sec ?? null,
  archetype: r?.archetype ?? 'hybrid',
  weight_kg: r?.weight_kg ?? null,
  birth_year: r?.birth_year ?? null,
  lthr: r?.lthr ?? null,
  max_hr: r?.max_hr ?? null,
  rest_hr: r?.rest_hr ?? null,
  threshold_pace_sec: r?.threshold_pace_sec ?? null,
  pr5k_sec: r?.pr5k_sec ?? null,
  vo2max: r?.vo2max ?? null,
  weekly_km: r?.weekly_km ?? null,
  flags: r?.flags ?? { achilles: false, quad: false, back: false, shin: false },
  station_stars: (r?.station_stars ?? Object.fromEntries(STATIONS.map((s) => [s, 3]))) as StationMap<number>,
  station_times: r?.station_times ?? {},
  week_schedule: r?.week_schedule?.length === 7 ? r.week_schedule : defaultSchedule(5),
  equipment: r?.equipment ?? 'gym',
  sim_protocol: r?.sim_protocol ?? null,
});

export function validate(d: Draft, step: number) {
  const e: Record<string, string> = {};
  if (step === 0 || step === -1) {
    if (!d.display_name.trim()) e.display_name = '!';
    if (!d.sex) e.sex = '!';
    if (!d.category) e.category = '!';
    if (!d.race_date || d.race_date <= todayISO()) e.race_date = 'onb.dateErr';
    if (!d.goal_sec) e.goal_sec = 'onb.goalErr';
  }
  if (step === 1 || step === -1) {
    if (!d.lthr || d.lthr < 100 || d.lthr > 220) e.lthr = '!';
    if (!d.max_hr || d.max_hr < 120 || d.max_hr > 230) e.max_hr = '!';
    if (d.lthr && d.max_hr && d.lthr >= d.max_hr) e.lthr = 'onb.hrErr';
    if (d.rest_hr && d.lthr && d.rest_hr >= d.lthr) e.rest_hr = '!';
    if (!d.threshold_pace_sec || d.threshold_pace_sec < 165 || d.threshold_pace_sec > 540) e.threshold_pace_sec = 'onb.tpErr';
  }
  if (step === 3 || step === -1) {
    if (d.week_schedule.filter((x) => x !== 'rest' && x !== 'recovery').length < 1) e.week_schedule = 'onb.noDays';
  }
  return e;
}

export default function Onboarding() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const prof = useProfileRow();
  const { updateProfile } = useMutations();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState(false);
  const simTpl = useSimTemplates();
  const gym = useMyGym();
  const [ackErr, setAckErr] = useState(false);

  useEffect(() => {
    if (prof.data !== undefined && !d) setD(fromRow(prof.data));
  }, [prof.data, d]);
  useEffect(() => {
    if (gym.data && d && d.equipment !== gym.data.equipment && !d.sim_protocol) setD({ ...d, equipment: gym.data.equipment });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym.data?.id]);
  const errors = useMemo(() => (d ? validate(d, step) : {}), [d, step]);
  if (!d) return <Spinner />;
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });
  const err = (k: string) => (tried && errors[k] ? (errors[k] === '!' ? ' ' : t(errors[k] as I18nKey)) : null);
  const inv = (k: string) => (tried && errors[k] ? 'border-bad' : '');
  const steps = [t('onb.s1'), t('onb.s2'), t('onb.s3'), t('onb.s4')];

  const next = () => {
    if (Object.keys(errors).length) {
      setTried(true);
      return;
    }
    setTried(false);
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const finish = async () => {
    if (!ack && !prof.data?.disclaimer_accepted_at) {
      setAckErr(true);
      return;
    }
    const all = validate(d, -1);
    if (Object.keys(all).length) {
      // jump to the first step with a problem and say what it is
      const bad = [0, 1, 3].find((st) => Object.keys(validate(d, st)).length) ?? 3;
      const firstMsg = Object.values(validate(d, bad)).find((m) => m !== '!');
      setTried(true);
      setStep(bad);
      toast.error(firstMsg ? t(firstMsg as I18nKey) : t('onb.fixStep', { n: bad + 1 }));
      return;
    }
    setBusy(true);
    try {
      const fresh = (await prof.refetch()).data;
      const patch: Partial<ProfileRow> = {
        ...d,
        onboarded: true,
        plan_start: fresh?.plan_start ?? mondayOf(todayISO()),
        disclaimer_accepted_at: fresh?.disclaimer_accepted_at ?? new Date().toISOString(),
      };
      if (fresh?.team_id) {
        // joined a team during intake: race and goal come from the team
        patch.race_name = fresh.race_name ?? d.race_name;
        patch.race_date = fresh.race_date ?? d.race_date;
        patch.goal_sec = fresh.goal_sec ?? d.goal_sec;
      }
      const athlete = toAthlete({ ...(prof.data as ProfileRow), ...patch } as ProfileRow);
      patch.baseline = { ...calibrationOf(athlete), since: todayISO() } as unknown as Record<string, unknown>;
      await updateProfile(patch);
      toast.success(t('onb.saved'));
      void notify('welcome');
      nav('/cockpit');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="eyebrow mb-1">{t('onb.step', { n: step + 1 })}</div>
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">{steps[step]}</h1>
      <div className="mb-6 grid grid-cols-4 gap-1">
        {steps.map((_, i) => (
          <div key={i} className={clsx('h-1.5 rounded-full', i <= step ? 'bg-volt' : 'bg-line')} />
        ))}
      </div>

      <div className="panel space-y-5 p-5 sm:p-6">
        {step === 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('onb.name')} help={t('onb.nameHelp')} error={err('display_name')}>
                <input className={clsx('input', inv('display_name'))} autoComplete="given-name" placeholder={t('onb.namePh')} value={d.display_name} onChange={(e) => set({ display_name: e.target.value })} />
              </Field>
              <Field group label={t('onb.sex')} error={err('sex')}>
                <Segmented value={d.sex ?? ('' as 'man')} onChange={(v) => set({ sex: v })} options={[{ value: 'woman', label: t('onb.woman') }, { value: 'man', label: t('onb.man') }]} />
              </Field>
              <Field group label={t('onb.category')} error={err('category')} className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {CATS.map((c) => (
                    <button key={c} type="button" onClick={() => set({ category: c })} className={clsx('rounded-lg border px-3 py-2 text-sm', d.category === c ? 'border-volt bg-volt/10 text-volt' : 'border-line text-muted hover:text-fg', tried && !d.category && 'border-bad')}>
                      {t(`cat.${c}` as I18nKey)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t('onb.raceName')}>
                <input className="input" value={d.race_name} placeholder="HYROX Amsterdam" onChange={(e) => set({ race_name: e.target.value })} />
              </Field>
              <Field label={t('onb.raceDate')} error={err('race_date')}>
                <input type="date" className={clsx('input', inv('race_date'))} min={todayISO()} value={d.race_date} onChange={(e) => set({ race_date: e.target.value })} />
              </Field>
              <Field label={t('onb.goal')} help={t('onb.goalHelp')} error={err('goal_sec')}>
                <TimeInput className={inv('goal_sec')} value={d.goal_sec} parse={parseRaceTime} format={fmtHms} placeholder="1:25:00" onChange={(v) => set({ goal_sec: v })} />
              </Field>
            </div>
            <div className="space-y-2 border-t border-line pt-5">
              <p className="font-semibold">{t('onb.archetype')}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {ARCH.map((a) => (
                  <button key={a} type="button" onClick={() => set({ archetype: a })} className={clsx('rounded-lg border p-3 text-left', d.archetype === a ? 'border-volt bg-volt/10' : 'border-line hover:border-muted')}>
                    <div className="font-semibold">{t(`arch.${a}` as I18nKey)}</div>
                    <div className="mt-1 text-xs text-muted">{t(`arch.${a}.d` as I18nKey)}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <DeviceHelp />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('onb.lthr')} help={t('onb.lthrHelp')} error={err('lthr')}>
                <NumInput className={inv('lthr')} value={d.lthr} onChange={(v) => set({ lthr: v })} placeholder="170" />
              </Field>
              <Field label={t('onb.maxHr')} error={err('max_hr')}>
                <NumInput className={inv('max_hr')} value={d.max_hr} onChange={(v) => set({ max_hr: v })} placeholder="190" />
              </Field>
              <Field label={t('onb.tp')} help={t('onb.tpHelp')} error={err('threshold_pace_sec')}>
                <TimeInput className={inv('threshold_pace_sec')} value={d.threshold_pace_sec} parse={parseMmss} format={fmtMmss} placeholder="5:00" onChange={(v) => set({ threshold_pace_sec: v })} />
              </Field>
              <Field
                group
                label={t('onb.pr5k')}
                help={
                  d.pr5k_sec ? (
                    <button type="button" className="text-volt underline" onClick={() => set({ threshold_pace_sec: Math.round((d.pr5k_sec! / 5) * 1.065) })}>
                      {t('onb.tpFrom5k')} → {fmtMmss((d.pr5k_sec / 5) * 1.065)}/km
                    </button>
                  ) : undefined
                }
              >
                <TimeInput value={d.pr5k_sec} parse={parseMmss} format={fmtMmss} placeholder="22:30" onChange={(v) => set({ pr5k_sec: v })} />
              </Field>
              <Field label={`${t('onb.restHr')} (${t('common.optional')})`} error={err('rest_hr')}>
                <NumInput value={d.rest_hr} onChange={(v) => set({ rest_hr: v })} placeholder="52" />
              </Field>
              <Field label={`${t('onb.vo2')} (${t('common.optional')})`}>
                <NumInput value={d.vo2max} onChange={(v) => set({ vo2max: v })} placeholder="50" />
              </Field>
              <Field label={t('onb.weeklyKm')}>
                <NumInput value={d.weekly_km} onChange={(v) => set({ weekly_km: v })} placeholder="25" />
              </Field>
              <Field label={`${t('onb.weight')} (${t('common.optional')})`}>
                <NumInput value={d.weight_kg} onChange={(v) => set({ weight_kg: v })} placeholder="75" />
              </Field>
            </div>
            <div className="border-t border-line pt-5">
              <InjuryEditor value={d.flags} onChange={(flags) => set({ flags })} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted">{t('onb.stationsIntro')}</p>
            <StationEditor stars={d.station_stars} times={d.station_times} onStars={(v) => set({ station_stars: v })} onTimes={(v) => set({ station_times: v })} />
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-muted">{t('onb.scheduleHelp')}</p>
            <ScheduleEditor value={d.week_schedule} onChange={(v) => set({ week_schedule: v })} />
            {d.week_schedule.filter((x) => x !== 'rest' && x !== 'recovery').length < 3 && (
              <div className={clsx('flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm', tried && errors.week_schedule ? 'border-bad bg-bad/10' : 'border-warn/50 bg-warn/10')}>
                <p className="flex-1">{d.week_schedule.every((x) => x === 'rest' || x === 'recovery') ? t('onb.noDays') : t('onb.minDays')}</p>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => {
                    const s = [...d.week_schedule];
                    // add "coach decides" on rest days, spread out: Sat, Wed, Mon, Thu, Sun, Fri, Tue
                    for (const i of [5, 2, 0, 3, 6, 4, 1]) if (s.filter((x) => x !== 'rest' && x !== 'recovery').length < 3 && s[i] === 'rest') s[i] = 'auto';
                    set({ week_schedule: s });
                  }}
                >
                  {t('onb.fillAuto')}
                </button>
              </div>
            )}
            <Field group label={t('onb.equipment')} help={t('eq.help')}>
              <Segmented
                value={d.equipment}
                onChange={(v) => set({ equipment: v })}
                options={(['hyrox', 'gym', 'home'] as const).map((v) => ({ value: v, label: t(`eq.${v}` as I18nKey) }))}
              />
            </Field>
            <GymField onJoined={(g) => set({ equipment: g.equipment, sim_protocol: null })} />
            {!gym.data && (simTpl.data ?? []).length > 0 && (
              <Field label={t('onb.simTpl')} help={t('onb.simTplHelp')}>
                <select
                  className="input"
                  value={(simTpl.data ?? []).find((x) => x.name === d.sim_protocol?.name)?.id ?? ''}
                  onChange={(e) => set({ sim_protocol: ((simTpl.data ?? []).find((x) => x.id === e.target.value)?.protocol as SimProtocol) ?? null })}
                >
                  <option value="">{t('onb.simDefault')}</option>
                  {(simTpl.data ?? []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {d.category?.startsWith('doubles') && (
              <div className="space-y-3 border-t border-line pt-5">
                <p className="text-sm text-muted">{t('onb.teamIntro')}</p>
                <TeamPair raceName={d.race_name} raceDate={d.race_date} goalSec={d.goal_sec} />
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <div className="space-y-3 border-t border-line pt-5">
            <p className="text-xs text-muted">{t('onb.moreRaces')}</p>
            <label className={clsx('flex cursor-pointer gap-3 rounded-lg border p-3 text-sm', ackErr && !ack ? 'border-bad' : 'border-warn/50 bg-warn/5')}>
              <input type="checkbox" className="mt-0.5 accent-[rgb(var(--volt))]" checked={ack || !!prof.data?.disclaimer_accepted_at} onChange={(e) => setAck(e.target.checked)} />
              <span>
                {(DISCLAIMER[lang] ?? DISCLAIMER.en).ack}{' '}
                <a href="/science" target="_blank" className="text-volt underline">
                  {(DISCLAIMER[lang] ?? DISCLAIMER.en).sources}
                </a>
              </span>
            </label>
            {ackErr && !ack && <p className="text-xs text-bad">{t('onb.ackErr')}</p>}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            {t('common.back')}
          </button>
          {step < 3 ? (
            <button className="btn-primary" onClick={next}>
              {t('common.next')}
            </button>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={finish}>
              {t('onb.generate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
