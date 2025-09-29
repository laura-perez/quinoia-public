/**
 * Database types for the User table
 */
export type UserStatus = 'trial_available' | 'trial_used' | 'paid_active' | 'paid_expired';
export type SubscriptionType = 'one_time' | 'recurring';

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
}

export interface UpsertUserInput {
  email: string;
  firstName?: string;
  status?: UserStatus;
  subscriptionType?: SubscriptionType;
  paidUntil?: string;
  hasUsedPromo?: boolean;
  hasUsedTrial?: boolean;
}
