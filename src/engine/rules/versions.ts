import type { RuleSetVersion } from './types';

/**
 * Every rule-set version after v1, oldest first. A version lists only what changes against the one before it.
 * Add one per research change (see claude/research/opdrachten/VERWERK_*.md): next number, date, title in 5 languages,
 * and per change { key, before, after, sourceIds, why }. `before` must equal the value in the previous version
 * (the tests check this). Members keep their pinned version until they choose "Apply" on the plan update.
 */
export const VERSIONS: RuleSetVersion[] = [];
