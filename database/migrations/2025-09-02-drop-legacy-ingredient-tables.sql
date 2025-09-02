-- Migration: Consolidate aliases and drop legacy tables
-- Safe to run after JSON ingredients have canonicalId across all recipes and tools stop writing recipeIngredient.

BEGIN;

-- 1) Optional: merge existing ingredientAlias.aliasName into ingredientCanonical.commonAliases
--    Skips duplicates; keeps array unique. If ingredientAlias no longer exists, this section will error; wrap in DO block.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ingredientAlias'
  ) THEN
    UPDATE public."ingredientCanonical" ic
    SET "commonAliases" = (
      SELECT ARRAY(SELECT DISTINCT unnest(ic."commonAliases" || COALESCE(array_agg(a."aliasName"), '{}')))
      FROM public."ingredientAlias" a
      WHERE a."canonicalId" = ic.id
    )
    WHERE EXISTS (
      SELECT 1 FROM public."ingredientAlias" a WHERE a."canonicalId" = ic.id
    );
  END IF;
END$$;

-- 2) Drop recipeIngredient first (no longer in use)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'recipeIngredient'
  ) THEN
    DROP TABLE public."recipeIngredient" CASCADE;
  END IF;
END$$;

-- 3) Drop ingredientAlias if you decided to consolidate into commonAliases exclusively
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ingredientAlias'
  ) THEN
    DROP TABLE public."ingredientAlias" CASCADE;
  END IF;
END$$;

COMMIT;
