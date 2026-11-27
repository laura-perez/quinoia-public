-- Migration: Clean up userRecency view - Remove unused fields
-- Date: 2025-10-26
--
-- CONTEXT: The fields recentStrict and recentSoft were kept for "backward compatibility"
-- but are never actually used in the codebase. The freshness scoring system uses
-- recipeTimestamps instead.
--
-- CHANGE: Remove unused fields and their calculations to improve performance

DROP VIEW IF EXISTS "userRecency";

CREATE OR REPLACE VIEW "userRecency" AS
WITH recipe_last_seen AS (
  SELECT
    mr."userId",
    recipe_id,
    MAX(mr."createdAt") as last_seen_at
  FROM "menuResult" mr
  CROSS JOIN LATERAL unnest(mr."activeRecipeIds") AS recipe_id
  WHERE mr."createdAt" >= (NOW() - '21 days'::interval)
  GROUP BY mr."userId", recipe_id
)
SELECT
  "userId",

  -- All active recipe IDs from last 21 days
  ARRAY_AGG(recipe_id) FILTER (WHERE TRUE) AS "excludeRecipeIds",

  -- Map of recipe_id -> last_seen_at timestamp (for freshness scoring)
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

-- Update comment
COMMENT ON VIEW "userRecency" IS 'Tracks active recipes per user with timestamps for freshness scoring. Cleaned up 2025-10-26 to remove unused recentStrict/recentSoft fields.';
