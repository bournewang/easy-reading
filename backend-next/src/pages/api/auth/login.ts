import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/db';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validation/auth';
import { generateSessionToken } from '@/lib/auth/session';
import { corsMiddleware } from '@/middleware/cors';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Login attempt:', {
      body: req.body,
      headers: req.headers,
    });

    // Validate input
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate session token
    const sessionToken = await generateSessionToken(user.id);

    // Set session cookie with cross-domain settings
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cookieDomain = isDevelopment ? undefined : '.english-reader.com';
    
    const cookieOptions = [
      `session=${sessionToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      ...(cookieDomain ? [`Domain=${cookieDomain}`] : []),
      `Max-Age=${60 * 60 * 24 * 7}`, // 7 days
    ].join('; ');

    console.log('Setting cookie:', cookieOptions);
    res.setHeader('Set-Cookie', cookieOptions);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      },
      sessionToken,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Apply CORS middleware to the handler
export default corsMiddleware(handler);