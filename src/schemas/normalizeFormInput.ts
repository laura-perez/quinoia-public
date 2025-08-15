import {
  genderMap,
  dietMap,
  cookingLevelMap,
  proteinPreferenceMap,
  equipmentMap,
  mapValue,
  mapArrayUnique,
  extractAllergens,
} from "./mappers";
import type { RawFormData } from "./api.types";

/**
 * Transforme le payload du formulaire (clés/valeurs FR) en un objet prêt pour NormalizedInput.
 */
export function normalizeFormInput(form: unknown): unknown {
  // Type guard - in a real app, we'd validate this properly
  const f = form as any;
  return {
    email: f.email,
    firstName: f.name?.trim(),
    age: f.age,
    gender: mapValue(genderMap, f.gender) ?? "unspecified",
    heightCm: f.height_cm,
    weightKg: f.weight_kg,
    diet: mapValue(dietMap, f.diet_type),
    proteinPreferences: mapArrayUnique(proteinPreferenceMap, f.protein_preference || []),
    equipmentAvailable: mapArrayUnique(equipmentMap, f.equipment || []),
    cookingLevel: mapValue(cookingLevelMap, f.cooking_level) ?? "beginner",
    numRecipes: f.nbRecipes,
    numServings: f.nbPortions,
    favoriteFoods: f.favourite_food?.trim(),
    dislikedFoods: f.disliked_food?.trim(),
    batchMode: !!f.batch,
    primaryGoal: f.primaryGoal,
    secondaryFocus: f.secondaryFocus ?? null,
    activity: { ...f.physicalActivity },
    allergiesText: f.allergies?.trim() || undefined,
    allergens: extractAllergens(f.allergies || ""),
    locale: "fr-FR",
    unitSystem: "metric",
    consent: !!f.consent,
  };
}
