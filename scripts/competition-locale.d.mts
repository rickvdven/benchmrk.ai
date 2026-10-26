export const PREFIXES: string[];
export function parseCopy(md: string): Record<string, { nl: string; en: string }>;
export function build(prefixes?: string[]): { keys: string[]; files: Record<'nl' | 'en' | 'de' | 'es' | 'ko', Record<string, string>> };
