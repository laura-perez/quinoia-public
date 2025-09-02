/**
 * Shopping List Types
 * TypeScript interfaces for shopping list generation
 */

export interface RecipeIngredient {
  nom: string;
  quantite?: number;
  unite?: string;
  canonicalId?: string;
  canonicalName?: string;
  section?: string;
}

export interface Recipe {
  id: string;
  titleFr: string;
  ingredients: RecipeIngredient[];
  servingsBase: number;
}

export interface ScaledIngredient {
  recipe_id: string;
  recipe_title: string;
  nom: string;
  scaled_amount: number;
  unite: string;
  canonicalId?: string;
  canonicalName?: string;
  serving_multiplier: number;
}

export interface ShoppingListItem {
  canonical_ingredient_id: string;
  name_fr: string;
  total_amount: number;
  unit: string;
  category: string;
  section_code: string;
  sources: Array<{
    recipe_id: string;
    recipe_title: string;
    amount: number;
    original_name: string;
    serving_multiplier: number;
  }>;
}

export interface ShoppingList {
  items: ShoppingListItem[];
  organizedByCategory: Array<{
    category: string;
    section_code: string;
    items: ShoppingListItem[];
  }>;
  summary: {
    totalItems: number;
    totalCategories: number;
    totalRecipes: number;
    unmappedIngredients: number;
  };
}