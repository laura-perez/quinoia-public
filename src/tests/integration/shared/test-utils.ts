/**
 * Shared test utilities for integration tests
 */

import crypto from 'crypto';

/**
 * Generate a random hex ID for testing
 * Used for mock Stripe IDs, event IDs, etc.
 */
export function generateTestId(prefix: string = ''): string {
  const randomHex = crypto.randomBytes(8).toString('hex');
  return prefix ? `${prefix}${randomHex}` : randomHex;
}

/**
 * Generate a test email address
 */
export function generateTestEmail(): string {
  return `test-${generateTestId()}@example.com`;
}

/**
 * Get current Unix timestamp (seconds since epoch)
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get Unix timestamp from X minutes ago
 */
export function getTimestampMinutesAgo(minutes: number): number {
  return getCurrentTimestamp() - (minutes * 60);
}

/**
 * Supabase error codes
 */
export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
} as const;

/**
 * Check if Supabase error is a "not found" error
 */
export function isNotFoundError(error: { code?: string } | null): boolean {
  return error?.code === SUPABASE_ERROR_CODES.NOT_FOUND;
}
