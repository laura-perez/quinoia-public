/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { PRODUCTION_DATASETS, createSubmitRequest, cleanupTestUsers } from './helpers';
import { TEST_CONSTANTS } from '../shared/constants';

describe('Onboarding - ReCAPTCHA Failed', () => {
  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  beforeAll(() => {
    supabase = createSupabaseServiceClient();
  });

  afterAll(async () => {
    await cleanupTestUsers(supabase);
  });

  it('should reject request with failed recaptcha verification', async () => {
    const profile = PRODUCTION_DATASETS.omnivore;
    const payload = createSubmitRequest(profile, {
      recaptchaToken: 'test-recaptcha-fail-score' // Special token for low score scenario
    });

    const response = await fetch(TEST_CONSTANTS.SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData).toHaveProperty('error', TEST_CONSTANTS.ERRORS.RECAPTCHA_FAILED);

    // No user should be created
    const { data: user } = await supabase
      .from('user')
      .select('id')
      .eq('email', payload.form.email)
      .maybeSingle();

    expect(user).toBeNull();
  });

  it('should reject request with recaptcha timeout error', async () => {
    const profile = PRODUCTION_DATASETS.vegan;
    const payload = createSubmitRequest(profile, {
      recaptchaToken: 'test-recaptcha-timeout' // Special token for timeout scenario
    });

    const response = await fetch(TEST_CONSTANTS.SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData).toHaveProperty('error', TEST_CONSTANTS.ERRORS.RECAPTCHA_TIMEOUT);

    // No user created
    const { data: user } = await supabase
      .from('user')
      .select('id')
      .eq('email', payload.form.email)
      .maybeSingle();

    expect(user).toBeNull();
  });

  it('should reject request with invalid recaptcha token', async () => {
    const profile = PRODUCTION_DATASETS.vegetarian;
    const payload = createSubmitRequest(profile, {
      recaptchaToken: 'test-recaptcha-invalid' // Special token for invalid token scenario
    });

    const response = await fetch(TEST_CONSTANTS.SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData).toHaveProperty('error', TEST_CONSTANTS.ERRORS.RECAPTCHA_INVALID);

    // No user created
    const { data: user } = await supabase
      .from('user')
      .select('id')
      .eq('email', payload.form.email)
      .maybeSingle();

    expect(user).toBeNull();
  });

  it('should handle recaptcha exception gracefully', async () => {
    const profile = PRODUCTION_DATASETS.flexitarian;
    const payload = createSubmitRequest(profile, {
      recaptchaToken: 'test-recaptcha-network-error' // Special token for network error scenario
    });

    const response = await fetch(TEST_CONSTANTS.SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData).toHaveProperty('error', TEST_CONSTANTS.ERRORS.RECAPTCHA_ERROR);

    // No user created
    const { data: user } = await supabase
      .from('user')
      .select('id')
      .eq('email', payload.form.email)
      .maybeSingle();

    expect(user).toBeNull();
  });
});
