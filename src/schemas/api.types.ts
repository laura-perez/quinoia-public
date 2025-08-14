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
 * Raw form data as submitted by the client (current format)
 */
export interface RawFormData {
  readonly email: string;
  readonly name?: string;
  readonly age: number;
  readonly gender: string;
  readonly height_cm: number;
  readonly weight_kg: number;
  readonly diet_type: string;
  readonly protein_preference?: string[];
  readonly equipment?: string[];
  readonly cooking_level: string;
  readonly nbRecipes: number;
  readonly nbPortions: number;
  readonly favourite_food?: string;
  readonly disliked_food?: string;
  readonly batch?: boolean;
  readonly primaryGoal: string;
  readonly secondaryFocus?: string | null;
  readonly physicalActivity: {
    readonly deskJob: boolean;
    readonly dailySteps: string;
    readonly sessionsPerWeek: string;
    readonly highIntensity: boolean;
  };
  readonly allergies?: string;
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
