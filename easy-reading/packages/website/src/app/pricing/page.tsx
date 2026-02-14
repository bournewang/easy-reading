'use client';

import { useState, useEffect } from 'react';
import { PRICING_TIERS, type PricingTier, type DurationOption, formatPrice, getSavingsText, getDefaultDurationOption, getPopularTier } from '@easy-reading/shared';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const popularTier = getPopularTier();
  const defaultDuration = popularTier ? getDefaultDurationOption(popularTier) : null;
  
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(popularTier || null);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(defaultDuration || null);

  const handleSelectPlan = (tier: PricingTier, duration?: DurationOption) => {
    setSelectedTier(tier);
    if (duration) {
      setSelectedDuration(duration);
    } else if (tier.durationOptions) {
      // If no duration is specified, select the default duration option
      const defaultDuration = getDefaultDurationOption(tier);
      if (defaultDuration) {
        setSelectedDuration(defaultDuration);
      }
    }
  };

  const handleProceedToCheckout = () => {
    if (selectedTier && selectedDuration && user?.id) {
      router.push(`/checkout?tier=${selectedTier.id}&duration=${selectedDuration.months}&userId=${user.id}`);
    } else {
      // If no user ID, redirect to login
      router.push('/login');
    }
  };

  const showCheckoutBar = selectedTier && selectedDuration && selectedTier.id !== 'free';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Select the perfect plan for your English learning journey
          </p>
        </div>

        <div className="mt-12 mb-12 grid gap-8 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="relative rounded-2xl shadow-lg ring-1 ring-gray-200 bg-white p-8"
            >
              {tier.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
                <p className="mt-4 text-gray-600">{tier.description}</p>
                {tier.monthlyPrice && (
                  <p className="mt-6">
                    <span className="text-4xl font-bold text-gray-900">
                      ¥{tier.monthlyPrice}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </p>
                )}
              </div>

              {tier.durationOptions && (
                <div className="mt-8 space-y-4">
                  {tier.durationOptions.map((duration) => (
                    <button
                      key={duration.months}
                      onClick={() => handleSelectPlan(tier, duration)}
                      className={`w-full rounded-lg px-4 py-2 text-sm font-semibold ${
                        selectedTier?.id === tier.id &&
                        selectedDuration?.months === duration.months
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>
                          {duration.months} {duration.months === 1 ? 'Month' : 'Months'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{formatPrice(duration.price)}</span>
                          {duration.savings && (
                            <span className="text-green-600 text-xs">
                              {getSavingsText(duration.savings)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <ul className="mt-8 space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {showCheckoutBar && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Selected: {selectedTier.name} - {selectedDuration.months}{' '}
                  {selectedDuration.months === 1 ? 'Month' : 'Months'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  Total: {formatPrice(selectedDuration.price)}
                </p>
              </div>
              <button
                onClick={handleProceedToCheckout}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 