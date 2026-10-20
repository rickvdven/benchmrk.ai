/** Race time parser shared by onboarding and settings.
 * Accepts "1:25" (h:mm), "1:25:00" (h:mm:ss), "85:00" (mm:ss when first part >= 30), "85" (minutes).
 * Returns seconds, or null when invalid or outside 30–240 min. */
export function parseRaceTime(input: string): number | null {
  const s = (input ?? '').trim();
  if (!s) return null;
  let sec: number | null = null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/))) {
    if (+m[2] > 59 || +m[3] > 59) return null;
    sec = +m[1] * 3600 + +m[2] * 60 + +m[3];
  } else if ((m = s.match(/^(\d{1,3}):(\d{2})$/))) {
    const a = +m[1];
    const b = +m[2];
    if (b > 59) return null;
    sec = a >= 30 ? a * 60 + b : a * 3600 + b * 60;
  } else if ((m = s.match(/^(\d{2,3})$/))) {
    sec = +m[1] * 60;
  }
  if (sec === null) return null;
  return sec >= 1800 && sec <= 14400 ? sec : null;
}

/** Pace / split parser "m:ss" -> seconds. */
export function parseMmss(input: string): number | null {
  const m = (input ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m || +m[2] > 59) return null;
  const v = +m[1] * 60 + +m[2];
  return v > 0 ? v : null;
}

export const fmtMmss = (sec: number | null | undefined): string => {
  if (sec == null || !Number.isFinite(sec)) return '–';
  const t = Math.round(sec);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export const fmtHms = (sec: number | null | undefined): string => {
  if (sec == null || !Number.isFinite(sec)) return '–';
  const t = Math.round(Math.abs(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const body = h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  return sec < 0 ? `−${body}` : body;
};

export const fmtMinutes = (sec: number) => `${Math.round(sec / 60)} min`;

// ---------- dates (local calendar dates as YYYY-MM-DD) ----------
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const mondayOf = (s: string) => {
  const d = fromISO(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISO(d);
};
/** whole days from a to b (b - a), DST-safe */
export const daysBetween = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
export const dowOf = (s: string) => (fromISO(s).getDay() + 6) % 7;
export const todayISO = () => toISO(new Date());
