import { http, HttpResponse, type HttpHandler } from "msw";

/**
 * MSW Handlers for Testing External Service Integrations
 * 
 * Test Scenarios:
 * - reCAPTCHA: Use 'low_score_token' as response to trigger low score (0.3)
 * - reCAPTCHA: Use 'invalid_token' as response to trigger invalid token error
 * - reCAPTCHA: Use any other token for successful verification (score 0.9)
 */

// reCAPTCHA API Mock Handlers
export const recaptchaHandlers = [
  // Unified reCAPTCHA verification handler with conditional responses
  http.post('https://www.google.com/recaptcha/api/siteverify', async ({ request }) => {
    const formData = await request.formData();
    const token = formData.get('secret');
    const response = formData.get('response');
    
    // Check for invalid secret
    if (token !== process.env.RECAPTCHA_SECRET_KEY) {
      return HttpResponse.json({
        success: false,
        'error-codes': ['invalid-input-secret'],
      });
    }
    
    // Handle low score test scenario
    if (response === 'low_score_token') {
      return HttpResponse.json({
        success: true,
        score: 0.3, // Below threshold
        action: 'submit',
        challenge_ts: new Date().toISOString(),
        hostname: 'localhost',
      });
    }
    
    // Handle invalid token scenario
    if (response === 'invalid_token') {
      return HttpResponse.json({
        success: false,
        'error-codes': ['invalid-input-response'],
      });
    }
    
    // Default successful verification
    return HttpResponse.json({
      success: true,
      score: 0.9,
      action: 'submit',
      challenge_ts: new Date().toISOString(),
      hostname: 'localhost',
    });
  }),
];


// Supabase Mock Handlers (if needed for certain tests)
export const supabaseHandlers = [
  // User upsert success
  http.post('*/rest/v1/user', () => {
    return HttpResponse.json([{ id: 'user_123' }]);
  }),

  // Submission insert success
  http.post('*/rest/v1/submission', () => {
    return HttpResponse.json([{ id: 'submission_456' }]);
  }),
];

export const handlers: HttpHandler[] = [
  ...recaptchaHandlers,
  ...supabaseHandlers,
];

export { http, HttpResponse };
