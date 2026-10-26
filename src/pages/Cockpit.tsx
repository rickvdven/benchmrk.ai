import { useEffect, useRef, useState } from 'react';
import { chanceTone } from '../engine';
import { ChanceInfo, GoalGap, GoalSuggestion, gapTone } from '../components/Chance';
import { chanceBoosters } from '../engine';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Award, ShieldAlert } from 'lucide-react';
import { STATIONS, stationLabel, goalStationTargets, radarScores, weekMilestone, daysBetween, fmtHms, fmtMmss, mondayOf, phaseLabel, weekOf, zones, type Session } from '../engine';
import { useAuth, useBenchmarks, useCoach, useMutations, usePlanChanges, useTeam } from '../data/hooks';
import { toBenchmark } from '../data/mapping';
import { useCardOffer } from '../components/CardOffer';
import { markSeen, predictionData, predictionDue, progressDue, progressOffer, readSeen } from '../lib/cardOffers';
import { useI18n, type I18nKey } from '../lib/i18n';
import { Notice, PageHeader, Spinner, Stat } from '../components/ui';
import { SessionChips, SessionDialog, BenchmarkDialog } from '../components/session';
import { PredictionBar, RadarProfile } from '../components/charts';
import { InjuryImpactCard } from '../components/InjuryImpact';
import { ReturnToRun } from '../components/ReturnToRun';
import { SeasonCard } from '../components/Season';
import { InviteCard } from '../components/Invite';
import { FrequencyNote } from '../components/Frequency';
import { PlanUpdateNotice, usePlanSnapshotBackfill } from '../components/PlanUpdates';
import { DISCLAIMER } from '../components/Disclaimer';
import { isComplete, toAthlete } from '../data/mapping';

