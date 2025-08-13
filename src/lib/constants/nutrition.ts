// Nutrition business constants
import { clampActivityFactor } from '@/lib/constants/activityFactor';

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

// Remove re-export of clampActivityFactor to reduce coupling
