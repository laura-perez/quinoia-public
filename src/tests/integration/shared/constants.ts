/**
 * Shared constants for integration tests
 */

const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

export const TEST_CONSTANTS = {
  // API
  SUBMIT_URL: `${TEST_SERVER_URL}/api/submit`,
  WEBHOOK_URL: `${TEST_SERVER_URL}/api/webhooks/stripe`,
  API_VERSION: 'v3.0_native',

  // ReCAPTCHA
  RECAPTCHA_TOKEN: 'test-recaptcha-token',

  // Form defaults
  DEFAULT_AGE: 30,
  DEFAULT_CONSENT: true,

  // Error messages
  ERRORS: {
    TRIAL_EXPIRED: 'Essai déjà utilisé',
    RECAPTCHA_FAILED: 'reCAPTCHA score too low',
    RECAPTCHA_TIMEOUT: 'reCAPTCHA verification timeout',
    RECAPTCHA_INVALID: 'Invalid reCAPTCHA token',
    RECAPTCHA_ERROR: 'Erreur lors de la vérification reCAPTCHA.',
  },

  // URL patterns
  PRICING_PATH: '/tarifs',
  TRIAL_EXPIRED_PARAM: 'trial-expired',
  MENU_PATH: '/menu/',
} as const;
