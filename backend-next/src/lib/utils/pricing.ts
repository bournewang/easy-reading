import { PRICING_TIERS } from '@/pricing';

/**
 * Calculate the price for a given tier and duration
 */
export function getPriceForTier(tierId: string, duration: number): number {
  const tier = PRICING_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    throw new Error(`Invalid tier: ${tierId}`);
  }

  const durationOption = tier.durationOptions?.find((d) => d.months === duration);
  if (!durationOption) {
    throw new Error(`Invalid duration ${duration} for tier ${tierId}`);
  }

  return durationOption.price / 100; // Convert from cents to yuan
} 