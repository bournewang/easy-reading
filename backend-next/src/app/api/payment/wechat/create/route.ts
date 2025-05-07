import { NextRequest, NextResponse } from 'next/server';
import { generateOrderId } from '@/lib/utils/order';
import { getPriceForTier } from '@/lib/utils/pricing';
import { validateSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  console.log('=== WeChat Pay Order Creation Request ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));

  try {
    // Get session token from cookie
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session')?.value;
    console.log('Session token from cookie:', sessionToken ? 'present' : 'missing');

    if (!sessionToken) {
      console.log('No session token found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate session and get user
    const user = await validateSession(sessionToken);
    console.log('Session validation result:', user ? 'valid' : 'invalid');

    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { tier, duration } = body;
    console.log('Extracted parameters:', { tier, duration });

    if (!tier || !duration) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate amount based on tier and duration (in yuan)
    const amount = getPriceForTier(tier, parseInt(duration));
    console.log('=== Amount Calculation ===');
    console.log('Tier:', tier);
    console.log('Duration:', duration);
    console.log('Amount from pricing (yuan):', amount);
    console.log('Amount type:', typeof amount);

    // Generate order ID
    const orderId = `WX${Date.now()}`;
    console.log('Generated order ID:', orderId);

    // Create order record in database first
    console.log('Creating order record in database');
    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: user.id,
        amount: amount,
        status: 'pending',
        paymentMethod: 'wechat',
        tier,
        duration: parseInt(duration),
        paymentDetails: {
          orderId,
          amount,
          tier,
          duration: parseInt(duration)
        }
      }
    });

    console.log('Order created in database:', order);

    // Convert amount to cents (WeChat Pay expects amounts in cents)
    const amountInCents = Math.round(amount * 100);
    console.log('=== Amount Conversion ===');
    console.log('Original amount (yuan):', amount);
    console.log('Conversion calculation:', `${amount} * 100 = ${amountInCents}`);
    console.log('Amount in cents:', amountInCents);
    console.log('Amount in cents type:', typeof amountInCents);

    // Lazy load WeChat Pay functions
    const { createWeChatOrder } = await import('@/lib/payment/wechat');

    // Create WeChat order
    console.log('=== Creating WeChat Pay Order ===');
    console.log('Order parameters:', {
      outTradeNo: orderId,
      totalAmount: amountInCents,
      description: `Easy Reading ${tier} Plan - ${duration} days`,
      userId: user.id
    });

    const result = await createWeChatOrder({
      outTradeNo: orderId,
      totalAmount: amountInCents,
      description: `Easy Reading ${tier} Plan - ${duration} days`,
      userId: user.id
    });

    console.log('WeChat Pay order creation result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating WeChat Pay order:', error);
    return NextResponse.json(
      { error: 'Failed to create WeChat Pay order' },
      { status: 500 }
    );
  }
}