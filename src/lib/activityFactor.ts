import type { NormalizedInput } from "@/schemas";

export type ActivityInput = NormalizedInput['activity'];

const stepIncrements = {
  '<5k': 0.00,
  '5-8k': 0.02,
  '>8k': 0.05,
} as const;

const sessionIncrements = {
  '0': 0.00,
  '1-2': 0.05,
  '3-4': 0.10,
  '>=5': 0.15,
} as const;

const intensityBonus = 0.05;
const sedentaryPenalty = -0.05;
const baseFactor = 1.35;
const clampMin = 1.35;
const clampMax = 1.70;

export function computeActivityFactor(input: ActivityInput): number {
  let factor = baseFactor;
  factor += stepIncrements[input.dailySteps];
  factor += sessionIncrements[input.sessionsPerWeek];
  if (input.sessionsPerWeek !== '0' && input.highIntensity) {
    factor += intensityBonus;
  }
  if (input.deskJob && input.dailySteps === '<5k') {
    factor += sedentaryPenalty;
  }
  factor = Math.max(clampMin, Math.min(clampMax, factor));
  return Math.round(factor * 100) / 100;
}

export function computeActivityFactorBreakdown(input: ActivityInput) {
  const stepInc = stepIncrements[input.dailySteps];
  const sessInc = sessionIncrements[input.sessionsPerWeek];
  const intensityInc = (input.sessionsPerWeek !== '0' && input.highIntensity) ? intensityBonus : 0;
  const sedentary = (input.deskJob && input.dailySteps === '<5k') ? sedentaryPenalty : 0;
  const unclamped = baseFactor + stepInc + sessInc + intensityInc + sedentary;
  const clamped = Math.max(clampMin, Math.min(clampMax, unclamped));
  const factor = Math.round(clamped * 100) / 100;
  return {
    factor,
    breakdown: {
      base: baseFactor,
      stepInc,
      sessInc,
      intensityInc,
      sedentaryPenalty: sedentary,
      unclamped,
      clamped,
    },
  };
}
