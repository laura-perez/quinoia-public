import type { NormalizedInput } from "@/schemas";
import type { Targets } from "@/schemas";

import {
  MEAL_SHARE,
  TOLERANCE,
  PROTEIN_FLOOR,
  HIGH_PROTEIN_BONUS,
  clampActivityFactor,
  BMR_FORMULA,
  GENDER_MALE,
} from "../constants/nutrition";

function computeBMR(gender: string, weightKg: number, heightCm: number, age: number): number {
  return Math.round(
    gender === GENDER_MALE
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  );
}

function computeTDEE(bmr: number, af: number): number {
  return Math.round(bmr * af);
}

function computeDailyTarget(
  primaryGoal: string,
  tdee: number
): { kcal: number; tolerance: number } {
  if (primaryGoal === "weightLoss") {
    return { kcal: Math.round(tdee * 0.85), tolerance: TOLERANCE.weightLoss };
  }
  return { kcal: tdee, tolerance: TOLERANCE[primaryGoal as keyof typeof TOLERANCE] };
}

function computeMealTarget(dailyKcal: number): number {
  return Math.round(dailyKcal * MEAL_SHARE);
}

function computeMealWindow(mealKcal: number, tolerance: number): { min: number; max: number } {
  return {
    min: Math.floor(mealKcal * (1 - tolerance)),
    max: Math.ceil(mealKcal * (1 + tolerance)),
  };
}

function computeProteinFloor(primaryGoal: string, secondaryFocus: string | null): number {
  let floor = PROTEIN_FLOOR[primaryGoal as keyof typeof PROTEIN_FLOOR];
  if (secondaryFocus === "highProtein") floor += HIGH_PROTEIN_BONUS;
  return floor;
}

export function computeTargets(input: NormalizedInput, activityFactor: number): Targets {
  const af = clampActivityFactor(activityFactor);
  const { age, gender, heightCm, weightKg, primaryGoal, secondaryFocus } = input;
  const bmrKcal = computeBMR(gender, weightKg, heightCm, age);
  const tdeeKcal = computeTDEE(bmrKcal, af);
  const { kcal: dailyTargetKcal, tolerance: mealTolerancePct } = computeDailyTarget(
    primaryGoal,
    tdeeKcal
  );
  const mealTargetKcal = computeMealTarget(dailyTargetKcal);
  const { min: mealMinKcal, max: mealMaxKcal } = computeMealWindow(
    mealTargetKcal,
    mealTolerancePct
  );
  const proteinFloorG = computeProteinFloor(primaryGoal, secondaryFocus);

  return {
    formula: BMR_FORMULA,
    bmr: bmrKcal,
    activityFactor: af,
    tdee: tdeeKcal,
    dailyEnergyTarget: dailyTargetKcal,
    mealShare: MEAL_SHARE,
    mealEnergyTarget: mealTargetKcal,
    tolerancePct: mealTolerancePct,
    mealEnergyMin: mealMinKcal,
    mealEnergyMax: mealMaxKcal,
    proteinFloor: proteinFloorG,
  };
}
