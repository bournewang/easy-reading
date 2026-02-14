import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
      // In production mode, query the database
      console.log(`Production mode: Querying order status for order ID ${orderId}`);
      
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!order) {
        console.log(`Order not found: ${orderId}`);
        return NextResponse.json(
          { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
          { status: 404 }
        );
      }

      orderStatus = {
        status: order.status as OrderStatus['status'],
        orderId: order.id,
        amount: order.amount,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };

      console.log(`Order status retrieved: ${orderStatus.status}`);
    }

    return NextResponse.json(orderStatus);
  } catch (error) {
    console.error('Query order error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to query order status' },
      { status: 500 }
    );
  }
} 