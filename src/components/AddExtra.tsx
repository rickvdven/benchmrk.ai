import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Activity, Dumbbell, StretchHorizontal, Plus, CheckCircle2, AlertTriangle, Moon, Sparkles, Waves } from 'lucide-react';
import { placeFor, suggestExtra, weakestStations, type ExtraFocus, type Session } from '../engine';
import { useCoach, useMutations } from '../data/hooks';
import { useI18n } from '../lib/i18n';

const FOCUS: { k: ExtraFocus; icon: typeof Activity; label: 'ex.coach' | 'ex.cardio' | 'ex.strength' | 'ex.mobility' | 'ex.recovery' }[] = [
  { k: 'coach', icon: Sparkles, label: 'ex.coach' },
  { k: 'cardio', icon: Activity, label: 'ex.cardio' },
  { k: 'strength', icon: Dumbbell, label: 'ex.strength' },
  { k: 'mobility', icon: StretchHorizontal, label: 'ex.mobility' },
  { k: 'recovery', icon: Waves, label: 'ex.recovery' },
];
const ADVICE = {
  go: { icon: CheckCircle2, cls: 'border-good/50 bg-good/10', tcls: 'text-good', key: 'ex.go' },
  caution: { icon: AlertTriangle, cls: 'border-warn/50 bg-warn/10', tcls: 'text-warn', key: 'ex.caution' },
  rest: { icon: Moon, cls: 'border-bad/50 bg-bad/10', tcls: 'text-bad', key: 'ex.rest' },
} as const;

/** On a rest / recovery day: pick cardio, strength or mobility → Benchmrk proposes a session or advises to rest. */
export function AddExtra({ date, onAdded }: { date: string; onAdded: () => void }) {
  const { t, lang } = useI18n();
  const c = useCoach(lang);
  const { saveEntry } = useMutations();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<ExtraFocus | null>(null);
  if (!c.profile) return null;
  const sug = focus
    ? suggestExtra(date, focus, {
        profile: c.profile,
        weeks: c.weeks,
        logs: c.logs,
        morning: c.morning,
        today: c.today,
        ceiling: c.rules?.achillesStiffnessCeiling ?? 4,
        weakest: weakestStations(c.profile.athlete, c.profile.category, c.baselines, 4),
        lang,
        place: c.row ? placeFor(c.row.places, c.row.place_by_dow, c.byDate[date]?.place, (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7) : null,
      })
    : null;
  const add = async (s: Session) => {
    await saveEntry(date, { completed: false, planned: s as unknown as Record<string, unknown> });
    toast.success(t('ex.added'));
    onAdded();
  };
  if (!open)
    return (
      <button className="btn-ghost mt-4" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t('ex.add')}
      </button>
    );
  const A = sug ? ADVICE[sug.advice] : null;
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
      <p className="font-semibold">{t('ex.ask')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup">
        {FOCUS.map(({ k, icon: I, label }) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={focus === k}
            onClick={() => setFocus(k)}
            className={clsx('flex items-center gap-2 rounded-lg border p-3 text-left', focus === k ? 'border-volt bg-volt/10' : 'border-line hover:border-muted')}
          >
            <I className="h-4 w-4 text-volt" aria-hidden /> {t(label)}
          </button>
        ))}
      </div>
      {sug && A && (
        <>
          <div className={clsx('rounded-lg border p-3', A.cls)}>
            <p className={clsx('flex items-center gap-2 font-semibold', A.tcls)}>
              <A.icon className="h-4 w-4" aria-hidden /> {t(A.key)}
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs">
              {sug.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          {sug.why && (
            <p className="flex gap-2 rounded-lg bg-volt/10 p-3 text-xs">
              <Sparkles className="h-4 w-4 shrink-0 text-volt" aria-hidden />
              <span>
                <span className="font-semibold">{t('ex.why')}</span> {sug.why}
              </span>
            </p>
          )}
          <div className="rounded-lg border border-line bg-panel2/50 p-3">
            <p className="font-semibold">{sug.session.title}</p>
            <p className="mt-1 whitespace-pre-line text-xs text-muted">{sug.session.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sug.alternative && (
              <button className="btn-primary" onClick={() => add(sug.alternative!)}>
                {t('ex.addMob')}
              </button>
            )}
            <button className={sug.alternative ? 'btn-ghost' : 'btn-primary'} onClick={() => add(sug.session)}>
              {sug.advice === 'rest' ? t('ex.anyway') : t('ex.addBtn')}
            </button>
          </div>
          {sug.load && <p className={clsx('text-[11px]', sug.load.over ? 'text-warn' : 'text-muted')}>{t('ex.load', { pct: sug.load.pct })}</p>}
          <p className="text-[11px] text-muted">{t('ex.note')}</p>
        </>
      )}
    </div>
  );
}
