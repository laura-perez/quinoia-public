import { http, HttpResponse, type HttpHandler } from "msw";

// reCAPTCHA API Mock Handlers
export const recaptchaHandlers = [
  // Successful reCAPTCHA verification
  http.post('https://www.google.com/recaptcha/api/siteverify', async ({ request }) => {
    const formData = await request.formData();
    const token = formData.get('secret');
    
    if (token === process.env.RECAPTCHA_SECRET_KEY) {
      return HttpResponse.json({
        success: true,
        score: 0.9,
        action: 'submit',
        challenge_ts: new Date().toISOString(),
        hostname: 'localhost',
      });
    }
    
    return HttpResponse.json({
      success: false,
      'error-codes': ['invalid-input-secret'],
    });
  }),

  // Failed reCAPTCHA verification (low score)
  http.post('https://www.google.com/recaptcha/api/siteverify', async ({ request }) => {
    const formData = await request.formData();
    const response = formData.get('response');
    
    if (response === 'low_score_token') {
      return HttpResponse.json({
        success: true,
        score: 0.3, // Below threshold
        action: 'submit',
        challenge_ts: new Date().toISOString(),
        hostname: 'localhost',
      });
    }
    
    return HttpResponse.json({
      success: false,
      'error-codes': ['invalid-input-response'],
    });
  }),
];

// n8n Webhook Mock Handlers
export const n8nHandlers = [
  // Successful n8n webhook trigger
  http.post(process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/test', async ({ request }) => {
    const payload = await request.json() as any;
    
    return HttpResponse.json({
      executionId: 'exec_12345',
      status: 'success',
      data: {
        submissionId: payload.submissionId,
        processedAt: new Date().toISOString(),
      },
    });
  }),

  // n8n webhook failure
  http.post(process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/test', () => {
    return HttpResponse.json(
      { error: 'Workflow execution failed' },
      { status: 502 }
    );
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
