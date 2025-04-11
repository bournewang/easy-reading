/**
 * API service for payment handling
 */

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
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/payment/wechat/create`;
  console.log('=== Creating WeChat Pay Order ===');
  console.log('API URL:', url);
  console.log('Request params:', params);
  console.log('Environment:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(params),
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const error = await response.json();
    console.error('Error response:', error);
    throw new Error(error.error || 'Failed to create order');
  }

  const data = await response.json();
  console.log('Success response:', data);
  return data;
}

// Create an order with Alipay
export async function createAlipayOrder(params: CreateOrderParams): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/alipay/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        amount: params.amount,
        orderId: params.orderId,
        tier: params.tier,
        duration: params.duration,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create Alipay order');
    }

    const data = await response.json();
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