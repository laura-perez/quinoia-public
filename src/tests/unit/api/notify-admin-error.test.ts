import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/notify-admin-error';
import { env } from '@/lib/config/env';
import { sendEmail } from '@/lib/email/client';
import { limit } from '@/lib/auth/rateLimits';

vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/auth/rateLimits', () => ({
  limit: vi.fn(),
}));

function createReq(body: unknown, method = 'POST'): NextApiRequest {
  return {
    method,
    body,
    headers: { 'x-real-ip': '203.0.113.10', 'user-agent': 'vitest' },
    socket: { remoteAddress: '203.0.113.10' },
  } as unknown as NextApiRequest;
}

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: any, payload: unknown) {
      this.body = payload;
      return this;
    }),
    end: vi.fn(function (this: any) {
      return this;
    }),
    setHeader: vi.fn(function (this: any, name: string, value: string) {
      this.headers[name] = value;
      return this;
    }),
  };
  return res as typeof res & NextApiResponse;
}

const validBody = {
  error: 'Submission failed',
  stack: 'Error: Submission failed\n    at submit (Step4.tsx:1:1)',
  formData: { email: 'camille@example.com', name: 'Camille', age: 30 },
  timestamp: '2026-11-27T10:00:00.000Z',
};

describe('POST /api/notify-admin-error', () => {
  const originalAdminEmail = env.ADMIN_EMAIL;

  beforeEach(() => {
    vi.clearAllMocks();
    env.ADMIN_EMAIL = 'admin@example.com';
    vi.mocked(limit).mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 3600_000 });
    vi.mocked(sendEmail).mockResolvedValue({ success: true, id: 'email-1' });
  });

  afterEach(() => {
    env.ADMIN_EMAIL = originalAdminEmail;
  });

  it('rejects non-POST methods with 405', async () => {
    const res = createRes();
    await handler(createReq(undefined, 'GET'), res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends the notification to ADMIN_EMAIL for a valid payload', async () => {
    const res = createRes();
    await handler(createReq(validBody), res);
    expect(res.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe('admin@example.com');
  });

  it('truncates an error message longer than 500 characters with a marker', async () => {
    const res = createRes();
    await handler(createReq({ ...validBody, error: 'a'.repeat(600) }), res);
    expect(res.statusCode).toBe(200);
    const { html } = vi.mocked(sendEmail).mock.calls[0][0];
    expect(html).toContain('a'.repeat(500) + '… [truncated]');
    expect(html).not.toContain('a'.repeat(501));
  });

  it('truncates a stack longer than 5000 characters with a marker', async () => {
    const res = createRes();
    await handler(createReq({ ...validBody, stack: 's'.repeat(6000) }), res);
    expect(res.statusCode).toBe(200);
    const { html } = vi.mocked(sendEmail).mock.calls[0][0];
    expect(html).toContain('s'.repeat(5000) + '… [truncated]');
    expect(html).not.toContain('s'.repeat(5001));
  });

  it('rejects an error message above the 20000-character raw cap with 400', async () => {
    const res = createRes();
    await handler(createReq({ ...validBody, error: 'x'.repeat(20001) }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'INVALID_INPUT' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects a stack above the 20000-character raw cap with 400', async () => {
    const res = createRes();
    await handler(createReq({ ...validBody, stack: 'x'.repeat(20001) }), res);
    expect(res.statusCode).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('accepts an empty error message and uses a placeholder', async () => {
    const res = createRes();
    await handler(createReq({ ...validBody, error: '' }), res);
    expect(res.statusCode).toBe(200);
    const { html } = vi.mocked(sendEmail).mock.calls[0][0];
    expect(html).toContain('(no error message)');
  });

  it('rejects formData larger than 10000 serialized characters with 400', async () => {
    const res = createRes();
    await handler(createReq({ ...validBody, formData: { blob: 'x'.repeat(10000) } }), res);
    expect(res.statusCode).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('HTML-escapes every interpolated value', async () => {
    const res = createRes();
    await handler(
      createReq({
        error: '<img src=x onerror=alert(1)>',
        stack: '<script>alert("stack")</script>',
        formData: { email: '"><b>bold</b>', name: '<i>name</i>' },
        timestamp: '<u>now</u>',
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    const { html } = vi.mocked(sendEmail).mock.calls[0][0];
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>bold</b>');
    expect(html).not.toContain('<i>name</i>');
    expect(html).not.toContain('<u>now</u>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;stack&quot;)&lt;/script&gt;');
    expect(html).toContain('&quot;&gt;&lt;b&gt;bold&lt;/b&gt;');
  });

  it('returns 429 with the standard error shape when the rate limit is exceeded', async () => {
    vi.mocked(limit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60_000 });
    const res = createRes();
    await handler(createReq(validBody), res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: expect.any(String), code: 'RATE_LIMITED' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rate limits per IP with 5 requests per hour', async () => {
    const res = createRes();
    await handler(createReq(validBody), res);
    expect(limit).toHaveBeenCalledWith(expect.stringContaining('203.0.113.10'), 5, 3600);
  });

  it('also applies a global cap of 30 notifications per hour after the per-IP check', async () => {
    const res = createRes();
    await handler(createReq(validBody), res);
    expect(limit).toHaveBeenCalledTimes(2);
    expect(vi.mocked(limit).mock.calls[0]).toEqual([expect.stringContaining('203.0.113.10'), 5, 3600]);
    expect(vi.mocked(limit).mock.calls[1]).toEqual(['notify-admin-error:global', 30, 3600]);
  });

  it('returns 429 with the standard error shape when the global cap is exceeded', async () => {
    vi.mocked(limit)
      .mockResolvedValueOnce({ success: true, remaining: 4, reset: Date.now() + 3600_000 })
      .mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 600_000 });
    const res = createRes();
    await handler(createReq(validBody), res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      details: { retryAfter: expect.any(Number) },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns 204 without sending when ADMIN_EMAIL is not configured', async () => {
    env.ADMIN_EMAIL = undefined;
    const res = createRes();
    await handler(createReq(validBody), res);
    expect(res.statusCode).toBe(204);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
