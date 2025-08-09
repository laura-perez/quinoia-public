
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, assertServerEnv } from './env';

// Empêche l'import côté client
if (typeof window !== 'undefined') {
  throw new Error('lib/supabaseServer.ts ne doit jamais être importé côté client');
}

/**
 * Retourne un client Supabase initialisé avec les credentials serveur.
 */
export function getServiceClient(): SupabaseClient {
  assertServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}
