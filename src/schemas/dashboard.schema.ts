/**
 * Zod schemas for dashboard API routes
 */

import { z } from 'zod';

/**
 * Schema for generate menu request body
 */
export const generateMenuSchema = z.object({
  numRecipes: z
    .number({ message: 'Le nombre de recettes est requis' })
    .int('Le nombre de recettes doit être un entier')
    .min(2, 'Minimum 2 recettes')
    .max(7, 'Maximum 7 recettes'),
  numServings: z
    .number()
    .int()
    .min(1, 'Minimum 1 portion')
    .max(4, 'Maximum 4 portions')
    .optional()
    .default(2),
});

export type GenerateMenuInput = z.infer<typeof generateMenuSchema>;

/**
 * Schema for update menu swap request body
 * Note: Premium users can have more than 7 recipes (free users start with max 7)
 */
export const updateMenuSwapSchema = z.object({
  activeRecipeIds: z
    .array(z.string().uuid('ID de recette invalide'))
    .min(1, 'Au moins une recette active requise')
    .max(20, 'Maximum 20 recettes actives'), // Increased for premium users who can add recipes
  swapPoolRecipeIds: z
    .array(z.string().uuid('ID de recette invalide'))
    .max(10, 'Maximum 10 recettes dans le pool'),
  swapsCount: z
    .number()
    .int()
    .min(0, 'Le compteur de swaps ne peut pas être négatif'),
});

export type UpdateMenuSwapInput = z.infer<typeof updateMenuSwapSchema>;

/**
 * Schema for refetch pool request body
 */
export const refetchPoolSchema = z.object({
  excludeRecipeIds: z
    .array(z.string().uuid('ID de recette invalide'))
    .optional()
    .default([]),
});

export type RefetchPoolInput = z.infer<typeof refetchPoolSchema>;
