/**
 * Stripe configuration and price IDs
 */

// Stripe Price IDs - À remplacer par vos vrais IDs de prix Stripe
export const STRIPE_PRICE_IDS = {
  monthly_promo: process.env.STRIPE_PRICE_MONTHLY_PROMO || 'price_monthly_promo_placeholder',
  yearly: process.env.STRIPE_PRICE_YEARLY || 'price_yearly_placeholder',
} as const;

export const STRIPE_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
} as const;

// Plan metadata for UI display
export const PLAN_METADATA = {
  monthly: {
    name: 'Premium Mensuel',
    price: 9.90,
    originalPrice: 12.90,
    currency: 'EUR',
    interval: 'mois',
    priceId: STRIPE_PRICE_IDS.monthly_promo,
    isPromo: true,
  },
  yearly: {
    name: 'Premium Annuel',
    price: 99,
    currency: 'EUR',
    interval: 'an',
    priceId: STRIPE_PRICE_IDS.yearly,
    monthlyEquivalent: 8.25,
    savings: '3 mois offerts',
  },
} as const;

export type PlanType = keyof typeof PLAN_METADATA;