/**
 * Database test helpers
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { generateTestId, generateTestEmail, isNotFoundError } from '../shared/test-utils';

/**
 * Create a test user in the database
 */
export async function createTestUser(overrides: {
  email?: string;
  status?: 'trial_available' | 'trial_used' | 'paid_active' | 'paid_expired';
  hasUsedTrial?: boolean;
  hasUsedPromo?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  subscriptionType?: 'monthly' | 'yearly' | null;
  paidUntil?: string | null;
} = {}) {
  const supabase = createSupabaseServiceClient();
  const email = overrides.email || generateTestEmail();

  const { data, error } = await supabase
    .from('user')
    .insert({
      email,
      status: overrides.status || 'trial_available',
      hasUsedTrial: overrides.hasUsedTrial ?? false,
      hasUsedPromo: overrides.hasUsedPromo ?? false,
      stripeCustomerId: overrides.stripeCustomerId || null,
      stripeSubscriptionId: overrides.stripeSubscriptionId || null,
      stripePriceId: overrides.stripePriceId || null,
      subscriptionType: overrides.subscriptionType || null,
      paidUntil: overrides.paidUntil || null,
      // Note: firstName, lastName, swapCount removed - not in current schema
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user')
    .select('*')
    .eq('email', email)
    .single();

  if (error && !isNotFoundError(error)) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(customerId: string) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user')
    .select('*')
    .eq('stripeCustomerId', customerId)
    .single();

  if (error && !isNotFoundError(error)) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Get user by Stripe subscription ID
 */
export async function getUserByStripeSubscriptionId(subscriptionId: string) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user')
    .select('*')
    .eq('stripeSubscriptionId', subscriptionId)
    .single();

  if (error && !isNotFoundError(error)) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Delete test user by ID
 */
export async function deleteTestUser(userId: string) {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from('user')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to delete test user: ${error.message}`);
  }
}

/**
 * Delete test user by email
 */
export async function deleteTestUserByEmail(email: string) {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from('user')
    .delete()
    .eq('email', email);

  if (error) {
    throw new Error(`Failed to delete test user: ${error.message}`);
  }
}

/**
 * Clean up all test users (emails matching test-* pattern)
 */
export async function cleanupTestUsers() {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from('user')
    .delete()
    .like('email', 'test-%@example.com');

  if (error) {
    console.warn('Failed to cleanup test users:', error.message);
  }
}

/**
 * Create a mock Stripe customer ID for testing
 */
export function createMockStripeCustomerId(): string {
  return generateTestId('cus_test_');
}

/**
 * Create a mock Stripe subscription ID for testing
 */
export function createMockStripeSubscriptionId(): string {
  return generateTestId('sub_test_');
}
