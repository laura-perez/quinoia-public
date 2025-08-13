// Nutrition business constants

// Activity factor bounds
export const ACTIVITY_FACTOR_MIN = 1.35;
export const ACTIVITY_FACTOR_MAX = 1.7;

// Activity increments
export const STEP_INCREMENTS = {
  "<5k": 0.0,
  "5-8k": 0.02,
  ">8k": 0.05,
} as const;
export const SESSION_INCREMENTS = {
  "0": 0.0,
  "1-2": 0.05,
  "3-4": 0.1,
  ">=5": 0.15,
} as const;
export const INTENSITY_BONUS = 0.05;
export const SEDENTARY_PENALTY = -0.05;
export const BASE_ACTIVITY_FACTOR = 1.35;

// Meal share and tolerances
export const MEAL_SHARE = 0.35;
export const TOLERANCE = {
  saveTime: 0.15,
  eatHealthier: 0.15,
  weightLoss: 0.1,
} as const;

// Protein floor per goal
export const PROTEIN_FLOOR = {
  saveTime: 25,
  eatHealthier: 30,
  weightLoss: 35,
} as const;
export const HIGH_PROTEIN_BONUS = 5;

// BMR formula name
export const BMR_FORMULA = "Mifflin-St Jeor";

// Gender enum for BMR
export const GENDER_MALE = "male";
export const GENDER_FEMALE = "female";
export const GENDER_UNSPECIFIED = "unspecified";

// Clamp helper
export function clampActivityFactor(af: number): number {
  return Math.max(ACTIVITY_FACTOR_MIN, Math.min(ACTIVITY_FACTOR_MAX, Math.round(af * 100) / 100));
}
