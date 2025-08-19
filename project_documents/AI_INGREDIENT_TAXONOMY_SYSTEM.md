# AI-Generated Ingredient Taxonomy System

## Problem Statement: French Language Variant Challenge

**Core Issue**: French ingredients have multiple valid forms that must aggregate correctly:

- **Plural/Singular**: "oeufs" (eggs) vs "oeuf" (egg)
- **Accent variations**: "œuf" (traditional ligature) vs "oeuf" (simplified)
- **Regional variants**: "courgette" vs "zucchini"
- **Descriptive variants**: "quinoa blanc" + "quinoa rouge" → "quinoa"

Without canonical mapping, shopping lists fail to aggregate properly.

---

## Architecture: AI-Powered Canonical Mapping Pipeline

### **Stage 1: Base Canonical Generation**

```typescript
// File: src/lib/recipes/ingredientTaxonomy.ts

interface CanonicalIngredient {
  id: string;
  name_fr: string; // "Œuf" (canonical form)
  name_simplified: string; // "oeuf" (no accents, lowercase)
  category: string; // "Protéines"
  section_code: string; // "dairy-eggs"
  default_unit: "g" | "ml" | "piece";
  density_g_per_ml?: number;
  ai_confidence: number; // 0.0-1.0
  ai_generation_source: "gpt4" | "claude" | "manual";
  validation_status: "pending" | "validated" | "rejected";
}

interface IngredientVariant {
  canonical_id: string;
  variant_name: string; // "oeufs", "oeuf", "œuf"
  normalized_form: string; // "oeuf" (search key)
  confidence: number; // 0.0-1.0
  source: "ai_generation" | "fuzzy_match" | "manual";
  variant_type: "plural" | "accent" | "regional" | "descriptive";
}
```

### **Stage 2: AI Variant Generation Pipeline**

```typescript
// AI prompt for variant generation
const VARIANT_GENERATION_PROMPT = `
Generate all possible French variants for this ingredient: "{ingredient_name}"

Include:
1. Plural/singular forms (oeuf → oeufs)
2. Accent variations (œuf → oeuf) 
3. Regional synonyms (courgette → zucchini)
4. Common misspellings (tomatoe → tomate)
5. Descriptive variants (quinoa blanc, quinoa rouge → quinoa)

Format as JSON array with confidence scores:
[
  { "variant": "oeufs", "type": "plural", "confidence": 0.98 },
  { "variant": "oeuf", "type": "singular", "confidence": 1.0 },
  { "variant": "œuf", "type": "accent", "confidence": 0.95 }
]
`;

export async function generateIngredientVariants(
  canonical: CanonicalIngredient
): Promise<IngredientVariant[]> {
  const prompt = VARIANT_GENERATION_PROMPT.replace("{ingredient_name}", canonical.name_fr);

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a French culinary ingredient expert." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3, // Low for consistency
  });

  const aiVariants = JSON.parse(response.choices[0].message.content);

  return aiVariants.map((variant) => ({
    canonical_id: canonical.id,
    variant_name: variant.variant,
    normalized_form: normalizeForSearch(variant.variant),
    confidence: variant.confidence,
    source: "ai_generation",
    variant_type: variant.type,
  }));
}

// Normalize for fuzzy matching
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Decompose accents
    .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
    .replace(/œ/g, "oe") // Handle ligatures
    .replace(/[^a-z0-9]/g, "-") // Replace special chars
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
}
```

### **Stage 3: Intelligent Fuzzy Matching**

