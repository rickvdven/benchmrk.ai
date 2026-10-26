import { useState } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Award, Check, LineChart, ShieldAlert, Sparkles, Users } from 'lucide-react';
import {
  STATIONS,
  stationLabel,
  applyBenchmark,
  calibrationOf,
  fmtMmss,
  parseMmss,
  replay,
  todayISO,
  type BenchmarkEntry,
  type Calibration,
  type Session,
} from '../engine';
import { useI18n, type I18nKey } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth, useBenchmarks, useKnowledge, useMutations, useMyGym, useProfileRow, useRulesAndBaselines } from '../data/hooks';
import { useCardOffer } from './CardOffer';
import { benchmarkPr } from '../lib/cardOffers';
import { Link } from 'react-router-dom';
import { toAthlete, toBenchmark, toProfile, type EntryRow, type ProfileRow } from '../data/mapping';
import { Field, Modal, NumInput, TimeInput } from './ui';
import { AnalysisPanel } from './Analysis';
import { PlacePicker } from './Places';
import { AddExtra } from './AddExtra';
import { AltPicker } from './AltPicker';

export const TYPE_DOT: Record<string, string> = {
  threshold: 'bg-[#d95926]',
  intervals: 'bg-[#d55181]',
  easy: 'bg-[#3987e5]',
  long: 'bg-[#3987e5]',
  sim: 'bg-volt',
  strength: 'bg-[#9085e9]',
  wod: 'bg-[#c98500]',
  recovery: 'bg-[#199e70]',
  rest: 'bg-line',
  race: 'bg-volt',
};

export function SessionChips({ s }: { s: Session }) {
  const { t, pace } = useI18n();
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {s.targetPaceSec && s.type !== 'easy' && s.type !== 'long' && s.type !== 'recovery' ? <span className="chip stat">{pace(s.targetPaceSec)}</span> : null}
      {s.hrCap ? <span className="chip stat">≤ {s.hrCap} bpm</span> : null}
      {s.rpe ? <span className="chip">RPE {s.rpe}</span> : null}
      {s.extra ? <span className="chip bg-sky/15 text-sky">{t('ex.badge')}</span> : null}
      {s.alt ? <span className="chip bg-sky/15 text-sky">{t('alt.badge')}</span> : null}
      {s.cross ? <span className="chip bg-warn/15 text-warn">{t('pl.noRun')}</span> : null}
      {s.placeChosen && s.placeName ? <span className="chip bg-volt/10 text-volt">📍 {s.placeName}</span> : null}
      {s.benchmark ? (
        <span className="chip bg-warn/15 font-semibold text-warn">
          <Award className="h-3 w-3" /> B{s.benchmark}
        </span>
      ) : null}
      {s.guard ? (
        <span className="chip bg-warn/15 text-warn">
          <ShieldAlert className="h-3 w-3" /> {t('pl.guard')}
        </span>
      ) : null}
      {s.sharedTeamDay ? (
        <span className="chip bg-sky/15 text-sky">
          <Users className="h-3 w-3" />
        </span>
      ) : null}
    </div>
  );
}

