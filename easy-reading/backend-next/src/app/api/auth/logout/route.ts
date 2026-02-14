import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Get session token from cookie
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear session cookie
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Error during logout' },
      { status: 500 }
    );
  }
} 