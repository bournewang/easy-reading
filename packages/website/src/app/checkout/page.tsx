'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { type PricingTier, type DurationOption, formatPrice } from '@easy-reading/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlipayPayment } from '@/components/payment/AlipayPayment';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { fetchPricingCatalog, fetchPricingQuote, type PricingQuote } from '@/lib/api/pricing';

// Client component that uses useSearchParams
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierId = searchParams.get('tier');
  const durationMonths = searchParams.get('duration');
  const initialPromoCode = searchParams.get('ref') || '';
  const cancelled = searchParams.get('status') === 'cancelled' || searchParams.get('cancelled') === '1';
  const { user } = useAuth();
  const { t } = useLocaleContext();
  const checkout = useCallback((key: string) => t(`website.checkoutPage.${key}`), [t]);
  const pricing = useCallback((key: string) => t(`website.pricingPage.${key}`), [t]);

  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const selectedTierName = selectedTier?.id === 'pro' ? pricing('proName') : pricing('freeName');

  useEffect(() => {
    let mounted = true;

    const loadCheckoutSelection = async () => {
      setLoading(true);
      try {
        const nextTierId = searchParams.get('tier');
        const nextDurationMonths = searchParams.get('duration');
        const userId = user?.id;

        if (!nextTierId || !nextDurationMonths || !userId) {
          if (mounted) {
            setError(checkout('missingParams'));
          }
          return;
        }

        const tiers = await fetchPricingCatalog();
        if (!mounted) return;

        const tier = tiers.find((item) => item.id === nextTierId) ?? null;
        const duration = tier?.durationOptions?.find((item) => item.months === parseInt(nextDurationMonths, 10)) ?? null;

        setSelectedTier(tier);
        setSelectedDuration(duration);

        if (!tier || !duration) {
          setError(checkout('missingParams'));
        } else if (cancelled) {
          setError(checkout('paymentCancelled'));
        } else {
          setError(null);
        }
      } catch (error) {
        console.error('Failed to load pricing catalog:', error);
        if (mounted) {
          setError(checkout('missingParams'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCheckoutSelection();

    return () => {
      mounted = false;
    };
  }, [searchParams, user?.id, cancelled, checkout]);

  useEffect(() => {
    let mounted = true;

    const loadQuote = async () => {
      if (!selectedTier || !selectedDuration || !user?.id) {
        return;
      }
      try {
        const nextQuote = await fetchPricingQuote({
          tier: selectedTier.id,
          duration: selectedDuration.months,
          promoCode: promoCode || undefined,
        });
        if (!mounted) return;
        setQuote(nextQuote);
        setError(cancelled ? checkout('paymentCancelled') : null);
      } catch (quoteError: any) {
        if (!mounted) return;
        setQuote(null);
        setError(quoteError?.response?.data?.detail || quoteError?.message || checkout('missingParams'));
      }
    };

    loadQuote();

    return () => {
      mounted = false;
    };
  }, [selectedTier, selectedDuration, user?.id, promoCode, cancelled, checkout]);

  const handlePaymentError = (error: Error) => {
    setError(error.message);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!selectedTier || !selectedDuration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{checkout('invalidTitle')}</h1>
          <p className="mt-4 text-gray-600">
            {checkout('invalidBody')}
          </p>
          <button
            onClick={() => router.push('/pricing')}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600"
          >
            {checkout('goPricing')}
          </button>
        </div>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const returnUrl = `${origin}/subscription/success`;
  const cancelUrl = `${origin}/checkout?tier=${selectedTier.id}&duration=${selectedDuration.months}&cancelled=1`;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">{checkout('title')}</h1>

          {/* Order Summary */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{checkout('orderSummary')}</h2>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">{pricing('planLabel')}</span>
              <span className="font-medium">{selectedTierName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">{pricing('durationLabel')}</span>
              <span className="font-medium">{selectedDuration.months} {pricing('months')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{pricing('total')}</span>
              <span className="text-xl font-bold text-blue-600">
                {formatPrice(quote?.finalAmount ?? selectedDuration.salePrice)}
              </span>
            </div>
            {quote && quote.originalAmount > quote.finalAmount && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">{pricing('originalPriceLabel')}</span>
                <span className="font-medium text-gray-400 line-through">{formatPrice(quote.originalAmount)}</span>
              </div>
            )}
            {quote && quote.discountAmount > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">{pricing('discountLabel')}</span>
                <span className="font-medium text-green-600">-{formatPrice(quote.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{pricing('userLabel')}</span>
              <span className="font-medium">
                {user?.username} {user?.fullName}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">{pricing('paymentPlanHint')}</p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">{pricing('promoLabel')}</span>
              <input
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value.trim().toUpperCase())}
                placeholder={pricing('promoPlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{checkout('paymentMethod')}</h2>
            <div className="rounded-lg border border-blue-500 bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-center">
                <Image
                  src="/images/alipay.png"
                  alt="Alipay"
                  width={120}
                  height={40}
                  className="mx-auto"
                />
              </div>
              <p className="mt-3 text-center text-sm text-gray-600">{checkout('alipayOnly')}</p>
            </div>
          </div>

          <AlipayPayment
            tier={selectedTier.id}
            duration={selectedDuration.months}
            returnUrl={returnUrl}
            cancelUrl={cancelUrl}
            promoCode={quote?.promoCode ?? (promoCode || undefined)}
            onError={handlePaymentError}
          />

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
} 
