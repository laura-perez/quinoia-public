-- Recipe catalog tables for fast launch
-- Add to existing schema

CREATE TABLE public.recipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_fr TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  servings_base INTEGER NOT NULL CHECK (servings_base >= 1 AND servings_base <= 8),
  prep_time_minutes INTEGER NOT NULL CHECK (prep_time_minutes <= 30),
  
  -- Nutrition per serving
  calories_per_serving INTEGER NOT NULL,
  protein_g_per_serving NUMERIC(5,2) NOT NULL,
  carbs_g_per_serving NUMERIC(5,2) NOT NULL,
  fat_g_per_serving NUMERIC(5,2) NOT NULL,
  
  -- Classification for scoring algorithm
  diet TEXT NOT NULL CHECK (diet IN ('omnivore', 'flexitarian', 'vegetarian', 'vegan')),
  protein_category TEXT NOT NULL CHECK (protein_category IN ('Beef', 'Poultry', 'Fish', 'Eggs', 'Dairy', 'Tofu', 'Legumes', 'Meat alternatives')),
  cooking_level TEXT NOT NULL CHECK (cooking_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- Equipment and preferences
  equipment_required TEXT[] NOT NULL DEFAULT '{}',
  batch_friendly BOOLEAN NOT NULL DEFAULT false,
  
  -- Ingredients as JSONB for flexibility
  ingredients JSONB NOT NULL,
  instructions TEXT[] NOT NULL,
  
  -- Preference matching
  favorite_foods_tags TEXT[] NOT NULL DEFAULT '{}',
  disliked_foods_tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Quality metadata
  gpt_auto_evaluation JSONB,
  cooking_tip TEXT,
  
  -- Admin
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for fast filtering and scoring
CREATE INDEX idx_recipe_diet ON public.recipe(diet);
CREATE INDEX idx_recipe_protein_category ON public.recipe(protein_category);
CREATE INDEX idx_recipe_cooking_level ON public.recipe(cooking_level);
CREATE INDEX idx_recipe_calories ON public.recipe(calories_per_serving);
CREATE INDEX idx_recipe_protein ON public.recipe(protein_g_per_serving);
CREATE INDEX idx_recipe_equipment ON public.recipe USING GIN(equipment_required);
CREATE INDEX idx_recipe_status ON public.recipe(status);

-- User recipe history for recency tracking
CREATE TABLE public.user_recipe_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user(id),
  recipe_id UUID NOT NULL REFERENCES public.recipe(id),
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  menu_result_id UUID REFERENCES public.menuResult(id),
  
  UNIQUE(user_id, recipe_id, consumed_at)
);

CREATE INDEX idx_user_recipe_consumption_user_date ON public.user_recipe_consumption(user_id, consumed_at DESC);
CREATE INDEX idx_user_recipe_consumption_recipe ON public.user_recipe_consumption(recipe_id);