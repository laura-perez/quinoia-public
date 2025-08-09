
import { z } from 'zod';

const envSchema = z.object({
  RECAPTCHA_SECRET_KEY: z.string().min(1, 'RECAPTCHA_SECRET_KEY est requis'),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL est requis'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY est requis'),
  N8N_WEBHOOK_URL: z.string().min(1, 'N8N_WEBHOOK_URL est requis'),
  N8N_WEBHOOK_SECRET: z.string().min(1, 'N8N_WEBHOOK_SECRET est requis'),
  HMAC_SECRET: z.string().min(1, 'HMAC_SECRET est requis'),
  APP_BASE_URL: z.string().min(1, 'APP_BASE_URL est requis'),

  // Optionnelles
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

const _env = {
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
  HMAC_SECRET: process.env.HMAC_SECRET,
  APP_BASE_URL: process.env.APP_BASE_URL,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

const parsed = envSchema.safeParse(_env);

if (!parsed.success) {
  // Affiche toutes les erreurs de validation
  const errors = parsed.error.issues.map(e => `${String(e.path[0])}: ${e.message}`).join('\n');
  throw new Error(`Erreur de configuration des variables d'environnement :\n${errors}`);
}

export const env: z.infer<typeof envSchema> = parsed.data;

/**
 * À appeler dans les routes API pour s'assurer que les variables sont bien présentes côté serveur.
 * Jette une erreur claire si une variable obligatoire manque.
 */
export function assertServerEnv() {
  // Cette fonction ne fait rien car la validation a déjà eu lieu à l'import,
  // mais elle permet d'être explicite dans les routes API.
  return true;
}
