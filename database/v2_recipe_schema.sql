-- Quinoïa v2.0 - Recipe Database Schema
-- Enhanced recipe system with canonical ingredient references
-- Designed for sub-second recipe selection with 200+ recipes

CREATE TABLE public.recipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_fr TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  servings_base INTEGER NOT NULL CHECK (servings_base BETWEEN 1 AND 8),
  prep_time_minutes INTEGER NOT NULL CHECK (prep_time_minutes <= 30),

  -- Nutrition per serving (critical for scoring algorithm)
  calories_per_serving INTEGER NOT NULL CHECK (calories_per_serving > 0),
  protein_g_per_serving NUMERIC(5,2) NOT NULL CHECK (protein_g_per_serving > 0),
  carbs_g_per_serving NUMERIC(5,2) NOT NULL CHECK (carbs_g_per_serving >= 0),
  fat_g_per_serving NUMERIC(5,2) NOT NULL CHECK (fat_g_per_serving >= 0),

  -- Classification for selection algorithm
  diet TEXT NOT NULL CHECK (diet IN ('omnivore', 'flexitarian', 'vegetarian', 'vegan')),
  protein_category TEXT NOT NULL CHECK (protein_category IN (
    'Beef', 'Poultry', 'Fish', 'Eggs', 'Dairy', 'Tofu', 'Legumes', 'Meat alternatives'
  )),
  cooking_level TEXT NOT NULL CHECK (cooking_level IN ('beginner', 'intermediate', 'advanced')),

  -- Features for filtering and scoring
  equipment_required TEXT[] NOT NULL DEFAULT '{}',
  batch_friendly BOOLEAN NOT NULL DEFAULT false,
  allergens TEXT[] NOT NULL DEFAULT '{}', -- ['gluten', 'lactose', 'poisson', 'œufs', 'soja']

  -- Content with canonical ingredient references (CRITICAL FOR V2.0)
  ingredients JSONB NOT NULL, -- [{'nom':'Quinoa', 'quantite':200, 'unite':'g', 'canonical_id':'uuid'}]
  instructions TEXT[] NOT NULL,

  -- Recipe tagging
  tags TEXT[] NOT NULL DEFAULT '{}', -- ['protéiné', 'asiatique', 'été']

  -- Recipe metadata
  cuisine_type TEXT, -- 'française', 'asiatique', 'méditerranéenne', 'autre'
  image_filename TEXT,
  cooking_tip TEXT,

  -- Quality control and sourcing
  gpt_auto_evaluation JSONB, -- GPT quality assessment scores
  source TEXT DEFAULT 'gpt_generated',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'review_needed')),

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Recipe ingredient junction table for normalized queries
CREATE TABLE public.recipe_ingredient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  canonical_ingredient_id UUID NOT NULL REFERENCES ingredient_canonical(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL, -- "quinoa blanc" from recipe
  quantity NUMERIC(8,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(recipe_id, canonical_ingredient_id)
);

-- User recipe history for recency tracking (21-day window)
CREATE TABLE public.user_recipe_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  menu_result_id UUID REFERENCES public.menuResult(id) ON DELETE SET NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  serving_count INTEGER NOT NULL DEFAULT 1,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Critical performance indexes for <2s recipe selection
CREATE INDEX idx_recipe_diet ON recipe(diet) WHERE status = 'active';
CREATE INDEX idx_recipe_protein_category ON recipe(protein_category) WHERE status = 'active';
CREATE INDEX idx_recipe_cooking_level ON recipe(cooking_level) WHERE status = 'active';
CREATE INDEX idx_recipe_calories ON recipe(calories_per_serving) WHERE status = 'active';
CREATE INDEX idx_recipe_protein ON recipe(protein_g_per_serving) WHERE status = 'active';
CREATE INDEX idx_recipe_prep_time ON recipe(prep_time_minutes) WHERE status = 'active';
CREATE INDEX idx_recipe_batch_friendly ON recipe(batch_friendly) WHERE status = 'active';

-- GIN indexes for array searches
CREATE INDEX idx_recipe_equipment ON recipe USING GIN(equipment_required) WHERE status = 'active';
CREATE INDEX idx_recipe_tags ON recipe USING GIN(tags) WHERE status = 'active';
CREATE INDEX idx_recipe_allergens ON recipe USING GIN(allergens) WHERE status = 'active';
-- Removed: favorite_foods_tags and disliked_foods_tags indexes (fields removed)

-- Ingredient junction indexes
CREATE INDEX idx_recipe_ingredient_recipe ON recipe_ingredient(recipe_id);
CREATE INDEX idx_recipe_ingredient_canonical ON recipe_ingredient(canonical_ingredient_id);

-- User history indexes for recency calculation
CREATE INDEX idx_user_recipe_history_user ON user_recipe_history(user_id, consumed_at DESC);
CREATE INDEX idx_user_recipe_history_recipe ON user_recipe_history(recipe_id);
CREATE INDEX idx_user_recipe_history_recent ON user_recipe_history(consumed_at) WHERE consumed_at > NOW() - INTERVAL '21 days';

-- Composite index for recipe selection scoring
CREATE INDEX idx_recipe_selection_scoring ON recipe(diet, protein_category, calories_per_serving, protein_g_per_serving) 
  WHERE status = 'active';

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_updated_at BEFORE UPDATE ON recipe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Slug generation from title
CREATE OR REPLACE FUNCTION generate_recipe_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(NEW.title_fr, '[àáâãäå]', 'a', 'g'),
          '[èéêë]', 'e', 'g'
        ),
        '[^a-z0-9]', '-', 'g'
      )
    );
    
    -- Ensure uniqueness
    WHILE EXISTS(SELECT 1 FROM recipe WHERE slug = NEW.slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
      NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_generate_slug BEFORE INSERT OR UPDATE ON recipe
  FOR EACH ROW EXECUTE FUNCTION generate_recipe_slug();

-- Nutrition validation function (calories should approximately match macronutrients)
CREATE OR REPLACE FUNCTION validate_recipe_nutrition()
RETURNS TRIGGER AS $$
DECLARE
  calculated_calories INTEGER;
  variance_percent NUMERIC;
BEGIN
  -- Calculate expected calories: 4 kcal/g for protein & carbs, 9 kcal/g for fat
  calculated_calories := ROUND(
    (NEW.protein_g_per_serving * 4) + 
    (NEW.carbs_g_per_serving * 4) + 
    (NEW.fat_g_per_serving * 9)
  );
  
  -- Allow ±15% variance (per MVP specs)
  variance_percent := ABS(NEW.calories_per_serving - calculated_calories)::NUMERIC / calculated_calories * 100;
  
  IF variance_percent > 15 THEN
    RAISE WARNING 'Recipe % nutrition may be implausible: declared %kcal vs calculated %kcal (%.1f%% variance)',
      NEW.title_fr, NEW.calories_per_serving, calculated_calories, variance_percent;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_nutrition_validation BEFORE INSERT OR UPDATE ON recipe
  FOR EACH ROW EXECUTE FUNCTION validate_recipe_nutrition();

-- RLS policies
ALTER TABLE recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredient ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_history ENABLE ROW LEVEL SECURITY;

-- Public read access for active recipes
CREATE POLICY recipe_public_read ON recipe FOR SELECT USING (status = 'active');
CREATE POLICY recipe_ingredient_public_read ON recipe_ingredient FOR SELECT USING (true);

-- User-specific history access
CREATE POLICY user_recipe_history_own ON user_recipe_history FOR ALL 
  USING (user_id = (current_setting('app.user_id', true))::UUID);

-- Service role full access
CREATE POLICY recipe_service_all ON recipe FOR ALL 
  USING (current_setting('role', true) = 'service_role');
CREATE POLICY recipe_ingredient_service_all ON recipe_ingredient FOR ALL 
  USING (current_setting('role', true) = 'service_role');
CREATE POLICY user_recipe_history_service_all ON user_recipe_history FOR ALL 
  USING (current_setting('role', true) = 'service_role');

-- Table comments
COMMENT ON TABLE recipe IS 'Core recipe catalog with canonical ingredient references. Optimized for <2s selection queries.';
COMMENT ON TABLE recipe_ingredient IS 'Normalized recipe-ingredient relationships for efficient ingredient aggregation.';
COMMENT ON TABLE user_recipe_history IS 'User recipe consumption history for 21-day recency tracking.';
COMMENT ON COLUMN recipe.ingredients IS 'JSONB array with canonical_id references for shopping list aggregation';
COMMENT ON COLUMN recipe.protein_category IS 'Used for diversity rotation: Beef → Poultry → Fish → Eggs → Dairy → Tofu → Legumes → Meat alternatives';