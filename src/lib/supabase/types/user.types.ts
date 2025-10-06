/**
 * Database types for the User table
 */
export type UserStatus = 'trial_available' | 'trial_used' | 'paid_active' | 'paid_expired';
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
