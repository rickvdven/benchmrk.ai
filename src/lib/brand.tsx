import type { ReactNode } from 'react';

/** Keeps the brand name on one line: headings hyphenate long words, and "BENCHM-RK" must never happen. */
export function nb(text: string): ReactNode {
  return text.split(/(Benchmrk)/g).map((part, i) =>
    part === 'Benchmrk' ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
