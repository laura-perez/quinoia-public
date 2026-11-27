-- Migration: Update userRecency view to include timestamps for freshness scoring
-- Date: 2025-01-25
--
-- CONTEXT: Current view only returns recipe IDs for exclusion lists.
-- We need timestamps to calculate "days since last seen" for freshness bonus/penalty.
--
-- CHANGE: Add timestamp columns to track when each recipe was last seen
-- This enables smart scoring: recent recipes get penalty, old recipes get bonus

DROP VIEW IF EXISTS "userRecency";

CREATE OR REPLACE VIEW "userRecency" AS
WITH recipe_last_seen AS (
  SELECT
    mr."userId",
    recipe_id,
    MAX(mr."createdAt") as last_seen_at,
    MAX(mr."createdAt") >= (NOW() - '14 days'::interval) as is_recent_strict,
    MAX(mr."createdAt") < (NOW() - '14 days'::interval)
      AND MAX(mr."createdAt") >= (NOW() - '21 days'::interval) as is_recent_soft
  FROM "menuResult" mr
  CROSS JOIN LATERAL unnest(mr."activeRecipeIds") AS recipe_id
  WHERE mr."createdAt" >= (NOW() - '21 days'::interval)
  GROUP BY mr."userId", recipe_id
)
SELECT
  "userId",

  -- All active recipe IDs from last 21 days (for backward compatibility)
  ARRAY_AGG(recipe_id) FILTER (WHERE TRUE) AS "excludeRecipeIds",

  -- Active recipes from last 14 days (hard exclusion - backward compatibility)
  ARRAY_AGG(recipe_id) FILTER (WHERE is_recent_strict) AS "recentStrict",

  -- Active recipes from 15-21 days ago (soft penalty - backward compatibility)
  ARRAY_AGG(recipe_id) FILTER (WHERE is_recent_soft) AS "recentSoft",

  -- NEW: Map of recipe_id -> last_seen_at timestamp (for freshness scoring)
  COALESCE(
    JSONB_OBJECT_AGG(
      recipe_id,
      JSONB_BUILD_OBJECT(
        'lastSeenAt', last_seen_at,
        'daysSince', (NOW()::date - last_seen_at::date)::int
      )
    ) FILTER (WHERE recipe_id IS NOT NULL),
    '{}'::jsonb
  ) AS "recipeTimestamps"

FROM recipe_last_seen
GROUP BY "userId";

-- Verify the view works
COMMENT ON VIEW "userRecency" IS 'Tracks active recipes per user with timestamps for freshness scoring. Updated: 2025-01-25 to include recipeTimestamps for smart recency bonus/penalty.';
