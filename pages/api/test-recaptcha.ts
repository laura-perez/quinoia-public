import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAndExtractRecaptcha } from '@/lib/auth/recaptcha';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  
  console.log('Test endpoint - NODE_ENV:', process.env.NODE_ENV);
  console.log('Test endpoint - Token received:', token);
  
  try {
    const result = await verifyAndExtractRecaptcha(token);
    console.log('Test endpoint - Result:', result);
    
    res.status(200).json({
      success: true,
      environment: process.env.NODE_ENV,
      tokenReceived: token,
      recaptchaResult: result
    });
  } catch (error) {
    console.error('Test endpoint - Error:', error);
    res.status(500).json({
      success: false,
      error: String(error),
      environment: process.env.NODE_ENV,
      tokenReceived: token
    });
  }
}