```typescript
// File: src/lib/recipes/ingredientMatcher.ts

import Fuse from "fuse.js";

interface MatchResult {
  canonical_id: string;
  canonical_name: string;
  matched_variant: string;
  confidence: number;
  match_type: "exact" | "fuzzy" | "ai_suggested";
}

export class IngredientMatcher {
  private fuseIndex: Fuse<IngredientVariant>;
  private exactLookup: Map<string, IngredientVariant>;

  constructor(variants: IngredientVariant[]) {
    // Exact lookup for normalized forms
    this.exactLookup = new Map();
    variants.forEach((variant) => {
      this.exactLookup.set(variant.normalized_form, variant);
    });

    // Fuzzy search index
    this.fuseIndex = new Fuse(variants, {
      keys: ["variant_name", "normalized_form"],
      threshold: 0.3, // Balance precision vs recall
      includeScore: true,
    });
  }

  async matchIngredient(inputName: string): Promise<MatchResult> {
    const normalized = normalizeForSearch(inputName);

    // 1. Try exact match first (highest confidence)
    const exactMatch = this.exactLookup.get(normalized);
    if (exactMatch) {
      return {
        canonical_id: exactMatch.canonical_id,
        canonical_name: await this.getCanonicalName(exactMatch.canonical_id),
        matched_variant: exactMatch.variant_name,
        confidence: exactMatch.confidence,
        match_type: "exact",
      };
    }

    // 2. Try fuzzy matching
    const fuzzyResults = this.fuseIndex.search(inputName);
    if (fuzzyResults.length > 0 && fuzzyResults[0].score! < 0.3) {
      const match = fuzzyResults[0].item;
      return {
        canonical_id: match.canonical_id,
        canonical_name: await this.getCanonicalName(match.canonical_id),
        matched_variant: match.variant_name,
        confidence: 1 - fuzzyResults[0].score!, // Invert score
        match_type: "fuzzy",
      };
    }

    // 3. AI-assisted matching for unknown ingredients
    return await this.aiAssistedMatch(inputName);
  }

  private async aiAssistedMatch(inputName: string): Promise<MatchResult> {
    const prompt = `
    Match this French ingredient to our canonical taxonomy: "${inputName}"
    
    Available canonicals: ${Array.from(this.canonicalNames).join(", ")}
    
    Return the best match or "NO_MATCH" if uncertain.
    Include confidence score 0.0-1.0.
    `;

    // AI matching logic here...
    // Queue for manual review if confidence < 0.7
  }
}
```

### **Stage 4: Example Implementation - "Œuf" Taxonomy**

```sql
-- Canonical ingredient (master record)
INSERT INTO ingredient_canonical (id, name_fr, name_simplified, category, section_code, default_unit)
VALUES (
  'uuid-oeuf-canonical',
  'Œuf',
  'oeuf',
  'Protéines',
  'dairy-eggs',
  'piece'
);

-- AI-generated variants
INSERT INTO ingredient_alias (canonical_id, alias_name, normalized_form, confidence, source, variant_type)
VALUES
  ('uuid-oeuf-canonical', 'œuf', 'oeuf', 1.0, 'ai_generation', 'canonical'),
  ('uuid-oeuf-canonical', 'oeuf', 'oeuf', 0.98, 'ai_generation', 'accent'),
  ('uuid-oeuf-canonical', 'oeufs', 'oeuf', 0.98, 'ai_generation', 'plural'),
  ('uuid-oeuf-canonical', 'œufs', 'oeuf', 0.96, 'ai_generation', 'plural_accent'),
  ('uuid-oeuf-canonical', 'oeuf de poule', 'oeuf-de-poule', 0.90, 'ai_generation', 'descriptive'),
  ('uuid-oeuf-canonical', 'oeufs frais', 'oeuf-frais', 0.88, 'ai_generation', 'descriptive');
```

### **Stage 5: Shopping List Aggregation Example**

