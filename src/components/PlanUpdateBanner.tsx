import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { pendingUpdate, usePlanChoices, usePlanUpdates } from '../data/planUpdates';
import { useI18n } from '../lib/i18n';
import { usePt } from '../lib/usePt';

/** Dashboard notice for a published plan update the member has not answered yet. The plan itself never changes without a choice. */
export function PlanUpdateBanner({ pin }: { pin: number }) {
  const { lang } = useI18n();
  const p = usePt();
  const updates = usePlanUpdates();
  const choices = usePlanChoices();
  const u = pendingUpdate(updates.data, choices.data, pin);
  if (!u) return null;
  const date = new Date(u.published_at ?? u.created_at).toLocaleDateString(lang === 'nl' ? 'nl-NL' : lang, { day: 'numeric', month: 'long' });
  return (
    <section className="panel flex flex-col gap-3 border-volt/60 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label={p('pu.banner.title', { date })}>
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-volt" aria-hidden />
        <div>
          <h2 className="font-semibold">{p('pu.banner.title', { date })}</h2>
          <p className="mt-0.5 text-sm text-muted">{p('pu.banner.body')}</p>
        </div>
      </div>
      <Link to={`/plan/update/${u.id}`} className="btn-primary shrink-0">
        {p('pu.banner.cta')}
      </Link>
    </section>
  );
}
