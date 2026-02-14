export interface DurationOption {
  months: number;
  price: number;
  savings?: number;
  default?: boolean;
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  features: string[];
  monthlyPrice?: number;
  durationOptions?: DurationOption[];
  isPopular?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started with English reading',
    features: [
      'Basic article reading',
      'Limited word lookups',
      'Basic word list',
      'Limited translations',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Enhanced features for serious learners',
    monthlyPrice: 39,
    isPopular: true,
    durationOptions: [
      {
        months: 1,
        price: 39,
      },
      {
        months: 3,
        price: 105,
        savings: 10,
        default: true,
      },
      {
        months: 6,
        price: 198,
        savings: 15,
      },
      {
        months: 12,
        price: 336,
        savings: 28,
      },
    ],
    features: [
      'Unlimited article reading',
      'Advanced word lookups',
      'Extended word list',
      'Full translations',
      'Offline access',
      'Ad-free experience',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Complete package for dedicated learners',
    monthlyPrice: 49,
    durationOptions: [
      {
        months: 1,
        price: 49,
      },
      {
        months: 3,
        price: 135,
        savings: 10,
      },
      {
        months: 6,
        price: 258,
        savings: 15,
        default: true,
      },
      {
        months: 12,
        price: 438,
        savings: 28,
      },
    ],
    features: [
      'All Pro features',
      'Priority support',
      'Advanced analytics',
      'Custom word lists',
      'Export/import features',
      'API access',
    ],
  },
];

// Helper functions
export function calculateMonthlyPrice(price: number, months: number): number {
  return price / months;
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function getSavingsText(savings: number): string {
  return `Save ${savings}%`;
}

export function getPopularTier(): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.isPopular);
}

export function getPopularDurationOption(tier: PricingTier): DurationOption | undefined {
  return tier.durationOptions?.find((option) => option.default);
}

export function getDefaultDurationOption(tier: PricingTier): DurationOption | undefined {
  return tier.durationOptions?.find((option) => option.default);
} 