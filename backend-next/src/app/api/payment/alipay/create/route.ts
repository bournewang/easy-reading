import { NextRequest, NextResponse } from 'next/server';
import { createAlipayOrder } from '@/lib/payment/alipay';
import { validateSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Create Alipay Order Request ===');
    
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

    const { amount, orderId, tier, duration } = body;
    console.log('Extracted parameters:', { amount, orderId, tier, duration });

    // Validate required fields
    if (!amount || !orderId || !tier || !duration) {
      console.log('Validation failed - missing fields:', { amount, orderId, tier, duration });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order record in database first
    console.log('Creating order record in database');
    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: user.id,
        amount: amount,
        status: 'pending',
        paymentMethod: 'alipay',
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

    // Create Alipay order using SDK
    console.log('Creating Alipay order with params:', {
      outTradeNo: orderId,
      totalAmount: amount.toFixed(2), // Ensure 2 decimal places
      subject: 'Subscription Payment',
    });

    const result = await createAlipayOrder({
      outTradeNo: orderId,
      totalAmount: amount,
      subject: 'Subscription Payment',
    });

    console.log('Alipay order creation result:', result);

    return NextResponse.json({
      orderId,
      amount,
      paymentUrl: result,
      status: 'success',
    });
  } catch (error) {
    console.error('=== Create Alipay Order Error ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 