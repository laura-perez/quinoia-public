export { computeActivityFactor, computeActivityFactorBreakdown } from './activityFactor';
export { default as SubmitMenuForm } from './submitMenuForm';
export { computeTargets } from './targets';
export { computeWindow } from './windowCalculation';
export type { WindowCalculationResult } from './windowCalculation';
// Note: buildN8nPayload n'est pas exporté ici car il est server-only (importe recency.ts)
// Import direct: import { buildN8nPayload } from '@/lib/business/buildN8nPayload'
