import { useState } from 'react';
import { toast } from 'sonner';
import { Award, Pencil, Trash2 } from 'lucide-react';
import { fmtMmss } from '../engine';
import { useBenchmarks, useCoach, useMutations } from '../data/hooks';
import { toBenchmark, type BenchmarkRow } from '../data/mapping';
import { useI18n } from '../lib/i18n';
import { PageHeader, Spinner } from '../components/ui';
import { TrendChart } from '../components/charts';
import { BenchmarkDialog } from '../components/session';

export default function Log() {
  const { t, lang, pace } = useI18n();
  const c = useCoach(lang);
  const bms = useBenchmarks();
  const { deleteBenchmark } = useMutations();
  const [edit, setEdit] = useState<BenchmarkRow | null>(null);
  if (!c.profile) return <Spinner />;
  const entries = Object.values(c.byDate)
    .filter((e) => e.completed)
    .sort((a, b) => b.date.localeCompare(a.date));
  const trend = [...entries]
    .reverse()
    .filter((e) => (e.planned as { type?: string } | null)?.type === 'threshold' && e.actual_pace_sec)
    .map((e) => ({ date: e.date.slice(5), target: (e.planned as { targetPaceSec?: number }).targetPaceSec ?? null, actual: e.actual_pace_sec }));

  return (
    <>
      <PageHeader title={t('lg.title')} />
      <div className="space-y-4">
        <section className="panel p-5">
          <h2 className="mb-3 text-lg font-bold">{t('lg.trend')}</h2>
          {trend.length >= 2 ? <TrendChart data={trend} /> : <p className="text-sm text-muted">{t('lg.empty')}</p>}
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-lg font-bold">{t('lg.benchmarks')}</h2>
          {(bms.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {(bms.data ?? []).map((b) => {
                  const eff = b.effect as { before?: { thresholdPaceSec: number }; after?: { thresholdPaceSec: number } } | null;
                  return (
                    <tr key={b.id} className="border-t border-line">
                      <td className="py-2">
                        <Award className="mr-1 inline h-4 w-4 text-warn" />B{b.number}
                      </td>
                      <td className="stat py-2">{b.date}</td>
                      <td className="stat py-2">
                        {pace(b.pace_sec)} · {b.avg_hr} bpm
                      </td>
                      <td className="stat py-2 text-muted">{eff?.before && eff.after && b.number <= 2 ? `${fmtMmss(eff.before.thresholdPaceSec)} → ${fmtMmss(eff.after.thresholdPaceSec)}` : ''}</td>
                      <td className="py-2 text-right">
                        <button className="p-1 text-muted hover:text-fg" aria-label={t('common.edit')} onClick={() => setEdit(b)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 text-muted hover:text-bad"
                          aria-label={t('common.delete')}
                          onClick={async () => {
                            if (!confirm(`${t('common.delete')} B${b.number}?`)) return;
                            await deleteBenchmark(c.row, b.id, bms.data ?? []);
                            toast.success(t('bm.deleted'));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {c.row.decay_sec != null && (
            <p className="mt-3 text-sm">
              {t('lg.decay')}: <span className={c.row.decay_sec > (c.rules?.eliteMaxDecaySec ?? 12) ? 'stat text-warn' : 'stat text-good'}>+{c.row.decay_sec} s/km</span>
            </p>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-lg font-bold">{t('lg.history')}</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">{t('lg.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-1 font-medium">Date</th>
                    <th className="py-1 font-medium">Session</th>
                    <th className="py-1 font-medium">{t('pl.target')}</th>
                    <th className="py-1 font-medium">{t('pl.actualPace')}</th>
                    <th className="py-1 font-medium">HR</th>
                    <th className="py-1 font-medium">RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const p = e.planned as { title?: string; targetPaceSec?: number; hrCap?: number } | null;
                    const slow = p?.targetPaceSec && e.actual_pace_sec && e.actual_pace_sec - p.targetPaceSec > 5;
                    return (
                      <tr key={e.date} className="border-t border-line align-top">
                        <td className="stat py-2 pr-2">{e.date}</td>
                        <td className="py-2 pr-2">
                          {p?.title ?? '—'}
                          {e.wod?.description && <div className="text-xs text-muted">{e.wod.description}</div>}
                          {e.notes && <div className="text-xs text-muted">{e.notes}</div>}
                        </td>
                        <td className="stat py-2 pr-2 text-muted">{p?.targetPaceSec ? pace(p.targetPaceSec) : '–'}</td>
                        <td className={`stat py-2 pr-2 ${slow ? 'text-warn' : ''}`}>{e.actual_pace_sec ? pace(e.actual_pace_sec) : '–'}</td>
                        <td className={`stat py-2 pr-2 ${p?.hrCap && e.avg_hr && e.avg_hr > p.hrCap ? 'text-warn' : ''}`}>{e.avg_hr ?? '–'}</td>
                        <td className="stat py-2">{e.rpe ?? '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {edit && <BenchmarkDialog number={edit.number} date={edit.date} row={c.row} existing={toBenchmark(edit)} onClose={() => setEdit(null)} />}
    </>
  );
}
