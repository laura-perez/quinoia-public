/**
 * Email Service - Main service for sending emails
 * Clean abstraction over email client and templates
 */

import { sendEmail } from './client';
import { getWelcomeMenuSubject, getWelcomeMenuHtml } from './templates/welcome-menu';
import { getInsufficientRecipesSubject, getInsufficientRecipesHtml } from './templates/insufficient-recipes-alert';
import { env } from '@/lib/config/env';
import type { User, MenuData, EmailType } from './types';
import type { SelectionContext } from '@/types/recipes';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

export interface SendWelcomeMenuParams {
  user: User;
  menu: MenuData;
}

/**
 * Send welcome menu email (premier menu gratuit)
 */
export async function sendWelcomeMenuEmail({ user, menu }: SendWelcomeMenuParams) {
  logger.info('Sending welcome menu email', {
    userId: user.id,
    email: user.email.substring(0, 3) + '***',
    shareId: menu.shareId,
    numRecipes: menu.numRecipes
  });

  const subject = getWelcomeMenuSubject(user);
  const html = getWelcomeMenuHtml(user, menu);

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    from: 'Quinoïa <hello@rs.quinoia.fr>',
    replyTo: 'hello@rs.quinoia.fr'
  });

  if (result.success) {
    logger.info('Welcome menu email sent successfully', {
      userId: user.id,
      emailId: result.id,
      shareId: menu.shareId
    });
  } else {
    logger.error('Welcome menu email failed', {
      userId: user.id,
      shareId: menu.shareId,
      error: result.error
    });
  }

  return result;
}

export interface SendInsufficientRecipesAlertParams {
  context: SelectionContext;
  availableCount: number;
  requestedCount: number;
  userEmail: string;
  submissionId: string;
  adminEmail?: string; // Email de Laura, optionnel (peut être en env var)
}

/**
 * Send insufficient recipes alert email to admin (Laura)
 */
export async function sendInsufficientRecipesAlert({
  context,
  availableCount,
  requestedCount,
  userEmail,
  submissionId,
  adminEmail = env.ADMIN_EMAIL || 'laura@quinoia.fr' // Use env var or fallback
}: SendInsufficientRecipesAlertParams) {
  logger.info('Sending insufficient recipes alert', {
    userId: context.userId,
    availableCount,
    requestedCount,
    diet: context.diet,
    proteinPreferences: context.proteinPreferences,
    submissionId
  });

  const alertData = {
    context,
    availableCount,
    requestedCount,
    userEmail,
    submissionId,
    timestamp: new Date().toISOString()
  };

  const subject = getInsufficientRecipesSubject(alertData);
  const html = getInsufficientRecipesHtml(alertData);

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
    from: 'Quinoïa Alert System <alerts@rs.quinoia.fr>',
    replyTo: 'hello@rs.quinoia.fr'
  });

  if (result.success) {
    logger.info('Insufficient recipes alert sent successfully', {
      userId: context.userId,
      emailId: result.id,
      submissionId,
      adminEmail: adminEmail.substring(0, 3) + '***'
    });
  } else {
    logger.error('Insufficient recipes alert failed', {
      userId: context.userId,
      submissionId,
      error: result.error
    });
  }

  return result;
}