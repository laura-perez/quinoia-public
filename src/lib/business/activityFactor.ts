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
