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

/**
 * Transforme le payload du formulaire (clés/valeurs FR) en un objet prêt pour NormalizedInput.
 */
export function normalizeFormInput(form: any): unknown {
  return {
    email: form.email,
    firstName: form.name?.trim(),
    age: form.age,
    gender: mapValue(genderMap, form.gender) ?? "unspecified",
    heightCm: form.height_cm,
    weightKg: form.weight_kg,
    diet: mapValue(dietMap, form.diet_type),
    proteinPreferences: mapArrayUnique(proteinPreferenceMap, form.protein_preference || []),
    equipmentAvailable: mapArrayUnique(equipmentMap, form.equipment || []),
    cookingLevel: mapValue(cookingLevelMap, form.cooking_level) ?? "beginner",
    numRecipes: form.nbRecipes,
    numServings: form.nbPortions,
    favoriteFoods: form.favourite_food?.trim(),
    dislikedFoods: form.disliked_food?.trim(),
    batchMode: !!form.batch,
    primaryGoal: form.primaryGoal,
    secondaryFocus: form.secondaryFocus ?? null,
    activity: { ...form.physicalActivity },
    allergiesText: form.allergies?.trim() || undefined,
    allergens: extractAllergens(form.allergies || ""),
    locale: "fr-FR",
    unitSystem: "metric",
    consent: !!form.consent,
  };
}
