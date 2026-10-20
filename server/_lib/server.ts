import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const env = (k: string) => process.env[k] ?? '';
export const APP_URL = () => env('APP_URL') || 'https://roxengine-beta.vercel.app';

let admin: SupabaseClient | null = null;
/** Service-role client: bypasses RLS, server only. */
export function db() {
  admin ??= createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  return admin;
}

/** Validates the caller's Supabase JWT and returns the user. */
export async function userFromRequest(authHeader?: string | string[]) {
  const h = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const { data } = await db().auth.getUser(token);
  return data.user ?? null;
}

export async function isAdmin(uid: string) {
  const { data } = await db().from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').maybeSingle();
  return !!data;
}

const secret = () => env('UNSUB_SECRET') || env('SUPABASE_SERVICE_ROLE_KEY');
export const unsubToken = (uid: string, kind: string) => crypto.createHmac('sha256', secret()).update(`${uid}:${kind}`).digest('hex').slice(0, 32);
export const unsubUrl = (uid: string, kind: string) => `${APP_URL()}/api/unsubscribe?u=${uid}&k=${kind}&t=${unsubToken(uid, kind)}`;
