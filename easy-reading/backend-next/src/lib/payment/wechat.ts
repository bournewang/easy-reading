import TenPay from 'node-tenpay';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Check if we're in test mode (not production)
const isTestMode = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_API_URL?.includes('preview');

export interface WeChatPayResponse {
  codeUrl: string;
  orderId: string;
}

// Initialize WeChat Pay SDK
function initializeWxPay() {
  if (isTestMode) {
    return null;
  }

  try {
    const config = {
      appid: process.env.WECHAT_PAY_APPID!,
      mchid: process.env.WECHAT_PAY_MCHID!,
      partnerKey: process.env.WECHAT_PAY_API_KEY!,
      notify_url: process.env.WECHAT_PAY_NOTIFY_URL!,
      spbill_create_ip: '127.0.0.1',
      trade_type: 'NATIVE',
      sign_type: 'MD5'
    };
    return new TenPay(config);
  } catch (error) {
    console.error('Error initializing WeChat Pay SDK:', error);
    return null;
  }
}

// Create WeChat Pay order
export async function createWeChatOrder(params: {
  outTradeNo: string;
  totalAmount: number;
  description: string;
  userId: string;
}): Promise<WeChatPayResponse> {
  // In test mode, return a mock response
  if (isTestMode) {
    console.log('Test mode: Returning mock WeChat Pay response');
    // In test mode, we'll simulate a successful payment after 5 seconds
    setTimeout(async () => {
      try {
        // Update order status in database
        await prisma.order.update({
          where: { id: params.outTradeNo },
          data: { 
            status: 'success',
            paymentDetails: {
              test: true,
              updatedAt: new Date().toISOString()
            }
          }
        });
      } catch (error) {
        console.error('Error updating test order status:', error);
      }
    }, 5000);

    return {
      codeUrl: `weixin://wxpay/bizpayurl?pr=${params.outTradeNo}`,
      orderId: params.outTradeNo
    };
  }

  const wxpay = initializeWxPay();
  if (!wxpay) {
    throw new Error('WeChat Pay SDK not initialized');
  }

  try {
    const orderParams = {
      out_trade_no: params.outTradeNo,
      body: params.description,
      total_fee: params.totalAmount,
      notify_url: process.env.WECHAT_PAY_NOTIFY_URL!
    };

    console.log('Creating WeChat Pay order with params:', orderParams);

    const result = await wxpay.getPayParams(orderParams);
    console.log('WeChat Pay API response:', result);

    if (!result.code_url) {
      console.error('WeChat Pay order creation failed: No code_url received');
      // Update order status to failed
      await prisma.order.update({
        where: { id: params.outTradeNo },
        data: { 
          status: 'failed',
          paymentDetails: {
            error: 'No code_url received from WeChat Pay',
            updatedAt: new Date().toISOString()
          }
        }
      });
      throw new Error('No code_url received from WeChat Pay');
    }

    // Update order with WeChat Pay details
    await prisma.order.update({
      where: { id: params.outTradeNo },
      data: { 
        paymentDetails: {
          ...result,
          updatedAt: new Date().toISOString()
        }
      }
    });

    return {
      codeUrl: result.code_url,
      orderId: params.outTradeNo
    };
  } catch (error) {
    console.error('WeChat Pay order creation error:', error);
    // Update order status to failed
    try {
      await prisma.order.update({
        where: { id: params.outTradeNo },
        data: { 
          status: 'failed',
          paymentDetails: {
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date().toISOString()
          }
        }
      });
    } catch (updateError) {
      console.error('Error updating order status to failed:', updateError);
    }
    throw error;
  }
}

// Query order status
export async function queryWeChatOrder(orderId: string): Promise<boolean> {
  // In test mode, check the order status in database
  if (isTestMode) {
    console.log('Test mode: Checking order status in database');
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });
      return order?.status === 'success';
    } catch (error) {
      console.error('Error checking test order status:', error);
      return false;
    }
  }

  const wxpay = initializeWxPay();
  if (!wxpay) {
    throw new Error('WeChat Pay SDK not initialized');
  }

  try {
    const result = await wxpay.orderQuery({ out_trade_no: orderId });
    console.log('WeChat Pay query response:', result);

    // Update order status in database based on WeChat Pay response
    try {
      const status = result.trade_state === 'SUCCESS' ? 'success' : 'pending';
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status,
          paymentDetails: {
            ...result,
            updatedAt: new Date().toISOString()
          }
        }
      });
    } catch (updateError) {
      console.error('Error updating order status:', updateError);
    }

    return result.trade_state === 'SUCCESS';
  } catch (error) {
    console.error('WeChat Pay order query error:', error);
    throw error;
  }
}

// Verify WeChat Pay notification
export async function verifyWeChatNotification(data: any): Promise<boolean> {
  // In test mode, always return true
  if (isTestMode) {
    console.log('Test mode: Accepting all notifications');
    return true;
  }

  const wxpay = initializeWxPay();
  if (!wxpay) {
    throw new Error('WeChat Pay SDK not initialized');
  }

  try {
    const isValid = await wxpay.verifyNotify(data);
    console.log('WeChat Pay notification verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error verifying WeChat Pay notification:', error);
    return false;
  }
} 