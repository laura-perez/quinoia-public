/**
 * Zod schemas for authentication API routes
 */

import { z } from 'zod';

/**
 * Schema for request magic link request body
 */
export const requestMagicLinkSchema = z.object({
  email: z
    .string({ message: "L'email est requis" })
    .email("Format d'email invalide")
    .trim()
    .toLowerCase(),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

/**
 * Schema for verify magic link query params
 */
export const verifyMagicLinkSchema = z.object({
  token: z
    .string({ message: 'Le token est requis' })
    .uuid({ message: 'Format de token invalide' }),
});

export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;
