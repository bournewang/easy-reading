/**
 * API service for payment handling
 */
import { api } from '../../utils/api';

// Types
export interface CreateOrderParams {
  tier: string;
  duration: number;
  billingMode: 'prepaid' | 'recurring';
  returnUrl?: string;
  cancelUrl?: string;
  promoCode?: string;
}

export interface PaymentResponse {
  orderId: number;
  orderNo: string;
  amount: number;
  originalAmount?: number;
  saleAmount?: number;
  discountAmount?: number;
  status: 'pending' | 'success' | 'failed' | 'expired';
  tier?: string;
  duration?: number;
  billingMode?: 'prepaid' | 'recurring';
  promoCode?: string;
  codeUrl?: string;  // For WeChat Pay Native Payment
  paymentUrl?: string;  // For Alipay
  createdAt: string;
  updatedAt: string;
}

interface OrderStatus {
  status: 'pending' | 'success' | 'failed' | 'expired';
  orderId: number;
  orderNo: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

// Create an order with WeChat Pay
export async function createOrder(params: CreateOrderParams): Promise<PaymentResponse> {
  const response = await api.post('/payment/wechat/create', params);

  if (response.status !== 200) {
    const error = response.data;
    throw new Error(error.message || error.detail || 'Failed to create order');
  }

  return response.data;
}

// Create an order with Alipay
export async function createAlipayOrder(params: CreateOrderParams): Promise<PaymentResponse> {
  try {
    const response = await api.post('/payment/alipay/create', params);

    if (response.status !== 200) {
      const error = response.data;
      throw new Error(error.message || error.detail || 'Failed to create Alipay order');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating Alipay order:', error);
    throw error;
  }
}

// Query order status
export async function queryOrderStatus(orderNo: string): Promise<PaymentResponse> {
  const response = await api.get(`/payment/query-order?orderNo=${encodeURIComponent(orderNo)}`);

  if (response.status !== 200) {
    throw new Error('Failed to query order status');
  }

  return response.data;
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
