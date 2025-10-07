/**
 * Repository for MenuResult table operations
 */

import { getServiceClient } from "../client";
import { createLogger } from "../../logger";
import type { Recipe } from "@/types/recipes";

const logger = createLogger();

export interface MenuResultData {
  id: string;
  submissionId: string;
  userId: string;
  resultBundle: any;
  numRecipes: number;
  numServings: number;
  shareId: string;
  shareActive: boolean;
  createdAt: Date;
  activeRecipeIds: string[];
  swapPoolRecipeIds: string[];
  swapsCount: number;
  updatedAt: Date | null;
}

export interface CreateMenuResultInput {
  submissionId: string;
  userId: string;
  resultBundle: any;
  numRecipes: number;
  numServings: number;
  shareId: string;
  activeRecipeIds: string[];
  swapPoolRecipeIds: string[];
}

export interface UpdateMenuSwapInput {
  activeRecipeIds: string[];
  swapPoolRecipeIds: string[];
  swapsCount: number;
}

/**
 * Repository for MenuResult table operations
 */
export class MenuResultsRepository {
  private client = getServiceClient();
  private logger = createLogger();

  /**
   * Create a new menu result
   */
  async create(input: CreateMenuResultInput): Promise<MenuResultData> {
    this.logger.debug('Creating menu result', {
      userId: input.userId,
      numRecipes: input.numRecipes
    });

    const { data, error } = await this.client
      .from('menuResult')
      .insert([{
        submissionId: input.submissionId,
        userId: input.userId,
        resultBundle: input.resultBundle,
        numRecipes: input.numRecipes,
        numServings: input.numServings,
        shareId: input.shareId,
        activeRecipeIds: input.activeRecipeIds,
        swapPoolRecipeIds: input.swapPoolRecipeIds,
        swapsCount: 0,
        shareActive: true,
      }])
      .select("*")
      .single();

    if (error || !data) {
      this.logger.error('Menu result creation failed', {
        error,
        userId: input.userId
      });
      throw new Error(error?.message || "Menu result creation failed");
    }

    this.logger.info('Menu result created successfully', {
      menuResultId: data.id,
      userId: input.userId,
      numRecipes: input.numRecipes
    });

    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
    };
  }

  /**
   * Find menu result by ID
   */
  async findById(id: string): Promise<MenuResultData | null> {
    this.logger.debug('Finding menu result by ID', { id });

    const { data, error } = await this.client
      .from('menuResult')
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        this.logger.debug('Menu result not found', { id });
        return null;
      }

      this.logger.error('Menu result lookup failed', { error, id });
      throw new Error(error.message || "Menu result lookup failed");
    }

    this.logger.debug('Menu result found', { id });

    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
    };
  }

  /**
   * Update menu result after swap (frontend-first approach)
   */
  async updateSwap(id: string, input: UpdateMenuSwapInput): Promise<void> {
    this.logger.debug('Updating menu swap', {
      id,
      swapsCount: input.swapsCount
    });

    const { error } = await this.client
      .from('menuResult')
      .update({
        activeRecipeIds: input.activeRecipeIds,
        swapPoolRecipeIds: input.swapPoolRecipeIds,
        swapsCount: input.swapsCount,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      this.logger.error('Menu swap update failed', {
        error,
        id
      });
      throw new Error(error.message || "Menu swap update failed");
    }

    this.logger.info('Menu swap updated successfully', {
      id,
      swapsCount: input.swapsCount,
      poolSize: input.swapPoolRecipeIds.length
    });
  }

  /**
   * Update swap pool (premium only - refetch pool)
   */
  async updateSwapPool(id: string, swapPoolRecipeIds: string[]): Promise<void> {
    this.logger.debug('Updating swap pool', {
      id,
      poolSize: swapPoolRecipeIds.length
    });

    const { error } = await this.client
      .from('menuResult')
      .update({
        swapPoolRecipeIds,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      this.logger.error('Swap pool update failed', {
        error,
        id
      });
      throw new Error(error.message || "Swap pool update failed");
    }

    this.logger.info('Swap pool updated successfully', {
      id,
      poolSize: swapPoolRecipeIds.length
    });
  }

  /**
   * Verify menu ownership (security check)
   */
  async verifyOwnership(menuId: string, userId: string): Promise<boolean> {
    this.logger.debug('Verifying menu ownership', {
      menuId,
      userId
    });

    const { data, error } = await this.client
      .from('menuResult')
      .select('userId')
      .eq('id', menuId)
      .single();

    if (error || !data) {
      this.logger.warn('Menu ownership verification failed', {
        menuId,
        userId,
        error
      });
      return false;
    }

    const isOwner = data.userId === userId;

    this.logger.debug('Menu ownership verified', {
      menuId,
      userId,
      isOwner
    });

    return isOwner;
  }
}

// Export singleton instance
export const menuResultsRepository = new MenuResultsRepository();
