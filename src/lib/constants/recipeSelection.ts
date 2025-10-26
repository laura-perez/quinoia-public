/**
 * Recipe Selection Constants
 *
 * Centralized configuration for recipe selection algorithm
 */

// ===== POOL SIZES =====

/**
 * Swap pool size for free tier users
 * Free users get 1 swap recipe available at a time
 */
export const FREE_POOL_SIZE = 3;

/**
 * Swap pool size for premium users
 * Premium users get 10 swap recipes available at a time
 */
export const PREMIUM_POOL_SIZE = 10;

/**
 * Minimum pool size for refetch operations
 * If pool drops below this, user should refetch
 */
export const MIN_POOL_SIZE = 15;

/**
 * Maximum refetch attempts before showing error
 */
export const MAX_REFETCH_ATTEMPTS = 3;

// ===== RECENCY & FRESHNESS =====

/**
 * Default recency window in days
 * Used for tracking recently consumed recipes
 */
export const DEFAULT_RECENCY_DAYS = 7;

/**
 * Maximum recency tracking window (21 days)
 * Recipes older than this are not tracked for recency
 */
export const MAX_RECENCY_DAYS = 21;

/**
 * Freshness bonus for recipes last seen 15-21 days ago
 */
export const FRESHNESS_BONUS_OLD = 0.5;

/**
 * Freshness penalty for recipes last seen ≤7 days ago
 */
export const FRESHNESS_PENALTY_RECENT = -2.0;

/**
 * Freshness score for recipes last seen 8-14 days ago (neutral)
 */
export const FRESHNESS_NEUTRAL = 0;

// ===== PROGRESSIVE FALLBACK WINDOWS =====

/**
 * Primary recency window: 15-21 days (freshness bonus applies)
 */
export const FALLBACK_PRIMARY_MIN_DAYS = 15;
export const FALLBACK_PRIMARY_MAX_DAYS = 21;

/**
 * Secondary recency window: 8-14 days (neutral, no bonus/penalty)
 */
export const FALLBACK_SECONDARY_MIN_DAYS = 8;
export const FALLBACK_SECONDARY_MAX_DAYS = 14;

/**
 * Complete reset: any recipe regardless of recency
 */
export const FALLBACK_COMPLETE_RESET_DAYS = 0;

// ===== DEBOUNCE & TIMING =====

/**
 * Debounce delay for saving menu changes (in milliseconds)
 */
export const MENU_SAVE_DEBOUNCE_MS = 500;

// ===== STORAGE & CACHE =====

/**
 * Signed URL TTL for recipe images (7 days in seconds)
 */
export const SIGNED_URL_TTL = 7 * 24 * 60 * 60;

/**
 * Cache TTL for recipe images (6 days in milliseconds)
 * Shorter than signed URL to avoid serving expired URLs
 */
export const RECIPE_IMAGE_CACHE_TTL = 6 * 24 * 60 * 60 * 1000;
