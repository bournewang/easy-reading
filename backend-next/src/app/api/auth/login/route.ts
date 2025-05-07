import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { generateSessionToken } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validation/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await compare(validatedData.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = await generateSessionToken(user.id);

    // Create response with success message
    const response = NextResponse.json(
      { 
        message: 'Logged in successfully',
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        }
      },
      { status: 200 }
    );

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.errors 
        },
        { status: 400 }
      );
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Error during login' },
      { status: 500 }
    );
  }
} 