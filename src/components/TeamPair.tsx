import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n, type I18nKey } from '../lib/i18n';
import { useProfileRow, useTeam } from '../data/hooks';
import { notify } from '../lib/notify';

export function TeamPair({ raceName, raceDate, goalSec }: { raceName?: string | null; raceDate?: string | null; goalSec?: number | null }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const prof = useProfileRow();
  const { team, partner } = useTeam();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['team'] });
    qc.invalidateQueries({ queryKey: ['partner'] });
  };
  const err = (e: unknown) => {
    const m = String((e as { message?: string })?.message ?? '');
    const k = (['team_not_found', 'team_full', 'already_in_team'].find((x) => m.includes(x)) ?? '') as string;
    toast.error(k ? t(`db.err.${k}` as I18nKey) : t('common.error'));
  };

  if (prof.data?.team_id && team) {
    const shareText = `Benchmrk doubles: ${team.code} → ${window.location.origin}/doubles`;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label">{t('db.code')}</span>
          <span className="stat rounded-lg bg-panel2 px-3 py-1.5 text-lg font-semibold tracking-widest text-volt">{team.code}</span>
          <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(team.code).then(() => toast.success('✓'))}>
            <Copy className="h-3.5 w-3.5" />
          </button>
          {navigator.share && (
            <button className="btn-ghost btn-sm" onClick={() => navigator.share({ text: shareText }).catch(() => undefined)}>
              <Share2 className="h-3.5 w-3.5" /> {t('db.share')}
            </button>
          )}
        </div>
        {!partner && <p className="text-sm text-muted">{t('db.waiting')}</p>}
        <button
          className="text-xs text-muted underline hover:text-bad"
          onClick={async () => {
            if (!confirm(t('db.leaveConfirm'))) return;
            const { error } = await supabase.rpc('leave_team');
            if (error) err(error);
            refresh();
          }}
        >
          {t('db.leave')}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <button
          className="btn-primary w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const { error } = await supabase.rpc('create_team', { _race_name: raceName ?? null, _race_date: raceDate ?? null, _goal_sec: goalSec ?? null });
            setBusy(false);
            if (error) return err(error);
            refresh();
          }}
        >
          {t('db.create')}
        </button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (code.replace(/[^A-Za-z0-9]/g, '').length < 6) return;
          setBusy(true);
          const { error } = await supabase.rpc('join_team', { _code: code });
          setBusy(false);
          if (error) return err(error);
          toast.success(t('db.joined'));
          void notify('team_joined');
          // doubles partners train the same sims: copy the partner's gym if you have none
          void supabase.rpc('copy_partner_gym');
          refresh();
        }}
      >
        <input className="input stat uppercase tracking-widest" placeholder="ROX-ABC" value={code} onChange={(e) => setCode(e.target.value)} aria-label={t('db.code')} />
        <button className="btn-ghost shrink-0" disabled={busy}>
          {t('db.join')}
        </button>
      </form>
    </div>
  );
}
