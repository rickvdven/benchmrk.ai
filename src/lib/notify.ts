import { supabase } from './supabase';

/** Fire-and-forget call to the mail API; never blocks the UI. */
export async function notify(kind: 'welcome' | 'team_joined' | 'payment_approved' | 'test', userId?: string) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const r = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, userId }),
    });
    return r.ok ? ((await r.json()) as { result: string }).result : null;
  } catch {
    return null;
  }
}
