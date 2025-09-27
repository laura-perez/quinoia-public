/**
 * Email Client - Resend Integration
 * Clean and modern email service for Quinoïa
 */

import { Resend } from 'resend';
import { env } from '@/lib/config/env';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

// Initialize Resend client
export const resend = new Resend(env.RESEND_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send email using Resend
 */
export async function sendEmail(data: EmailData): Promise<EmailResult> {
  try {
    logger.info('Sending email', {
      to: data.to.substring(0, 3) + '***', // Redact email for privacy
      subject: data.subject,
      from: data.from || env.FROM_EMAIL
    });

    const result = await resend.emails.send({
      from: data.from || env.FROM_EMAIL,
      to: data.to,
      subject: data.subject,
      html: data.html,
      replyTo: data.replyTo,
    });

    if (result.error) {
      logger.error('Email sending failed', {
        error: result.error,
        to: data.to.substring(0, 3) + '***'
      });
      return {
        success: false,
        error: result.error.message || 'Email sending failed'
      };
    }

    logger.info('Email sent successfully', {
      id: result.data?.id,
      to: data.to.substring(0, 3) + '***'
    });

    return {
      success: true,
      id: result.data?.id
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Email service error', {
      error: errorMessage,
      to: data.to.substring(0, 3) + '***'
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}