-- Quinoïa Complete Database Setup (Corrected & CamelCase Preserved)
-- Run ONCE to set up the entire database (idempotent via IF NOT EXISTS)
-- All camelCase identifiers are quoted to preserve case.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ==================================================
-- STEP 0: BASE TABLES
-- ==================================================

CREATE TABLE IF NOT EXISTS public."user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  "firstName" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "lastSubmissionAt" timestamp with time zone,
  "lastMenuResultId" uuid
);

CREATE TABLE IF NOT EXISTS public."submission" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public."user"(id),
  "rawFormJson" jsonb NOT NULL,
  "normalizedInput" jsonb NOT NULL,
  age integer CHECK (age BETWEEN 16 AND 100),
  gender text,
  "heightCm" integer CHECK ("heightCm" BETWEEN 100 AND 250),
  "weightKg" numeric CHECK ("weightKg" >= 40 AND "weightKg" <= 150),
  diet text,
  "proteinPreferences" text[] NOT NULL DEFAULT '{}' CHECK ("proteinPreferences" <@ ARRAY['Beef','Poultry','Fish','Eggs','Dairy','Tofu','Legumes','Meat alternatives']),
  "equipmentAvailable" text[] NOT NULL DEFAULT '{}' CHECK ("equipmentAvailable" <@ ARRAY['Oven','Blender','Thermomix','Air Fryer']),
  "numRecipes" integer CHECK ("numRecipes" BETWEEN 2 AND 7),
  "numServings" integer CHECK ("numServings" BETWEEN 1 AND 4),
  "dislikedFoods" text,
  "favoriteFoods" text,
  "cookingLevel" text,
  "freeTextMessage" text,
  locale text NOT NULL DEFAULT 'fr-FR',
  "unitSystem" text NOT NULL DEFAULT 'metric',
  consent boolean NOT NULL DEFAULT true,
  "consentedAt" timestamp with time zone NOT NULL,
  "consentVersion" text NOT NULL DEFAULT 'v1',
  "recaptchaScore" numeric,
  "recaptchaSuccess" boolean,
  "recaptchaHostname" text,
  "recaptchaAction" text,
  "recaptchaChallengeTs" timestamp with time zone,
  "ipAddress" inet,
  "userAgent" text,
  "runId" text,
  status text NOT NULL DEFAULT 'pending',
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "activityDeskJob" boolean,
  "activityDailySteps" text CHECK ("activityDailySteps" = ANY (ARRAY['<5k','5-8k','>8k'])),
  "activitySessionsPerWeek" text CHECK ("activitySessionsPerWeek" = ANY (ARRAY['0','1-2','3-4','>=5'])),
  "activityHighIntensity" boolean
);

CREATE TABLE IF NOT EXISTS public."menuResult" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submissionId" uuid NOT NULL REFERENCES public."submission"(id),
  "userId" uuid NOT NULL REFERENCES public."user"(id),
  "resultBundle" jsonb NOT NULL,
  "numRecipes" integer NOT NULL,
  "numServings" integer NOT NULL,
  "shareId" text UNIQUE,
  "shareActive" boolean NOT NULL DEFAULT true,
  "shareCreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."runLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submissionId" uuid REFERENCES public."submission"(id),
  "menuResultId" uuid REFERENCES public."menuResult"(id),
  "runId" text,
  node text NOT NULL,
  "inputJson" jsonb,
  "outputJson" jsonb,
  "tokensIn" integer,
  "tokensOut" integer,
  "costEstimateEur" numeric,
  status text NOT NULL DEFAULT 'ok',
  "startedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "endedAt" timestamp with time zone
);

-- ==================================================
-- STEP 1: INGREDIENT TAXONOMY
-- ==================================================

CREATE TABLE IF NOT EXISTS public."ingredientCanonical" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nameFr" text NOT NULL UNIQUE,
  category text NOT NULL,
  "sectionCode" text NOT NULL,
  "defaultUnit" text NOT NULL CHECK ("defaultUnit" IN ('g','ml','piece')),
  "densityGPerMl" numeric(4,2),
  "commonAliases" text[] NOT NULL DEFAULT '{}',
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."ingredientAlias" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "canonicalId" uuid NOT NULL REFERENCES public."ingredientCanonical"(id) ON DELETE CASCADE,
  "aliasName" text NOT NULL,
  "normalizedForm" text NOT NULL,
  confidence numeric(3,2) DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  source text DEFAULT 'manual' CHECK (source IN ('manual','fuzzy_match','gpt_mapping')),
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE ("aliasName","canonicalId")
);

