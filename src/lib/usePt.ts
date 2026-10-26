import { useCallback } from 'react';
import { pt } from './planupdate';
import { useI18n } from './i18n';

/** `pt` bound to the language of the app: const p = usePt(); p('pu.hist.title'). */
export function usePt() {
  const { lang } = useI18n();
  return useCallback((key: string, p?: Record<string, string | number>) => pt(lang, key, p), [lang]);
}
