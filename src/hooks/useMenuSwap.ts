/**
 * useMenuSwap Hook
 *
 * Manages menu swap state with frontend-first architecture:
 * - Swaps happen INSTANTLY (0ms latency) by updating local state
 * - Changes are debounced (500ms) and saved to database in background
 * - No blocking API calls during swap operation
 * - Optimistic UI updates with error recovery
 *
 * Usage:
 * ```tsx
 * const { activeRecipes, swapPool, swapRecipe, isSwapping, error } = useMenuSwap({
 *   initialActiveRecipes,
 *   initialSwapPool,
 *   menuId,
 *   numServings
 * });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Recipe } from '@/lib/recipes/types';

export interface UseMenuSwapInput {
  initialActiveRecipes: Recipe[];
  initialSwapPool: Recipe[];
  menuId: string;
  numServings: number;
  onQuotaExceeded?: () => void;
  onError?: (error: string) => void;
}

export interface UseMenuSwapReturn {
  activeRecipes: Recipe[];
  swapPool: Recipe[];
  swapsCount: number;
  swapRecipe: (recipeToRemove: Recipe, recipeToAdd: Recipe) => void;
  isSwapping: boolean;
  isSaving: boolean;
  error: string | null;
  canRefetchPool: boolean;
  refetchPool: () => Promise<void>;
}

const DEBOUNCE_DELAY_MS = 500;

export function useMenuSwap(input: UseMenuSwapInput): UseMenuSwapReturn {
  const {
    initialActiveRecipes,
    initialSwapPool,
    menuId,
    numServings,
    onQuotaExceeded,
    onError,
  } = input;

  // Local state (source of truth for UI)
  const [activeRecipes, setActiveRecipes] = useState<Recipe[]>(initialActiveRecipes);
  const [swapPool, setSwapPool] = useState<Recipe[]>(initialSwapPool);
  const [swapsCount, setSwapsCount] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<{
    activeRecipeIds: string[];
    swapsCount: number;
  } | null>(null);

  /**
   * Swap recipe - INSTANT update (0ms latency)
   * Database save happens asynchronously with debounce
   */
  const swapRecipe = useCallback(
    (recipeToRemove: Recipe, recipeToAdd: Recipe) => {
      setIsSwapping(true);
      setError(null);

      try {
        // INSTANT state update (frontend-first)
        setActiveRecipes((prev) => {
          const index = prev.findIndex((r) => r.id === recipeToRemove.id);
          if (index === -1) return prev;

          const updated = [...prev];
          updated[index] = recipeToAdd;
          return updated;
        });

        // Move swapped-out recipe to pool, remove swapped-in recipe from pool
        setSwapPool((prev) => {
          const filtered = prev.filter((r) => r.id !== recipeToAdd.id);
          return [recipeToRemove, ...filtered];
        });

        // Increment swaps count
        setSwapsCount((prev) => prev + 1);

        // Schedule debounced save
        scheduleDebouncedSave();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors du swap';
        setError(errorMessage);
        if (onError) onError(errorMessage);
      } finally {
        setIsSwapping(false);
      }
    },
    [onError]
  );

  /**
   * Schedule debounced save to database
   * Cancels previous pending save and restarts timer
   */
  const scheduleDebouncedSave = useCallback(() => {
    // Cancel previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase();
    }, DEBOUNCE_DELAY_MS);
  }, []);

  /**
   * Save current state to database (debounced)
   */
  const saveToDatabase = useCallback(async () => {
    const activeRecipeIds = activeRecipes.map((r) => r.id);

    pendingSaveRef.current = {
      activeRecipeIds,
      swapsCount,
    };

    setIsSaving(true);

    try {
      const response = await fetch(`/api/dashboard/menu/${menuId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeRecipeIds,
          swapsCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        // Handle quota exceeded (free user max 1 swap)
        if (response.status === 403) {
          if (onQuotaExceeded) onQuotaExceeded();
          setError(data.message || 'Quota de swaps dépassé');
          return;
        }

        throw new Error(data.message || 'Erreur lors de la sauvegarde');
      }

      // Success - clear pending save
      pendingSaveRef.current = null;
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMessage);
      if (onError) onError(errorMessage);

      // TODO: Implement retry logic or rollback on persistent errors
    } finally {
      setIsSaving(false);
    }
  }, [activeRecipes, swapsCount, menuId, onQuotaExceeded, onError]);

  /**
   * Refetch swap pool (premium only)
   * Fetches 10 new recipes excluding current active + pool
   */
  const refetchPool = useCallback(async (): Promise<void> => {
    const excludeRecipeIds = [
      ...activeRecipes.map((r) => r.id),
      ...swapPool.map((r) => r.id),
    ];

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/menu/${menuId}/refetch-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeRecipeIds }),
      });

      if (!response.ok) {
        const data = await response.json();

        // Handle non-premium user
        if (response.status === 403) {
          setError(data.message || 'Fonctionnalité réservée aux utilisateurs premium');
          return;
        }

        throw new Error(data.message || 'Erreur lors du rechargement du pool');
      }

      const data = await response.json();
      setSwapPool(data.newSwapPool);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de rechargement';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [activeRecipes, swapPool, menuId, onError]);

  /**
   * Cleanup: Save pending changes on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // If there's a pending save, execute it immediately
      if (pendingSaveRef.current) {
        // Fire-and-forget save on unmount
        fetch(`/api/dashboard/menu/${menuId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingSaveRef.current),
          keepalive: true, // Ensure request completes even after page unload
        }).catch(() => {
          // Silently fail on unmount
        });
      }
    };
  }, [menuId]);

  return {
    activeRecipes,
    swapPool,
    swapsCount,
    swapRecipe,
    isSwapping,
    isSaving,
    error,
    canRefetchPool: swapPool.length > 0, // Can refetch if pool exists
    refetchPool,
  };
}
