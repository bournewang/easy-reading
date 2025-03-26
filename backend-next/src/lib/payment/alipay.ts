import {AlipaySdk} from 'alipay-sdk';

// Debug SDK configuration
console.log('=== Alipay SDK Configuration ===');
console.log('App ID:', process.env.ALIPAY_APP_ID);
console.log('Gateway URL:', process.env.ALIPAY_GATEWAY_URL);
console.log('API Base URL:', process.env.API_BASE_URL);
console.log('Frontend URL:', process.env.FRONTEND_URL);
console.log('Private Key Length:', process.env.ALIPAY_PRIVATE_KEY?.length);
console.log('Public Key Length:', process.env.ALIPAY_PUBLIC_KEY?.length);

// Initialize Alipay SDK
const alipaySDK = new (AlipaySdk as any)({
  appId: process.env.ALIPAY_APP_ID!,
  privateKey: process.env.ALIPAY_PRIVATE_KEY!,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
  gateway: process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipay.com/gateway.do',
  charset: 'utf-8',
  version: '1.0',
  signType: 'RSA2',
});

export interface CreateOrderParams {
  outTradeNo: string;
  totalAmount: number;
  subject: string;
}

export async function createAlipayOrder(params: CreateOrderParams) {
  try {
    console.log('=== Creating Alipay Order ===');
    console.log('Order params:', params);

    const requestParams = {
      notify_url: process.env.ALIPAY_NOTIFY_URL,
      return_url: process.env.ALIPAY_RETURN_URL,
      bizContent: {
        out_trade_no: params.outTradeNo,
        total_amount: params.totalAmount.toFixed(2),
        subject: params.subject,
        product_code: 'FAST_INSTANT_TRADE_PAY',
      },
    };

    console.log('Request params:', JSON.stringify(requestParams, null, 2));

    const result = await alipaySDK.pageExec('alipay.trade.page.pay', requestParams);
    console.log('Alipay SDK response:', result);

    return result;
  } catch (error) {
    console.error('=== Alipay Order Creation Error ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export async function verifyAlipayCallback(params: Record<string, string>) {
  try {
    console.log('=== Verifying Alipay Callback ===');
    console.log('Callback params:', params);
    
    // Accept test notifications in development mode
    if (process.env.NODE_ENV === 'development' && params.sign === 'test_sign') {
      console.log('Accepting test notification in development mode');
      return true;
    }
    
    const result = await alipaySDK.checkNotifySign(params);
    console.log('Verification result:', result);
    
    return result;
  } catch (error) {
    console.error('=== Alipay Callback Verification Error ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
} 