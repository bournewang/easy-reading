import { api } from '../../utils/api';

export interface ReferralSummary {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingCommission: number;
  paidCommission: number;
  totalCommission: number;
}

export interface ReferralCommissionItem {
  id: number;
  orderId: number;
  referredUserId: number;
  referredUsername: string;
  referralCode: string;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  orderTier: string | null;
  orderDuration: number | null;
  orderAmount: number;
  createdAt: string | null;
}

export interface ReferralCommissionsResponse {
  items: ReferralCommissionItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function getReferralSummary(): Promise<ReferralSummary> {
  const response = await api.get('/referral/summary');

  if (response.status !== 200) {
    throw new Error('Failed to load referral summary');
  }

  return response.data;
}

export async function getReferralCommissions(
  page: number = 1,
  pageSize: number = 20,
): Promise<ReferralCommissionsResponse> {
  const response = await api.get('/referral/commissions', { params: { page, pageSize } });

  if (response.status !== 200) {
    throw new Error('Failed to load referral commissions');
  }

  return response.data;
}
