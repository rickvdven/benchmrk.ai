import clsx from 'clsx';
import { CheckCircle2, AlertTriangle, XCircle, Info, LineChart } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { HeartPulse, Sparkles } from 'lucide-react';
import { analyzeSession, areaName, injuriesOf, withInjuries, type LoggedEntry, type NoteSignals, type Tone } from '../engine';
import { useCoach, useMutations } from '../data/hooks';
import { supabase } from '../lib/supabase';
import { useI18n, type I18nKey } from '../lib/i18n';
import { TYPE_DOT } from './session';

const ICON: Record<Tone, typeof Info> = { good: CheckCircle2, warn: AlertTriangle, bad: XCircle, info: Info };
const COLOR: Record<Tone, string> = { good: 'text-good', warn: 'text-warn', bad: 'text-bad', info: 'text-sky' };
const VERDICT: Record<string, string> = { on_target: 'border-good/50 bg-good/10 text-good', check: 'border-warn/50 bg-warn/10 text-warn', off: 'border-bad/50 bg-bad/10 text-bad', no_data: 'border-line text-muted' };

/** How Benchmrk reads a logged session and what it changes going forward. */
export function AnalysisPanel({ entry, saved }: { entry: LoggedEntry; saved?: boolean }) {
  const { t, lang } = useI18n();
  const c = useCoach(lang);
  const qc = useQueryClient();
  const { updateProfile } = useMutations();
  // AI reading of the saved notes (server caches it per text, so re-opening is cheap)
  const wantAi = !!saved && (entry.notes ?? '').trim().length >= 15;
  const ai = useQuery({
    queryKey: ['notes-ai', entry.date, entry.notes, lang],
    enabled: wantAi,
    staleTime: Infinity,
    retry: false,
    initialData: entry.notesAi && (entry.notesAi as { hash?: string }).hash ? entry.notesAi : undefined,
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const r = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ date: entry.date, lang }) });
      if (!r.ok) return null;
      const j = (await r.json()) as NoteSignals;
      qc.invalidateQueries({ queryKey: ['entries'] });
      return j;
    },
  });
  if (!c.profile) return null;
  const notesAi = (ai.data as NoteSignals | null | undefined) ?? entry.notesAi ?? null;
  // the session being analysed counts as logged even before the save has round-tripped
  const logs = [
    ...c.logs.filter((l) => l.date !== entry.date),
    { date: entry.date, type: entry.planned.type, targetPaceSec: entry.planned.targetPaceSec, hrCap: entry.planned.hrCap, actualPaceSec: entry.actualPaceSec, avgHr: entry.avgHr, rpe: entry.rpe },
  ];
  const a = analyzeSession({ ...entry, notesAi }, {
    profile: c.profile,
    weeks: c.weeks,
    logs,
    morning: c.morning,
    today: c.today,
    ceiling: c.rules?.achillesStiffnessCeiling ?? 4,
    adjust: c.adjust,
    weakest: c.model.weakestStations,
    lang,
  });
  const List = ({ items }: { items: typeof a.findings }) => (
    <ul className="space-y-1.5">
      {items.map((f, i) => {
        const I = ICON[f.tone];
        return (
          <li key={i} className="flex gap-2">
            <I className={clsx('mt-0.5 h-4 w-4 shrink-0', COLOR[f.tone])} aria-hidden />
            <span>{f.text}</span>
          </li>
        );
      })}
    </ul>
  );
  return (
    <section aria-label={t('an.title')} className="mt-4 space-y-4 rounded-lg border border-line bg-panel2/50 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <LineChart className="h-4 w-4 text-volt" aria-hidden />
        <h3 className="font-semibold">{t('an.title')}</h3>
        <span className={clsx('rounded-full border px-2 py-0.5 text-xs font-semibold', VERDICT[a.verdict])}>{t(`an.${a.verdict}` as I18nKey)}</span>
        {a.zone && <span className="chip stat">{a.zone} · {a.pctLthr}% LTHR</span>}
      </div>
      {wantAi && ai.isFetching && <p className="text-xs text-muted">{t('an.reading')}</p>}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t('an.how')}</p>
        <List items={a.findings} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t('an.future')}</p>
        <List items={a.effects} />
      </div>
      {a.signals?.pain &&
        (() => {
          const area = a.signals.area;
          const cur = injuriesOf(c.row?.flags);
          if (area && cur[area] === 'now') return <p className="rounded-lg bg-good/10 p-2 text-xs text-good">{t('an.inj.set', { area: areaName(lang, area) })}</p>;
          if (!area)
            return (
              <Link to="/settings?tab=physio" className="btn-primary btn-sm inline-flex">
                <HeartPulse className="h-4 w-4" /> {t('an.inj.other')}
              </Link>
            );
          return (
            <button
              className="btn-primary btn-sm"
              onClick={async () => {
                const flags = c.row!.flags ?? { achilles: false, quad: false, back: false, shin: false };
                await updateProfile({ flags: withInjuries(flags, { ...cur, [area]: 'now' }) });
                toast.success(t('an.inj.done'));
              }}
            >
              <HeartPulse className="h-4 w-4" /> {t('an.inj.btn', { area: areaName(lang, area) })}
            </button>
          );
        })()}
      {a.next.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t('an.next')}</p>
          <ul className="space-y-1">
            {a.next.map((s) => (
              <li key={s.date} className="flex items-center gap-2 text-xs">
                <span className={clsx('h-2 w-2 rounded-full', TYPE_DOT[s.type])} />
                <span className="w-16 text-muted">
                  {t(`dow.${s.dow}` as I18nKey)} {s.date.slice(8)}/{s.date.slice(5, 7)}
                </span>
                <span>{s.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-muted">
        {a.signals?.source === 'ai' && (
          <span className="mr-1 inline-flex items-center gap-1 text-sky">
            <Sparkles className="h-3 w-3" /> {t('an.ai')} ·
          </span>
        )}
        {t('an.theory')}
      </p>
    </section>
  );
}
