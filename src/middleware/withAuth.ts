/**
 * Authentication middleware for API routes
 * Verifies session and injects userId into handler
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { validateSession, getSessionToken } from '@/lib/auth/session';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

export type AuthenticatedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => Promise<void> | void;

/**
 * Higher-order function that wraps API handlers with authentication
 * Injects userId as third parameter to handler
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = getSessionToken(req);

    if (!token) {
      logger.warn('Authentication failed: No session token', {
        path: req.url,
        method: req.method
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Reconnecte-toi pour continuer'
      });
    }

    const sessionUser = await validateSession(token);

    if (!sessionUser) {
      logger.warn('Authentication failed: Invalid or expired session', {
        path: req.url,
        method: req.method,
        token: token.substring(0, 8) + '...'
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Ta session a expiré. Reconnecte-toi pour continuer.'
      });
    }

    logger.debug('Authentication successful', {
      userId: sessionUser.id,
      path: req.url,
      method: req.method
    });

    // Inject userId as third parameter
    return handler(req, res, sessionUser.id);
  };
}
