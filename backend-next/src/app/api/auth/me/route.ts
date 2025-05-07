import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get session token from cookie
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session')?.value;
    console.log('Session token from cookie:', sessionToken ? 'present' : 'missing');

    if (!sessionToken) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate session and get user
    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionExpires: user.subscriptionExpires,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 