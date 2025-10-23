/**
 * Repository for dashboard_data view
 *
 * This view provides a unified query for all dashboard data:
 * - User info
 * - Submission (preferences)
 * - Current menu
 * - Quota status
 *
 * Replaces 6-7 separate queries with 1 single optimized query
 */

import { getServiceClient } from '../client';
import { createLogger } from '../../logger';
import type { UserStatus } from '../types/user.types';

const logger = createLogger();

export interface DashboardDataRow {
  // User fields
  user_id: string;
  email: string;
  status: UserStatus;
  firstName: string | null;
  isFirstLogin: boolean;
  lastMenuResultId: string | null;

  // Submission fields (preferences)
  submission_id: string | null;
  age: number | null;
  gender: string | null;
  diet: string | null;
  proteinPreferences: string[] | null;
  equipmentAvailable: string[] | null;
  cookingLevel: string | null;
  submission_num_recipes: number | null;
  submission_num_servings: number | null;
  dislikedFoods: string | null;
  favoriteFoods: string | null;

  // Current menu fields
  current_menu_id: string | null;
  activeRecipeIds: string[] | null;
  swapPoolRecipeIds: string[] | null;
  menu_num_recipes: number | null;
  menu_num_servings: number | null;
  swapsCount: number | null;
  menu_created_at: string | null;

  // Quota fields (computed)
  latest_menu_id: string | null;
  latest_menu_created_at: string | null;
  hasSwappedInWindow: boolean | null;
  can_generate_menu: boolean;
  can_swap: boolean;
  menu_quota_limit: number | null;
  swap_quota_limit: number | null;
  menus_generated_this_window: number;
  swaps_used_this_menu: number;
  next_quota_reset: string | null;
}

/**
 * Repository for dashboard_data view operations
 */
export class DashboardDataRepository {
  private client = getServiceClient();
  private logger = createLogger();

  /**
   * Get unified dashboard data for a user
   * Single query replaces: user fetch, submission fetch, menu fetch, 2x quota checks
   */
  async getByUserId(userId: string): Promise<DashboardDataRow | null> {
    this.logger.debug('Fetching unified dashboard data', { userId });

    const { data, error } = await this.client
      .from('dashboard_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error('Dashboard data fetch failed', {
        error,
        userId
      });
      throw new Error(error.message || 'Dashboard data fetch failed');
    }

    if (!data) {
      this.logger.warn('Dashboard data not found', { userId });
      return null;
    }

    this.logger.debug('Dashboard data fetched successfully', {
      userId,
      hasSubmission: !!data.submission_id,
      hasCurrentMenu: !!data.current_menu_id,
      canGenerateMenu: data.can_generate_menu,
      canSwap: data.can_swap
    });

    return data as DashboardDataRow;
  }
}

// Export singleton instance
export const dashboardDataRepository = new DashboardDataRepository();