export default function Cockpit() {
  const { t, lang, pace } = useI18n();
  const c = useCoach(lang);
  const { setMorning, updateProfile, addChange } = useMutations();
  const changes = usePlanChanges();
  const team = useTeam();
  const [open, setOpen] = useState<Session | null>(null);
  const [bench, setBench] = useState(false);
  const [editMorning, setEditMorning] = useState(false);
  const { user } = useAuth();
  const { offer } = useCardOffer();
  const bms = useBenchmarks();
  const offered = useRef(false);
  usePlanSnapshotBackfill(c.profile ? c : null);
  // offer a shareable card: the first prediction after the intake, and a progress card every 4 weeks
  useEffect(() => {
    if (offered.current || !user || !c.profile || !bms.data) return;
    try {
      if (sessionStorage.getItem('rox:card-offered')) return;
    } catch {
      /* ignore */
    }
    const seen = readSeen(user.id);
    let spec = null;
    if (predictionDue({ createdAt: c.row.created_at, today: c.today, seen })) {
      spec = predictionData(c.profile, c.model, lang);
      markSeen(user.id, { pred: c.today });
      offered.current = true;
      offer({ type: 'prediction', data: spec });
    } else if (progressDue({ planStart: c.fullProfile.planStart, today: c.today, seen })) {
      const o = progressOffer({ full: c.fullProfile, row: c.row, benchmarks: bms.data.map(toBenchmark), today: c.today, lang, liveFinishSec: c.model.projected.finishSec, base: c.baselines });
      if (o) {
        markSeen(user.id, { prog: c.today });
        offered.current = true;
        offer(o);
      }
    }
    if (offered.current) {
      try {
        sessionStorage.setItem('rox:card-offered', '1');
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, c.profile, bms.data]);
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rox:dismiss-adjust');
    } catch {
      return null;
    }
  });

  const adjust = c.profile ? c.adjust : null;

  if (!c.profile) return <Spinner />;
  const { profile, model, today, row } = c;
  const week = weekOf(c.weeks, today);
  const todays = week?.sessions.find((s) => s.date === today);
  const todayScore = c.morning[today];
  const days = daysBetween(today, profile.raceDate);
  // the rest-week suggestion is re-evaluated every day on a rolling week, so its evidence keeps changing:
  // answer it once per calendar week instead of once per set of evidence
  const weekStart = mondayOf(today);
  const adjustKey = adjust ? (adjust.kind === 'deload' ? `deload:${weekStart}` : `${adjust.kind}:${adjust.evidence.join(',')}`) : null;
  const deloadApplied = adjust?.kind === 'deload' && (changes.data ?? []).some((ch) => ch.kind === 'deload' && String(ch.created_at).slice(0, 10) >= weekStart);
  const stiffCeiling = c.rules?.achillesStiffnessCeiling ?? 4;
  const hasScore = typeof todayScore === 'number';
  const z = zones(profile.athlete.lthr, profile.athlete.maxHr);
  const partnerName = team.partner?.display_name ?? null;
  const partnerToday = team.partnerEntries.find((e) => e.date === today);
  const tm = c.teamModel;
  const shownChance = tm ? tm.chance : model.chance;
  const shownStatus = tm ? tm.status : model.status;
  const goalSplit = goalStationTargets(profile, today, c.baselines);
  const radarSeries = [{ name: profile.athlete.name || 'You', scores: radarScores(profile.athlete, profile.category, c.baselines) }];
  if (team.partner && isComplete(team.partner)) radarSeries.push({ name: team.partner.display_name || 'Partner', scores: radarScores(toAthlete(team.partner), profile.category, c.baselines) });

  return (
    <>
      <PageHeader eyebrow={t('ck.welcome', { name: profile.athlete.name ? `, ${profile.athlete.name}` : '' })} title={profile.raceName}>
        {week && <span className="rounded-full bg-volt/15 px-3 py-1 text-xs font-semibold text-volt">{phaseLabel(lang, week.phase)}</span>}
      </PageHeader>

      <div className="space-y-4">
        {(profile.goalSec < 1800 || profile.goalSec > 14400) && <Notice tone="bad">{t('ck.goalInvalid')}</Notice>}

        <PlanUpdateNotice pinned={row.rule_set_version ?? 1} />

        {adjust && adjustKey !== dismissed && !deloadApplied && (
          <div className="panel border-sky/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky">{t('ck.adjust')}</p>
            <p className="mt-1 text-sm">{t(`ck.adjust.${adjust.kind}` as I18nKey, { n: 'sec' in adjust ? adjust.sec : 0 })}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="btn-primary btn-sm"
                onClick={async () => {
                  if (adjust.kind === 'slow_down' || adjust.kind === 'speed_up') {
                    const delta = adjust.kind === 'slow_down' ? adjust.sec : -adjust.sec;
                    await updateProfile({ pace_adjust_sec: (row.pace_adjust_sec ?? 0) + delta });
                    await addChange(adjust.kind, t(`ck.adjust.${adjust.kind}` as I18nKey, { n: adjust.sec }), { delta, evidence: adjust.evidence });
                  } else {
                    await addChange('deload', t('ck.adjust.deload'), { evidence: adjust.evidence });
                  }
                  localStorage.setItem('rox:dismiss-adjust', adjustKey!);
                  setDismissed(adjustKey);
                  toast.success(t('common.saved'));
                }}
              >
                {t('ck.apply')}
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  localStorage.setItem('rox:dismiss-adjust', adjustKey!);
                  setDismissed(adjustKey);
                }}
              >
                {t('ck.dismiss')}
              </button>
            </div>
          </div>
        )}

        {!row.disclaimer_accepted_at && (
          <div className="panel flex flex-wrap items-center gap-3 border-warn/50 p-4 text-sm">
            <p className="flex-1">{(DISCLAIMER[lang] ?? DISCLAIMER.en).ack}</p>
            <button className="btn-primary btn-sm" onClick={() => updateProfile({ disclaimer_accepted_at: new Date().toISOString() })}>
              OK
            </button>
          </div>
        )}

        <ReturnToRun flags={row.flags} today={today} />
        <InjuryImpactCard profile={profile} today={today} sharedSimDow={team.team?.shared_sim_dow ?? null} />

        {todays?.benchmark && !c.byDate[today]?.completed && (
          <button onClick={() => setBench(true)} className="panel flex w-full items-center gap-3 border-warn/60 bg-warn/10 p-4 text-left">
            <Award className="h-6 w-6 shrink-0 text-warn" />
            <div>
              <p className="font-semibold text-warn">{t('ck.benchToday', { n: todays.benchmark })}</p>
              <p className="text-sm text-muted">{todays.benchmarkText}</p>
            </div>
            <span className="btn-primary btn-sm ml-auto">{t('ck.benchCta')}</span>
          </button>
        )}

        {hasScore && !editMorning ? (
          // saved for today: one slim line instead of the full 1-10 question
          <div className={clsx(todayScore >= stiffCeiling ? 'panel border-warn/60 bg-warn/10 p-4' : 'px-1')}>
            <p className={clsx('flex flex-wrap items-center gap-2 text-sm', todayScore >= stiffCeiling ? 'text-warn' : 'text-muted')}>
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t('ck.morningSaved', { n: todayScore })}</span>
              <button type="button" className="underline underline-offset-4 hover:text-fg" onClick={() => setEditMorning(true)}>
                {t('ck.morningEdit')}
              </button>
            </p>
            {todayScore >= stiffCeiling && <p className="mt-2 text-sm text-warn">{t('ck.guardOn')}</p>}
          </div>
        ) : (
          <div className={clsx('panel p-4', hasScore && todayScore >= stiffCeiling && 'border-warn/60 bg-warn/10')}>
            <div className="flex flex-wrap items-center gap-3">
              <ShieldAlert className={clsx('h-5 w-5', hasScore && todayScore >= stiffCeiling ? 'text-warn' : 'text-volt')} />
              <p className="text-sm font-medium">{t('ck.morning')}</p>
              <div className="ml-auto flex flex-wrap gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    aria-label={`${n}`}
                    aria-pressed={todayScore === n}
                    onClick={() => {
                      void setMorning(today, n);
                      setEditMorning(false);
                    }}
                    className={clsx('stat h-8 w-8 rounded-md border text-sm', todayScore === n ? (n >= stiffCeiling ? 'border-warn bg-warn text-white' : 'border-volt bg-volt text-black') : 'border-line hover:border-volt/60')}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {week && weekMilestone(week, profile, lang) && (
          <div className="panel flex items-center gap-3 border-volt/40 p-4 text-sm">
            <span className="eyebrow shrink-0">{t('x.weekTarget')}</span>
            <span>{weekMilestone(week, profile, lang)}</span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <p className="eyebrow">{t('ck.today')}</p>
            {todays ? (
              <>
                <h2 className="mt-1 text-xl font-bold">{todays.title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-muted">{todays.description}</p>
                <SessionChips s={todays} />
                <div className="mt-4 flex gap-2">
                  {todays.type !== 'rest' && todays.type !== 'race' && (
                    <button className={c.byDate[today]?.completed ? 'btn-ghost' : 'btn-primary'} onClick={() => setOpen(todays)}>
                      {c.byDate[today]?.completed ? `✓ ${t('ck.done')}` : t('ck.markDone')}
                    </button>
                  )}
                  <Link to="/plan" className="btn-ghost">
                    {t('ck.openPlan')}
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">—</p>
            )}
            {team.partner && (
              <p className="mt-4 border-t border-line pt-3 text-xs text-sky">
                {t('ck.partnerToday', { name: partnerName ?? '' })}: {partnerToday?.completed ? '✓' : '—'}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat label={t('ck.daysToGo')} value={days} sub={profile.raceDate} />
            <Stat label={t('ck.compliance')} value={c.compliance == null ? '–' : `${c.compliance}%`} sub={c.compliance == null ? t('ck.complianceNone') : undefined} />
          </div>
        </div>

        <FrequencyNote profile={profile} today={today} baselines={c.baselines} />

        <SeasonCard profile={c.fullProfile} today={today} />

        <section className="panel p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{tm ? t('db.teamPred') : t('ck.prediction')}</h2>
              <p className="text-xs text-muted">{t('ck.predictionSub')}</p>
            </div>
            <div className="text-right">
              <div className={clsx('stat text-3xl font-bold', chanceTone(shownChance))}>{shownChance}%</div>
              <div className="text-xs text-muted">
                {t('ck.chance')} · {t(`ck.status.${shownStatus}` as I18nKey)}
                <ChanceInfo chance={shownChance} weeks={model.weeksLeft} boosters={tm ? null : chanceBoosters(profile, today, c.baselines, model)} team={!!tm} align="right" finishSec={tm ? tm.projectedFinishSec : model.projected.finishSec} goalSec={profile.goalSec} />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="label">{t('ck.goal')}</div>
              <div className="stat text-xl font-semibold">{fmtHms(profile.goalSec)}</div>
            </div>
            <div>
              <div className="label">{t('ck.projected')}</div>
              <div className={clsx('stat text-xl font-semibold', gapTone(tm ? tm.projectedFinishSec : model.projected.finishSec, profile.goalSec))}>{fmtHms(tm ? tm.projectedFinishSec : model.projected.finishSec)}</div>
              <GoalGap finishSec={tm ? tm.projectedFinishSec : model.projected.finishSec} goalSec={profile.goalSec} chance={shownChance} />
            </div>
            <div>
              <div className="label">{t('ck.now')}</div>
              <div className="stat text-xl font-semibold text-muted">{fmtHms(tm ? tm.finishSec : model.current.finishSec)}</div>
            </div>
          </div>
          {!tm && <PredictionBar b={model.projected} goalSec={profile.goalSec} />}
          {!tm && <GoalSuggestion profile={profile} full={c.fullProfile} boosters={chanceBoosters(profile, today, c.baselines, model)} chance={model.chance} />}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-panel2 p-3">
              <div className="label">{t('ck.reqPace')}</div>
              <div className="stat text-lg font-semibold">{pace(tm ? tm.requiredRunPaceSec : model.requiredRunPaceSec)}</div>
            </div>
            <div className="rounded-lg bg-panel2 p-3">
              <div className="label">{t('ck.yourPace')}</div>
              <div className="stat text-lg font-semibold">{pace(tm ? tm.runPaceSec : model.projected.runPaceSec)}</div>
              {(() => {
                const gap = tm ? tm.pacerGapSecPerKm : model.runGapSecPerKm;
                return <div className={clsx('text-xs', gap > 0 ? 'text-warn' : 'text-good')}>{gap > 0 ? t('ck.gapSlow', { n: gap }) : t('ck.gapFast', { n: -gap })}</div>;
              })()}
            </div>
          </div>
          {!tm && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">{t('ck.stationBreakdown')}</summary>
              <p className="mt-2 text-xs text-muted">{t('x.goalSplitSub')}</p>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-1 font-medium" />
                    <th className="py-1 text-right font-medium">{t('ck.projected')}</th>
                    <th className="py-1 text-right font-medium">{t('x.goalSplit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {STATIONS.map((s) => (
                    <tr key={s} className="border-t border-line">
                      <td className="py-1.5">
                        {stationLabel(lang, s)}
                        {model.weakestStations.includes(s) && <span className="ml-2 chip bg-warn/15 text-warn">{t('ck.weakest')}</span>}
                      </td>
                      <td className="stat py-1.5 text-right">{fmtMmss(model.projected.stations[s])}</td>
                      <td className={clsx('stat py-1.5 text-right', goalSplit.targets[s] < model.projected.stations[s] ? 'text-warn' : 'text-good')}>{fmtMmss(goalSplit.targets[s])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          {tm && (
            <Link to="/doubles" className="mt-3 inline-block text-sm text-volt underline">
              {t('nav.doubles')} →
            </Link>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-bold">{t('x.radar')}</h2>
          <p className="text-xs text-muted">{t('x.radarSub')}</p>
          <RadarProfile series={radarSeries} />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="panel p-5">
            <h2 className="text-lg font-bold">{t('ck.zones')}</h2>
            <p className="mb-3 text-xs text-muted">{t('ck.zonesSub', { lthr: profile.athlete.lthr, max: profile.athlete.maxHr })}</p>
            <table className="w-full text-sm">
              <tbody>
                {z.map((zz) => (
                  <tr key={zz.id} className="border-t border-line">
                    <td className="py-1.5 font-semibold">{zz.id}</td>
                    <td className="py-1.5 text-muted">
                      {Math.round(zz.lo * 100)}
                      {zz.hi ? `–${Math.round(zz.hi * 100)}` : '+'}%
                    </td>
                    <td className="stat py-1.5 text-right">
                      {zz.min}–{zz.max} bpm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              {t('ck.threshold')}: <span className="stat text-fg">{pace(profile.athlete.thresholdPaceSec + (profile.paceAdjustSec ?? 0))}</span>
            </p>
          </section>
          <section className="panel p-5">
            <h2 className="mb-3 text-lg font-bold">{t('ck.changes')}</h2>
            {(changes.data ?? []).length === 0 ? (
              <p className="text-sm text-muted">{t('ck.noChanges')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(changes.data ?? []).slice(0, 8).map((ch: { id: string; created_at: string; message: string }) => (
                  <li key={ch.id} className="border-t border-line pt-2">
                    <span className="stat text-xs text-muted">{ch.created_at.slice(0, 10)}</span> {ch.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <InviteCard compact />
      </div>

      {open && (
        <SessionDialog
          s={c.weeks.flatMap((w) => w.sessions).find((x) => x.date === open.date) ?? open}
          entry={c.byDate[open.date]}
          row={row}
          today={today}
          partnerName={partnerName}
          partnerDone={!!team.partnerEntries.find((e) => e.date === open.date && e.completed)}
          onClose={() => setOpen(null)}
        />
      )}
      {bench && todays?.benchmark && <BenchmarkDialog number={todays.benchmark} date={today} row={row} session={todays} onClose={() => setBench(false)} />}
    </>
  );
}
