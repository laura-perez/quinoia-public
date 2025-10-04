/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  PRODUCTION_DATASETS,
  createSubmitRequest,
  verifySuccessResponse,
  verifyUserInDatabase,
  verifySubmissionInDatabase,
  verifyMenuResultInDatabase,
  cleanupTestUsers,
} from './helpers';
import { TEST_CONSTANTS } from '../shared/constants';

const SUBMIT_URL = TEST_CONSTANTS.SUBMIT_URL;

describe('Onboarding - Success Flow (Complete A→Z)', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeAll(async () => {
    supabase = createSupabaseServiceClient();
    // Production recipes already loaded in database (69 recipes)
  });


  afterAll(async () => {
    await cleanupTestUsers(supabase);
    // Don't cleanup production recipes
  });

  it('should complete full onboarding flow for new omnivore user', async () => {
    // ============================================
    // ARRANGE - Prepare test data
    // ============================================
    const profile = PRODUCTION_DATASETS.omnivore;
    const payload = createSubmitRequest(profile);
    const uniqueEmail = payload.form.email; // Capture the generated unique email

    // ============================================
    // ACT - Submit form to API
    // ============================================
    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // ============================================
    // ASSERT - Verify HTTP Response
    // ============================================
    expect(response.status).toBe(200);
    verifySuccessResponse(responseData);
    expect(responseData.resultBundle.recipes.length).toBe(parseInt(profile.numRecipes));

    // ============================================
    // ASSERT - Verify User in Database
    // ============================================
    const user = await verifyUserInDatabase(
      supabase,
      uniqueEmail,
      'trial_used', // Should be marked as used after first submission
      profile.name
    );

    // ============================================
    // ASSERT - Verify Submission in Database
    // ============================================
    const submission = await verifySubmissionInDatabase(
      supabase,
      responseData.submissionId,
      user.id
    );

    // Verify normalized input contains form data
    expect(submission.normalizedInput.email).toBe(uniqueEmail);
    expect(submission.normalizedInput.numRecipes).toBe(parseInt(profile.numRecipes));
    expect(submission.normalizedInput.numServings).toBe(parseInt(profile.numServings));

    // ============================================
    // ASSERT - Verify MenuResult in Database
    // ============================================
    const menuResult = await verifyMenuResultInDatabase(
      supabase,
      responseData.shareId,
      parseInt(profile.numRecipes),
      parseInt(profile.numServings)
    );

    // Verify menuResult is linked to submission
    expect(menuResult.submissionId).toBe(responseData.submissionId);
    expect(menuResult.userId).toBe(user.id);

    // ============================================
    // NOTE: Email sending is mocked server-side
    // We don't verify email calls in HTTP integration tests
    // ============================================

    // ============================================
    // ASSERT - Verify Recipe Selection
    // ============================================
    const recipes = responseData.resultBundle.recipes;

    // All recipes should have required properties
    recipes.forEach((recipe: any) => {
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('titleFr');
      expect(recipe).toHaveProperty('ingredients');
      expect(Array.isArray(recipe.ingredients)).toBe(true);
    });

    // ============================================
    // ASSERT - Verify Shopping List
    // ============================================
    const shoppingList = responseData.resultBundle.shoppingList;

    expect(shoppingList).toHaveProperty('items');
    expect(shoppingList).toHaveProperty('organizedByCategory');
    expect(shoppingList).toHaveProperty('summary');
    expect(shoppingList.summary).toHaveProperty('totalItems');
    expect(shoppingList.summary).toHaveProperty('totalCategories');
    expect(shoppingList.summary).toHaveProperty('totalRecipes');
    expect(shoppingList.summary.totalItems).toBeGreaterThan(0);

    // ============================================
    // ASSERT - Verify Nutrition Summary
    // ============================================
    const nutrition = responseData.resultBundle.nutritionSummary;

    expect(nutrition).toHaveProperty('avgProtein');
    expect(nutrition).toHaveProperty('totalProtein');
    expect(nutrition.avgProtein).toBeGreaterThan(0);
    expect(nutrition.totalProtein).toBeGreaterThan(0);
  });

  it('should complete full onboarding flow for new flexitarian user', async () => {
    const profile = PRODUCTION_DATASETS.flexitarian;
    const payload = createSubmitRequest(profile);
    const uniqueEmail = payload.form.email;

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // Verify success
    expect(response.status).toBe(200);
    verifySuccessResponse(responseData);

    // Verify user created with trial_used
    await verifyUserInDatabase(supabase, uniqueEmail, 'trial_used', profile.name);

    // Verify correct number of recipes
    expect(responseData.resultBundle.recipes.length).toBe(parseInt(profile.numRecipes));

    // Email verification removed (server-side mocking)
  });

  it('should complete full onboarding flow for new vegetarian user', async () => {
    const profile = PRODUCTION_DATASETS.vegetarian;
    const payload = createSubmitRequest(profile);
    const uniqueEmail = payload.form.email;

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // Verify success
    expect(response.status).toBe(200);
    verifySuccessResponse(responseData);

    // Verify user created with trial_used
    await verifyUserInDatabase(supabase, uniqueEmail, 'trial_used', profile.name);

    // Verify correct number of recipes and servings
    expect(responseData.resultBundle.recipes.length).toBe(parseInt(profile.numRecipes));

    // Verify menuResult has correct servings
    await verifyMenuResultInDatabase(
      supabase,
      responseData.shareId,
      parseInt(profile.numRecipes),
      parseInt(profile.numServings)
    );

    // Email verification removed (server-side mocking)
  });

  it('should complete full onboarding flow for new vegan user', async () => {
    const profile = PRODUCTION_DATASETS.vegan;
    const payload = createSubmitRequest(profile);
    const uniqueEmail = payload.form.email;

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // Verify success
    expect(response.status).toBe(200);
    verifySuccessResponse(responseData);

    // Verify user created with trial_used
    const user = await verifyUserInDatabase(
      supabase,
      uniqueEmail,
      'trial_used',
      profile.name
    );

    // Verify submission and menuResult
    await verifySubmissionInDatabase(supabase, responseData.submissionId, user.id);
    await verifyMenuResultInDatabase(
      supabase,
      responseData.shareId,
      parseInt(profile.numRecipes),
      parseInt(profile.numServings)
    );

    // Email verification removed (server-side mocking)
  });
});
