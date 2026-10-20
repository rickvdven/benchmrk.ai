import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Repeat2, Star } from 'lucide-react';
import { alternativesFor, type Session } from '../engine';
import { useCoach, useMutations } from '../data/hooks';
import { useI18n } from '../lib/i18n';

/** "Can't do this as planned?" → two alternatives with reasoning and a recommendation. */
export function AltPicker({ s, onPicked }: { s: Session; onPicked: () => void }) {
  const { t, lang } = useI18n();
  const c = useCoach(lang);
  const { saveEntry } = useMutations();
  const [open, setOpen] = useState(false);
  if (!c.profile) return null;
  if (!open)
    return (
      <button className="btn-ghost mt-4" onClick={() => setOpen(true)}>
        <Repeat2 className="h-4 w-4" /> {t('alt.open')}
      </button>
    );
  const alt = alternativesFor(s, c.fullProfile, c.weeks, lang);
  if (!alt) return null;
  const pick = async (x: Session) => {
    await saveEntry(s.date, { completed: false, planned: x as unknown as Record<string, unknown> });
    toast.success(t('alt.done'));
    onPicked();
  };
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
      <p className="font-semibold">{t('alt.open')}</p>
      <p className="text-xs text-muted">{t('alt.intro')}</p>
      <p className="rounded-lg border border-volt/40 bg-volt/5 p-2.5 text-sm">{alt.advice}</p>
      {alt.note && <p className="text-xs text-warn">{alt.note}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {alt.options.map((o) => {
          const rec = o.key === alt.recommended;
          return (
            <div key={o.key} className={clsx('flex flex-col rounded-lg border p-3', rec ? 'border-volt/60' : 'border-line')}>
              {rec && (
                <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-volt/15 px-2 py-0.5 text-[11px] font-semibold text-volt">
                  <Star className="h-3 w-3" aria-hidden /> {t('alt.rec')}
                </span>
              )}
              <p className="font-semibold">{o.session.title}</p>
              <p className="mt-1 whitespace-pre-line text-xs text-muted">{o.session.description}</p>
              <p className="mt-2 text-xs">
                <span className="font-semibold">{t('alt.why')}: </span>
                {o.why}
              </p>
              <button className={clsx('mt-3 self-start', rec ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')} onClick={() => pick(o.session)}>
                {t('alt.pick')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
