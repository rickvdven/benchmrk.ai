import { useState } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { ClipboardCopy, Download, ShieldCheck } from 'lucide-react';
import { planToMarkdown, validatePlan, type Profile, type Week } from '../engine';
import { useI18n, type I18nKey } from '../lib/i18n';

export function PlanExportBar({ weeks, profile, maxIncrease }: { weeks: Week[]; profile: Profile; maxIncrease?: number }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const check = validatePlan(weeks, profile, maxIncrease);
  return (
    <div className="relative flex flex-wrap gap-2">
      <button
        className="btn-ghost btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(planToMarkdown(weeks, profile, lang));
            toast.success(t('x.copied'));
          } catch {
            toast.error(t('common.error'));
          }
        }}
      >
        <ClipboardCopy className="h-4 w-4" /> {t('x.copyMd')}
      </button>
      <button
        className="btn-ghost btn-sm"
        onClick={() => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([JSON.stringify({ profile, weeks }, null, 2)], { type: 'application/json' }));
          a.download = 'benchmrk-plan.json';
          a.click();
        }}
      >
        <Download className="h-4 w-4" /> {t('x.json')}
      </button>
      <button className={clsx('btn-ghost btn-sm', check.score === 100 ? 'border-good/60 text-good' : 'border-warn/60 text-warn')} onClick={() => setOpen(!open)} aria-expanded={open}>
        <ShieldCheck className="h-4 w-4" /> {t('x.check')} {check.score}%
      </button>
      {open && (
        <div className="panel absolute right-0 top-10 z-30 w-80 p-3 text-sm shadow-xl">
          <ul className="space-y-1.5">
            {check.checks.map((c) => (
              <li key={c.key} className={c.passed ? 'text-good' : 'text-warn'}>
                {c.passed ? '✓' : '✗'} <span className="text-fg">{t(`x.check.${c.key}` as I18nKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
