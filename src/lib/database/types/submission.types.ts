/**
 * Database types for the Submission table
 */
export interface Submission {
  id: string;
  userId: string;
  rawFormJson: any;
  normalizedInput: any;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  activityDeskJob: boolean;
  activityDailySteps: number;
  activitySessionsPerWeek: number;
  activityHighIntensity: boolean;
  diet: string;
  proteinPreferences: string[];
  equipmentAvailable: string[];
  numRecipes: number;
  numServings: number;
  dislikedFoods: string[];
  favoriteFoods: string[];
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
  rawFormJson: any;
  normalizedInput: any;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  activityDeskJob: boolean;
  activityDailySteps: number;
  activitySessionsPerWeek: number;
  activityHighIntensity: boolean;
  diet: string;
  proteinPreferences: string[];
  equipmentAvailable: string[];
  numRecipes: number;
  numServings: number;
  dislikedFoods: string[];
  favoriteFoods: string[];
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
