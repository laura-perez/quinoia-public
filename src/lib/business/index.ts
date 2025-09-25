// Core metabolic calculations
export { computeActivityFactor, computeActivityFactorBreakdown } from './activityFactor';
export type { ActivityInput } from './activityFactor';
export { computeTargets } from './targets';
export { computeWindow } from './windowCalculation';
export type { WindowCalculationResult } from './windowCalculation';

// Form submission workflow
export { default as SubmitMenuForm } from './submitMenuForm';

// Server-only exports (require database access)
// Note: Direct imports for server-only functions that access database

// Re-export commonly used types from schemas
export type { NormalizedInput, Targets } from '@/schemas';
