/**
 * Token generation and validation utilities for authentication
 */

import { randomUUID } from 'crypto';

/**
 * Generate a cryptographically secure magic link token (UUID v4)
 */
export function generateMagicLinkToken(): string {
  return randomUUID();
}

/**
 * Generate a cryptographically secure session token (UUID v4)
 */
export function generateSessionToken(): string {
  return randomUUID();
}

/**
 * Calculate expiration timestamp for magic link (15 minutes from now)
 */
export function getMagicLinkExpiration(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  return now;
}

/**
 * Calculate expiration timestamp for session (30 days from now)
 * Note: Technical architecture specifies 90 days, but using 30 days for security
 */
export function getSessionExpiration(): Date {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now;
}

/**
 * Validate that a token is not expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Validate token format (basic UUID v4 format check)
 */
export function isValidTokenFormat(token: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(token);
}
