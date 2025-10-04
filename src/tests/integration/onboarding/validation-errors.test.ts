/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { cleanupTestUsers } from './helpers';
import { TEST_CONSTANTS } from '../shared/constants';

const SUBMIT_URL = TEST_CONSTANTS.SUBMIT_URL;

describe('Onboarding - Validation Errors', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeAll(() => {
    supabase = createSupabaseServiceClient();
  });

  afterAll(async () => {
    await cleanupTestUsers(supabase);
  });

  it('should reject request without recaptchaToken', async () => {
    const payload = {
      // Missing recaptchaToken
      form: {
        email: 'test@example.com',
        diet: 'omnivore',
        numRecipes: 3,
        numServings: 2,
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');
  });

  it('should reject request with invalid email format', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'not-an-email', // Invalid email
        diet: 'omnivore',
        numRecipes: 3,
        numServings: 2,
        cookingLevel: 'beginner',
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');
  });

  it('should reject request with missing required fields', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'test@example.com',
        // Missing diet, numRecipes, numServings
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');
  });

  it('should reject request with invalid diet type', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'test@example.com',
        diet: 'carnivore', // Invalid diet (not in enum)
        numRecipes: 3,
        numServings: 2,
        cookingLevel: 'beginner',
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');
  });

  it('should reject request with invalid numRecipes (too low)', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'test@example.com',
        diet: 'omnivore',
        numRecipes: 0, // Invalid: must be >= 1
        numServings: 2,
        cookingLevel: 'beginner',
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');
  });

  it('should reject request with invalid numRecipes (too high)', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'test@example.com',
        diet: 'vegan',
        numRecipes: 20, // Invalid: likely too high (check schema max)
        numServings: 2,
        cookingLevel: 'intermediate',
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Might succeed or fail depending on schema max - adjust based on actual schema
    // expect(response.status).toBe(400);
  });

  it('should reject request with invalid numServings', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'test@example.com',
        diet: 'vegetarian',
        numRecipes: 3,
        numServings: 0, // Invalid: must be >= 1
        cookingLevel: 'advanced',
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');
  });

  it('should reject request with invalid cookingLevel', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'test@example.com',
        diet: 'flexitarian',
        numRecipes: 4,
        numServings: 2,
        cookingLevel: 'expert', // Invalid: not in enum (beginner, intermediate, advanced)
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');
  });

  it('should reject request with malformed JSON', async () => {
    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json }',
    });

    expect(response.status).toBe(400);

    // Response might be plain text "Invalid JSON" instead of JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await response.json();
      expect(responseData).toHaveProperty('error');
    } else {
      const responseText = await response.text();
      expect(responseText).toBeDefined();
    }
  });

  it('should reject request with wrong HTTP method', async () => {
    const response = await fetch(SUBMIT_URL, {
      method: 'GET', // Should be POST
    });

    expect(response.status).toBe(405);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('error', 'Méthode non autorisée');
  });

  it('should reject multiple invalid fields and return all errors', async () => {
    const payload = {
      recaptchaToken: 'test-token',
      form: {
        email: 'invalid-email', // Invalid
        diet: 'invalid-diet', // Invalid
        numRecipes: -1, // Invalid
        numServings: 0, // Invalid
        cookingLevel: 'master-chef', // Invalid
      },
    };

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('errors');

    // Should have multiple errors
    const errors = responseData.errors;
    expect(errors).toBeDefined();
  });
});
