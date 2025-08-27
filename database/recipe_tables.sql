-- Legacy snake_case script converted to camelCase schema references.
-- Prefer using create-base-and-v2-tables-fixed.sql for authoritative schema.

CREATE TABLE IF NOT EXISTS public."recipe" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "titleFr" TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  "servingsBase" INTEGER NOT NULL CHECK ("servingsBase" >= 1 AND "servingsBase" <= 8),
  "prepTimeMinutes" INTEGER NOT NULL CHECK ("prepTimeMinutes" <= 30),

  -- Nutrition per serving
  "caloriesPerServing" INTEGER NOT NULL,
  "proteinGPerServing" NUMERIC(5,2) NOT NULL,
  "carbsGPerServing" NUMERIC(5,2) NOT NULL,
  "fatGPerServing" NUMERIC(5,2) NOT NULL,

  diet TEXT NOT NULL CHECK (diet IN ('omnivore','flexitarian','vegetarian','vegan')),
  "proteinCategory" TEXT NOT NULL CHECK ("proteinCategory" IN ('Beef','Poultry','Fish','Eggs','Dairy','Tofu','Legumes','Meat alternatives')),
  "cookingLevel" TEXT NOT NULL CHECK ("cookingLevel" IN ('beginner','intermediate','advanced')),

  "equipmentRequired" TEXT[] NOT NULL DEFAULT '{}',
  "batchFriendly" BOOLEAN NOT NULL DEFAULT false,
  ingredients JSONB NOT NULL,
  instructions TEXT[] NOT NULL,
  "gptAutoEvaluation" JSONB,
  "cookingTip" TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_diet_legacy ON public."recipe"(diet);
CREATE INDEX IF NOT EXISTS idx_recipe_proteinCategory_legacy ON public."recipe"("proteinCategory");
CREATE INDEX IF NOT EXISTS idx_recipe_cookingLevel_legacy ON public."recipe"("cookingLevel");
CREATE INDEX IF NOT EXISTS idx_recipe_caloriesPerServing_legacy ON public."recipe"("caloriesPerServing");
CREATE INDEX IF NOT EXISTS idx_recipe_proteinGPerServing_legacy ON public."recipe"("proteinGPerServing");
CREATE INDEX IF NOT EXISTS idx_recipe_equipmentRequired_legacy ON public."recipe" USING GIN("equipmentRequired");
CREATE INDEX IF NOT EXISTS idx_recipe_status_legacy ON public."recipe"(status);

CREATE TABLE IF NOT EXISTS public."userRecipeHistory" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  "recipeId" UUID NOT NULL REFERENCES public."recipe"(id) ON DELETE CASCADE,
  "menuResultId" UUID REFERENCES public."menuResult"(id) ON DELETE SET NULL,
  "consumedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE("userId","recipeId","consumedAt")
);

CREATE INDEX IF NOT EXISTS idx_userRecipeHistory_user_date_legacy ON public."userRecipeHistory"("userId","consumedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_userRecipeHistory_recipe_legacy ON public."userRecipeHistory"("recipeId");