declare module 'weixin-pay' {
  interface WXPayConfig {
    appid: string;
    mch_id: string;
    partner_key: string;
    pfx: Buffer;
  }

  interface UnifiedOrderParams {
    body: string;
    out_trade_no: string;
    total_fee: number;
    spbill_create_ip: string;
    notify_url: string;
    trade_type: 'NATIVE' | 'JSAPI' | 'APP' | 'MWEB';
    product_id?: string;
  }

  interface OrderQueryParams {
    transaction_id?: string;
    out_trade_no?: string;
  }

  interface WXPayResponse {
    return_code: string;
    return_msg: string;
    result_code: string;
    err_code?: string;
    err_code_des?: string;
    code_url?: string;
    [key: string]: any;
  }

  interface WXPayInstance {
    createUnifiedOrder(params: UnifiedOrderParams, callback: (err: Error | null, result: WXPayResponse) => void): void;
    queryOrder(params: OrderQueryParams, callback: (err: Error | null, result: WXPayResponse) => void): void;
    useWXCallback(callback: (msg: any, req: any, res: any, next: any) => void): (req: any, res: any, next: any) => void;
  }

  function WXPay(config: WXPayConfig): WXPayInstance;
  export = WXPay;
} 