-- ==================================================
-- STEP 2: RECIPES & HISTORY
-- ==================================================

CREATE TABLE IF NOT EXISTS public."recipe" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "titleFr" text NOT NULL,
  slug text UNIQUE NOT NULL,
  "servingsBase" integer NOT NULL CHECK ("servingsBase" BETWEEN 1 AND 8),
  "prepTimeMinutes" integer NOT NULL CHECK ("prepTimeMinutes" <= 30),
  "caloriesPerServing" integer NOT NULL CHECK ("caloriesPerServing" > 0),
  "proteinGPerServing" numeric(5,2) NOT NULL CHECK ("proteinGPerServing" > 0),
  "carbsGPerServing" numeric(5,2) NOT NULL CHECK ("carbsGPerServing" >= 0),
  "fatGPerServing" numeric(5,2) NOT NULL CHECK ("fatGPerServing" >= 0),
  diet text NOT NULL CHECK (diet IN ('omnivore','flexitarian','vegetarian','vegan')),
  "proteinCategory" text NOT NULL CHECK ("proteinCategory" IN ('Beef','Poultry','Fish','Eggs','Dairy','Tofu','Legumes','Meat alternatives')),
  "cookingLevel" text NOT NULL CHECK ("cookingLevel" IN ('beginner','intermediate','advanced')),
  "equipmentRequired" text[] NOT NULL DEFAULT '{}',
  "batchFriendly" boolean NOT NULL DEFAULT false,
  allergens text[] NOT NULL DEFAULT '{}',
  ingredients jsonb NOT NULL,
  instructions text[] NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  "cuisineType" text,
  "imageFilename" text,
  "cookingTip" text,
  "gptAutoEvaluation" jsonb,
  source text DEFAULT 'gpt_generated',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived','review_needed')),
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."recipeIngredient" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipeId" uuid NOT NULL REFERENCES public."recipe"(id) ON DELETE CASCADE,
  "canonicalIngredientId" uuid NOT NULL REFERENCES public."ingredientCanonical"(id) ON DELETE CASCADE,
  "originalName" text NOT NULL,
  quantity numeric(8,2) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  "isOptional" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE ("recipeId","canonicalIngredientId")
);

CREATE TABLE IF NOT EXISTS public."userRecipeHistory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  "recipeId" uuid NOT NULL REFERENCES public."recipe"(id) ON DELETE CASCADE,
  "menuResultId" uuid REFERENCES public."menuResult"(id) ON DELETE SET NULL,
  "consumedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "servingCount" integer NOT NULL DEFAULT 1,
  "userRating" integer CHECK ("userRating" BETWEEN 1 AND 5),
  "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

-- ==================================================
-- STEP 3: INDEXES
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_ingredientCanonical_nameFr ON public."ingredientCanonical"("nameFr");
CREATE INDEX IF NOT EXISTS idx_ingredientCanonical_category ON public."ingredientCanonical"(category);
CREATE INDEX IF NOT EXISTS idx_ingredientCanonical_sectionCode ON public."ingredientCanonical"("sectionCode");
CREATE INDEX IF NOT EXISTS idx_ingredientAlias_normalizedForm ON public."ingredientAlias"("normalizedForm");
CREATE INDEX IF NOT EXISTS idx_ingredientAlias_canonicalId ON public."ingredientAlias"("canonicalId");

