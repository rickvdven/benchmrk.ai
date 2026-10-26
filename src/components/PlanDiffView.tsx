import clsx from 'clsx';
import { fmtHms, type DayDiff, type PlanDiff, type SessionBrief, type WeekDiff } from '../engine';
import { useI18n } from '../lib/i18n';
import { usePt } from '../lib/usePt';

const signed = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(n)}`;

/** "−4 km, +1× threshold": what a week gains or loses. */
export function weekSummary(w: WeekDiff, p: ReturnType<typeof usePt>): string {
  const parts: string[] = [];
  if (w.summary.km !== 0) parts.push(p('pu.sum.km', { km: signed(w.summary.km) }));
  for (const [type, n] of Object.entries(w.summary.types)) if (n) parts.push(p('pu.sum.type', { n: signed(n), type: p(`pu.type.${type}`) }));
  return parts.length ? parts.join(', ') : p('pu.sum.days', { n: w.days.length });
}

function Cell({ s, old }: { s: SessionBrief | null; old?: boolean }) {
  const { pace } = useI18n();
  const p = usePt();
  if (!s) return <span className="text-muted">{p('pu.preview.noneDay')}</span>;
  const meta = [s.km != null ? `${s.km} km` : null, s.paceSec != null ? pace(s.paceSec) : null, s.hrCap != null ? `≤ ${s.hrCap} bpm` : null].filter(Boolean).join(' · ');
  return (
    <div className={clsx(old ? 'text-muted line-through decoration-1' : 'font-semibold text-fg')}>
      <div>{s.title}</div>
      {meta && <div className="stat mt-0.5 text-xs font-normal">{meta}</div>}
    </div>
  );
}

function Day({ d }: { d: DayDiff }) {
  const { lang } = useI18n();
  const label = new Date(`${d.date}T00:00:00`).toLocaleDateString(lang === 'nl' ? 'nl-NL' : lang, { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <tr className="border-t border-line align-top">
      <th scope="row" className="w-[84px] whitespace-nowrap py-2.5 pr-2 text-left text-xs font-semibold text-muted sm:w-[110px] sm:text-sm">
        {label}
      </th>
      <td className="py-2.5 pr-3 text-sm">
        <Cell s={d.before} old />
      </td>
      <td className="rounded-sm bg-volt/10 px-2 py-2.5 text-sm">
        <Cell s={d.after} />
      </td>
    </tr>
  );
}

/** Before/after of the coming weeks: only changed days, old struck through with the new next to it, a summary line per week. */
export function PlanDiffView({ diff, className }: { diff: PlanDiff; className?: string }) {
  const { lang } = useI18n();
  const p = usePt();
  const date = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(lang === 'nl' ? 'nl-NL' : lang, { day: 'numeric', month: 'long' });
  if (!diff.weeks.length) return <p className={clsx('text-sm text-muted', className)}>{p('pu.preview.none')}</p>;
  return (
    <div className={clsx('space-y-5', className)}>
      {diff.weeks.map((w) => (
        <section key={w.start}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="font-semibold">{p('pu.preview.week', { n: w.index, date: date(w.start) })}</h3>
            <span className="stat text-xs text-volt">{weekSummary(w, p)}</span>
          </div>
          <table className="w-full table-fixed border-collapse sm:table-auto">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="w-[84px] pb-1 sm:w-[110px]" />
                <th className="pb-1 font-semibold">{p('pu.preview.now')}</th>
                <th className="px-2 pb-1 font-semibold">{p('pu.preview.next')}</th>
              </tr>
            </thead>
            <tbody>
              {w.days.map((d) => (
                <Day key={d.date} d={d} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="text-xs text-muted">{p('pu.preview.unchanged')}</p>
      {diff.forecast && (
        <section className="rounded-lg border border-line p-3">
          <h3 className="mb-2 font-semibold">{p('pu.forecast.title')}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">{p('pu.forecast.time')}</dt>
            <dd className="stat">
              <span className="text-muted line-through">{fmtHms(diff.forecast.beforeSec)}</span> → <span className="font-semibold">{fmtHms(diff.forecast.afterSec)}</span>
            </dd>
            <dt className="text-muted">{p('pu.forecast.chance')}</dt>
            <dd className="stat">
              <span className="text-muted line-through">{diff.forecast.chanceBefore}%</span> → <span className="font-semibold">{diff.forecast.chanceAfter}%</span>
            </dd>
          </dl>
        </section>
      )}
    </div>
  );
}
