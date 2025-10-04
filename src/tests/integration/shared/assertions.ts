/**
 * Shared assertion helpers for integration tests
 */

import { expect } from 'vitest';
import type { ProductionFormData } from './types';

/**
 * Assert complete onboarding flow for success-flow tests
 */
export function assertCompleteOnboardingFlow(
  response: Response,
  responseData: any,
  profile: ProductionFormData,
  uniqueEmail: string
) {
  // HTTP Response
  expect(response.status).toBe(200);
  expect(responseData).toHaveProperty('ok', true);
  expect(responseData).toHaveProperty('submissionId');
  expect(responseData).toHaveProperty('shareId');
  expect(responseData).toHaveProperty('shareUrl');
  expect(responseData).toHaveProperty('resultBundle');

  // Recipe count
  expect(responseData.resultBundle.recipes.length).toBe(parseInt(profile.numRecipes));

  // Recipes structure
  responseData.resultBundle.recipes.forEach((recipe: any) => {
    expect(recipe).toHaveProperty('id');
    expect(recipe).toHaveProperty('titleFr');
    expect(recipe).toHaveProperty('ingredients');
    expect(Array.isArray(recipe.ingredients)).toBe(true);
  });

  // Shopping list
  const { shoppingList } = responseData.resultBundle;
  expect(shoppingList).toHaveProperty('items');
  expect(shoppingList).toHaveProperty('organizedByCategory');
  expect(shoppingList).toHaveProperty('summary');
  expect(shoppingList.summary).toHaveProperty('totalItems');
  expect(shoppingList.summary).toHaveProperty('totalCategories');
  expect(shoppingList.summary).toHaveProperty('totalRecipes');
  expect(shoppingList.summary.totalItems).toBeGreaterThan(0);

  // Nutrition summary
  const { nutritionSummary } = responseData.resultBundle;
  expect(nutritionSummary).toHaveProperty('avgProtein');
  expect(nutritionSummary).toHaveProperty('totalProtein');
  expect(nutritionSummary.avgProtein).toBeGreaterThan(0);
  expect(nutritionSummary.totalProtein).toBeGreaterThan(0);
}

/**
 * Assert 403 rejection with redirect to pricing
 */
export function assertRejectionWithPricingRedirect(
  response: Response,
  responseData: any,
  expectedError: string = 'Essai déjà utilisé'
) {
  expect(response.status).toBe(403);
  expect(responseData).toHaveProperty('error', expectedError);
  expect(responseData).toHaveProperty('redirectTo');
  expect(responseData.redirectTo).toContain('/tarifs');
  expect(responseData.redirectTo).toContain('trial-expired');
}

/**
 * Assert recaptcha failure response
 */
export function assertRecaptchaFailure(
  response: Response,
  responseData: any,
  expectedError: string
) {
  expect(response.status).toBe(403);
  expect(responseData).toHaveProperty('error', expectedError);
}
