import { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '@/lib/auth/session';
import { corsMiddleware } from '@/middleware/cors';
import { parseCookies } from '@/lib/cookies';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get session token from cookie
    const cookies = parseCookies(req);
    const sessionToken = cookies.session;

    if (!sessionToken) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Validate session and get user
    const user = await validateSession(sessionToken);

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default corsMiddleware(handler); 