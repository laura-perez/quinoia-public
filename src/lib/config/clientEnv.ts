import { z } from "zod";

/**
 * Client-side environment variables schema
 * These are NEXT_PUBLIC_* variables that are exposed to the browser
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z
    .string()
    .min(1, "reCAPTCHA site key is required")
    .refine((val) => val.startsWith("6L"), "Invalid reCAPTCHA site key format - must start with '6L'")
    .refine((val) => val.length === 40, "Invalid reCAPTCHA site key format - must be 40 characters long"),
});

/**
 * Validated client environment variables
 * Only call this in client-side code (components, not API routes)
 */
export function getClientEnv() {
  const _clientEnv = {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  };

  const parsed = clientEnvSchema.safeParse(_clientEnv);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((e) => `${String(e.path[0])}: ${e.message}`)
      .join("\n");
    throw new Error(`Client environment configuration error:\n${errors}`);
  }

  return parsed.data;
}

/**
 * Get reCAPTCHA site key with validation
 */
export function getRecaptchaSiteKey(): string {
  const clientEnv = getClientEnv();
  return clientEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
}
