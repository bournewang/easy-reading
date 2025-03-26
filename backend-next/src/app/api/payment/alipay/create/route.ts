import { NextRequest, NextResponse } from 'next/server';
import { createAlipayOrder } from '@/lib/payment/alipay';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Create Alipay Order Request ===');
    const body = await request.json();
    console.log('Request body:', body);

    const { amount, orderId } = body;
    console.log('Extracted parameters:', { amount, orderId });

    // Validate required fields
    if (!amount || !orderId) {
      console.log('Validation failed - missing fields:', { amount, orderId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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