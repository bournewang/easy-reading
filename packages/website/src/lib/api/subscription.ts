import { api } from '@/utils/api';

export interface SubscriptionSummary {
  subscriptionId: string | null;
  tier: string;
  expiresAt: string | null;
  active: boolean;
  billingMode: 'prepaid' | 'recurring' | null;
  intervalMonths: number | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionEntitlements {
  tier: string;
  active: boolean;
  canUseWordBook: boolean;
  canTranslateSentences: boolean;
  canUseTextToSpeech: boolean;
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const response = await api.get('/subscription');
  return response.data;
}

export async function getSubscriptionEntitlements(): Promise<SubscriptionEntitlements> {
  const response = await api.get('/subscription/entitlements');
  return response.data;
}

export async function cancelSubscription(): Promise<SubscriptionSummary> {
  const response = await api.post('/subscription/cancel');
  return response.data;
}

export async function reactivateSubscription(): Promise<SubscriptionSummary> {
  const response = await api.post('/subscription/reactivate');
  return response.data;
}
