import clsx from 'clsx';
import { STATIONS, stationLabel, fmtMmss, parseMmss, resolveSchedule, type DayType, type StationMap } from '../engine';
import { useI18n, type I18nKey } from '../lib/i18n';
import { Stars, TimeInput } from './ui';

const DAY_TYPES: DayType[] = ['auto', 'threshold', 'intervals', 'easy', 'long', 'sim', 'strength', 'wod', 'recovery', 'rest'];

export function ScheduleEditor({ value, onChange }: { value: DayType[]; onChange: (v: DayType[]) => void }) {
  const { t } = useI18n();
  const days = value.filter((d) => d !== 'rest').length;
  const resolved = resolveSchedule(value);
  const hasThreshold = resolved.includes('threshold') || resolved.includes('intervals');
  const hasSim = resolved.includes('sim');
  return (
    <div className="space-y-2">
      <p className="rounded-lg border border-volt/30 bg-volt/5 p-2.5 text-xs text-muted">{t('sch.autoHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {value.map((d, i) => (
          <label key={i} className={clsx('flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5', d === 'rest' ? 'border-line' : d === 'auto' ? 'border-sky/50 bg-sky/5' : 'border-volt/40 bg-volt/5')}>
            <span className="w-10 text-sm font-semibold">{t(`dow.${i}` as I18nKey)}</span>
            <select
              className="input h-9 flex-1"
              value={d}
              aria-label={t(`dow.${i}` as I18nKey)}
              onChange={(e) => onChange(value.map((x, k) => (k === i ? (e.target.value as DayType) : x)))}
            >
              {DAY_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {t(`day.${dt}` as I18nKey)}
                </option>
              ))}
            </select>
            {d === 'auto' && (
              <span className="w-full pl-12 text-xs text-sky">
                {t('sch.picks')}: <span className="font-semibold">{t(`day.${resolved[i]}` as I18nKey)}</span>
              </span>
            )}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        {t('onb.days')}: <span className="stat text-fg">{days}</span>
      </p>
      {days > 0 && !hasThreshold && hasSim && <p className="text-xs text-sky">{t('sch.combo')}</p>}
      {days > 0 && hasThreshold && !hasSim && <p className="text-xs text-sky">{t('sch.noSim')}</p>}
      {days > 0 && !hasThreshold && !hasSim && <p className="text-xs text-warn">{t('sch.neither')}</p>}
    </div>
  );
}

export function StationEditor({
  stars,
  times,
  onStars,
  onTimes,
}: {
  stars: StationMap<number>;
  times: Partial<StationMap<number>>;
  onStars: (v: StationMap<number>) => void;
  onTimes: (v: Partial<StationMap<number>>) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="divide-y divide-line">
      {STATIONS.map((s) => (
        <div key={s} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <span className="w-40 text-sm">{stationLabel(lang, s)}</span>
          <Stars label={stationLabel(lang, s)} value={stars[s] ?? 3} onChange={(v) => onStars({ ...stars, [s]: v })} />
          <TimeInput
            className="h-8 w-24 text-xs"
            placeholder={t('onb.pr')}
            value={times[s] ?? null}
            parse={parseMmss}
            format={fmtMmss}
            onChange={(v) => {
              const next = { ...times };
              if (v) next[s] = v;
              else delete next[s];
              onTimes(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}
