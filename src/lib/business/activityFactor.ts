import type { NormalizedInput } from "@/schemas";
export type ActivityInput = NormalizedInput["activity"];
import {
  STEP_INCREMENTS,
  SESSION_INCREMENTS,
  INTENSITY_BONUS,
  SEDENTARY_PENALTY,
  BASE_ACTIVITY_FACTOR,
  CLAMP_MIN,
  CLAMP_MAX,
  clampActivityFactor,
} from "@/lib/constants/activityFactor";

/**
 * Calcule le facteur d'activité pour le calcul TDEE
 * 
 * Formule: TDEE = BMR × facteur d'activité
 * 
 * @param input - Données d'activité physique de l'utilisateur
 * @returns Facteur d'activité clamped entre 1.35 et 1.7
 * 
 * @example
 * ```typescript
 * const activity = {
 *   deskJob: true,
 *   dailySteps: '5-8k',
 *   sessionsPerWeek: '3-4',
 *   highIntensity: true
 * };
 * const factor = computeActivityFactor(activity); // ~1.57
 * ```
 * 
 * @description
 * Le calcul suit cette logique:
 * - Base: 1.35 (sédentaire)
 * - Pas/jour: +0.00 (<5k), +0.02 (5-8k), +0.05 (>8k)
 * - Sessions/semaine: +0.0 (0), +0.05 (1-2), +0.1 (3-4), +0.15 (>=5)
 * - Bonus intensité: +0.05 si sessions > 0 ET highIntensity
 * - Pénalité sédentaire: -0.05 si deskJob ET dailySteps < 5k
 * - Résultat clamped entre 1.35 et 1.7
 */
export function computeActivityFactor(input: ActivityInput): number {
  let factor = BASE_ACTIVITY_FACTOR;
  factor += STEP_INCREMENTS[input.dailySteps];
  factor += SESSION_INCREMENTS[input.sessionsPerWeek];
  if (input.sessionsPerWeek !== "0" && input.highIntensity) {
    factor += INTENSITY_BONUS;
  }
  if (input.deskJob && input.dailySteps === "<5k") {
    factor += SEDENTARY_PENALTY;
  }
  factor = clampActivityFactor(factor);
  return factor;
}

/**
 * Calcule le facteur d'activité avec détail des composants
 * 
 * Utile pour debugging et validation des calculs métaboliques
 * 
 * @param input - Données d'activité physique de l'utilisateur
 * @returns Objet contenant le facteur final et la décomposition détaillée
 * 
 * @example
 * ```typescript
 * const result = computeActivityFactorBreakdown(activity);
 * console.log(result.factor); // 1.57
 * console.log(result.breakdown);
 * // {
 * //   base: 1.35,
 * //   stepInc: 0.02,
 * //   sessInc: 0.1,
 * //   intensityInc: 0.05,
 * //   sedentaryPenalty: 0,
 * //   unclamped: 1.52,
 * //   clamped: 1.52
 * // }
 * ```
 */
export function computeActivityFactorBreakdown(input: ActivityInput) {
  const stepInc = STEP_INCREMENTS[input.dailySteps];
  const sessInc = SESSION_INCREMENTS[input.sessionsPerWeek];
  const intensityInc = input.sessionsPerWeek !== "0" && input.highIntensity ? INTENSITY_BONUS : 0;
  const sedentary = input.deskJob && input.dailySteps === "<5k" ? SEDENTARY_PENALTY : 0;
  const unclamped = BASE_ACTIVITY_FACTOR + stepInc + sessInc + intensityInc + sedentary;
  const clamped = clampActivityFactor(unclamped);
  return {
    factor: clamped,
    breakdown: {
      base: BASE_ACTIVITY_FACTOR,
      stepInc,
      sessInc,
      intensityInc,
      sedentaryPenalty: sedentary,
      unclamped,
      clamped,
    },
  };
}
