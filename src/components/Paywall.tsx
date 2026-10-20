import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppSettings, useSubscription } from '../data/hooks';
import { useI18n } from '../lib/i18n';
import { todayISO } from '../engine';

export function membershipOk(sub: { status: string; valid_until: string | null; paywall_enabled: boolean } | null | undefined) {
  if (!sub || !sub.paywall_enabled) return true;
  if (sub.status === 'exempt' || sub.status === 'pending') return true;
  if (sub.status === 'active' || sub.status === 'trial') return !sub.valid_until || sub.valid_until >= todayISO();
  return false;
}

/** Bank-transfer payment block: reference, "I have paid", pending state, invite code. */
export function PayPanel() {
  const { t } = useI18n();
  const sub = useSubscription();
  const settings = useAppSettings();
  const qc = useQueryClient();
  if (!sub.data) return null;
  const s = sub.data;
  const price = String(settings.data?.price_text ?? '');
  const iban = String(settings.data?.iban ?? '');
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{t('st.payTitle')}</h3>
      {s.status === 'pending' ? (
        <p className="rounded-lg bg-warn/10 p-3 text-sm text-warn">{t('st.payPending')}</p>
      ) : (
        <>
          <p className="text-sm">{t('st.payText', { price, iban, ref: s.bank_reference })}</p>
          <div className="stat rounded-lg bg-panel2 p-3 text-sm">
            IBAN <span className="text-fg">{iban}</span> · ref <span className="text-volt">{s.bank_reference}</span>
          </div>
          <button
            className="btn-primary"
            onClick={async () => {
              const { error } = await supabase.rpc('mark_payment_sent');
              if (error) return toast.error(t('common.error'));
              qc.invalidateQueries({ queryKey: ['sub'] });
              toast.success(t('st.payPending'));
            }}
          >
            {t('st.paySent')}
          </button>
        </>
      )}
    </div>
  );
}

export function PaywallScreen() {
  const { t } = useI18n();
  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="panel space-y-4 p-6">
        <h1 className="text-2xl font-extrabold">{t('pay.title')}</h1>
        <p className="text-sm text-muted">{t('pay.sub')}</p>
        <PayPanel />
      </div>
    </div>
  );
}
