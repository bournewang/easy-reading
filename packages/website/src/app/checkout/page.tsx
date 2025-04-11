'use client';

import { useState, useEffect, Suspense } from 'react';
import { PRICING_TIERS, formatPrice } from '@easy-reading/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import WeChatPayQR from '@/components/payment/WeChatPayQR';
import { AlipayPayment } from '@/components/payment/AlipayPayment';
import Image from 'next/image';

// Client component that uses useSearchParams
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierId = searchParams.get('tier');
  const durationMonths = searchParams.get('duration');
  const userId = searchParams.get('userId');

  // Initialize tier and duration from URL parameters
  const initialTier = tierId ? PRICING_TIERS.find((t) => t.id === tierId) : null;
  const initialDuration = initialTier?.durationOptions?.find(
    (d) => d.months === parseInt(durationMonths || '0')
  ) || null;

  const [selectedTier, setSelectedTier] = useState(initialTier);
  const [selectedDuration, setSelectedDuration] = useState(initialDuration);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tierId = searchParams.get('tier');
    const durationMonths = searchParams.get('duration');
    const userId = searchParams.get('userId');

    if (tierId && durationMonths && userId) {
      const tier = PRICING_TIERS.find((t) => t.id === tierId);
      if (tier) {
        setSelectedTier(tier);
        const duration = tier.durationOptions?.find(
          (d) => d.months === parseInt(durationMonths)
        );
        if (duration) {
          setSelectedDuration(duration);
        }
      }
    } else {
      setError('Missing required parameters. Please select a plan from the pricing page.');
    }
    setLoading(false);
  }, [searchParams]);

  const handlePayment = () => {
    if (!selectedTier || !selectedDuration || !paymentMethod) return;
    setPaymentStarted(true);
  };

  const handlePaymentSuccess = () => {
    router.push('/subscription/success');
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Invalid Subscription Plan</h1>
          <p className="mt-4 text-gray-600">
            Please select a valid subscription plan from the pricing page.
          </p>
          <button
            onClick={() => router.push('/pricing')}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600"
          >
            Go to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

          {/* Order Summary */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium">{selectedTier.name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Duration</span>
              <span className="font-medium">{selectedDuration.months} months</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total</span>
              <span className="text-xl font-bold text-blue-600">
                {formatPrice(selectedDuration.price)}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => setPaymentMethod('alipay')}
                className={`flex-1 py-3 px-4 rounded-lg border ${
                  paymentMethod === 'alipay'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <Image
                  src="/images/alipay.png"
                  alt="Alipay"
                  width={120}
                  height={40}
                  className="mx-auto"
                />
              </button>
              {/* <button
                onClick={() => setPaymentMethod('wechat')}
                className={`flex-1 py-3 px-4 rounded-lg border ${
                  paymentMethod === 'wechat'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <Image
                  src="/images/wechatpay.png"
                  alt="WeChat Pay"
                  width={120}
                  height={40}
                  className="mx-auto"
                />
              </button> */}
            </div>
          </div>

          {/* Payment Button */}
          {!paymentStarted ? (
            <button
              onClick={handlePayment}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700"
            >
              Proceed to Payment
            </button>
          ) : (
            <div className="space-y-4">
              {paymentMethod === 'wechat' && (
                <WeChatPayQR
                  tier={selectedTier.id}
                  duration={selectedDuration.months}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentFailure={handlePaymentError}
                />
              )}
              {paymentMethod === 'alipay' && (
                <AlipayPayment
                  amount={selectedDuration.price}
                  orderId={`ORDER_${Date.now()}`}
                  tier={selectedTier.id}
                  duration={selectedDuration.months}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
            </div>
          )}

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