CREATE INDEX IF NOT EXISTS idx_recipe_diet ON public."recipe"(diet) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipe_proteinCategory ON public."recipe"("proteinCategory") WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipe_cookingLevel ON public."recipe"("cookingLevel") WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipe_caloriesPerServing ON public."recipe"("caloriesPerServing") WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipe_proteinGPerServing ON public."recipe"("proteinGPerServing") WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipe_equipmentRequired ON public."recipe" USING GIN ("equipmentRequired") WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipe_tags ON public."recipe" USING GIN (tags) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipe_allergens ON public."recipe" USING GIN (allergens) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_recipeIngredient_recipeId ON public."recipeIngredient"("recipeId");
CREATE INDEX IF NOT EXISTS idx_recipeIngredient_canonicalId ON public."recipeIngredient"("canonicalIngredientId");

CREATE INDEX IF NOT EXISTS idx_userRecipeHistory_userId ON public."userRecipeHistory"("userId","consumedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_userRecipeHistory_recipeId ON public."userRecipeHistory"("recipeId");

-- Foreign key performance indexes
CREATE INDEX IF NOT EXISTS idx_submission_userId ON public."submission"("userId");
CREATE INDEX IF NOT EXISTS idx_menuResult_submissionId ON public."menuResult"("submissionId");
CREATE INDEX IF NOT EXISTS idx_menuResult_userId ON public."menuResult"("userId");
CREATE INDEX IF NOT EXISTS idx_runLog_submissionId ON public."runLog"("submissionId");
CREATE INDEX IF NOT EXISTS idx_runLog_menuResultId ON public."runLog"("menuResultId");
CREATE INDEX IF NOT EXISTS idx_userRecipeHistory_menuResultId ON public."userRecipeHistory"("menuResultId");
CREATE INDEX IF NOT EXISTS idx_ingredientAlias_aliasName ON public."ingredientAlias"("aliasName");

-- ==================================================
-- STEP 4: FUNCTIONS & TRIGGERS
-- ==================================================

CREATE OR REPLACE FUNCTION public.normalize_ingredient_name(input_name text)
RETURNS text AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(input_name, '[àáâãäå]', 'a', 'g'),
        '[èéêë]', 'e', 'g'
      ),
      '[^a-z0-9]', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.update_ingredient_alias_normalized()
RETURNS trigger AS $$
BEGIN
  NEW."normalizedForm" := public.normalize_ingredient_name(NEW."aliasName");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE; -- row-dependent

DROP TRIGGER IF EXISTS ingredientAlias_normalize ON public."ingredientAlias";
CREATE TRIGGER ingredientAlias_normalize
  BEFORE INSERT OR UPDATE ON public."ingredientAlias"
  FOR EACH ROW EXECUTE FUNCTION public.update_ingredient_alias_normalized();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

DROP TRIGGER IF EXISTS recipe_updatedAt ON public."recipe";
CREATE TRIGGER recipe_updatedAt
  BEFORE UPDATE ON public."recipe"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Maintain updatedAt on ingredientCanonical
DROP TRIGGER IF EXISTS ingredientCanonical_updatedAt ON public."ingredientCanonical";
CREATE TRIGGER ingredientCanonical_updatedAt
  BEFORE UPDATE ON public."ingredientCanonical"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_recipe_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(NEW."titleFr", '[àáâãäå]', 'a', 'g'),
          '[èéêë]', 'e', 'g'
        ),
        '[^a-z0-9]', '-', 'g'
      )
    );
    WHILE EXISTS(SELECT 1 FROM public."recipe" r WHERE r.slug = NEW.slug AND r.id <> COALESCE(NEW.id, gen_random_uuid())) LOOP
      NEW.slug := NEW.slug || '-' || floor(extract(epoch FROM now()))::text;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

DROP TRIGGER IF EXISTS recipe_generateSlug ON public."recipe";
CREATE TRIGGER recipe_generateSlug
  BEFORE INSERT OR UPDATE ON public."recipe"
  FOR EACH ROW EXECUTE FUNCTION public.generate_recipe_slug();

-- ==================================================
-- COMPLETION MESSAGE
-- ==================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 Quinoïa Database (camelCase) Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables: user, submission, menuResult, runLog';
  RAISE NOTICE '         ingredientCanonical, ingredientAlias';
  RAISE NOTICE '         recipe, recipeIngredient, userRecipeHistory';
  RAISE NOTICE 'Indexes & triggers installed.';
  RAISE NOTICE 'Next: seed ingredients → import recipes → run tests.';
END $$;