```typescript
// Before canonical mapping (BROKEN):
// Recipe 1: "2 oeufs"
// Recipe 2: "1 œuf"
// Recipe 3: "3 oeufs frais"
// Result: 3 separate shopping list items ❌

// After canonical mapping (WORKS):
const ingredients = [
  { name: "oeufs", quantity: 2, recipe: "Omelette" },
  { name: "œuf", quantity: 1, recipe: "Gâteau" },
  { name: "oeufs frais", quantity: 3, recipe: "Crêpes" },
];

const matched = await Promise.all(
  ingredients.map(async (ing) => ({
    ...ing,
    canonical: await matcher.matchIngredient(ing.name),
  }))
);

// Aggregate by canonical_id
const aggregated = matched.reduce((acc, ing) => {
  const key = ing.canonical.canonical_id;
  if (acc[key]) {
    acc[key].total_quantity += ing.quantity;
    acc[key].sources.push({ recipe: ing.recipe, quantity: ing.quantity });
  } else {
    acc[key] = {
      canonical_name: ing.canonical.canonical_name, // "Œuf"
      total_quantity: ing.quantity,
      unit: "piece",
      sources: [{ recipe: ing.recipe, quantity: ing.quantity }],
    };
  }
  return acc;
}, {});

// Result:
// "Œuf": 6 pieces total ✅
// Sources: Omelette (2), Gâteau (1), Crêpes (3)
```

---

## Quality Assurance & Confidence Scoring

### **Confidence Thresholds**

```typescript
const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 0.95, // Auto-import without review
  MANUAL_REVIEW: 0.7, // Queue for human validation
  AI_SUGGEST: 0.5, // Show as suggestion
  REJECT: 0.5, // Too uncertain, manual entry required
};

interface QualityMetrics {
  total_ingredients: number;
  auto_approved: number;
  manual_review_queue: number;
  rejected_mappings: number;
  human_override_rate: number; // Track AI accuracy over time
}
```

### **Continuous Learning Pipeline**

```typescript
// Learn from human corrections
export async function recordHumanCorrection(
  originalInput: string,
  aiSuggestion: MatchResult,
  humanCorrection: MatchResult
): Promise<void> {
  // 1. Log for retraining
  await logTrainingData({
    input: originalInput,
    ai_prediction: aiSuggestion,
    human_truth: humanCorrection,
    correction_type: "human_override",
  });

  // 2. Update confidence models
  await updateConfidenceModels(originalInput, humanCorrection);

  // 3. Add to variant database
  if (!(await variantExists(originalInput, humanCorrection.canonical_id))) {
    await createVariant({
      canonical_id: humanCorrection.canonical_id,
      variant_name: originalInput,
      confidence: 1.0, // Human-validated
      source: "human_correction",
    });
  }
}
```

---

## Implementation Roadmap

### **Week 1: Foundation (Priority 1)**

1. **Day 1**: Deploy canonical ingredient schema + core French ingredients (200)
2. **Day 2**: Implement AI variant generation pipeline
3. **Day 3**: Build fuzzy matching system with confidence scoring

### **Week 2: Intelligence (Priority 2)**

4. **Day 4**: Integrate OpenAI for unknown ingredient suggestions
5. **Day 5**: Build manual review interface for low-confidence matches
6. **Day 6**: Implement continuous learning from human corrections

### **Week 3: Optimization (Priority 3)**

7. **Day 7**: Performance optimization (sub-100ms matching target)
8. **Day 8**: Expand to 500+ canonical ingredients with full variant coverage
9. **Day 9**: A/B test shopping list aggregation accuracy

---

## Success Metrics

### **Technical Performance**

- **Matching accuracy**: >95% for common ingredients
- **Response time**: <100ms for ingredient matching
- **Coverage**: >90% of recipe ingredients auto-matched

### **User Experience**

- **Shopping list aggregation**: "quinoa blanc" + "quinoa rouge" = "quinoa" ✅
- **Variant recognition**: "oeufs" + "œuf" + "oeuf" = "Œuf" ✅
- **Manual review rate**: <5% of ingredients require human intervention

### **Business Impact**

- **Shopping list utility**: Users report accurate, consolidated shopping lists
- **Recipe import efficiency**: GPT-generated recipes automatically mapped
- **Data quality**: Consistent ingredient taxonomy enables advanced analytics

This AI-powered taxonomy system solves the core aggregation challenge while maintaining French language authenticity and handling real-world ingredient variants intelligently.
