/**
 * Write queue: every user action is written immediately as its own row (no debounced blob).
 * If the network fails, the write is kept in localStorage and retried on reconnect,
 * on an interval and when the page becomes visible again. Last write per key wins
 * locally; different rows (days) never overwrite each other.
 */
import { supabase } from './supabase';

type Op =
  | { kind: 'upsert'; table: string; row: Record<string, unknown>; onConflict?: string }
  | { kind: 'delete'; table: string; match: Record<string, unknown> };

interface Item {
  key: string; // dedupe key: later writes to the same key replace earlier queued ones
  op: Op;
  at: number;
}

const LS = 'rox:queue:v1';
let flushing = false;
const listeners = new Set<(n: number) => void>();

function load(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(LS) || '[]');
  } catch {
    return [];
  }
}
function save(items: Item[]) {
  try {
    localStorage.setItem(LS, JSON.stringify(items));
  } catch {
    /* storage unavailable: writes still go straight to the server */
  }
  listeners.forEach((l) => l(items.length));
}

export const pendingCount = () => load().length;
export function onQueueChange(fn: (n: number) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function run(op: Op) {
  if (op.kind === 'upsert') {
    const { error } = await supabase.from(op.table).upsert(op.row, op.onConflict ? { onConflict: op.onConflict } : undefined);
    if (error) throw error;
  } else {
    let q = supabase.from(op.table).delete();
    for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v as string);
    const { error } = await q;
    if (error) throw error;
  }
}

const isNetwork = (e: unknown) => {
  const m = String((e as { message?: string })?.message ?? e);
  return /fetch|network|Failed|timeout|Load failed/i.test(m);
};

/** Write now; queue only if the network is down. Rejects on real (non-network) errors. */
export async function write(key: string, op: Op) {
  const queued = load().filter((i) => i.key !== key);
  try {
    if (!navigator.onLine) throw new Error('network offline');
    await run(op);
    save(queued);
  } catch (e) {
    if (isNetwork(e)) {
      save([...queued, { key, op, at: Date.now() }]);
      return;
    }
    throw e;
  }
}

export async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    let items = load();
    for (const it of [...items]) {
      try {
        await run(it.op);
        items = items.filter((x) => x !== it);
        save(items);
      } catch (e) {
        if (isNetwork(e)) break;
        items = items.filter((x) => x !== it); // permanent error: drop
        save(items);
      }
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void flush());
  setInterval(() => load().length && void flush(), 15000);
}
