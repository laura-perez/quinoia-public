import { z } from "zod";

import { normalizedInputSchema } from "@/schemas/normalizedInput.schema";

export const resultBundleSchema = z
  .object({
    version: z.literal("v1"),
    shareId: z.string().min(8),
    generatedAt: z.string(),
    meta: z
      .object({
        numRecipes: z.number().int().min(1),
        numServings: z.number().int().min(1),
      })
      .strict(),
    recipes: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string(),
            timeMinutes: z.number().int().positive(),
            difficulty: z.enum(["beginner", "intermediate", "advanced"]),
            nutritionPerServing: z
              .object({
                calories: z.number(),
                proteins: z.number(),
                carbs: z.number(),
                fats: z.number(),
              })
              .strict(),
            servings: z.number().int().min(1),
            ingredients: z.array(
              z
                .object({
                  name: z.string(),
                  quantity: z.number().optional(),
                  unit: z.string().optional(),
                })
                .strict()
            ),
            steps: z.array(z.string()),
            imageUrl: z.string().url().optional(),
          })
          .strict()
      )
      .min(1),
    shoppingList: z
      .object({
        items: z.array(
          z
            .object({
              name: z.string(),
              quantity: z.number().nullable(),
              unit: z.string().nullable(),
              section: z.string().optional(),
              sources: z.array(
                z
                  .object({
                    recipeId: z.string(),
                    amount: z.number().optional(),
                    unit: z.string().optional(),
                  })
                  .strict()
              ),
            })
            .strict()
        ),
        summary: z
          .object({
            itemsCount: z.number().int().min(0),
          })
          .optional(),
      })
      .strict(),
    tips: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
    audit: z
      .object({
        selectionPolicyVersion: z.string(),
        catalogVersion: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export type ResultBundle = z.infer<typeof resultBundleSchema>;
