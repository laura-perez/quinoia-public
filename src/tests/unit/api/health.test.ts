import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/health';
import { env } from '@/lib/config';
import { getServiceClient } from '@/lib/supabase/client';

vi.mock('@/lib/supabase/client', () => ({
  getServiceClient: vi.fn(),
}));

const SECRET = 'test-cron-secret-0123456789';

function createReq(headers: Record<string, string> = {}, method = 'GET'): NextApiRequest {
  return { method, headers } as unknown as NextApiRequest;
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

function mockDbResult(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ select });
  vi.mocked(getServiceClient).mockReturnValue({ from } as any);
  return { from, select, limit };
}

describe('GET /api/health', () => {
  const originalSecret = env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    env.CRON_SECRET = SECRET;
  });

  afterEach(() => {
    env.CRON_SECRET = originalSecret;
  });

  it('returns 401 without an Authorization header', async () => {
    mockDbResult({ data: [{ id: 'r1' }], error: null });
    const res = createRes();
    await handler(createReq(), res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: expect.any(String), code: 'UNAUTHORIZED' });
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it('returns 401 with a wrong secret', async () => {
    mockDbResult({ data: [{ id: 'r1' }], error: null });
    const res = createRes();
    await handler(createReq({ authorization: 'Bearer wrong-secret-0123456789x' }), res);
    expect(res.statusCode).toBe(401);
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it('returns 200 and runs one cheap read with the right secret', async () => {
    const { from, select, limit } = mockDbResult({ data: [{ id: 'r1' }], error: null });
    const res = createRes();
    await handler(createReq({ authorization: `Bearer ${SECRET}` }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok', timestamp: expect.any(String) });
    expect(from).toHaveBeenCalledWith('recipe');
    expect(select).toHaveBeenCalledWith('id');
    expect(limit).toHaveBeenCalledWith(1);
  });

  it('does not require a secret when CRON_SECRET is not configured', async () => {
    env.CRON_SECRET = undefined;
    mockDbResult({ data: [], error: null });
    const res = createRes();
    await handler(createReq(), res);
    expect(res.statusCode).toBe(200);
  });

  it('returns 503 with the standard error shape when the database query fails', async () => {
    mockDbResult({ data: null, error: { message: 'connection refused', code: 'PGRST000' } });
    const res = createRes();
    await handler(createReq({ authorization: `Bearer ${SECRET}` }), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: expect.any(String), code: 'DB_UNAVAILABLE' });
  });

  it('rejects non-GET methods with 405', async () => {
    const res = createRes();
    await handler(createReq({ authorization: `Bearer ${SECRET}` }, 'POST'), res);
    expect(res.statusCode).toBe(405);
  });
});
