import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Star, X } from 'lucide-react';

/** Form field. Use `group` when the children are buttons (a <label> would forward every click to its first button). */
export function Field({ label, help, error, children, className, group }: { label: ReactNode; help?: ReactNode; error?: string | null; children: ReactNode; className?: string; group?: boolean }) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className={clsx('block space-y-1.5', className)} {...(group ? { role: 'group', 'aria-label': typeof label === 'string' ? label : undefined } : {})}>
      <span className="label block">{label}</span>
      {children}
      {error ? <span className="block text-xs text-bad">{error}</span> : help ? <span className="block text-xs text-muted">{help}</span> : null}
    </Tag>
  );
}

/** Number input that keeps what the user types and reports a number (or null when empty/invalid). */
export function NumInput({ value, onChange, min, max, step, placeholder, className }: { value: number | null | undefined; onChange: (v: number | null) => void; min?: number; max?: number; step?: number; placeholder?: string; className?: string }) {
  const [txt, setTxt] = useState(value == null ? '' : String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setTxt(value == null ? '' : String(value));
      last.current = value;
    }
  }, [value]);
  return (
    <input
      className={clsx('input no-spin stat', className)}
      inputMode="decimal"
      type="number"
      value={txt}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = Number(e.target.value.replace(',', '.'));
        const v = e.target.value.trim() === '' || !Number.isFinite(n) ? null : n;
        last.current = v;
        onChange(v);
      }}
    />
  );
}

/** Text input parsed by a parser; reports seconds or null. Shows formatted value initially. */
export function TimeInput({ value, onChange, parse, format, placeholder, className }: { value: number | null | undefined; onChange: (v: number | null, raw: string) => void; parse: (s: string) => number | null; format: (v: number) => string; placeholder?: string; className?: string }) {
  const [txt, setTxt] = useState(value ? format(value) : '');
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setTxt(value ? format(value) : '');
      last.current = value;
    }
  }, [value, format]);
  return (
    <input
      className={clsx('input stat', className)}
      inputMode="numeric"
      value={txt}
      placeholder={placeholder}
      onChange={(e) => {
        setTxt(e.target.value);
        const v = parse(e.target.value);
        last.current = v;
        onChange(v, e.target.value);
      }}
    />
  );
}

export function Stars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${label} ${i}`} onClick={() => onChange(i)} className="p-0.5">
          <Star className={clsx('h-5 w-5', i <= value ? 'fill-volt text-volt' : 'text-muted/50')} />
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-panel2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx('rounded-md font-medium transition-colors', size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm', value === o.value ? 'bg-volt text-black' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={clsx('panel max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold leading-tight">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-panel2 hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'volt' | 'warn' | 'bad' | 'good' }) {
  return (
    <div className="panel p-4">
      <div className="label">{label}</div>
      <div className={clsx('stat mt-1 text-2xl font-semibold', tone && `text-${tone}`)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Spinner() {
  return <div className="mx-auto my-16 h-6 w-6 animate-spin rounded-full border-2 border-line border-t-volt" />;
}

export function Notice({ tone = 'volt', children }: { tone?: 'volt' | 'warn' | 'bad'; children: ReactNode }) {
  return <div className={clsx('rounded-lg border p-3 text-sm', tone === 'volt' && 'border-volt/40 bg-volt/10', tone === 'warn' && 'border-warn/50 bg-warn/10', tone === 'bad' && 'border-bad/50 bg-bad/10')}>{children}</div>;
}
