/**
 * Dashboard TypeScript Types
 *
 * Type definitions for dashboard pages, components, and API responses
 */

import type { Recipe } from '@/lib/recipes/types';
import type { CanonicalIngredientInfo } from '@/lib/supabase/repositories/ingredients';

// ==================== User Status ====================

export type UserStatus = 'trial_available' | 'trial_active' | 'trial_expired' | 'paid_active' | 'paid_expired';

export interface DashboardUser {
  id: string;
  email: string;
  firstName: string | null;
  status: UserStatus;
  isFirstLogin: boolean;
  lastSubmissionAt: Date | null;
}

// ==================== Quotas ====================

export interface QuotaStatus {
  menusGeneratedThisWindow: number;
  menuQuotaLimit: number | null; // null = unlimited (premium)
  swapsUsedThisMenu: number;
  swapQuotaLimit: number | null; // null = unlimited (premium)
  nextQuotaReset: string | null; // ISO timestamp
  isPremium: boolean;
}

// ==================== Menu ====================

export interface DashboardMenu {
  id: string;
  activeRecipes: Recipe[];
  swapPool: Recipe[];
  swapsCount: number;
  numServings: number;
}

export interface MenuGenerationRequest {
  numRecipes: number;
  numServings: number;
}

export interface MenuGenerationResponse {
  success: true;
  menu: DashboardMenu;
  ingredientsCatalog: Record<string, CanonicalIngredientInfo>;
  quotas: QuotaStatus;
}

// ==================== Dashboard Status ====================

export interface DashboardStatusResponse {
  user: DashboardUser;
  quotas: QuotaStatus;
  currentMenu: DashboardMenu | null;
  ingredientsCatalog: Record<string, CanonicalIngredientInfo> | null;
}

// ==================== Swap Operations ====================

export interface MenuSwapUpdateRequest {
  activeRecipeIds: string[];
  swapsCount: number;
}

export interface MenuSwapUpdateResponse {
  success: true;
  message: string;
}

export interface RefetchPoolRequest {
  excludeRecipeIds: string[];
}

export interface RefetchPoolResponse {
  success: true;
  newSwapPool: Recipe[];
  message: string;
}

// ==================== Error Responses ====================

export interface QuotaExceededError {
  error: 'Quota dépassé';
  message: string;
  upgradeUrl: '/tarifs';
  quotaStatus: QuotaStatus;
}

export interface PremiumFeatureError {
  error: 'Fonctionnalité premium';
  message: string;
  upgradeUrl: '/tarifs';
}

export interface UnauthorizedError {
  error: 'Unauthorized' | 'Accès refusé';
  message: string;
}

export type DashboardAPIError =
  | QuotaExceededError
  | PremiumFeatureError
  | UnauthorizedError
  | { error: string; message: string };

// ==================== Component Props ====================

export interface RecipeCardProps {
  recipe: Recipe;
  onSwap?: (recipe: Recipe) => void;
  isSwappable?: boolean;
  isLoading?: boolean;
  showNutrition?: boolean;
}

export interface SwapPoolProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  isLoading?: boolean;
}

export interface ShoppingListProps {
  recipes: Recipe[];
  numServings: number;
  ingredientsCatalog: Record<string, CanonicalIngredientInfo>;
  isLoading?: boolean;
}

export interface QuotaDisplayProps {
  quotas: QuotaStatus;
  compact?: boolean;
}

// ==================== Quota Helpers ====================

/**
 * Check if user is premium (paid_active)
 */
export function isPremiumUser(status: UserStatus): boolean {
  return status === 'paid_active';
}

/**
 * Check if user can generate new menu
 */
export function canGenerateMenu(quotas: QuotaStatus): boolean {
  if (quotas.isPremium) return true;

  if (quotas.menuQuotaLimit === null) return true; // Unlimited

  return quotas.menusGeneratedThisWindow < quotas.menuQuotaLimit;
}

/**
 * Get remaining menu quota
 */
export function getRemainingMenuQuota(quotas: QuotaStatus): number | null {
  if (quotas.isPremium || quotas.menuQuotaLimit === null) return null; // Unlimited

  return Math.max(0, quotas.menuQuotaLimit - quotas.menusGeneratedThisWindow);
}

/**
 * Get quota reset date as human-readable string
 */
export function getQuotaResetDate(quotas: QuotaStatus): string | null {
  if (!quotas.nextQuotaReset) return null;

  const resetDate = new Date(quotas.nextQuotaReset);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Bientôt';
  if (diffDays === 1) return 'Demain';
  return `Dans ${diffDays} jours`;
}

/**
 * Get user-friendly status label
 */
export function getUserStatusLabel(status: UserStatus): string {
  const labels: Record<UserStatus, string> = {
    trial_available: 'Essai disponible',
    trial_active: 'Essai en cours',
    trial_expired: 'Essai expiré',
    paid_active: 'Premium actif',
    paid_expired: 'Abonnement expiré',
  };

  return labels[status];
}
