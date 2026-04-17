'use client';

import { useState } from 'react';
import { createAlipayOrder } from '@/lib/api/payment';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

interface AlipayPaymentProps {
  tier: string;
  duration: number;
  returnUrl: string;
  cancelUrl: string;
  promoCode?: string;
  onError: (error: Error) => void;
}

export function AlipayPayment({
  tier,
  duration,
  returnUrl,
  cancelUrl,
  promoCode,
  onError,
}: AlipayPaymentProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useLocaleContext();
  const checkout = (key: string) => t(`website.checkoutPage.${key}`);

  const handlePayment = async () => {
    const paymentTab = typeof window !== 'undefined' ? window.open('', '_blank', 'noopener,noreferrer') : null;
    try {
      setLoading(true);
      const response = await createAlipayOrder({
        tier,
        duration,
        billingMode: 'prepaid',
        returnUrl,
        cancelUrl,
        promoCode,
      });

      if (response.paymentUrl) {
        if (paymentTab) {
          paymentTab.location.href = response.paymentUrl;
        } else {
          window.location.assign(response.paymentUrl);
        }
        return;
      }

      throw new Error('No Alipay payment URL returned.');
    } catch (error) {
      if (paymentTab && !paymentTab.closed) {
        paymentTab.close();
      }
      console.error('Payment error:', error);
      onError(error instanceof Error ? error : new Error('Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? checkout('redirectingToAlipay') : checkout('proceedPayment')}
    </button>
  );
} 
