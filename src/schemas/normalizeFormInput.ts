import {
  genderMap,
  dietMap,
  cookingLevelMap,
  proteinPreferenceMap,
  equipmentMap,
  allergenSynonymsFr,
  mapValue,
  mapArrayUnique,
  extractAllergens,
} from "./mappers";
import type { RawFormData } from "./api.types";

/**
 * Type for the output of normalizeFormInput function
 */
export interface NormalizedFormOutput {
  email: string;
  firstName?: string;
  age: number;
  gender: string;
  diet: string;
  proteinPreferences: string[];
  equipmentAvailable: string[];
  cookingLevel: string;
  numRecipes: number;
  numServings: number;
  favoriteFoods?: string;
  dislikedFoods?: string;
  batchMode: boolean;
  allergiesText?: string;
  allergens: string[];
  otherAllergies?: string;
  locale: string;
  unitSystem: string;
  consent: boolean;
}

/**
 * Transforms form payload (camelCase) into normalized input object.
 */
export function normalizeFormInput(form: unknown): NormalizedFormOutput {
  // Type guard - in production, validate with Zod schema
  const f = form as RawFormData;
  return {
    email: f.email,
    firstName: f.name?.trim(),
    age: f.age,
    gender: mapValue(genderMap, f.gender) ?? "unspecified",
    diet: mapValue(dietMap, f.dietType) ?? "omnivore",
    proteinPreferences: mapArrayUnique(proteinPreferenceMap, f.proteinPreferences || []),
    equipmentAvailable: mapArrayUnique(equipmentMap, f.equipmentAvailable || []),
    cookingLevel: mapValue(cookingLevelMap, f.cookingLevel) ?? "beginner",
    numRecipes: f.numRecipes,
    numServings: f.numServings,
    favoriteFoods: Array.isArray(f.favoriteFoods)
      ? f.favoriteFoods.join(', ')
      : f.favoriteFoods?.trim(),
    dislikedFoods: Array.isArray(f.dislikedFoods)
      ? f.dislikedFoods.join(', ')
      : f.dislikedFoods?.trim(),
    batchMode: false,
    allergiesText: [
      Array.isArray(f.allergens) ? f.allergens.join(', ') : f.allergens?.trim(),
      f.otherAllergies?.trim()
    ].filter(Boolean).join(', ') || undefined,
    allergens: [
      ...(Array.isArray(f.allergens) 
        ? mapArrayUnique(allergenSynonymsFr, f.allergens.filter(a => a !== "Aucune" && a !== "Autres"))
        : [...extractAllergens(f.allergens || "")]),
      ...(f.otherAllergies ? extractAllergens(f.otherAllergies) : [])
    ].filter(Boolean),
    otherAllergies: f.otherAllergies?.trim(),
    locale: "fr-FR",
    unitSystem: "metric",
    consent: !!f.consent,
  };
}
