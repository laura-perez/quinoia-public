/**
 * Database types for the Submission table
 */
import type { NormalizedInput } from "@/schemas";

export interface Submission {
  id: string;
  userId: string;
  rawFormJson: unknown; // Keep flexible for JSON storage
  normalizedInput: NormalizedInput;
  age: number;
  gender: string;
  diet: string;
  proteinPreferences: string[];
  equipmentAvailable: string[];
  numRecipes: number;
  numServings: number;
  dislikedFoods: string | null; // Can be null/undefined
  favoriteFoods: string | null; // Can be null/undefined
  cookingLevel: string;
  locale: string;
  unitSystem: string;
  consent: boolean;
  consentedAt: string;
  consentVersion: string;
  recaptchaScore: number;
  recaptchaSuccess: boolean;
  recaptchaHostname: string;
  recaptchaAction: string;
  recaptchaChallengeTs: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSubmissionInput {
  userId: string;
  rawFormJson: unknown; // Keep flexible for JSON storage
  normalizedInput: NormalizedInput;
  age: number;
  gender: string;
  diet: string;
  proteinPreferences: string[];
  equipmentAvailable: string[];
  numRecipes: number;
  numServings: number;
  dislikedFoods: string | null; // Can be null/undefined
  favoriteFoods: string | null; // Can be null/undefined
  cookingLevel: string;
  locale: string;
  unitSystem: string;
  consent: boolean;
  consentedAt: string;
  consentVersion: string;
  recaptchaScore: number;
  recaptchaSuccess: boolean;
  recaptchaHostname: string;
  recaptchaAction: string;
  recaptchaChallengeTs: string | null;
  createdAt: string;
}
