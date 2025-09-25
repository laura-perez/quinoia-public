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
    favoriteFoods: f.favoriteFoods?.trim(),
    dislikedFoods: f.dislikedFoods?.trim(),
    batchMode: false,
    allergiesText: f.allergens?.trim() || undefined,
    allergens: [...extractAllergens(f.allergens || "")],
    locale: "fr-FR",
    unitSystem: "metric",
    consent: !!f.consent,
  };
}
