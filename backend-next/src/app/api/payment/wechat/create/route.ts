import { NextRequest, NextResponse } from 'next/server';
import { createWeChatOrder, queryWeChatOrder } from '@/lib/payment/wechat';
import { generateOrderId } from '@/lib/utils/order';
import { getPriceForTier } from '@/lib/utils/pricing';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  console.log('=== WeChat Pay Order Creation Request ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));

  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session?.user?.id) {
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

    // Generate order ID
    const orderId = `WX${Date.now()}`;
    console.log('Generated order ID:', orderId);

    // Calculate amount (in cents)
    const amount = tier === 'pro' ? 10500 : 9900;
    console.log('Calculated amount:', amount);

    // Create WeChat order
    console.log('Creating WeChat order with params:', {
      outTradeNo: orderId,
      totalAmount: amount,
      description: `Easy Reading ${tier} Plan - ${duration} Months`,
      userId: session.user.id
    });

    const wechatOrder = await createWeChatOrder({
      outTradeNo: orderId,
      totalAmount: amount,
      description: `Easy Reading ${tier} Plan - ${duration} Months`,
      userId: session.user.id
    });

    console.log('WeChat order created:', wechatOrder);

    // Create order record in database
    console.log('Creating order record in database');
    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: session.user.id,
        amount: amount / 100, // Convert cents to dollars
        status: 'pending',
        paymentMethod: 'wechat',
        tier,
        duration: parseInt(duration),
        paymentDetails: {
          codeUrl: wechatOrder.codeUrl,
          orderId: wechatOrder.orderId
        }
      }
    });

    console.log('Order created in database:', order);

    return NextResponse.json({
      orderId: order.id,
      codeUrl: wechatOrder.codeUrl,
      amount: order.amount,
      status: order.status
    });
  } catch (error) {
    console.error('Error creating WeChat Pay order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
} 