-- Add swap-related fields to menuResult table for frontend-first swap feature
-- No shoppingListCache field (shopping list is calculated client-side via pure function)

DO $$
BEGIN
  -- Add activeRecipeIds column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menuResult' AND column_name = 'activeRecipeIds') THEN
    ALTER TABLE public."menuResult" ADD COLUMN "activeRecipeIds" uuid[] NOT NULL DEFAULT '{}';
  END IF;

  -- Add swapPoolRecipeIds column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menuResult' AND column_name = 'swapPoolRecipeIds') THEN
    ALTER TABLE public."menuResult" ADD COLUMN "swapPoolRecipeIds" uuid[] NOT NULL DEFAULT '{}';
  END IF;

  -- Add swapsCount column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menuResult' AND column_name = 'swapsCount') THEN
    ALTER TABLE public."menuResult" ADD COLUMN "swapsCount" integer NOT NULL DEFAULT 0;
  END IF;

  -- Add updatedAt column if it doesn't exist (for tracking when swaps occur)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menuResult' AND column_name = 'updatedAt') THEN
    ALTER TABLE public."menuResult" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_menuResult_userId ON public."menuResult"("userId");
CREATE INDEX IF NOT EXISTS idx_menuResult_activeRecipeIds ON public."menuResult" USING GIN ("activeRecipeIds");

-- Comments for documentation
COMMENT ON COLUMN public."menuResult"."activeRecipeIds" IS 'Array of currently active recipe IDs (updated when user swaps recipes)';
COMMENT ON COLUMN public."menuResult"."swapPoolRecipeIds" IS 'Array of pre-loaded swap pool recipe IDs (1 for free users, 10 for premium)';
COMMENT ON COLUMN public."menuResult"."swapsCount" IS 'Total number of swaps performed by user on this menu';
COMMENT ON COLUMN public."menuResult"."updatedAt" IS 'Timestamp of last update (swap or modification)';
COMMENT ON TABLE public."menuResult" IS 'Menu results with frontend-first swap support. Shopping list is NOT cached here - it is calculated client-side via pure function.';
