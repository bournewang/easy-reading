export interface DurationOption {
  months: number;
  originalPrice: number;
  salePrice: number;
  savings?: number;
  default?: boolean;
}

export interface PricingTier {
  id: string;
  originalMonthlyPrice?: number;
  saleMonthlyPrice?: number;
  durationOptions?: DurationOption[];
  isPopular?: boolean;
}

export function calculateMonthlyPrice(price: number, months: number): number {
  return price / months;
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function getSavingsText(savings: number): string {
  return `Save ${savings}%`;
}

export function getPopularTier(tiers: PricingTier[]): PricingTier | undefined {
  return tiers.find((tier) => tier.isPopular);
}

export function getPopularDurationOption(tier: PricingTier): DurationOption | undefined {
  return tier.durationOptions?.find((option) => option.default);
}

export function getDefaultDurationOption(tier: PricingTier): DurationOption | undefined {
  return tier.durationOptions?.find((option) => option.default) ?? tier.durationOptions?.[0];
}
