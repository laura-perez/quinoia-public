/**
 * Supabase client server-only pour accès avec service key
 * Conforme aux instructions lib.instructions.md
 */

import { createClient } from '@supabase/supabase-js'
import { env } from './config/env'

/**
 * Crée un client Supabase avec service key pour les opérations server-only
 * @returns Client Supabase avec privilèges administrateur
 */
export function getServiceClient() {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
