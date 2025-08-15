import { http, HttpResponse, type HttpHandler } from "msw";

/**
 * MSW Handlers for Testing External Service Integrations
 * 
 * Test Scenarios:
 * - reCAPTCHA: Use 'low_score_token' as response to trigger low score (0.3)
 * - reCAPTCHA: Use 'invalid_token' as response to trigger invalid token error
 * - reCAPTCHA: Use any other token for successful verification (score 0.9)
 * - n8n: Include { testScenario: 'n8n_failure' } in payload to trigger 502 error
 * - n8n: Use any other payload for successful response
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

// n8n Webhook Mock Handlers
export const n8nHandlers = [
  // Unified n8n webhook handler with conditional responses
  http.post(process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/test', async ({ request }) => {
    const payload = await request.json() as any;
    
    // Check for failure test scenario
    if (payload.testScenario === 'n8n_failure') {
      return HttpResponse.json(
        { error: 'Workflow execution failed' },
        { status: 502 }
      );
    }
    
    // Default successful response
    return HttpResponse.json({
      executionId: 'exec_12345',
      status: 'success',
      data: {
        submissionId: payload.submissionId,
        processedAt: new Date().toISOString(),
      },
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
  ...n8nHandlers,
  ...supabaseHandlers,
];

export { http, HttpResponse };
