'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { calculateMonthlyPrice, type PricingTier, type DurationOption, formatPrice, getDefaultDurationOption, getPopularTier } from '@easy-reading/shared';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { fetchPricingCatalog, fetchPricingQuote, type PricingQuote } from '@/lib/api/pricing';
import { getActiveReferralCode } from '@/utils/referral';

function PricingPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocaleContext();
  const pricing = (key: string) => t(`website.pricingPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  const getTierContent = (tier: PricingTier) => {
    if (tier.id === 'free') {
      return {
        name: pricing('freeName'),
        description: pricing('freeDescription'),
        features: [
          pricing('freeFeatureBasicReading'),
          pricing('freeFeatureWordLookup'),
          pricing('freeFeatureWordBook'),
          pricing('freeFeatureTranslation'),
        ],
      };
    }

    return {
      name: pricing('proName'),
      description: pricing('proDescription'),
      features: [
        pricing('proFeatureUnlimitedReading'),
        pricing('proFeatureAdvancedLookup'),
        pricing('proFeatureExtendedWordBook'),
        pricing('proFeatureFullTranslation'),
        pricing('proFeatureOffline'),
        pricing('proFeatureAdFree'),
      ],
    };
  };
  
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(null);
  const [loading, setLoading] = useState(true);

  // hasReferral: server-side flag wins (user.hasReferrer); localStorage is fallback for
  // unauthenticated visitors who arrived via a referral link.
  const hasReferral = Boolean(user?.hasReferrer) || Boolean(getActiveReferralCode());

  // Pre-fill promo code with stored referral code (if any)
  const [promoCode, setPromoCode] = useState<string>(() => getActiveReferralCode());

  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectivePrice = (d: DurationOption) =>
    hasReferral && d.referralPrice != null ? d.referralPrice : d.salePrice;

  const showReferralPrice = (d: DurationOption) => hasReferral && d.referralPrice != null;
  const hasActiveReferral = hasReferral || Boolean(quote?.referralDiscountAmount);

  useEffect(() => {
    let mounted = true;

    const loadPricing = async () => {
      try {
        const tiers = await fetchPricingCatalog();
        if (!mounted) return;
        setPricingTiers(tiers);
        const popularTier = getPopularTier(tiers) ?? tiers.find((tier) => tier.id === 'pro') ?? tiers[0] ?? null;
        const defaultDuration = popularTier ? getDefaultDurationOption(popularTier) ?? null : null;
        setSelectedTier(popularTier);
        setSelectedDuration(defaultDuration);
      } catch (error) {
        console.error('Failed to load pricing catalog:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPricing();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectPlan = (tier: PricingTier, duration?: DurationOption) => {
    setSelectedTier(tier);
    if (duration) {
      setSelectedDuration(duration);
      console.log(duration)
    } else if (tier.durationOptions) {
      // If no duration is specified, select the default duration option
      const defaultDuration = getDefaultDurationOption(tier);
      if (defaultDuration) {
        setSelectedDuration(defaultDuration);
      }
    }
  };

  // Fetch a live quote whenever plan/duration/promo changes (debounced).
  useEffect(() => {
    if (!selectedTier || !selectedDuration || selectedTier.id === 'free') {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const q = await fetchPricingQuote({
          tier: selectedTier.id,
          duration: selectedDuration.months,
          promoCode: promoCode || undefined,
        });
        console.log("fetched quote: ")
        console.log(q)
        setQuote(q);
        if (q.promoCode && !promoCode) {
          setPromoCode(q.promoCode);
        }
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          || (e as Error).message || 'Invalid promo code';
        setQuoteError(msg);
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedTier, selectedDuration, promoCode]);

  const getDisplayedDuration = (tier: PricingTier) => {
    if (selectedTier?.id === tier.id && selectedDuration) {
      return selectedDuration;
    }
    return getDefaultDurationOption(tier) ?? tier.durationOptions?.[0] ?? null;
  };

  const handleProceedToCheckout = () => {
    if (selectedTier && selectedDuration && user?.id) {
      const nextParams = new URLSearchParams({
        tier: selectedTier.id,
        duration: String(selectedDuration.months),
        userId: String(user.id),
      });
      const refCode = promoCode || getActiveReferralCode();
      if (refCode) nextParams.set('ref', refCode);
      router.push(`/checkout?${nextParams.toString()}`);
    } else {
      router.push('/login');
    }
  };

  const showCheckoutBar = selectedTier && selectedDuration && selectedTier.id !== 'free';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            {pricing('title')}
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            {pricing('subtitle')}
          </p>
        </div>

        <div className="mt-12 mb-12 grid gap-8 md:grid-cols-2">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl shadow-lg ring-1 ring-gray-200 bg-white p-8 ${
                tier.isPopular ? 'md:-translate-y-2 md:shadow-2xl' : ''
              }`}
            >
              {(() => {
                const content = getTierContent(tier);
                return (
                  <>
              {tier.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {pricing('mostPopular')}
                  </span>
                </div>
              )}

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">{content.name}</h2>
                <p className="mt-4 text-gray-600">{content.description}</p>
                {(() => {
                  const displayedDuration = getDisplayedDuration(tier);
                  if (!displayedDuration) {
                    return null;
                  }

                  const originalMonthlyPrice = calculateMonthlyPrice(
                    displayedDuration.originalPrice,
                    displayedDuration.months,
                  );
                  const activePrice = effectivePrice(displayedDuration);
                  const activeMonthlyPrice = calculateMonthlyPrice(activePrice, displayedDuration.months);

                  return (
                    <>
                      {hasActiveReferral ? (
                        <p className="mt-4">
                          <span className="mr-2 text-lg text-gray-400">&nbsp;</span>
                          <span className="text-4xl font-bold text-gray-900">
                            ¥{originalMonthlyPrice.toFixed(2)}
                          </span>
                          <span className="text-gray-600">{pricing('perMonth')}</span>
                        </p>
                      ) : (
                        <p className="mt-4">
                          <span className="mr-2 text-lg text-gray-400 line-through">
                            ¥{originalMonthlyPrice.toFixed(2)}
                          </span>
                          <span className="text-4xl font-bold text-gray-900">
                            ¥{activeMonthlyPrice.toFixed(2)}
                          </span>
                          <span className="text-gray-600">{pricing('perMonth')}</span>
                        </p>
                      )}
                    </>
                  );
                })()}
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
                          {duration.months} {duration.months === 1 ? pricing('month') : pricing('months')}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-semibold">
                              {hasActiveReferral
                                ? formatPrice(duration.originalPrice)
                                : formatPrice(effectivePrice(duration))}
                            </div>
                            {/* {!showReferralPrice(duration) && ( */}
                              <div className="text-xs text-gray-400 line-through">
                                {hasActiveReferral ? "" : formatPrice(duration.originalPrice)}
                              </div>
                            {/* )} */}
                          </div>
                          {duration.savings && !showReferralPrice(duration) && (
                            <span className="text-green-600 text-xs">
                              {common('save')} {duration.savings}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <ul className="mt-8 space-y-4">
                {content.features.map((feature) => (
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
                  </>
                );
              })()}
            </div>
          ))}
        </div>

        {showCheckoutBar && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-3xl mx-auto px-4 py-4">
              {/* Plan label  */}
              <p className="text-xs text-gray-400 mb-3">
                {getTierContent(selectedTier).name} &middot; {selectedDuration.months}{' '}
                {selectedDuration.months === 1 ? pricing('month') : pricing('months')}
              </p>

              <div className="flex flex-wrap items-end gap-4">
                {/* Promo code input */}
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {pricing('promoLabel')}
                  </label>
                  <input
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.trim().toUpperCase());
                      setQuoteError(null);
                    }}
                    placeholder={pricing('promoPlaceholder')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  {quoteError && (
                    <p className="mt-1 text-xs text-red-500">{quoteError}</p>
                  )}
                </div>

                {/* Price summary */}
                <div className="flex-1 min-w-0">
                  {quoteLoading && <p className="text-sm text-gray-400 pb-2">Calculating…</p>}
                  {hasActiveReferral ? (quote && 
                    <div className="space-y-0.5 text-sm pb-1">
                      {quote.originalAmount > quote.finalAmount && (
                        <div className="flex justify-between text-gray-400">
                          <span>{pricing('originalPriceLabel')}</span>
                          <span className="">{formatPrice(quote.originalAmount)}</span>
                        </div>
                      )}
                      {quote.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>{pricing('discountLabel')}</span>
                          <span>{formatPrice(quote.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base text-blue-600">
                        <span>{quote.referralDiscountAmount > 0 ? pricing('referralPriceLabel') : pricing('salePriceLabel')}</span>
                        <span>{formatPrice(quote.finalAmount)}</span>
                      </div>
                    </div>
                  ) : (
                      <div className="space-y-0.5 text-sm pb-1">
                        <div className="flex justify-between text-gray-400">
                          <span>{pricing('originalPriceLabel')}</span>
                          <span className="line-through">{formatPrice(selectedDuration['originalPrice'])}</span>
                        </div>
                      
                        {/* <div className="flex justify-between text-green-600">
                          <span>{pricing('discountLabel')}</span>
                          <span>{formatPrice(selectedDuration['discount'])}</span>
                        </div> */}
                      
                      <div className="flex justify-between font-bold text-base text-blue-600">
                        <span>{pricing('salePriceLabel')}</span>
                        <span>{formatPrice(selectedDuration['salePrice'])}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={handleProceedToCheckout}
                  className="shrink-0 bg-blue-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-600"
                >
                  {pricing('proceedToCheckout')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PricingPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageFallback />}>
      <PricingPageContent />
    </Suspense>
  );
}
