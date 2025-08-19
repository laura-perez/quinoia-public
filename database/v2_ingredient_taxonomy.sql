-- Quinoïa v2.0 - Ingredient Taxonomy System (CamelCase Version)
-- Use ONLY if you need to (re)deploy taxonomy separately from the unified create-base-and-v2-tables-fixed.sql
-- All identifiers converted to camelCase to match authoritative schema.

-- Master canonical ingredient table
CREATE TABLE IF NOT EXISTS public."ingredientCanonical" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nameFr" TEXT NOT NULL UNIQUE, -- "Quinoa", "Courgette", "Tomate"
  category TEXT NOT NULL, -- "Féculents", "Légumes", "Protéines", etc.
  "sectionCode" TEXT NOT NULL, -- store organization: "frais", "sec", "surgele", "epicerie"
  "defaultUnit" TEXT NOT NULL CHECK ("defaultUnit" IN ('g','ml','piece')),
  "densityGPerMl" NUMERIC(4,2), -- for ml->g conversion (e.g., 1.0 water, 0.92 oil)
  "commonAliases" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fuzzy matching and alias system for ingredient recognition
CREATE TABLE IF NOT EXISTS public."ingredientAlias" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "canonicalId" UUID NOT NULL REFERENCES public."ingredientCanonical"(id) ON DELETE CASCADE,
  "aliasName" TEXT NOT NULL,
  "normalizedForm" TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','fuzzy_match','gpt_mapping')),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE("aliasName","canonicalId")
);

-- Performance indexes for sub-second lookups
CREATE INDEX IF NOT EXISTS idx_ingredientCanonical_nameFr ON public."ingredientCanonical"("nameFr");
CREATE INDEX IF NOT EXISTS idx_ingredientCanonical_category ON public."ingredientCanonical"(category);
CREATE INDEX IF NOT EXISTS idx_ingredientCanonical_sectionCode ON public."ingredientCanonical"("sectionCode");

CREATE INDEX IF NOT EXISTS idx_ingredientAlias_normalizedForm ON public."ingredientAlias"("normalizedForm");
CREATE INDEX IF NOT EXISTS idx_ingredientAlias_canonicalId ON public."ingredientAlias"("canonicalId");
CREATE INDEX IF NOT EXISTS idx_ingredientAlias_confidence ON public."ingredientAlias"(confidence DESC);

-- Function to normalize ingredient names for fuzzy matching
CREATE OR REPLACE FUNCTION normalize_ingredient_name(input_name TEXT)
RETURNS TEXT AS $$
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

-- Trigger to auto-generate normalized_form
CREATE OR REPLACE FUNCTION public.update_ingredient_alias_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW."normalizedForm" := normalize_ingredient_name(NEW."aliasName");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ingredientAlias_normalize ON public."ingredientAlias";
CREATE TRIGGER ingredientAlias_normalize
  BEFORE INSERT OR UPDATE ON public."ingredientAlias"
  FOR EACH ROW EXECUTE FUNCTION public.update_ingredient_alias_normalized();

-- RLS policies for security
ALTER TABLE public."ingredientCanonical" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ingredientAlias" ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated sessions (recipes need this for selection)
DROP POLICY IF EXISTS ingredientCanonical_read ON public."ingredientCanonical";
CREATE POLICY ingredientCanonical_read ON public."ingredientCanonical" FOR SELECT USING (true);
DROP POLICY IF EXISTS ingredientAlias_read ON public."ingredientAlias";
CREATE POLICY ingredientAlias_read ON public."ingredientAlias" FOR SELECT USING (true);

-- Only service role can modify taxonomy (admin operations)
DROP POLICY IF EXISTS ingredientCanonical_admin ON public."ingredientCanonical";
CREATE POLICY ingredientCanonical_admin ON public."ingredientCanonical" FOR ALL 
  USING (current_setting('role', true) = 'service_role');
DROP POLICY IF EXISTS ingredientAlias_admin ON public."ingredientAlias";
CREATE POLICY ingredientAlias_admin ON public."ingredientAlias" FOR ALL 
  USING (current_setting('role', true) = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public."ingredientCanonical" IS 'Master ingredient taxonomy for canonical shopping list aggregation. Critical for v2.0 launch.';
COMMENT ON TABLE public."ingredientAlias" IS 'Ingredient name variations and fuzzy matching system. Maps recipe ingredients to canonical form.';
COMMENT ON COLUMN public."ingredientCanonical".category IS 'Grocery store organization: "Légumes", "Féculents", "Protéines", etc.';
COMMENT ON COLUMN public."ingredientCanonical"."sectionCode" IS 'Store section: "frais", "sec", "surgele", "epicerie", "boucherie", "poissonnerie"';
COMMENT ON COLUMN public."ingredientAlias".confidence IS 'Matching confidence: 1.0 = exact, 0.9 = high, 0.7 = medium (manual review), <0.7 = low (reject)';