/**
 * API Route: Request Magic Link
 * POST /api/auth/request-magic-link
 *
 * Sends a magic link email for passwordless authentication
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { setZodErrorMapFR, formatZodErrors } from '@/schemas/zodErrorMap.fr';
import { requestMagicLinkSchema } from '@/schemas/auth.schema';
import { createLogger, redact } from '@/lib/logger';
import { detectClientIP } from '@/lib/auth';
import { limit } from '@/lib/auth/rateLimits';
import { usersRepository } from '@/lib/supabase/repositories/users';
import { magicLinksRepository } from '@/lib/supabase/repositories/magicLinks';
import { generateMagicLinkToken, getMagicLinkExpiration } from '@/lib/auth/tokens';
import { sendMagicLinkEmail } from '@/lib/email/service';
import { env } from '@/lib/config';

setZodErrorMapFR();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createLogger();
  const ipDetection = detectClientIP(req);

  logger.info('Magic link request started', {
    method: req.method,
    path: req.url,
    userAgent: req.headers['user-agent'],
    ip: redact(ipDetection.ip),
    ipSource: ipDetection.source
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'POST') {
    logger.warn('Invalid method', { method: req.method });
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Parse body
  let raw: any;
  try {
    raw = req.body;
    if (typeof raw === 'string') raw = JSON.parse(raw);
  } catch (e) {
    logger.error('Invalid request body', { error: e });
    return res.status(400).json({ error: 'Corps de requête invalide' });
  }

  // Validate with Zod
  const parsed = requestMagicLinkSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('Magic link request validation failed', {
      errors: formatZodErrors(parsed.error)
    });
    return res.status(400).json({ errors: formatZodErrors(parsed.error) });
  }

  const { email } = parsed.data;

  // Rate limiting: 3 requests per hour per email
  const rateLimitKey = `magic-link:${email}`;
  const rateLimitResult = await limit(rateLimitKey, 3, 3600); // 3 req/hour

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for magic link', {
      email: redact(email),
      remaining: rateLimitResult.remaining,
      reset: new Date(rateLimitResult.reset).toISOString()
    });

    return res.status(429).json({
      error: 'Trop de demandes',
      message: 'Tu as atteint la limite de demandes. Réessaie dans 1 heure.',
      retryAfter: new Date(rateLimitResult.reset).toISOString()
    });
  }

  try {
    // Find or create user
    let user = await usersRepository.findByEmail(email);

    if (!user) {
      logger.info('Creating new user for magic link', {
        email: redact(email)
      });

      user = await usersRepository.create({
        email,
        status: 'trial_available',
        firstName: undefined
      });

      logger.info('New user created', {
        userId: user.id,
        email: redact(email),
        status: user.status
      });
    } else {
      logger.info('Existing user found', {
        userId: user.id,
        email: redact(email),
        status: user.status
      });
    }

    // Generate magic link token
    const token = generateMagicLinkToken();
    const expiresAt = getMagicLinkExpiration();

    // Save magic link to database
    await magicLinksRepository.create({
      token,
      email,
      expiresAt,
      ipAddress: ipDetection.ip,
      userAgent: req.headers['user-agent'] || null
    });

    logger.info('Magic link created', {
      email: redact(email),
      expiresAt: expiresAt.toISOString(),
      token: token.substring(0, 8) + '...'
    });

    // Construct magic link URL
    const baseUrl = env.APP_BASE_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    const magicLinkUrl = `${baseUrl}/api/auth/verify-magic-link?token=${token}`;

    // Send email
    const emailResult = await sendMagicLinkEmail({
      email,
      magicLinkUrl,
      firstName: user.firstName
    });

    if (!emailResult.success) {
      logger.error('Failed to send magic link email', {
        email: redact(email),
        error: emailResult.error
      });

      // Don't expose email sending failure to client (security)
      // Still return success to prevent email enumeration
    } else {
      logger.info('Magic link email sent successfully', {
        email: redact(email),
        emailId: emailResult.id
      });
    }

    // Always return success (prevent email enumeration attack)
    return res.status(200).json({
      success: true,
      message: 'Magic link envoyé ! Vérifie tes emails.'
    });

  } catch (error) {
    logger.error('Error processing magic link request', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email: redact(email)
    });

    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue. Réessaie dans quelques instants.'
    });
  }
}
