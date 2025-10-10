/**
 * Database types for the User table
 */
export const USER_STATUS = {
  TRIAL_AVAILABLE: 'trial_available',
  TRIAL_USED: 'trial_used',
  PAID_ACTIVE: 'paid_active',
  PAID_EXPIRED: 'paid_expired',
  FREE: 'free',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type SubscriptionType = 'monthly' | 'yearly';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  status: UserStatus;
  subscriptionType?: SubscriptionType;
  paidUntil?: string;
  hasUsedPromo: boolean;
  hasUsedTrial: boolean;
  lastSubmissionAt?: string;
  lastMenuResultId?: string;
  // Authentication fields
  lastLoginAt?: string;
  isFirstLogin: boolean;
  // Stripe integration fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  email: string;
  firstName?: string;
  status?: UserStatus;
  subscriptionType?: SubscriptionType;
  paidUntil?: string;
  hasUsedPromo?: boolean;
  hasUsedTrial?: boolean;
  lastLoginAt?: string;
  isFirstLogin?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
}

export interface UpsertUserInput {
  email: string;
  firstName?: string;
  status?: UserStatus;
  subscriptionType?: SubscriptionType;
  paidUntil?: string;
  hasUsedPromo?: boolean;
  hasUsedTrial?: boolean;
  lastLoginAt?: string;
  isFirstLogin?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
}