/** Session detail + logging (pace/HR/RPE, WOD text & photo) + benchmark entry. */
export function SessionDialog({
  s,
  entry,
  row,
  partnerName,
  partnerDone,
  today,
  onClose,
}: {
  s: Session & { frozen?: boolean };
  entry?: EntryRow;
  row: ProfileRow;
  partnerName?: string | null;
  partnerDone?: boolean;
  today: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { saveEntry } = useMutations();
  const prof = useProfileRow();
  const [pace, setPace] = useState<number | null>(entry?.actual_pace_sec ?? null);
  const [hr, setHr] = useState<number | null>(entry?.avg_hr ?? null);
  const [maxHr, setMaxHr] = useState<number | null>(entry?.max_hr ?? null);
  const [rpe, setRpe] = useState<number>(entry?.rpe ?? 7);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [wodText, setWodText] = useState(entry?.wod?.description ?? '');
  const [wodWork, setWodWork] = useState(entry?.wod?.work ?? '');
  const [photo, setPhoto] = useState<string | null>(entry?.wod?.photo ?? null);
  const [bench, setBench] = useState(false);
  const [showAn, setShowAn] = useState(false);
  const [savedData, setSavedData] = useState(false);
  const { user } = useAuth();
  const knowledge = useKnowledge();
  const myGym = useMyGym();
  const srcCat: Record<string, string> = { threshold: 'zones', intervals: 'zones', easy: 'science', long: 'science', sim: 'science', strength: 'rules', recovery: 'zones' };
  const kd = knowledge.data ?? [];
  const source = (s.sourceKey ? kd.find((k) => k.title.startsWith(s.sourceKey!)) : null) ?? (s.type === 'race' ? kd.find((k) => k.category === 'nutrition') : null) ?? kd.find((k) => k.category === srcCat[s.type]) ?? null;
  const future = s.date > today;
  const done = !!entry?.completed;
  const runType = ['threshold', 'intervals', 'easy', 'long', 'sim'].includes(s.type);
  const [scanning, setScanning] = useState(false);

  /** Resize to ≤1600 px JPEG, store the photo, optionally read it with AI. */
  const onPhoto = async (f: File | undefined, scan: boolean) => {
    if (!f || !user) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(f);
    });
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${user.id}/${s.date}-${Date.now()}.jpg`;
    const up = await supabase.storage.from('wod-photos').upload(path, blob, { contentType: 'image/jpeg' });
    if (!up.error) setPhoto(path);
    if (!scan) return;
    setScanning(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const r = await fetch('/api/whiteboard', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ image: dataUrl }) });
      if (r.status === 429) return toast.error(t('ai.limit'));
      if (!r.ok) return toast.error(t('ai.fail'));
      const j = (await r.json()) as { description: string; work: string };
      if (j.description) setWodText(j.description);
      if (j.work) setWodWork(j.work);
      toast.success(t('ai.done'));
    } catch {
      toast.error(t('ai.fail'));
    } finally {
      setScanning(false);
    }
  };

  const save = async (withData: boolean) => {
    try {
      const { frozen: _f, ...planned } = s as Session & { frozen?: boolean };
      await saveEntry(s.date, {
        completed: true,
        planned: planned as unknown as Record<string, unknown>,
        actual_pace_sec: withData ? pace : null,
        avg_hr: withData ? hr : null,
        max_hr: withData ? maxHr : null,
        rpe: withData ? rpe : null,
        notes: withData ? notes || null : null,
        wod: s.type === 'wod' && (wodText || wodWork || photo) ? { description: wodText, work: wodWork, photo } : null,
      });
      toast.success(t('common.saved'));
      // with data: stay open and show how Benchmrk reads it
      if (withData) {
        setSavedData(true);
        setShowAn(true);
      }
      else onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <Modal open onClose={onClose} title={s.title} wide>
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            {t(`dow.${s.dow}` as I18nKey)} {s.date}
          </p>
          {s.frozen && <p className="text-xs text-muted">{t('pl.frozen')}</p>}
          {s.benchmarkText && <p className="rounded-lg bg-warn/15 p-2 font-semibold text-warn">{s.benchmarkText}</p>}
          <p className="whitespace-pre-line">{s.description}</p>
          <SessionChips s={s} />
          {s.type === 'sim' && !s.alt && !row.sim_protocol && myGym.isFetched && !myGym.data && (
            <p className="rounded-lg border border-sky/40 bg-sky/5 p-2 text-xs">
              {t('sim.defaultNote')}{' '}
              <Link to="/settings?tab=gym" className="text-volt underline">
                {t('sim.linkGym')}
              </Link>
            </p>
          )}
          {s.warmup && (
            <p className="border-t border-line pt-2 text-xs text-muted">
              <span className="font-semibold text-fg">{t('pl.warmup')}: </span>
              {s.warmup}
            </p>
          )}
          {s.tip && <p className="rounded-lg border border-volt/30 bg-volt/10 p-2 text-xs">{s.tip}</p>}
          {source && (
            <p className="text-xs text-muted">
              {t('x.source')}:{' '}
              {source.source_url ? (
                <a href={source.source_url} target="_blank" rel="noreferrer" className="text-volt underline">
                  {source.title}
                </a>
              ) : (
                source.title
              )}
            </p>
          )}
          {partnerName && (
            <p className="text-xs text-sky">{partnerDone ? t('pl.partnerDone', { name: partnerName }) : t('pl.partnerNot', { name: partnerName })}</p>
          )}
        </div>

        {s.type !== 'rest' && s.type !== 'race' && !future && (
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <h3 className="font-semibold">{t('pl.logTitle')}</h3>
            {s.type === 'wod' && (
              <>
                <Field label={t('pl.wodWhat')}>
                  <textarea className="input h-20 py-2" value={wodText} onChange={(e) => setWodText(e.target.value)} />
                </Field>
                <Field label={t('pl.wodWork')}>
                  <input className="input" value={wodWork} onChange={(e) => setWodWork(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <label className={clsx('btn-ghost btn-sm cursor-pointer', scanning && 'pointer-events-none opacity-60')}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {scanning ? t('ai.scanning') : t('ai.scan')}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0], true)} />
                  </label>
                  <label className="btn-ghost btn-sm cursor-pointer">
                    {photo ? '✓ ' : ''}
                    {t('pl.photo')}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0], false)} />
                  </label>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {runType && (
                <Field label={t('pl.actualPace')}>
                  <TimeInput value={pace} parse={parseMmss} format={fmtMmss} placeholder={s.targetPaceSec ? fmtMmss(s.targetPaceSec) : '5:00'} onChange={(v) => setPace(v)} />
                </Field>
              )}
              <Field label={t('pl.avgHr')}>
                <NumInput value={hr} onChange={setHr} placeholder={s.hrCap ? String(s.hrCap) : '160'} />
              </Field>
              <Field label={t('pl.maxHr')}>
                <NumInput value={maxHr} onChange={setMaxHr} />
              </Field>
              <Field label={`RPE ${rpe}/10`}>
                <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(+e.target.value)} className="mt-3 w-full accent-[rgb(var(--volt))]" />
              </Field>
            </div>
            <Field label={t('pl.notes')} help={t('pl.notesHelp')}>
              <textarea className="input min-h-[84px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => save(true)}>
                <Check className="h-4 w-4" /> {t('common.save')}
              </button>
              {!done && (
                <button className="btn-ghost" onClick={() => save(false)}>
                  {t('pl.skip')}
                </button>
              )}
              {done && (
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    const { frozen: _fz, ...keep } = s as Session & { frozen?: boolean };
                    await saveEntry(s.date, { completed: false, planned: s.extra || s.alt ? (keep as unknown as Record<string, unknown>) : null });
                    onClose();
                  }}
                >
                  {t('pl.undo')}
                </button>
              )}
              {(done || showAn) && (
                <button className="btn-ghost" aria-expanded={showAn} onClick={() => setShowAn(!showAn)}>
                  <LineChart className="h-4 w-4" /> {showAn ? t('an.hide') : t('an.view')}
                </button>
              )}
              {s.benchmark && (
                <button className="btn-ghost border-warn/60 text-warn" onClick={() => setBench(true)}>
                  <Award className="h-4 w-4" /> {t('pl.logBench')}
                </button>
              )}
            </div>
          </div>
        )}
        {showAn && (
          <AnalysisPanel
            entry={{
              date: s.date,
              planned: s,
              actualPaceSec: pace,
              avgHr: hr,
              maxHr,
              rpe: savedData || entry?.rpe != null ? rpe : null,
              wod: { description: wodText, work: wodWork },
              notes,
              notesAi: entry?.notes === notes ? (entry?.notes_ai ?? null) : null,
            }}
            saved={!!entry?.completed && (entry?.notes ?? '') === notes}
          />
        )}
        {!done && s.date >= today && s.type !== 'rest' && s.type !== 'race' && prof.data && (
          <PlacePicker row={prof.data} date={s.date} dow={s.dow} chosen={entry?.place} onPick={(id) => saveEntry(s.date, { place: id })} />
        )}
        {future && s.type !== 'rest' && <p className="mt-4 text-xs text-muted">{t('pl.future')}</p>}
        {(s.type === 'rest' || (s.type === 'recovery' && !s.extra)) && !done && <AddExtra date={s.date} onAdded={onClose} />}
        {!s.extra && !s.alt && !done && ['sim', 'strength', 'threshold', 'intervals', 'long', 'easy'].includes(s.type) && s.date >= today && <AltPicker s={s} onPicked={onClose} />}
        {s.alt && !done && (
          <div className="mt-4 rounded-lg border border-sky/40 bg-sky/5 p-3 text-sm">
            <p className="text-xs text-muted">{t('alt.replaces', { title: s.altOf ?? '' })}</p>
            <button
              className="btn-ghost btn-sm mt-2"
              onClick={async () => {
                await saveEntry(s.date, { completed: false, planned: null });
                onClose();
              }}
            >
              {t('alt.back')}
            </button>
          </div>
        )}
        {s.extra && !done && (
          <button
            className="btn-ghost mt-4 text-bad"
            onClick={async () => {
              await saveEntry(s.date, { completed: false, planned: null });
              onClose();
            }}
          >
            {t('ex.remove')}
          </button>
        )}
      </Modal>
      {bench && s.benchmark && <BenchmarkDialog number={s.benchmark} date={s.date} row={row} session={s} onClose={() => setBench(false)} onSaved={onClose} />}
    </>
  );
}

export function BenchmarkDialog({
  number,
  date,
  row,
  existing,
  session,
  onClose,
  onSaved,
}: {
  number: 1 | 2 | 3 | 4 | 5;
  date: string;
  row: ProfileRow;
  existing?: BenchmarkEntry;
  session?: Session;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t, lang } = useI18n();
  const bms = useBenchmarks();
  const rb = useRulesAndBaselines();
  const { offer } = useCardOffer();
  const { saveBenchmark, saveEntry } = useMutations();
  const [pace, setPace] = useState<number | null>(existing?.paceSec ?? null);
  const [hr, setHr] = useState<number | null>(existing?.avgHr ?? null);
  const [rpe, setRpe] = useState(existing?.rpe ?? 8);
  const [lt, setLt] = useState<number | null>(existing?.newLtPaceSec ?? null);
  const [lthr, setLthr] = useState<number | null>(existing?.newLthr ?? null);
  const [vo2, setVo2] = useState<number | null>(existing?.newVo2 ?? null);
  const [splits, setSplits] = useState<Record<string, number | null>>(existing?.stationSplits ?? {});
  const [runs, setRuns] = useState<(number | null)[]>(existing?.runSplits ?? Array(8).fill(null));
  const [busy, setBusy] = useState(false);
  const withStations = number >= 3;

  const entry: BenchmarkEntry | null =
    pace && hr
      ? {
          id: existing?.id ?? crypto.randomUUID(),
          number,
          date,
          paceSec: pace,
          avgHr: hr,
          rpe,
          newLtPaceSec: lt,
          newLthr: lthr,
          newVo2: vo2,
          stationSplits: Object.fromEntries(Object.entries(splits).filter(([, v]) => v)) as BenchmarkEntry['stationSplits'],
          runSplits: runs.some((x) => x) ? runs.map((x) => x ?? 0) : undefined,
        }
      : null;

  const baseline = (row.baseline as Calibration | null) ?? calibrationOf(toAthlete(row));
  const since = (row.baseline as { since?: string } | null)?.since ?? '0000';
  const prior = replay(baseline, (bms.data ?? []).filter((b) => b.id !== existing?.id && b.date >= since).map(toBenchmark));
  const preview = entry ? applyBenchmark(prior, entry) : null;

  return (
    <Modal open onClose={onClose} title={t('bm.title', { n: number })} wide>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label={t('bm.pace')}>
            <TimeInput value={pace} parse={parseMmss} format={fmtMmss} placeholder="4:30" onChange={(v) => setPace(v)} />
          </Field>
          <Field label={t('bm.hr')}>
            <NumInput value={hr} onChange={setHr} placeholder={String(row.lthr ?? 170)} />
          </Field>
          <Field label={`RPE ${rpe}/10`}>
            <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(+e.target.value)} className="mt-3 w-full accent-[rgb(var(--volt))]" />
          </Field>
        </div>
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted">{t('bm.garmin')}</summary>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Field label={t('bm.ltPace')}>
              <TimeInput value={lt} parse={parseMmss} format={fmtMmss} onChange={(v) => setLt(v)} />
            </Field>
            <Field label={t('bm.lthr')}>
              <NumInput value={lthr} onChange={setLthr} />
            </Field>
            <Field label={t('bm.vo2')}>
              <NumInput value={vo2} onChange={setVo2} />
            </Field>
          </div>
        </details>
        {withStations && (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-xs font-semibold text-muted">{t('bm.splits')}</p>
            {number < 5 && <p className="text-xs text-warn">{t('bm.splitsVol', { n: 75 })}</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATIONS.map((s) => (
                <Field key={s} label={stationLabel(lang, s)}>
                  <TimeInput className="h-8 text-xs" value={splits[s] ?? null} parse={parseMmss} format={fmtMmss} placeholder="m:ss" onChange={(v) => setSplits({ ...splits, [s]: v })} />
                </Field>
              ))}
            </div>
            <p className="text-xs font-semibold text-muted">{t('bm.runs')}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {runs.map((r, i) => (
                <Field key={i} label={`#${i + 1}`}>
                  <TimeInput className="h-8 text-xs" value={r} parse={parseMmss} format={fmtMmss} placeholder="m:ss" onChange={(v) => setRuns(runs.map((x, k) => (k === i ? v : x)))} />
                </Field>
              ))}
            </div>
          </div>
        )}
        {preview && (
          <div className="rounded-lg border border-volt/40 bg-volt/10 p-3 text-xs">
            <p className="mb-1 font-semibold text-volt">{t('bm.preview')}</p>
            {(number <= 2 || lt) && <p className="stat">{t('bm.thrFromTo', { a: fmtMmss(preview.before.thresholdPaceSec), b: fmtMmss(preview.after.thresholdPaceSec) })}</p>}
            {preview.notes
              .filter((n) => !n.startsWith('threshold_'))
              .map((n) => (
                <p key={n}>• {t(`bm.note.${n}` as I18nKey)}</p>
              ))}
          </div>
        )}
        <button
          className="btn-primary w-full"
          disabled={busy}
          onClick={async () => {
            if (!entry) return toast.error(t('bm.errPace'));
            setBusy(true);
            try {
              const effect = await saveBenchmark(row, entry, bms.data ?? []);
              const { frozen: _f, ...planned } = (session ?? {}) as Session & { frozen?: boolean };
              await saveEntry(date, {
                completed: true,
                ...(session ? { planned: planned as unknown as Record<string, unknown> } : {}),
                actual_pace_sec: entry.paceSec,
                avg_hr: entry.avgHr,
                rpe: entry.rpe ?? null,
              });
              toast.success(t('common.saved'));
              onClose();
              onSaved?.();
              // a faster threshold than before is a personal record: offer a card (not when an old result was edited)
              if (!existing) {
                const previous = (bms.data ?? []).filter((x) => x.id !== entry.id && x.date < entry.date).map((x) => x.date).sort().pop() ?? null;
                const pr = benchmarkPr({ full: toProfile(row), effect, n: number, date: entry.date, today: todayISO(), lang, base: rb.data?.baselines, previousDate: previous });
                if (pr) offer(pr);
              }
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('bm.save')}
        </button>
      </div>
    </Modal>
  );
}

