/**
 * API Route: Verify Magic Link
 * GET /api/auth/verify-magic-link?token=xxx
 *
 * Verifies magic link token and creates authenticated session
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { setZodErrorMapFR } from '@/schemas/zodErrorMap.fr';
import { verifyMagicLinkSchema } from '@/schemas/auth.schema';
import { createLogger, redact } from '@/lib/logger';
import { detectClientIP } from '@/lib/auth';
import { magicLinksRepository } from '@/lib/supabase/repositories/magicLinks';
import { usersRepository } from '@/lib/supabase/repositories/users';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { isTokenExpired, isValidTokenFormat } from '@/lib/auth/tokens';

setZodErrorMapFR();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createLogger();
  const ipDetection = detectClientIP(req);

  logger.info('Magic link verification started', {
    method: req.method,
    path: req.url,
    ip: redact(ipDetection.ip)
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'GET') {
    logger.warn('Invalid method', { method: req.method });
    return res.redirect('/login?error=invalid_method');
  }

  // Validate query params
  const parsed = verifyMagicLinkSchema.safeParse(req.query);
  if (!parsed.success) {
    logger.error('Invalid token format', {
      query: req.query
    });
    return res.redirect('/login?error=invalid_token');
  }

  const { token } = parsed.data;

  // Basic token format validation
  if (!isValidTokenFormat(token)) {
    logger.warn('Token format validation failed', {
      token: token.substring(0, 8) + '...'
    });
    return res.redirect('/login?error=invalid_token');
  }

  try {
    // Find magic link in database
    const magicLink = await magicLinksRepository.findByToken(token);

    if (!magicLink) {
      logger.warn('Magic link not found', {
        token: token.substring(0, 8) + '...'
      });
      return res.redirect('/login?error=invalid_token');
    }

    // Check if already used
    if (magicLink.usedAt) {
      logger.warn('Magic link already used', {
        token: token.substring(0, 8) + '...',
        usedAt: magicLink.usedAt.toISOString()
      });
      return res.redirect('/login?error=token_used');
    }

    // Check if expired
    if (isTokenExpired(magicLink.expiresAt)) {
      logger.warn('Magic link expired', {
        token: token.substring(0, 8) + '...',
        expiresAt: magicLink.expiresAt.toISOString()
      });
      return res.redirect('/login?error=token_expired');
    }

    // Mark magic link as used (one-time use)
    await magicLinksRepository.markAsUsed(magicLink.id);

    logger.info('Magic link marked as used', {
      magicLinkId: magicLink.id,
      email: redact(magicLink.email)
    });

    // Find user by email
    const user = await usersRepository.findByEmail(magicLink.email);

    if (!user) {
      logger.error('User not found for magic link', {
        email: redact(magicLink.email)
      });
      return res.redirect('/login?error=user_not_found');
    }

    // Create session
    const sessionToken = await createSession(
      user.id,
      ipDetection.ip,
      req.headers['user-agent'] || null
    );

    // Set HTTP-only secure cookie
    setSessionCookie(res, sessionToken);

    logger.info('Session created successfully', {
      userId: user.id,
      email: redact(user.email)
    });

    // Update user login tracking
    await usersRepository.updateLastLogin(user.id);

    logger.info('User login tracking updated', {
      userId: user.id,
      isFirstLogin: user.isFirstLogin
    });

    // Redirect to dashboard
    const redirectUrl = user.isFirstLogin ? '/dashboard?welcome=true' : '/dashboard';

    logger.info('Magic link verification successful, redirecting', {
      userId: user.id,
      redirectUrl
    });

    return res.redirect(redirectUrl);

  } catch (error) {
    logger.error('Error verifying magic link', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      token: token.substring(0, 8) + '...'
    });

    return res.redirect('/login?error=server_error');
  }
}
