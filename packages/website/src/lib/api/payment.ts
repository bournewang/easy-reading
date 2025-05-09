/**
 * API service for payment handling
 */
import { api } from '../../utils/api';

// Types
export interface CreateOrderParams {
  tier?: string;
  duration?: number;
  amount?: number;
  orderId?: string;
}

export interface PaymentResponse {
  orderId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'expired';
  codeUrl?: string;  // For WeChat Pay Native Payment
  paymentUrl?: string;  // For Alipay
}

interface OrderStatus {
  status: 'pending' | 'success' | 'failed' | 'expired';
  orderId: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

// Create an order with WeChat Pay
export async function createOrder(params: CreateOrderParams): Promise<PaymentResponse> {
  const response = await api.post('/payment/wechat/create', params);

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  if (response.status !== 200) {
    const error = response.data;
    console.error('Error response:', error);
    throw new Error(error.message || 'Failed to create order');
  }

  const data = response.data;
  console.log('Success response:', data);
  return data;
}

// Create an order with Alipay
export async function createAlipayOrder(params: CreateOrderParams): Promise<PaymentResponse> {
  try {
    const response = await api.post(`/payment/alipay/create`, {
      amount: params.amount,
      orderId: params.orderId,
      tier: params.tier,
      duration: params.duration,
    });

    if (response.status !== 200) {
      const error = response.data;
      throw new Error(error.message || 'Failed to create Alipay order');
    }

    const data = response.data;
    return data;
  } catch (error) {
    console.error('Error creating Alipay order:', error);
    throw error;
  }
}

// Query order status
export async function queryOrderStatus(orderId: string): Promise<PaymentResponse> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/query-order?orderId=${orderId}`);
  
  if (!response.ok) {
    throw new Error('Failed to query order status');
  }
  
  return response.json();
}

// Generate WeChat Pay parameters for JSAPI
export function generateWxPayParameters(prepayId: string, appId: string): Record<string, string> {
  // In a real implementation, you would generate a signature here
  // For now, we'll just return mock data for testing
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = Math.random().toString(36).substr(2, 15);
  
  return {
    appId,
    timeStamp: timestamp,
    nonceStr,
    package: `prepay_id=${prepayId}`,
    signType: 'RSA',
    paySign: 'mock_signature', // This would be a real signature in production
  };
} 