/**
 * Form Options Constants
 * Centralized form data options used across onboarding and preferences
 */

// Diet type options (French labels)
export const DIET_OPTIONS = [
  "Omnivore",
  "Flexitarien",
  "Végétarien",
  "Vegan"
] as const;

// Protein preferences options (French labels)
export const PROTEIN_OPTIONS = [
  "Boeuf",
  "Volaille",
  "Poisson",
  "Œufs",
  "Fromages, Produits laitiers",
  "Tofu",
  "Légumineuses (Pois chiches, lentilles ..)",
  "Simili-viandes (Heura, LaVie etc ..)",
] as const;

// Allergy options with internal values and display labels
export const ALLERGY_OPTIONS = [
  { value: "none", label: "Aucune" },
  { value: "Gluten", label: "Gluten" },
  { value: "Milk", label: "Lactose" },
  { value: "Tree nuts", label: "Noix" },
  { value: "Eggs", label: "Œufs" },
  { value: "other", label: "Autres" }
] as const;

// Cooking level options (French labels with descriptions)
export const COOKING_LEVELS = [
  "Débutant : Je veux juste que ce soit simple et rapide",
  "Intermédiaire : Je suis à l'aise, mais pas un chef non plus",
  "Confirmé : Cuisiner, c'est mon terrain de jeu",
] as const;

// Equipment options (French labels)
export const EQUIPMENT_OPTIONS = [
  "Four",
  "Mixeur/Blender",
  "Thermomix",
  "Air Fryer"
] as const;

// Portion count options
export const PORTION_COUNTS = [2, 3, 4] as const;

// Recipe count options - free tier
export const RECIPE_COUNTS_FREE = [2, 3] as const;

// Recipe count options - premium tier
export const RECIPE_COUNTS_PREMIUM = [2, 3, 4, 5, 6, 7] as const;

// Premium-only recipe counts (for displaying locked options)
export const RECIPE_COUNTS_PREMIUM_ONLY = [4, 5, 6, 7] as const;

/**
 * Helper to get recipe count options based on user tier
 */
export function getRecipeCountOptions(isPremium: boolean): readonly number[] {
  return isPremium ? RECIPE_COUNTS_PREMIUM : RECIPE_COUNTS_FREE;
}

/**
 * Helper to get premium-only recipe counts based on user tier
 */
export function getPremiumOnlyRecipeCounts(isPremium: boolean): readonly number[] {
  return isPremium ? [] : RECIPE_COUNTS_PREMIUM_ONLY;
}
