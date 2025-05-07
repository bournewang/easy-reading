import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { registerSchema } from '@/lib/validation/auth';
import { generateSessionToken } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received registration request:', body);
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Username already taken' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        passwordHash,
        fullName: validatedData.fullName,
      },
    });

    // Generate session token
    const sessionToken = await generateSessionToken(user.id);

    // Create response with success message
    const response = NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        },
      },
      { status: 201 }
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
      console.error('Validation errors:', error.errors);
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.errors 
        },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 