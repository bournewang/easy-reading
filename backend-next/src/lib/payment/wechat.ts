import WXPay from 'weixin-pay';
import fs from 'fs';
import path from 'path';

// Configuration from environment variables
const WECHAT_PAY_CONFIG = {
  appid: process.env.WECHAT_PAY_APPID!,
  mch_id: process.env.WECHAT_PAY_MCHID!,
  partner_key: process.env.WECHAT_PAY_API_KEY!,
  pfx: fs.readFileSync(path.join(process.cwd(), 'cert/apiclient_cert.p12')),
  notify_url: process.env.WECHAT_PAY_NOTIFY_URL!
};

// Initialize WeChat Pay SDK
const wxpay = WXPay(WECHAT_PAY_CONFIG);

export interface WeChatPayOrder {
  out_trade_no: string;
  total_fee: number;
  body: string;
  spbill_create_ip: string;
  trade_type: 'NATIVE';
  notify_url: string;
}

export interface WeChatPayResponse {
  codeUrl: string;
  orderId: string;
}

// Create WeChat Pay order
export async function createWeChatOrder(params: {
  outTradeNo: string;
  totalAmount: number;
  description: string;
  userId: string;
}): Promise<WeChatPayResponse> {
  return new Promise((resolve, reject) => {
    const orderParams: WeChatPayOrder = {
      out_trade_no: params.outTradeNo,
      total_fee: params.totalAmount,
      body: params.description,
      spbill_create_ip: '127.0.0.1', // In production, get from request
      trade_type: 'NATIVE',
      notify_url: WECHAT_PAY_CONFIG.notify_url
    };

    wxpay.createUnifiedOrder(orderParams, (err, result) => {
      if (err) {
        console.error('WeChat Pay order creation error:', err);
        reject(err);
        return;
      }

      if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
        console.error('WeChat Pay order creation failed:', result);
        reject(new Error(result.err_code_des || 'Order creation failed'));
        return;
      }

      resolve({
        codeUrl: result.code_url!,
        orderId: params.outTradeNo
      });
    });
  });
}

// Query order status
export async function queryWeChatOrder(orderId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    wxpay.queryOrder({ out_trade_no: orderId }, (err, result) => {
      if (err) {
        console.error('WeChat Pay order query error:', err);
        reject(err);
        return;
      }

      if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
        console.error('WeChat Pay order query failed:', result);
        reject(new Error(result.err_code_des || 'Order query failed'));
        return;
      }

      resolve(result.trade_state === 'SUCCESS');
    });
  });
}

// Verify WeChat Pay notification
export function verifyWeChatNotification(callback: (msg: any) => void) {
  return wxpay.useWXCallback((msg, req, res, next) => {
    callback(msg);
    res.send('<xml><return_code>SUCCESS</return_code></xml>');
  });
} 