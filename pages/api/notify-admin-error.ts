import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { sendEmail } from "@/lib/email/client";
import { env } from '@/lib/config/env';
import { createLogger, redact } from '@/lib/logger';
import { getClientIPForRateLimit } from '@/lib/auth/ipDetection';
import { limit } from '@/lib/auth/rateLimits';
import { escapeHtml } from '@/lib/utils/escapeHtml';

const logger = createLogger();

// 5 notifications per IP per hour
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 3600;

// 30 notifications per hour across all clients
const GLOBAL_RATE_LIMIT_MAX = 30;
const GLOBAL_RATE_LIMIT_WINDOW_SEC = 3600;

// Raw input caps: larger payloads are rejected
const MAX_RAW_TEXT_LENGTH = 20000;
// Display limits: accepted values are truncated to these lengths in the email
const MAX_ERROR_LENGTH = 500;
const MAX_STACK_LENGTH = 5000;
const MAX_FORM_DATA_LENGTH = 10000;

const TRUNCATION_MARKER = '… [truncated]';
const EMPTY_ERROR_PLACEHOLDER = '(no error message)';

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) + TRUNCATION_MARKER : value;
}

const notifyAdminErrorSchema = z.object({
  error: z.string().max(MAX_RAW_TEXT_LENGTH),
  stack: z.string().max(MAX_RAW_TEXT_LENGTH).optional(),
  formData: z
    .record(z.string(), z.unknown())
    .refine((data) => JSON.stringify(data).length <= MAX_FORM_DATA_LENGTH, {
      message: `formData must not exceed ${MAX_FORM_DATA_LENGTH} characters once serialized`,
    })
    .optional(),
  timestamp: z.string().max(64).optional(),
});

function rateLimitedResponse(res: NextApiResponse, reset: number) {
  return res.status(429).json({
    error: 'Too many requests',
    code: 'RATE_LIMITED',
    details: { retryAfter: Math.max(0, Math.ceil((reset - Date.now()) / 1000)) }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ipData = getClientIPForRateLimit(req);
  const rateLimitResult = await limit(`notify-admin-error:${ipData.key}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC);

  if (!rateLimitResult.success) {
    logger.warn('Admin error notification rate limit exceeded', {
      ip: redact(ipData.key),
      reset: new Date(rateLimitResult.reset).toISOString()
    });
    return rateLimitedResponse(res, rateLimitResult.reset);
  }

  const globalRateLimitResult = await limit(
    'notify-admin-error:global',
    GLOBAL_RATE_LIMIT_MAX,
    GLOBAL_RATE_LIMIT_WINDOW_SEC
  );

  if (!globalRateLimitResult.success) {
    logger.warn('Admin error notification global rate limit exceeded', {
      reset: new Date(globalRateLimitResult.reset).toISOString()
    });
    return rateLimitedResponse(res, globalRateLimitResult.reset);
  }

  const parsed = notifyAdminErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('Admin error notification rejected: invalid payload', {
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code }))
    });
    return res.status(400).json({
      error: 'Invalid request',
      code: 'INVALID_INPUT',
      details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) }
    });
  }

  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn('ADMIN_EMAIL is not configured: admin error notification skipped');
    return res.status(204).end();
  }

  const { formData, timestamp } = parsed.data;
  const error = truncate(parsed.data.error.trim() || EMPTY_ERROR_PLACEHOLDER, MAX_ERROR_LENGTH);
  const stack = parsed.data.stack ? truncate(parsed.data.stack, MAX_STACK_LENGTH) : undefined;
  const field = (key: string): string => escapeHtml(formData?.[key]) || 'Non fourni';

  try {
    const subject = `🚨 Erreur de soumission formulaire Quinoïa`;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Erreur de soumission formulaire</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #FFF6DC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #B91C1C; margin: 0;">🚨 Erreur de soumission formulaire</h1>
    <p style="color: #7C2D12; margin: 10px 0 0 0;">Une erreur s'est produite lors de la soumission d'un formulaire utilisateur.</p>
  </div>

  <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #414535; margin-top: 0;">📋 Détails de l'erreur</h3>
    <p><strong>Message d'erreur :</strong></p>
    <pre style="background-color: #FEE2E2; padding: 10px; border-radius: 4px; color: #B91C1C; white-space: pre-wrap;">${escapeHtml(error)}</pre>

    ${stack ? `
    <p><strong>Stack trace :</strong></p>
    <pre style="background-color: #FEE2E2; padding: 10px; border-radius: 4px; color: #B91C1C; font-size: 11px; white-space: pre-wrap;">${escapeHtml(stack)}</pre>
    ` : ''}
  </div>

  <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #414535; margin-top: 0;">👤 Données utilisateur</h3>
    <p><strong>Email :</strong> ${field('email')}</p>
    <p><strong>Prénom :</strong> ${field('name')}</p>
    <p><strong>Âge :</strong> ${field('age')}</p>
    <p><strong>Régime :</strong> ${field('diet')}</p>
    <p><strong>Niveau cuisine :</strong> ${field('cookingLevel')}</p>
    <p><strong>Nombre de recettes :</strong> ${field('numRecipes')}</p>
    <p><strong>Nombre de portions :</strong> ${field('numServings')}</p>
  </div>

  <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #414535; margin-top: 0;">🕐 Métadonnées</h3>
    <p><strong>Timestamp :</strong> ${escapeHtml(timestamp)}</p>
    <p><strong>User Agent :</strong> ${escapeHtml(req.headers['user-agent']) || 'Non fourni'}</p>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
    <p style="color: #8A8A8A; font-size: 12px; margin: 0;">
      Email automatique - Système Quinoïa
    </p>
  </div>
</body>
</html>
    `;

    await sendEmail({
      to: adminEmail,
      subject,
      html,
      from: 'Quinoïa Error System <alerts@rs.quinoia.fr>',
      replyTo: 'hello@rs.quinoia.fr'
    });

    logger.info('Admin error notification sent', {
      adminEmail: adminEmail.substring(0, 3) + '***',
      hasUserEmail: typeof formData?.email === 'string',
      error: error.substring(0, 100)
    });

    res.status(200).json({ success: true });
  } catch (emailError) {
    logger.error('Failed to send admin error notification', {
      error: emailError,
      originalError: error.substring(0, 100)
    });

    // Don't fail the response as this is non-critical
    res.status(200).json({ success: false, error: 'Email failed' });
  }
}