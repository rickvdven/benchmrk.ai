import { useEffect, useRef, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { addDays, phaseLabel, weekMilestone, type Session, type Week } from '../engine';
import { PlanExportBar } from '../components/PlanTools';
import { useCoach, useMutations } from '../data/hooks';
import { useI18n } from '../lib/i18n';
import { PageHeader, Spinner } from '../components/ui';
import { SessionDialog, SessionRow } from '../components/session';

function ics(weeks: Week[], race: string) {
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Benchmrk//Plan//EN'];
  for (const w of weeks)
    for (const s of w.sessions) {
      if (s.type === 'rest') continue;
      const d = s.date.replace(/-/g, '');
      const n = addDays(s.date, 1).replace(/-/g, '');
      lines.push('BEGIN:VEVENT', `UID:${d}-${s.type}@roxengine`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${n}`, `SUMMARY:${esc(s.title)}`, `DESCRIPTION:${esc(s.description)}`, 'END:VEVENT');
    }
  lines.push('END:VCALENDAR');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  a.download = `roxengine-${race.replace(/\W+/g, '-').toLowerCase()}.ics`;
  a.click();
}

export default function Plan() {
  const { t, lang } = useI18n();
  const c = useCoach(lang);
  const { saveEntry } = useMutations();
  const [open, setOpen] = useState<Session | null>(null);
  const [showPast, setShowPast] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'start' });
  }, [c.profile !== null]);
  if (!c.profile) return <Spinner />;
  const { weeks, today, byDate, team } = c;
  const curIdx = Math.max(0, weeks.findIndex((w) => today >= w.start && today <= addDays(w.start, 6)));
  const past = weeks.slice(0, curIdx);
  const rest = weeks.slice(curIdx);
  const partnerName = team.partner?.display_name ?? null;
  const partnerDone = (d: string) => !!team.partnerEntries.find((e) => e.date === d && e.completed);

  const toggle = (s: Session) => {
    if (byDate[s.date]?.completed) void saveEntry(s.date, { completed: false, planned: null });
    else setOpen(s);
  };

  const renderWeek = (w: Week, isCur = false) => {
    const done = w.sessions.filter((s) => byDate[s.date]?.completed).length;
    const train = w.sessions.filter((s) => s.type !== 'rest').length;
    return (
      <section key={w.index} ref={isCur ? todayRef : undefined} className="scroll-mt-20">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">
            {t('pl.week', { n: w.index })} <span className="ml-1 text-sm font-normal text-muted">{phaseLabel(lang, w.phase)}</span>
            {w.deload && <span className="ml-2 chip">{t('pl.deload')}</span>}
          </h2>
          <span className="stat text-xs text-muted">
            {done}/{train}
          </span>
        </div>
        {(() => {
          const ms = weekMilestone(w, c.profile!, lang);
          return ms ? <p className="mb-2 rounded-lg bg-volt/10 px-3 py-1.5 text-xs text-volt">🎯 {ms}</p> : null;
        })()}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {w.sessions.map((s) => (
            <SessionRow
              key={s.id}
              s={s}
              isToday={s.date === today}
              done={!!byDate[s.date]?.completed}
              missed={s.date < today && !byDate[s.date]?.completed && !['rest', 'race', 'recovery'].includes(s.type) && !s.extra}
              onOpen={() => setOpen(s)}
              onToggle={s.date <= today ? () => toggle(s) : undefined}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
      <PageHeader eyebrow={t('pl.weeksTo', { n: weeks.length - curIdx, race: c.profile.raceName })} title={t('pl.title')}>
        <div className="flex flex-wrap gap-2">
          <PlanExportBar weeks={weeks} profile={c.profile} maxIncrease={c.rules?.maxWeeklyVolumeIncrease} />
          <button className="btn-ghost btn-sm" onClick={() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {t('pl.jump')}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => ics(weeks, c.profile.raceName)}>
            <CalendarPlus className="h-4 w-4" /> {t('pl.export')}
          </button>
        </div>
      </PageHeader>
      {past.length > 0 && (
        <button className="mb-4 text-sm text-muted underline" onClick={() => setShowPast(!showPast)}>
          {showPast ? t('pl.hidePast') : t('pl.showPast', { n: past.length })}
        </button>
      )}
      <div className="space-y-6">
        {showPast && past.map((w) => renderWeek(w))}
        {rest.map((w, i) => renderWeek(w, i === 0))}
      </div>
      {open && (
        <SessionDialog
          s={weeks.flatMap((w) => w.sessions).find((x) => x.date === open.date) ?? open}
          entry={byDate[open.date]}
          row={c.row}
          today={today}
          partnerName={partnerName}
          partnerDone={partnerDone(open.date)}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
