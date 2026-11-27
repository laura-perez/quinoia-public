-- Migration: Add removedRecipeIds column to menuResult table
-- Date: 2025-10-26
--
-- CONTEXT: When users remove recipes from their menu, we need to track them
-- to prevent them from reappearing in refetched swap pools.
--
-- PROBLEM: Currently, removed recipes disappear from activeRecipeIds but are not
-- tracked anywhere. This causes them to reappear in refetched pools because the
-- recency system doesn't know they were explicitly removed by the user.
--
-- SOLUTION: Add removedRecipeIds array column to track recipes the user has
-- explicitly removed from this menu. These IDs will be excluded from future
-- recipe selections and pool refetches.

ALTER TABLE "menuResult"
ADD COLUMN IF NOT EXISTS "removedRecipeIds" uuid[] DEFAULT '{}'::uuid[];

COMMENT ON COLUMN "menuResult"."removedRecipeIds" IS 'Array of recipe IDs that user has explicitly removed from this menu (prevents them from reappearing in refetch)';

-- Create index for better query performance when filtering by removed recipes
CREATE INDEX IF NOT EXISTS idx_menu_result_removed_recipe_ids
ON "menuResult" USING GIN ("removedRecipeIds");
