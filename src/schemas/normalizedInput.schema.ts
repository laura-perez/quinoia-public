import { z } from "zod";
import {
  canonicalAllergens,
  extractAllergens,
} from "./mappers";

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
export const primaryGoalEnum = ["saveTime", "eatHealthier", "weightLoss"] as const;
const dailyStepsEnum = ["<5k", "5-8k", ">8k"] as const;
const sessionsPerWeekEnum = ["0", "1-2", "3-4", ">=5"] as const;
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
    heightCm: z.coerce.number().min(120, { message: "Taille minimale 120 cm" }).max(230, { message: "Taille maximale 230 cm" }),
    weightKg: z.coerce.number().min(30, { message: "Poids minimal 30 kg" }).max(250, { message: "Poids maximal 250 kg" }),
    diet: z.enum(dietEnum),
    proteinPreferences: z.array(z.enum(proteinEnum)).default([]),
    equipmentAvailable: z.array(z.enum(equipmentEnum)).default([]),
    cookingLevel: z.enum(cookingLevelEnum),
    numRecipes: z.coerce.number().int().min(2).max(7),
    numServings: z.coerce.number().int().min(1).max(4),
    favoriteFoods: z.string().trim().max(500).optional(),
    dislikedFoods: z.string().trim().max(500).optional(),
    batchMode: z.boolean(),
    primaryGoal: z.enum(primaryGoalEnum),
    secondaryFocus: z.union([z.literal("highProtein"), z.null()]),
    activity: z
      .object({
        deskJob: z.boolean(),
        dailySteps: z.enum(dailyStepsEnum),
        sessionsPerWeek: z.enum(sessionsPerWeekEnum),
        highIntensity: z.boolean(),
      })
      .strict(),
    allergiesText: z.string().trim().max(300).optional(),
    allergens: z.array(z.enum(allergensEnum)).default([]),
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
