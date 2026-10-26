import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';

/**
 * Modal on desktop, bottom sheet under 768px (design A: scrim in ink at 45 %, ground-coloured panel).
 * Closes on Escape and on a click on the scrim; focus moves into the dialog and returns when it closes.
 */
export function Dialog({ open, onClose, labelledBy, children, wide = false, closeLabel = 'Close' }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; wide?: boolean; closeLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={clsx(
          'absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[10px] bg-ground shadow-[0_30px_80px_rgba(0,0,0,0.3)] outline-none',
          'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[calc(100vh-48px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded',
          wide ? 'md:w-[min(920px,calc(100%-48px))]' : 'md:w-[min(520px,calc(100%-48px))]',
        )}
      >
        <div className="mx-auto mb-1 mt-2 h-[5px] w-11 rounded-[3px] bg-line md:hidden" aria-hidden />
        <button type="button" onClick={onClose} aria-label={closeLabel} className="absolute right-1 top-1 z-10 flex h-11 w-11 items-center justify-center text-[26px] leading-none text-ink hover:text-ink-3 md:right-3 md:top-2.5">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
