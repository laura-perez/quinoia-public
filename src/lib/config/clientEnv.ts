import { z } from "zod";

/**
 * Client-side environment variables schema
 * These are NEXT_PUBLIC_* variables that are exposed to the browser
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z
    .string()
    .min(1, "reCAPTCHA site key is required"),
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
  const siteKey = clientEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
  // Basic validation for reCAPTCHA site key format
  if (!siteKey.startsWith('6L') || siteKey.length !== 40) {
    throw new Error(`Invalid reCAPTCHA site key format: expected format 6L... with 40 characters, got ${siteKey.length} characters`);
  }
  
  return siteKey;
}
