-- Migration: Update userRecency view to track active recipes (not resultBundle)
-- Date: 2025-10-17
--
-- PROBLEM: The current view extracts recipes from resultBundle JSONB, which is only
-- populated at menu creation time. When users swap/add/remove recipes, resultBundle
-- is NOT updated, so swapped/added recipes are not tracked for recency filtering.
--
-- SOLUTION: Use activeRecipeIds array instead, which is updated on every swap/add/remove.
-- This ensures that recipes actually in the user's active menu are excluded from future
-- menu generations (21-day recency window).
--
-- IMPORTANT: We only track ACTIVE recipes (not swap pool), because only active recipes
-- are "consumed" by the user. Swap pool recipes are candidates but not yet selected.

DROP VIEW IF EXISTS "userRecency";

CREATE OR REPLACE VIEW "userRecency" AS
SELECT
  mr."userId",

  -- All active recipe IDs from last 21 days (for exclusion)
  ARRAY_AGG(DISTINCT recipe_id) FILTER (
    WHERE mr."createdAt" >= (NOW() - '21 days'::interval)
  ) AS "excludeRecipeIds",

  -- Active recipes from last 14 days (hard exclusion)
  ARRAY_AGG(DISTINCT recipe_id) FILTER (
    WHERE mr."createdAt" >= (NOW() - '14 days'::interval)
  ) AS "recentStrict",

  -- Active recipes from 15-21 days ago (soft penalty)
  ARRAY_AGG(DISTINCT recipe_id) FILTER (
    WHERE mr."createdAt" < (NOW() - '14 days'::interval)
      AND mr."createdAt" >= (NOW() - '21 days'::interval)
  ) AS "recentSoft"

FROM "menuResult" mr
  -- Unnest activeRecipeIds array (updated on every swap/add/remove)
  CROSS JOIN LATERAL unnest(mr."activeRecipeIds") AS recipe_id
GROUP BY mr."userId";

-- Verify the view works
COMMENT ON VIEW "userRecency" IS 'Tracks active recipes per user for recency-based exclusion. Updated: 2025-10-17 to use activeRecipeIds instead of resultBundle for accurate swap/add/remove tracking.';
