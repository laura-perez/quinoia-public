import type { NextApiRequest, NextApiResponse } from 'next';
import { usersRepository } from '@/lib/supabase/repositories/users';

/**
 * API endpoint to check user status by email
 * Returns user status if user exists, or null if not found
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await usersRepository.findByEmail(email);

    if (!user) {
      return res.status(200).json({ exists: false, status: null });
    }

    return res.status(200).json({
      exists: true,
      status: user.status,
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
