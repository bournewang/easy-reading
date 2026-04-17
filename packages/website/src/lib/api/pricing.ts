import { api } from '../../utils/api';
import type { PricingTier } from '@easy-reading/shared';

export async function fetchPricingCatalog(): Promise<PricingTier[]> {
  const response = await api.get('/pricing');

  if (response.status !== 200) {
    throw new Error('Failed to load pricing catalog');
  }

  return response.data;
}

export interface PricingQuote {
  tier: string;
  duration: number;
  originalAmount: number;
  saleAmount: number;
  discountAmount: number;
  finalAmount: number;
  promoCode?: string | null;
  couponDiscountAmount: number;
  referralCode?: string | null;
  referralDiscountAmount: number;
  commissionAmount: number;
  commissionRate: number;
  paymentMode: 'prepaid';
}

export async function fetchPricingQuote(params: {
  tier: string;
  duration: number;
  promoCode?: string;
}): Promise<PricingQuote> {
  const response = await api.post('/pricing/quote', params);

  if (response.status !== 200) {
    throw new Error(response.data?.detail || 'Failed to load pricing quote');
  }

  return response.data;
}
