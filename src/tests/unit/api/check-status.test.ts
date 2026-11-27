import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/user/check-status';
import { usersRepository } from '@/lib/supabase/repositories/users';
import { limit } from '@/lib/auth/rateLimits';

vi.mock('@/lib/supabase/repositories/users', () => ({
  usersRepository: { findByEmail: vi.fn() },
}));

vi.mock('@/lib/auth/rateLimits', () => ({
  limit: vi.fn(),
}));

function createReq(body: unknown, method = 'POST'): NextApiRequest {
  return {
    method,
    body,
    headers: { 'x-real-ip': '203.0.113.20' },
    socket: { remoteAddress: '203.0.113.20' },
  } as unknown as NextApiRequest;
}

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: any, payload: unknown) {
      this.body = payload;
      return this;
    }),
    setHeader: vi.fn(function (this: any) {
      return this;
    }),
  };
  return res as typeof res & NextApiResponse;
}

describe('POST /api/user/check-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(limit).mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60_000 });
  });

  it('returns requiresLogin: false for an unknown email', async () => {
    vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
    const res = createRes();
    await handler(createReq({ email: 'unknown@example.com' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ requiresLogin: false });
  });

  it('returns requiresLogin: false for a user whose trial is still available', async () => {
    vi.mocked(usersRepository.findByEmail).mockResolvedValue({ status: 'trial_available' } as any);
    const res = createRes();
    await handler(createReq({ email: 'camille@example.com' }), res);
    expect(res.body).toEqual({ requiresLogin: false });
  });

  it('returns only requiresLogin: true for other statuses, without the exact status', async () => {
    vi.mocked(usersRepository.findByEmail).mockResolvedValue({ status: 'paid_active' } as any);
    const res = createRes();
    await handler(createReq({ email: 'camille@example.com' }), res);
    expect(res.body).toEqual({ requiresLogin: true });
  });

  it('normalises the email (trim and lower-case) before the lookup', async () => {
    vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
    const res = createRes();
    await handler(createReq({ email: '  Camille@Example.COM ' }), res);
    expect(res.statusCode).toBe(200);
    expect(usersRepository.findByEmail).toHaveBeenCalledWith('camille@example.com');
  });

  it('rejects non-POST methods with 405', async () => {
    const res = createRes();
    await handler(createReq(undefined, 'GET'), res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(limit).not.toHaveBeenCalled();
    expect(usersRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid email with 400', async () => {
    const res = createRes();
    await handler(createReq({ email: 'not-an-email' }), res);
    expect(res.statusCode).toBe(400);
    expect(usersRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('returns 429 when the per-IP rate limit (10/min) is exceeded', async () => {
    vi.mocked(limit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 30_000 });
    const res = createRes();
    await handler(createReq({ email: 'camille@example.com' }), res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(limit).toHaveBeenCalledWith(expect.stringContaining('203.0.113.20'), 10, 60);
    expect(usersRepository.findByEmail).not.toHaveBeenCalled();
  });
});
