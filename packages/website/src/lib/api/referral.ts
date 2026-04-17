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

export async function getReferralSummary(): Promise<ReferralSummary> {
  const response = await api.get('/referral/summary');

  if (response.status !== 200) {
    throw new Error('Failed to load referral summary');
  }

  return response.data;
}
