-- Add unique constraint on recipe titleFr to prevent duplicate recipes
-- This ensures recipes cannot be imported twice with the same title

-- Check if constraint already exists before adding it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'recipe_titleFr_unique' 
    AND table_name = 'recipe'
  ) THEN
    ALTER TABLE public."recipe" ADD CONSTRAINT recipe_titleFr_unique UNIQUE ("titleFr");
    RAISE NOTICE 'Added unique constraint on recipe.titleFr';
  ELSE
    RAISE NOTICE 'Unique constraint on recipe.titleFr already exists';
  END IF;
END $$;

-- Create an index for faster lookups on titleFr
CREATE INDEX IF NOT EXISTS idx_recipe_titleFr ON public."recipe"("titleFr");

COMMENT ON CONSTRAINT recipe_titleFr_unique ON public."recipe" IS 'Prevents duplicate recipes with the same title during import';