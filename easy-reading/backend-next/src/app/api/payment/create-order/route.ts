import { NextResponse } from 'next/server';
import { PRICING_TIERS } from '@/pricing';
import { CreateOrderRequest, WeChatPayOrder, PaymentResponse } from '../types';

// Configuration from environment variables
const WECHAT_PAY_CONFIG = {
  appid: process.env.WECHAT_PAY_APPID || '',
  mchid: process.env.WECHAT_PAY_MCHID || '',
  apiKey: process.env.WECHAT_PAY_API_KEY || '',
  notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || '',
  // Test mode (for development)
  testMode: process.env.NODE_ENV !== 'production',
  testUserOpenid: process.env.TEST_USER_OPENID || '',
};

export async function POST(request: Request) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { tier, duration, userId } = body;

    // Validate request
    if (!tier || !duration || !userId) {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find selected tier and duration
    const selectedTier = PRICING_TIERS.find((t: any) => t.id === tier);
    if (!selectedTier) {
      return NextResponse.json(
        { code: 'INVALID_TIER', message: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const selectedDuration = selectedTier.durationOptions?.find(
      (d: any) => d.months === duration
    );
    if (!selectedDuration) {
      return NextResponse.json(
        { code: 'INVALID_DURATION', message: 'Invalid subscription duration' },
        { status: 400 }
      );
    }

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get client IP (in production, you'd extract this from the request)
    const clientIp = WECHAT_PAY_CONFIG.testMode ? '127.0.0.1' : '';

    // Create WeChat Pay order
    const wechatOrder: WeChatPayOrder = {
      appid: WECHAT_PAY_CONFIG.appid,
      mchid: WECHAT_PAY_CONFIG.mchid,
      description: `${selectedTier.name} - ${duration} months subscription`,
      out_trade_no: orderId,
      notify_url: WECHAT_PAY_CONFIG.notifyUrl,
      amount: {
        total: selectedDuration.price,
        currency: 'CNY',
      },
      payer: {
        // Use test OpenID in test mode, otherwise use the provided userId
        openid: WECHAT_PAY_CONFIG.testMode ? WECHAT_PAY_CONFIG.testUserOpenid : userId,
      },
      scene_info: {
        payer_client_ip: clientIp,
        h5_info: {
          type: 'Wap',
          wap_url: 'https://easy-reading.com',
          wap_name: 'Easy Reading Subscription',
        },
      },
    };

    let response: PaymentResponse;

    if (WECHAT_PAY_CONFIG.testMode) {
      // For testing, return mock data
      console.log('Using test mode, returning mock data');
      console.log('Order details:', JSON.stringify(wechatOrder, null, 2));
      
      response = {
        orderId,
        prepayId: `wx${Date.now()}`,
        amount: selectedDuration.price,
        status: 'pending',
      };
    } else {
      // TODO: Call WeChat Pay API to create order
      // const wxResponse = await createWeChatPayOrder(wechatOrder);
      // response = {
      //   orderId,
      //   prepayId: wxResponse.prepay_id,
      //   amount: selectedDuration.price,
      //   status: 'pending',
      // };
      
      // Placeholder for production code
      throw new Error('Production mode not implemented yet');
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create order' },
      { status: 500 }
    );
  }
} 