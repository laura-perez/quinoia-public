/**
 * API Route: Logout
 * POST /api/auth/logout
 *
 * Invalidates user session and clears cookie
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createLogger } from '@/lib/logger';
import { getSessionToken, deleteSession, clearSessionCookie } from '@/lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createLogger();

  logger.info('Logout request started', {
    method: req.method,
    path: req.url
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'POST') {
    logger.warn('Invalid method', { method: req.method });
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Get session token from cookie
    const token = getSessionToken(req);

    if (token) {
      // Delete session from database
      await deleteSession(token);

      logger.info('Session deleted from database', {
        token: token.substring(0, 8) + '...'
      });
    } else {
      logger.info('No session token found, skipping database deletion');
    }

    // Clear session cookie (even if no token found)
    clearSessionCookie(res);

    logger.info('Logout successful');

    return res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    logger.error('Error during logout', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Clear cookie anyway (best effort)
    clearSessionCookie(res);

    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la déconnexion'
    });
  }
}
