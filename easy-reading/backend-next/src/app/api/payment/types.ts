export interface CreateOrderRequest {
  tier: string;
  duration: number;
  userId: string;
}

export interface WeChatPayOrder {
  appid: string;
  mchid: string;
  description: string;
  out_trade_no: string;
  notify_url: string;
  amount: {
    total: number;
    currency: string;
  };
  payer: {
    openid: string;  // User's WeChat OpenID
  };
  // For JSAPI
  scene_info: {
    payer_client_ip: string;
    h5_info: {
      type: 'Wap';
      wap_url: string;
      wap_name: string;
    };
  };
}

export interface WeChatPayResponse {
  code: string;
  message: string;
  detail?: {
    field: string;
    value: string;
    issue: string;
    location: string;
  }[];
}

export interface OrderStatus {
  status: 'pending' | 'success' | 'failed' | 'expired';
  orderId: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentError {
  code: string;
  message: string;
}

export interface PaymentResponse {
  orderId: string;
  // For JSAPI
  prepayId: string;  // Required for JSAPI
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'expired';
} 