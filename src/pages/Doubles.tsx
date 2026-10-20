import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { SEGMENTS, stationLabel, fmtHms, fmtMmss, isDoubles, parseRaceTime, type Station } from '../engine';
import { useCoach } from '../data/hooks';
import { isComplete } from '../data/mapping';
import { supabase } from '../lib/supabase';
import { useI18n, type I18nKey } from '../lib/i18n';
import { Field, Notice, PageHeader, Spinner, TimeInput } from '../components/ui';
import { TeamPair } from '../components/TeamPair';

export default function Doubles() {
  const { t, lang, pace } = useI18n();
  const c = useCoach(lang);
  const qc = useQueryClient();
  const [goal, setGoal] = useState<number | null>(null);
  if (!c.profile) return <Spinner />;
  const { profile, team } = c;
  const me = profile.athlete.name || 'A';
  const partnerName = team.partner?.display_name || 'B';
  const tm = c.teamModel;
  const name = (x: 'A' | 'B') => (x === 'A' ? me : partnerName);

  const updateTeam = async (patch: { goal?: number | null; dow?: number | null; captain?: string | null }) => {
    if (!team.team) return;
    const { error } = await supabase.rpc('update_team', {
      _race_name: null,
      _race_date: null,
      _goal_sec: patch.goal ?? null,
      _shared_sim_dow: patch.dow === undefined ? team.team.shared_sim_dow : patch.dow,
      _captain: patch.captain ?? null,
    });
    if (error) return toast.error(error.message.includes('not_captain') ? t('db.captainOnly') : t('common.error'));
    toast.success(t('common.saved'));
    qc.invalidateQueries({ queryKey: ['team'] });
    qc.invalidateQueries({ queryKey: ['profile'] });
  };

  return (
    <>
      <PageHeader eyebrow={t('db.title')} title={team.partner ? `${me} × ${partnerName}` : t('nav.doubles')} />
      <div className="space-y-4">
        {!isDoubles(profile.category) && <Notice tone="warn">{t('db.notDoubles')}</Notice>}
        <section className="panel p-5">
          {!team.team && (
            <>
              <h2 className="text-lg font-bold">{t('db.noTeam')}</h2>
              <p className="mb-4 text-sm text-muted">{t('db.noTeamSub')}</p>
            </>
          )}
          <TeamPair raceName={profile.raceName} raceDate={profile.raceDate} goalSec={profile.goalSec} />
        </section>

        {team.team && (
          <section className="panel space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="label">{t('db.captain')}:</span>
              <span className="font-semibold">{team.isCaptain ? me : partnerName}</span>
              {team.isCaptain && team.partnerId && (
                <button className="btn-ghost btn-sm" onClick={() => updateTeam({ captain: team.partnerId })}>
                  → {partnerName}
                </button>
              )}
            </div>
            {!team.isCaptain && <p className="text-xs text-muted">{t('db.captainOnly')}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('onb.goal')} help={t('onb.goalHelp')}>
                <div className="flex gap-2">
                  <TimeInput value={team.team.goal_sec} parse={parseRaceTime} format={fmtHms} onChange={(v) => setGoal(v)} className={clsx(!team.isCaptain && 'opacity-60')} />
                  {team.isCaptain && (
                    <button className="btn-primary shrink-0" disabled={!goal} onClick={() => updateTeam({ goal })}>
                      {t('common.save')}
                    </button>
                  )}
                </div>
              </Field>
              <Field label={t('db.sharedDay')} help={t('db.sharedDaySub')}>
                <select
                  className="input"
                  disabled={!team.isCaptain}
                  value={team.team.shared_sim_dow ?? ''}
                  onChange={(e) => updateTeam({ dow: e.target.value === '' ? null : +e.target.value })}
                >
                  <option value="">{t('db.none')}</option>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {t(`dow.${d}` as I18nKey)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
        )}

        {team.partner && !isComplete(team.partner) && <Notice>{t('db.partnerIncomplete')}</Notice>}

        {tm && (
          <>
            <section className="panel p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-bold">{t('db.teamPred')}</h2>
                <div className="text-right">
                  <div className="stat text-3xl font-bold">{tm.chance}%</div>
                  <div className="text-xs text-muted">{t(`ck.status.${tm.status}` as I18nKey)}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-panel2 p-3">
                  <div className="label">{t('ck.projected')}</div>
                  <div className="stat text-lg font-semibold">{fmtHms(tm.projectedFinishSec)}</div>
                </div>
                <div className="rounded-lg bg-panel2 p-3">
                  <div className="label">{t('ck.runs')}</div>
                  <div className="stat text-lg font-semibold">{pace(tm.runPaceSec)}</div>
                </div>
                <div className="rounded-lg bg-panel2 p-3">
                  <div className="label">{t('ck.stations')}</div>
                  <div className="stat text-lg font-semibold">{fmtHms(tm.stationTotalSec)}</div>
                </div>
                <div className="rounded-lg bg-panel2 p-3">
                  <div className="label">{t('ck.reqPace')}</div>
                  <div className="stat text-lg font-semibold">{pace(tm.requiredRunPaceSec)}</div>
                </div>
              </div>
              <p className="mt-4 text-sm">
                <span className="font-semibold">{t('db.pacer')}: </span>
                {t('db.pacerText', { name: name(tm.pacer), pace: fmtMmss(tm.runPaceSec) })}
              </p>
              {tm.pacerGapSecPerKm > 0 && (
                <Notice tone="warn">{t('db.pacerGap', { n: tm.pacerGapSecPerKm, min: Math.round((tm.pacerGapSecPerKm * 8) / 60) })}</Notice>
              )}
            </section>

            <section className="panel p-5">
              <h2 className="text-lg font-bold">{t('db.splits')}</h2>
              <p className="mb-3 text-xs text-muted">{t('db.splitsSub')}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="py-1 font-medium">Station</th>
                      <th className="py-1 font-medium">{t('db.lead')}</th>
                      <th className="py-1 font-medium">{me}</th>
                      <th className="py-1 font-medium">{partnerName}</th>
                      <th className="py-1 text-right font-medium">Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tm.splits.map((s) => {
                      const seg = SEGMENTS[s.station as Station];
                      const unit = seg.unit === 'reps' ? '' : ' m';
                      const segTxt = (n: number) => `${n} × ${seg.size}${unit}${seg.unit === 'reps' ? ' reps' : ''}`;
                      return (
                        <tr key={s.station} className="border-t border-line">
                          <td className="py-2">{stationLabel(lang, s.station)}</td>
                          <td className="py-2">{s.lead === 'even' ? t('db.even') : name(s.lead)}</td>
                          <td className="stat py-2">
                            {segTxt(s.aSegments)} <span className="text-xs text-muted">({fmtMmss(s.aSec)})</span>
                          </td>
                          <td className="stat py-2">
                            {segTxt(s.bSegments)} <span className="text-xs text-muted">({fmtMmss(s.bSec)})</span>
                          </td>
                          <td className="stat py-2 text-right">{fmtMmss(s.teamSec)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
