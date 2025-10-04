import { z } from "zod";
import { canonicalAllergens, extractAllergens } from "./mappers";

const genderEnum = ["female", "male", "unspecified"] as const;
const dietEnum = ["omnivore", "flexitarian", "vegetarian", "vegan"] as const;
const proteinEnum = [
  "Beef",
  "Poultry",
  "Meat alternatives",
  "Fish",
  "Eggs",
  "Dairy",
  "Legumes",
  "Tofu",
] as const;
const equipmentEnum = ["Oven", "Blender", "Thermomix", "Air Fryer"] as const;
const cookingLevelEnum = ["beginner", "intermediate", "advanced"] as const;
const allergensEnum = [
  "Gluten",
  "Milk",
  "Eggs",
  "Fish",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Sesame",
  "Shellfish",
  "Mustard",
] as const;

export const normalizedInputSchema = z
  .object({
    email: z.string().trim().toLowerCase().email({ message: "Email invalide" }),
    firstName: z.string().trim().max(80).optional(),
    age: z.coerce.number().int().min(13).max(100),
    gender: z.enum(genderEnum),
    diet: z.enum(dietEnum),
    proteinPreferences: z.array(z.enum(proteinEnum)).default([]),
    equipmentAvailable: z.array(z.enum(equipmentEnum)).default([]),
    cookingLevel: z.enum(cookingLevelEnum),
    numRecipes: z.coerce.number().int().min(2).max(7),
    numServings: z.coerce.number().int().min(1).max(4),
    favoriteFoods: z.string().trim().max(500).optional(),
    dislikedFoods: z.string().trim().max(500).optional(),
    batchMode: z.boolean(),
    allergiesText: z.string().trim().max(300).optional(),
    allergens: z.array(z.enum(allergensEnum)).default([]),
    otherAllergies: z.string().trim().max(300).optional(),
    locale: z.literal("fr-FR"),
    unitSystem: z.literal("metric"),
    consent: z.literal(true),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.allergiesText && (!data.allergens || data.allergens.length === 0)) {
      const extracted = extractAllergens(data.allergiesText);
      if (extracted.length > 0) {
        // @ts-expect-error: Zod doesn't allow mutation, but we want to suggest the canonical extraction
        data.allergens = extracted;
      }
    }
  });

export type NormalizedInput = z.infer<typeof normalizedInputSchema>;
