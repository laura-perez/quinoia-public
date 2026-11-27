/**
 * Unit Tests for checkUserQuota
 *
 * Quota state is derived from the most recent menuResult row within a 7-day window
 * (see src/lib/quotas/checker.ts). The Supabase query chain is mocked:
 * from('menuResult').select().eq().gte().order().limit().maybeSingle()
 *
 * Test Coverage:
 * 1. Free user within quota (can generate)
 * 2. Free user quota exceeded (cannot generate)
 * 3. Premium user (unlimited, always can generate, no DB query)
 * 4. Swap quota checks (free user)
 * 5. Trial used user
 * 6. Quota status messages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkUserQuota,
  getQuotaMessage,
  isPremiumUser,
  type QuotaStatus,
} from '@/lib/quotas/checker';
import type { SessionUser } from '@/lib/auth/session';
import { getServiceClient } from '@/lib/supabase/client';

const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  getServiceClient: vi.fn(),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

type MenuResultRow = { id: string; createdAt: string; hasSwappedInWindow: boolean | null };

/**
 * Build a mocked Supabase client whose menuResult query resolves to `row`.
 * Returns the query builder so tests can assert on the filters applied.
 */
function mockMenuResultQuery(row: MenuResultRow | null) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  const client = { from: vi.fn().mockReturnValue(query) };
  vi.mocked(getServiceClient).mockReturnValue(client as any);
  return { client, query };
}

function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user-1',
    email: 'user@test.com',
    firstName: 'Test',
    status: 'trial_available',
    isFirstLogin: false,
    lastLoginAt: null,
    ...overrides,
  };
}

function makeQuotaStatus(overrides: Partial<QuotaStatus> = {}): QuotaStatus {
  return {
    userId: 'user-1',
    status: 'trial_available',
    lastMenuGeneratedAt: null,
    menusGeneratedThisWindow: 0,
    swapsUsedThisMenu: 0,
    menuQuotaLimit: 1,
    swapQuotaLimit: 1,
    nextQuotaReset: null,
    canGenerateMenu: true,
    ...overrides,
  };
}

describe('checkUserQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow free user within quota to generate menu', async () => {
    const { client, query } = mockMenuResultQuery(null);

    const result = await checkUserQuota('user-1', makeUser(), 'menu');

    expect(result.canGenerate).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.daysUntilReset).toBe(7);
    expect(result.quotaStatus.menusGeneratedThisWindow).toBe(0);
    expect(result.quotaStatus.menuQuotaLimit).toBe(1);
    expect(result.quotaStatus.canGenerateMenu).toBe(true);

    // Quota is derived from the user's menuResult rows within the last 7 days
    expect(client.from).toHaveBeenCalledWith('menuResult');
    expect(query.eq).toHaveBeenCalledWith('userId', 'user-1');
    const [column, sinceIso] = query.gte.mock.calls[0];
    expect(column).toBe('createdAt');
    expect(Math.abs(Date.now() - 7 * DAY_MS - new Date(sinceIso).getTime())).toBeLessThan(60_000);
  });

  it('should block free user when quota exceeded', async () => {
    const createdAt = new Date(Date.now() - 2 * DAY_MS);
    mockMenuResultQuery({
      id: 'menu-1',
      createdAt: createdAt.toISOString(),
      hasSwappedInWindow: false,
    });

    const result = await checkUserQuota('user-2', makeUser({ id: 'user-2' }), 'menu');

    expect(result.canGenerate).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.quotaStatus.menusGeneratedThisWindow).toBe(1);
    expect(result.quotaStatus.lastMenuGeneratedAt).toEqual(createdAt);
    // Next reset is 7 days after the last menu was generated
    expect(result.nextReset?.getTime()).toBe(createdAt.getTime() + 7 * DAY_MS);
    expect(result.daysUntilReset).toBe(5);
    expect(getQuotaMessage(result, 'menu')).toBe('Disponible dans 5 jours');
  });

  it('should allow premium user unlimited menu generation', async () => {
    mockMenuResultQuery(null);

    const result = await checkUserQuota(
      'user-premium',
      makeUser({ id: 'user-premium', email: 'premium@test.com', status: 'paid_active' }),
      'menu'
    );

    expect(result.canGenerate).toBe(true);
    expect(result.remaining).toBeNull(); // Unlimited
    expect(result.quotaStatus.menuQuotaLimit).toBeNull();
    expect(isPremiumUser(result.quotaStatus)).toBe(true);
    expect(getQuotaMessage(result, 'menu')).toBe('Illimité');
    // Premium users short-circuit before any database query
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it('should check swap quota for free user', async () => {
    mockMenuResultQuery({
      id: 'menu-3',
      createdAt: new Date(Date.now() - DAY_MS).toISOString(),
      hasSwappedInWindow: false,
    });

    const result = await checkUserQuota('user-3', makeUser({ id: 'user-3' }), 'swap');

    expect(result.quotaStatus.swapQuotaLimit).toBe(1);
    expect(result.quotaStatus.swapsUsedThisMenu).toBe(0);
    expect(result.canGenerate).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should block swap once the free user has already swapped in the window', async () => {
    mockMenuResultQuery({
      id: 'menu-4',
      createdAt: new Date(Date.now() - DAY_MS).toISOString(),
      hasSwappedInWindow: true,
    });

    const result = await checkUserQuota('user-4', makeUser({ id: 'user-4' }), 'swap');

    expect(result.canGenerate).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.quotaStatus.swapsUsedThisMenu).toBe(1);
  });

  it('should block a trial_used user who already generated a menu this week', async () => {
    mockMenuResultQuery({
      id: 'menu-expired',
      createdAt: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      hasSwappedInWindow: false,
    });

    const result = await checkUserQuota(
      'user-expired',
      makeUser({ id: 'user-expired', email: 'expired@test.com', status: 'trial_used' }),
      'menu'
    );

    expect(result.canGenerate).toBe(false);
    expect(result.quotaStatus.status).toBe('trial_used');
    expect(isPremiumUser(result.quotaStatus)).toBe(false);
  });

  it('should not apply trial rules: a trial_used user with no menu this week can generate', async () => {
    // Trial enforcement lives in pages/api/submit.ts; checkUserQuota only applies the weekly window.
    mockMenuResultQuery(null);

    const result = await checkUserQuota(
      'user-expired-2',
      makeUser({ id: 'user-expired-2', email: 'expired2@test.com', status: 'trial_used' }),
      'menu'
    );

    expect(result.canGenerate).toBe(true);
    expect(result.quotaStatus.status).toBe('trial_used');
  });

  it('should propagate database errors', async () => {
    const { query } = mockMenuResultQuery(null);
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'db down' } });

    await expect(checkUserQuota('user-5', makeUser({ id: 'user-5' }), 'menu')).rejects.toThrow('db down');
  });
});

describe('isPremiumUser', () => {
  it('should return true for paid_active status', () => {
    const quotaStatus = makeQuotaStatus({
      status: 'paid_active',
      menuQuotaLimit: null,
      swapQuotaLimit: null,
    });

    expect(isPremiumUser(quotaStatus)).toBe(true);
  });

  it('should return false for trial_available status', () => {
    const quotaStatus = makeQuotaStatus({ status: 'trial_available' });

    expect(isPremiumUser(quotaStatus)).toBe(false);
  });

  it('should return false for trial_used status', () => {
    const quotaStatus = makeQuotaStatus({
      status: 'trial_used',
      menusGeneratedThisWindow: 1,
    });

    expect(isPremiumUser(quotaStatus)).toBe(false);
  });
});
