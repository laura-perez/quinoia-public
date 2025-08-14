import { z } from "zod";

/**
 * Client-side environment variables schema
 * These are NEXT_PUBLIC_* variables that are exposed to the browser
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z
    .string()
    .optional()
    .refine((val) => val && val.length > 0, "reCAPTCHA site key is required")
    .refine((val) => !val || /^6L[a-zA-Z0-9_-]{40}$/.test(val), "Invalid reCAPTCHA site key format")
    .transform((val) => val!), // Non-null assertion since we validated above
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
