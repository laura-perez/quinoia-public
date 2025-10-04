/**
 * Shared TypeScript types for integration tests
 */

export type UserStatus = 'trial_available' | 'trial_used' | 'paid_active' | 'paid_expired';

export type SubscriptionType = 'monthly' | 'yearly';

export type DietType = 'omnivore' | 'flexitarian' | 'vegetarian' | 'vegan';

/**
 * Raw form input structure as received from production forms
 */
export interface ProductionFormData {
  email: string;
  name: string;
  age: string;
  gender: string;
  consent: boolean;
  dietType: string;
  numRecipes: string;
  numServings: string;
  cookingLevel: string;
  proteinPreferences: string[];
  equipmentAvailable: string[];
  allergens?: string;
}

/**
 * Submit request payload structure
 */
export interface SubmitRequest {
  recaptchaToken: string;
  form: ProductionFormData & {
    age: number | string;
    consent: boolean;
  };
}

/**
 * Options for creating submit requests
 */
export interface SubmitRequestOptions {
  generateUniqueEmail?: boolean;
  recaptchaToken?: string;
  overrides?: Partial<ProductionFormData>;
}

/**
 * Test user data structure
 */
export interface TestUser {
  id: string;
  email: string;
  firstName?: string;
  status: UserStatus;
  hasUsedTrial: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  subscriptionType?: SubscriptionType;
  paidUntil?: string;
}

/**
 * Supabase client type
 */
export type SupabaseClient = ReturnType<typeof import('@/lib/supabase/service').createSupabaseServiceClient>;
