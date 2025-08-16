// Core metabolic calculations
export { computeActivityFactor, computeActivityFactorBreakdown } from './activityFactor';
export type { ActivityInput } from './activityFactor';
export { computeTargets } from './targets';
export { computeWindow } from './windowCalculation';
export type { WindowCalculationResult } from './windowCalculation';

// Form submission workflow
export { default as SubmitMenuForm } from './submitMenuForm';

// Server-only exports (require database access)
// Note: buildN8nPayload n'est pas exporté ici car il est server-only (importe recency.ts)
// Import direct: import { buildN8nPayload } from '@/lib/business/buildN8nPayload'

// Re-export commonly used types from schemas
export type { NormalizedInput, Targets } from '@/schemas';