export function SessionRow({ s, done, onOpen, onToggle, isToday, missed }: { s: Session; done: boolean; onOpen: () => void; onToggle?: () => void; isToday?: boolean; missed?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={clsx('panel relative flex gap-2 p-3 transition-colors hover:border-volt/50', isToday && 'border-volt', done && 'opacity-60')}>
      {onToggle && s.type !== 'rest' && s.type !== 'race' ? (
        <button
          onClick={onToggle}
          aria-label={`${done ? t('pl.undo') : t('ck.markDone')}: ${s.title}`}
          aria-pressed={done}
          className={clsx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border', done ? 'border-volt bg-volt text-black' : 'border-muted')}
        >
          {done && <Check className="h-3.5 w-3.5" />}
        </button>
      ) : (
        <span className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
          <span className={clsx('h-2 w-2 rounded-full', TYPE_DOT[s.type])} />
          {t(`dow.${s.dow}` as I18nKey)} {s.date.slice(8)}/{s.date.slice(5, 7)}
        </div>
        <p className="mt-1 text-sm font-medium leading-tight">{s.title}</p>
        {missed && <span className="mt-1 inline-block rounded-md bg-warn/15 px-1.5 py-0.5 text-[11px] font-semibold text-warn">{t('pl.missed')}</span>}
        <SessionChips s={s} />
      </button>
    </div>
  );
}
