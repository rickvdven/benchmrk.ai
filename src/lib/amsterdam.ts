// Times in Admin → Social are shown and entered in Europe/Amsterdam, whatever the browser's time zone.
export const TZ = 'Europe/Amsterdam';

const parts = (at: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
};

/** Minutes Amsterdam is ahead of UTC at that instant (60 or 120). */
export function amsOffset(at: Date) {
  const p = parts(at);
  return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO instant → "YYYY-MM-DDTHH:mm" in Amsterdam (for <input type="datetime-local">). */
export function toAmsInput(iso: string | Date) {
  const p = parts(typeof iso === 'string' ? new Date(iso) : iso);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** "YYYY-MM-DDTHH:mm" in Amsterdam → ISO instant (UTC). */
export function fromAmsInput(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = guess - amsOffset(new Date(guess)) * 60_000;
  const off2 = amsOffset(new Date(t));
  t = guess - off2 * 60_000;
  return new Date(t).toISOString();
}

/** The Amsterdam calendar date (YYYY-MM-DD) of an instant. */
export const amsDate = (iso: string | Date) => toAmsInput(iso).slice(0, 10);

/** Monday (YYYY-MM-DD, Amsterdam) of the week an instant falls in. */
export function amsMonday(iso: string | Date) {
  const d = amsDate(iso);
  const dt = new Date(d + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

export function addDaysIso(date: string, n: number) {
  const dt = new Date(date + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** "di 17 nov · 18:30" in the reader's language, Amsterdam time. */
export function fmtAms(iso: string, lang: string, withYear = false) {
  const loc = lang === 'ko' ? 'ko-KR' : lang;
  const d = new Date(iso);
  const day = d.toLocaleDateString(loc, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  const time = d.toLocaleTimeString(loc, { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}
