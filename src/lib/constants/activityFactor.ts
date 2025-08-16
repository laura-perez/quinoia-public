// Activity factor business constants
import { roundToPrecision } from './ui';

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
export const CLAMP_MIN = 1.35;
export const CLAMP_MAX = 1.7;

export function clampActivityFactor(factor: number): number {
  return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, roundToPrecision(factor)));
}
