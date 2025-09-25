/**
 * Types for API requests and responses
 */
import type { NormalizedInput } from "./index";

/**
 * reCAPTCHA verification metadata
 */
export interface RecaptchaMetadata {
  readonly score: number;
  readonly success: boolean;
  readonly hostname: string;
  readonly action: string;
  readonly challenge_ts: string | null;
}

/**
 * Raw form data as submitted by the client (camelCase format)
 */
export interface RawFormData {
  readonly email: string;
  readonly name?: string;
  readonly age: number;
  readonly gender: string;
  readonly dietType: string;
  readonly proteinPreferences?: string[];
  readonly equipmentAvailable?: string[];
  readonly cookingLevel: string;
  readonly numRecipes: number;
  readonly numServings: number;
  readonly favoriteFoods?: string;
  readonly dislikedFoods?: string;
  readonly batchMode?: boolean;
  readonly allergens?: string; // String input converted to array during normalization
  readonly consent: boolean;
}

/**
 * Parameters for upsertUserAndSubmission service function
 */
export interface UpsertUserAndSubmissionParams {
  readonly email: string;
  readonly normalizedInput: NormalizedInput;
  readonly recaptchaMeta: RecaptchaMetadata;
  readonly rawFormData: unknown; // Keep flexible for now
}
