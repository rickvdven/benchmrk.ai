import { useCallback } from 'react';
import { ct } from './competition';
import { useI18n } from './i18n';

/** `ct` bound to the language of the app: const c = useCt(); c('share.btn.share'). */
export function useCt() {
  const { lang } = useI18n();
  return useCallback((key: string, p?: Record<string, string | number>) => ct(lang, key, p), [lang]);
}
