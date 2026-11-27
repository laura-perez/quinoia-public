-- Create userRecency view for recipe selection algorithm
-- This view provides recency data for each user based on their menuResult history
-- Source: extracted from production database using pg_get_viewdef

CREATE OR REPLACE VIEW "userRecency" AS
SELECT
  mr."userId",

  -- All recipe IDs used in last 21 days (for exclusion)
  ARRAY_AGG(DISTINCT r.recipe_id) FILTER (
    WHERE mr."createdAt" >= (NOW() - '21 days'::interval)
  ) AS "excludeRecipeIds",

  -- Recipes from last 14 days (hard exclusion)
  ARRAY_AGG(DISTINCT r.recipe_id) FILTER (
    WHERE mr."createdAt" >= (NOW() - '14 days'::interval)
  ) AS "recentStrict",

  -- Recipes from 15-21 days ago (soft penalty)
  ARRAY_AGG(DISTINCT r.recipe_id) FILTER (
    WHERE mr."createdAt" < (NOW() - '14 days'::interval)
      AND mr."createdAt" >= (NOW() - '21 days'::interval)
  ) AS "recentSoft"

FROM "menuResult" mr
  CROSS JOIN LATERAL jsonb_array_elements(mr."resultBundle" -> 'recipes'::text) recipe_obj(value)
  CROSS JOIN LATERAL (
    SELECT recipe_obj.value ->> 'id'::text AS recipe_id
  ) r
GROUP BY mr."userId";

-- Add comment
COMMENT ON VIEW "userRecency" IS 'Aggregated recency data per user for recipe selection algorithm';
