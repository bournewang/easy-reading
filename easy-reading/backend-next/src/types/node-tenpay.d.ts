declare module 'node-tenpay' {
  interface TenPayConfig {
    appid: string;
    mchid: string;
    partnerKey: string;
    notify_url: string;
    spbill_create_ip: string;
    trade_type: string;
    sign_type: string;
  }

  interface OrderParams {
    out_trade_no: string;
    body: string;
    total_fee: number;
    notify_url: string;
  }

  interface QueryParams {
    out_trade_no: string;
  }

  interface PayResult {
    code_url: string;
    [key: string]: any;
  }

  interface QueryResult {
    trade_state: string;
    [key: string]: any;
  }

  class TenPay {
    constructor(config: TenPayConfig);
    getPayParams(params: OrderParams): Promise<PayResult>;
    orderQuery(params: QueryParams): Promise<QueryResult>;
    verifyNotify(data: any): Promise<boolean>;
  }

  export default TenPay;
} 