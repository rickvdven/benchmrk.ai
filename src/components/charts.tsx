import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtHms, fmtMmss, type RaceBreakdown } from '../engine';
import { useI18n } from '../lib/i18n';

/** Horizontal stacked bar: runs / stations / roxzone, with the goal as a marker. */
export function PredictionBar({ b, goalSec }: { b: RaceBreakdown; goalSec: number }) {
  const { t } = useI18n();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(b.finishSec, goalSec) * 1.04;
  const parts = [
    { k: 'runs', label: t('ck.runs'), v: b.runTotalSec, color: 'var(--series-1)' },
    { k: 'stations', label: t('ck.stations'), v: b.stationTotalSec, color: 'var(--series-2)' },
    { k: 'roxzone', label: t('ck.roxzone'), v: b.roxzoneSec, color: 'var(--series-3)' },
  ];
  const goalPct = (goalSec / max) * 100;
  return (
    <figure className="mt-5" aria-label={`${t('ck.projected')} ${fmtHms(b.finishSec)}`}>
      <div className="relative h-9">
        <div className="absolute inset-y-0 left-0 flex gap-[2px]" style={{ width: `${(b.finishSec / max) * 100}%` }}>
          {parts.map((p, i) => (
            <div
              key={p.k}
              onMouseEnter={() => setHover(p.k)}
              onMouseLeave={() => setHover(null)}
              className="h-full transition-opacity"
              style={{
                width: `${(p.v / b.finishSec) * 100}%`,
                background: p.color,
                borderRadius: i === 0 ? '4px 0 0 4px' : i === parts.length - 1 ? '0 4px 4px 0' : 0,
                opacity: hover && hover !== p.k ? 0.45 : 1,
              }}
              title={`${p.label}: ${fmtHms(p.v)}`}
            />
          ))}
        </div>
        <div className="absolute -top-1 bottom-[-4px] w-0.5 bg-fg" style={{ left: `${goalPct}%` }} aria-hidden />
        <div
          className="stat absolute -top-5 whitespace-nowrap text-[11px] text-fg"
          style={{ left: `${goalPct}%`, transform: `translateX(${goalPct > 75 ? '-100%' : goalPct < 25 ? '0' : '-50%'})` }}
        >
          {t('ck.goal')} {fmtHms(goalSec)}
        </div>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {parts.map((p) => (
          <span key={p.k} className="inline-flex items-center gap-1.5" onMouseEnter={() => setHover(p.k)} onMouseLeave={() => setHover(null)}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="stat text-fg">{fmtHms(p.v)}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function TrendChart({ data }: { data: { date: string; target: number | null; actual: number | null }[] }) {
  const { t } = useI18n();
  const vals = data.flatMap((d) => [d.target, d.actual]).filter((x): x is number => !!x);
  const lo = Math.min(...vals) - 10;
  const hi = Math.max(...vals) + 10;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgb(var(--line))' }} />
          <YAxis
            reversed
            domain={[lo, hi]}
            tickFormatter={(v: number) => fmtMmss(v)}
            tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{ background: 'rgb(var(--panel2))', border: '1px solid rgb(var(--line))', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'rgb(var(--fg))' }}
            formatter={(v: number, n: string) => [`${fmtMmss(v)}/km`, n]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line name={t('pl.target')} type="monotone" dataKey="target" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
          <Line name={t("lg.actual")} type="monotone" dataKey="actual" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from 'recharts';
import { RADAR_AXES, type RadarAxis } from '../engine';
import type { I18nKey } from '../lib/i18n';

/** Radar of the six HYROX abilities; one series per athlete (max 2 → legend). */
export function RadarProfile({ series }: { series: { name: string; scores: Record<RadarAxis, number> }[] }) {
  const { t } = useI18n();
  const data = RADAR_AXES.map((a) => ({ axis: t(`x.axis.${a}` as I18nKey), ...Object.fromEntries(series.map((s) => [s.name, s.scores[a]])) }));
  const colors = ['var(--series-1)', 'var(--series-2)'];
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgb(var(--line))" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
          <Tooltip contentStyle={{ background: 'rgb(var(--panel2))', border: '1px solid rgb(var(--line))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => v.toFixed(1)} />
          {series.map((s, i) => (
            <Radar key={s.name} name={s.name} dataKey={s.name} stroke={colors[i]} fill={colors[i]} fillOpacity={0.18} strokeWidth={2} dot={{ r: 3 }} />
          ))}
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
