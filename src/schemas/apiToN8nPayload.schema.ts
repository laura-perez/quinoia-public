/**
 * Schema Zod pour le payload API → n8n
 * Conforme au contrat SPECS_MVP_QUINOIA v1.1 section 4.5
 */
import { z } from "zod";
import { primaryGoalEnum } from "./normalizedInput.schema";

// Profile de sélection (non-PII)
const profileSchema = z.object({
  diet: z.enum(["omnivore", "flexitarian", "vegetarian", "vegan"]),
  equipmentAvailable: z.array(z.enum(["Oven", "Blender", "Thermomix", "Air Fryer"])),
  cookingLevel: z.enum(["beginner", "intermediate", "advanced"]),
  proteinPreferences: z.array(z.enum([
    "Beef", "Poultry", "Meat alternatives", "Fish", 
    "Eggs", "Dairy", "Legumes", "Tofu"
  ])),
  favoriteFoods: z.string().optional(),
  dislikedFoods: z.string().optional(),
  batchMode: z.boolean(),
  numRecipes: z.number().int().min(2).max(7),
  numServings: z.number().int().min(1).max(4),
}).strict();

// Fenêtre énergétique et protéique
const windowSchema = z.object({
  mealMinKcal: z.number().int().positive(),
  mealMaxKcal: z.number().int().positive(),
  mealTargetKcal: z.number().int().positive(),
  proteinFloorG: z.number().int().positive(),
}).strict();

// Policy de sélection
const policySchema = z.object({
  primaryGoal: z.enum(primaryGoalEnum),
  secondaryFocus: z.union([z.literal("highProtein"), z.null()]),
  mealShare: z.number().positive(),
  tolerancePct: z.number().positive(),
}).strict();

// Targets calculés (copiés vers n8n)
const targetsSchema = z.object({
  bmrKcal: z.number().int().positive(),
  activityFactor: z.number().min(1.35).max(1.7),
  tdeeKcal: z.number().int().positive(),
  dailyTargetKcal: z.number().int().positive(),
}).strict();

// Récence et exclusions
const recencySchema = z.object({
  excludeRecipeIds: z.array(z.string()),
  recentStrict: z.array(z.string()), // ≤14j exclus en dur
  recentSoft: z.array(z.string()),   // 14-21j autorisés max 2 avec malus
}).strict();

// Traçabilité
const traceSchema = z.object({
  runId: z.string().uuid(),
  submissionId: z.string().uuid(),
  contractVersion: z.string(),
}).strict();

// Payload complet API → n8n (strictement non-PII)
export const apiToN8nPayloadSchema = z.object({
  profile: profileSchema,
  window: windowSchema,
  policy: policySchema,
  targets: targetsSchema,
  recency: recencySchema,
  trace: traceSchema,
}).strict();

export type ApiToN8nPayload = z.infer<typeof apiToN8nPayloadSchema>;
