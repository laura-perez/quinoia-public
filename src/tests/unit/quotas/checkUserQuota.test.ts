/**
 * Unit Tests for checkUserQuota
 *
 * Test Coverage:
 * 1. Free user within quota (can generate)
 * 2. Free user quota exceeded (cannot generate)
 * 3. Premium user (unlimited, always can generate)
 * 4. Swap quota checks (free vs premium)
 * 5. Trial expired user
 * 6. Quota status messages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkUserQuota, isPremiumUser } from '@/lib/quotas/checker';
import { getServiceClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  getServiceClient: vi.fn(),
}));

describe('checkUserQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow free user within quota to generate menu', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                userId: 'user-1',
                email: 'user@test.com',
                status: 'trial_active',
                lastMenuGeneratedAt: new Date('2025-01-01'),
                menusGeneratedThisWindow: 0,
                menuQuotaLimit: 1,
                canGenerateMenu: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getServiceClient).mockReturnValue(mockClient as any);

    const result = await checkUserQuota('user-1', 'menu');

    expect(result.canGenerate).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.quotaStatus.menusGeneratedThisWindow).toBe(0);
    expect(result.quotaStatus.menuQuotaLimit).toBe(1);
  });

  it('should block free user when quota exceeded', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                userId: 'user-2',
                email: 'user@test.com',
                status: 'trial_active',
                lastMenuGeneratedAt: new Date('2025-01-01'),
                menusGeneratedThisWindow: 1,
                menuQuotaLimit: 1,
                canGenerateMenu: false,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getServiceClient).mockReturnValue(mockClient as any);

    const result = await checkUserQuota('user-2', 'menu');

    expect(result.canGenerate).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.quotaStatus.menusGeneratedThisWindow).toBe(1);
    expect(result.message).toContain('quota');
  });

  it('should allow premium user unlimited menu generation', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                userId: 'user-premium',
                email: 'premium@test.com',
                status: 'paid_active',
                lastMenuGeneratedAt: new Date('2025-01-01'),
                menusGeneratedThisWindow: 10,
                menuQuotaLimit: null, // Unlimited
                canGenerateMenu: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getServiceClient).mockReturnValue(mockClient as any);

    const result = await checkUserQuota('user-premium', 'menu');

    expect(result.canGenerate).toBe(true);
    expect(result.remaining).toBeNull(); // Unlimited
    expect(result.quotaStatus.menuQuotaLimit).toBeNull();
    expect(isPremiumUser(result.quotaStatus)).toBe(true);
  });

  it('should check swap quota for free user', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                userId: 'user-3',
                email: 'user@test.com',
                status: 'trial_active',
                lastMenuGeneratedAt: new Date('2025-01-01'),
                menusGeneratedThisWindow: 0,
                menuQuotaLimit: 1,
                swapQuotaLimit: 1,
                canGenerateMenu: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getServiceClient).mockReturnValue(mockClient as any);

    const result = await checkUserQuota('user-3', 'swap');

    expect(result.quotaStatus.swapQuotaLimit).toBe(1);
  });

  it('should handle trial expired user', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                userId: 'user-expired',
                email: 'expired@test.com',
                status: 'trial_expired',
                lastMenuGeneratedAt: new Date('2024-12-20'),
                menusGeneratedThisWindow: 1,
                menuQuotaLimit: 1,
                canGenerateMenu: false,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(getServiceClient).mockReturnValue(mockClient as any);

    const result = await checkUserQuota('user-expired', 'menu');

    expect(result.canGenerate).toBe(false);
    expect(result.quotaStatus.status).toBe('trial_expired');
  });
});

describe('isPremiumUser', () => {
  it('should return true for paid_active status', () => {
    const quotaStatus = {
      status: 'paid_active',
      menusGeneratedThisWindow: 0,
      menuQuotaLimit: null,
      swapQuotaLimit: null,
    };

    expect(isPremiumUser(quotaStatus)).toBe(true);
  });

  it('should return false for trial_active status', () => {
    const quotaStatus = {
      status: 'trial_active',
      menusGeneratedThisWindow: 0,
      menuQuotaLimit: 1,
      swapQuotaLimit: 1,
    };

    expect(isPremiumUser(quotaStatus)).toBe(false);
  });

  it('should return false for trial_expired status', () => {
    const quotaStatus = {
      status: 'trial_expired',
      menusGeneratedThisWindow: 1,
      menuQuotaLimit: 1,
      swapQuotaLimit: 1,
    };

    expect(isPremiumUser(quotaStatus)).toBe(false);
  });
});
