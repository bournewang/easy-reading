import { NextResponse } from 'next/server';
import { OrderStatus, PaymentError } from '../types';

// Configuration from environment variables
const WECHAT_PAY_CONFIG = {
  appid: process.env.WECHAT_PAY_APPID || '',
  mchid: process.env.WECHAT_PAY_MCHID || '',
  apiKey: process.env.WECHAT_PAY_API_KEY || '',
  // Test mode (for development)
  testMode: process.env.NODE_ENV !== 'production',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', message: 'Missing orderId' },
        { status: 400 }
      );
    }

    let orderStatus: OrderStatus;

    if (WECHAT_PAY_CONFIG.testMode) {
      // In test mode, randomly determine order status for testing
      const statuses: OrderStatus['status'][] = ['pending', 'success', 'failed', 'expired'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // For some mock consistency, use the same status for the same order ID
      // If orderId contains a specific test code, return a fixed status
      let status = randomStatus;
      if (orderId.includes('_success_')) {
        status = 'success';
      } else if (orderId.includes('_failed_')) {
        status = 'failed';
      } else if (orderId.includes('_expired_')) {
        status = 'expired';
      }
      
      console.log(`Test mode: Using ${status} status for order ID ${orderId}`);
      
      orderStatus = {
        status,
        orderId,
        amount: 100, // Mock amount
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updatedAt: new Date().toISOString(),
      };
    } else {
      // TODO: Call WeChat Pay API to query order status
      // const wxResponse = await queryWeChatPayOrder(orderId);
      // orderStatus = mapWeChatResponseToOrderStatus(wxResponse);
      
      // Placeholder for production code
      throw new Error('Production mode not implemented yet');
    }

    return NextResponse.json(orderStatus);
  } catch (error) {
    console.error('Query order error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to query order' },
      { status: 500 }
    );
  }
} 