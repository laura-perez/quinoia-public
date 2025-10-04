/**
 * Onboarding integration test helpers
 */

import type { ProductionFormData, SubmitRequest, UserStatus, SupabaseClient, TestUser } from '../shared/types';
import { TEST_CONSTANTS } from '../shared/constants';

import omnivoreDataset from './dataset/omnivore_rawFormInput.json';
import flexitarianDataset from './dataset/flexitarian_rawFormInput.json';
import vegetarianDataset from './dataset/vegetarian_rawFormInput.json';
import veganDataset from './dataset/vegan_rawFormInput.json';

/**
 * Production datasets for different diets
 */
export const PRODUCTION_DATASETS: Record<string, ProductionFormData> = {
  omnivore: omnivoreDataset as ProductionFormData,
  flexitarian: flexitarianDataset as ProductionFormData,
  vegetarian: vegetarianDataset as ProductionFormData,
  vegan: veganDataset as ProductionFormData,
};

/**
 * Generate unique email for test run to avoid conflicts
 * Uses timestamp + random string to ensure uniqueness even in parallel test runs
 */
export function generateUniqueEmail(baseEmail: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8); // 6 char random string
  const [localPart, domain] = baseEmail.split('@');
  return `${localPart}-${timestamp}-${random}@${domain}`;
}

/**
 * Create a valid submit request payload
 * By default generates unique email for new users
 */
export function createSubmitRequest(
  formData: ProductionFormData,
  options: { uniqueEmail?: boolean; recaptchaToken?: string } = {}
): SubmitRequest {
  const { uniqueEmail = true, recaptchaToken = TEST_CONSTANTS.RECAPTCHA_TOKEN } = options;

  return {
    recaptchaToken,
    form: {
      ...formData,
      email: uniqueEmail ? generateUniqueEmail(formData.email) : formData.email,
      age: formData.age ?? TEST_CONSTANTS.DEFAULT_AGE,
      consent: formData.consent ?? TEST_CONSTANTS.DEFAULT_CONSENT,
    },
  };
}

/**
 * Create a submit request for existing user (without modifying email)
 * Alias for createSubmitRequest with uniqueEmail: false
 */
export function createSubmitRequestForExistingUser(formData: ProductionFormData): SubmitRequest {
  return createSubmitRequest(formData, { uniqueEmail: false });
}

/**
 * Create an invalid submit request (missing required fields)
 */
export function createInvalidSubmitRequest() {
  return {
    recaptchaToken: 'test-recaptcha-token',
    form: {
      email: 'invalid-email', // Invalid email format
      // Missing required fields
    },
  };
}

/**
 * Verify response structure for success case
 */
export function verifySuccessResponse(response: Record<string, any>): void {
  expect(response).toHaveProperty('ok', true);
  expect(response).toHaveProperty('submissionId');
  expect(response).toHaveProperty('shareId');
  expect(response).toHaveProperty('shareUrl');
  expect(response).toHaveProperty('resultBundle');

  // Verify submissionId is UUID format
  expect(response.submissionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  // Verify shareId is base64url format (16 chars)
  expect(response.shareId).toMatch(/^[A-Za-z0-9_-]{16}$/);

  // Verify shareUrl format
  expect(response.shareUrl).toContain('/menu/');
  expect(response.shareUrl).toContain(response.shareId);

  // Verify resultBundle structure
  expect(response.resultBundle).toHaveProperty('version', TEST_CONSTANTS.API_VERSION);
  expect(response.resultBundle).toHaveProperty('recipes');
  expect(response.resultBundle).toHaveProperty('shoppingList');
  expect(response.resultBundle).toHaveProperty('nutritionSummary');
  expect(response.resultBundle).toHaveProperty('scoringDetails');
  expect(Array.isArray(response.resultBundle.recipes)).toBe(true);

  return response;
}

/**
 * Verify user in database
 */
export async function verifyUserInDatabase(
  supabase: SupabaseClient,
  email: string,
  expectedStatus: UserStatus,
  expectedFirstName?: string
): Promise<TestUser> {
  const { data: user, error } = await supabase
    .from('user')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user with email "${email}": ${error.message}`);
  }

  if (!user) {
    throw new Error(`User not found with email: ${email}`);
  }

  expect(user.id).toBeDefined();
  expect(user.email).toBe(email);
  expect(user.status).toBe(expectedStatus);

  if (expectedFirstName) {
    expect(user.firstName).toBe(expectedFirstName);
  }

  return user;
}

/**
 * Verify submission in database
 */
export async function verifySubmissionInDatabase(
  supabase: SupabaseClient,
  submissionId: string,
  userId: string
): Promise<any> {
  const { data: submission, error } = await supabase
    .from('submission')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch submission ${submissionId}: ${error.message}`);
  }

  if (!submission) {
    throw new Error(`Submission not found with id: ${submissionId}`);
  }

  expect(submission.id).toBe(submissionId);
  expect(submission.userId).toBe(userId);
  expect(submission.normalizedInput).toBeDefined();
  expect(submission.normalizedInput).toHaveProperty('email');
  expect(submission.normalizedInput).toHaveProperty('diet');

  return submission;
}

/**
 * Verify menuResult in database
 */
export async function verifyMenuResultInDatabase(
  supabase: SupabaseClient,
  shareId: string,
  expectedNumRecipes: number,
  expectedNumServings: number
): Promise<any> {
  const { data: menuResult, error } = await supabase
    .from('menuResult')
    .select('*')
    .eq('shareId', shareId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch menuResult with shareId "${shareId}": ${error.message}`);
  }

  if (!menuResult) {
    throw new Error(`MenuResult not found with shareId: ${shareId}`);
  }

  expect(menuResult.shareId).toBe(shareId);
  expect(menuResult.shareActive).toBe(true);
  expect(menuResult.numRecipes).toBe(expectedNumRecipes);
  expect(menuResult.numServings).toBe(expectedNumServings);

  // Verify resultBundle structure
  expect(menuResult.resultBundle).toBeDefined();
  expect(menuResult.resultBundle.recipes).toBeDefined();
  expect(Array.isArray(menuResult.resultBundle.recipes)).toBe(true);
  expect(menuResult.resultBundle.recipes.length).toBe(expectedNumRecipes);
  expect(menuResult.resultBundle.shoppingList).toBeDefined();

  return menuResult;
}

/**
 * Cleanup test users by email pattern
 * Handles foreign key constraints by deleting related records first
 * Matches pattern: {name}-{timestamp}-{random}@{domain}
 */
export async function cleanupTestUsers(supabase: SupabaseClient): Promise<void> {
  // Find all test users (emails with timestamp-random pattern like "loz-1234567890-abc123@test.com")
  const { data: testUsers } = await supabase
    .from('user')
    .select('id')
    .like('email', '%-%-@test.com'); // Matches name-timestamp-random@test.com

  if (!testUsers || testUsers.length === 0) {
    return; // No test users to cleanup
  }

  const userIds = testUsers.map((u: any) => u.id);

  // Delete related records first (to avoid foreign key constraint violations)
  await supabase.from('submission').delete().in('userId', userIds);
  await supabase.from('menuResult').delete().in('userId', userIds);

  // Then delete users
  const { error } = await supabase.from('user').delete().in('id', userIds);

  if (error) {
    console.warn('Failed to cleanup test users:', error.message);
  }
}
