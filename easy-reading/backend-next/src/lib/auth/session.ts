import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function generateSessionToken(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  console.log('Creating session for user:', userId);
  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
  console.log('Session created:', session.id);

  return token;
}

export async function validateSession(token: string) {
  console.log('Validating session token');
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    console.log('No session found for token');
    return null;
  }

  if (session.expiresAt < new Date()) {
    console.log('Session expired, deleting');
    await prisma.session.delete({
      where: { id: session.id },
    });
    return null;
  }

  console.log('Session valid for user:', session.user.username);
  return session.user;
} 