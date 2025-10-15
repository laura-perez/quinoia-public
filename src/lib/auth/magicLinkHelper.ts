/**
 * Magic Link Helper
 * Centralized magic link generation and email sending logic
 */

import { generateMagicLinkToken, getMagicLinkExpiration } from './tokens';
import { magicLinksRepository } from '@/lib/supabase/repositories/magicLinks';
import { sendWelcomeMenuWithActivationEmail } from '@/lib/email/service';
import { limit } from './rateLimits';
import { createLogger } from '@/lib/logger';
import { env } from '@/lib/config';

const logger = createLogger();

export interface CreateAndSendMagicLinkForWelcomeParams {
  email: string;
  firstName: string | null;
  shareId: string;
  ipAddress: string;
  userAgent: string | null;
}

export interface CreateAndSendMagicLinkResult {
  success: boolean;
  rateLimited?: boolean;
  error?: string;
}

/**
 * Create magic link and send welcome email after form submission
 * Handles rate limiting (3 magic links per hour per email)
 */
export async function createAndSendMagicLinkForWelcome({
  email,
  firstName,
  shareId,
  ipAddress,
  userAgent
}: CreateAndSendMagicLinkForWelcomeParams): Promise<CreateAndSendMagicLinkResult> {
  // Rate limit: 3 magic links per hour per email
  const rateLimitKey = `magic-link:${email}`;
  const rateLimitResult = await limit(rateLimitKey, 3, 3600);

  if (!rateLimitResult.success) {
    logger.warn('Magic link rate limit exceeded', { email: email.substring(0, 3) + '***' });
    return { success: false, rateLimited: true };
  }

  try {
    // Generate magic link token
    const magicLinkToken = generateMagicLinkToken();
    const expiresAt = getMagicLinkExpiration();

    // Save to database
    await magicLinksRepository.create({
      token: magicLinkToken,
      email,
      expiresAt,
      ipAddress,
      userAgent
    });

    // Build URLs
    const baseUrl = env.APP_BASE_URL;
    const shareUrl = `${baseUrl}/menu/${shareId}`;
    const magicLinkUrl = `${baseUrl}/api/auth/verify-magic-link?token=${magicLinkToken}`;

    // Send welcome email with 2 buttons
    await sendWelcomeMenuWithActivationEmail({
      email,
      firstName,
      shareUrl,
      magicLinkUrl
    });

    logger.info('Magic link created and email sent', {
      email: email.substring(0, 3) + '***',
      shareId
    });

    return { success: true };
  } catch (error) {
    logger.error('Magic link creation or email failed', {
      error: error instanceof Error ? error.message : String(error),
      email: email.substring(0, 3) + '***'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
