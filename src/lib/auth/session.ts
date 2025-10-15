/**
 * Session management utilities for authentication
 * Handles session creation, validation, and cookie management
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { generateSessionToken, getSessionExpiration, isTokenExpired } from './tokens';
import { sessionsRepository } from '../supabase/repositories/sessions';
import { USER_STATUS, type UserStatus } from '../supabase/types/user.types';
import { createLogger } from '../logger';

const logger = createLogger();

const SESSION_COOKIE_NAME = 'quinoia_session';
const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export interface SessionUser {
  id: string;
  email: string;
  firstName: string | null;
  status: UserStatus | string;
  lastMenuResultId?: string | null;
  isFirstLogin: boolean;
  lastLoginAt: Date | null;
}

/**
 * Create a new session for a user
 * Returns session token to be stored in HTTP-only cookie
 */
export async function createSession(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = getSessionExpiration();

  await sessionsRepository.create({
    token,
    userId,
    expiresAt,
    ipAddress,
    userAgent,
  });

  logger.info('Session created', {
    userId,
    expiresAt: expiresAt.toISOString(),
  });

  return token;
}

/**
 * Validate session token and return user data
 * Returns null if session is invalid or expired
 */
export async function validateSession(token: string): Promise<SessionUser | null> {
  const session = await sessionsRepository.findByToken(token);

  if (!session) {
    logger.warn('Session not found', { token: token.substring(0, 8) + '...' });
    return null;
  }

  // Check expiration
  if (isTokenExpired(session.expiresAt)) {
    logger.warn('Session expired', {
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
    await sessionsRepository.deleteById(session.id);
    return null;
  }

  // Update lastUsedAt
  await sessionsRepository.updateLastUsedAt(session.id);

  // Return user data from session
  return {
    id: session.userId,
    email: session.user.email,
    firstName: session.user.firstName,
    status: session.user.status,
    lastMenuResultId: session.user.lastMenuResultId,
    isFirstLogin: session.user.isFirstLogin,
    lastLoginAt: session.user.lastLoginAt,
  };
}

/**
 * Set session cookie in HTTP response
 */
export function setSessionCookie(res: NextApiResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE}`
  );
}

/**
 * Get session token from HTTP request cookies
 */
export function getSessionToken(req: NextApiRequest): string | null {
  return req.cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Clear session cookie (logout)
 */
export function clearSessionCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

/**
 * Delete session from database
 */
export async function deleteSession(token: string): Promise<void> {
  const session = await sessionsRepository.findByToken(token);
  if (session) {
    await sessionsRepository.deleteById(session.id);
    logger.info('Session deleted', { userId: session.userId });
  }
}

/**
 * Delete all sessions for a user (useful for logout from all devices)
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await sessionsRepository.deleteByUserId(userId);
  logger.info('All user sessions deleted', { userId });
}
