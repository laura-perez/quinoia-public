/**
 * Load environment variables BEFORE any other imports
 * This file must be the FIRST setupFile in vitest.config.ts
 */
import dotenv from 'dotenv';

const envFile = process.env.INTEGRATION_TESTS === 'true' ? '.env.local.test' : '.env.test';
const result = dotenv.config({ path: envFile });

if (result.error) {
  console.warn(`Warning: Could not load ${envFile}:`, result.error.message);
}

// Ensure process.env is populated
if (process.env.INTEGRATION_TESTS === 'true') {
  // Log loaded vars for debugging (without showing secrets)
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_KEY;

  console.log('✅ setup-env.ts loaded for integration tests', {
    hasSupabaseUrl,
    hasSupabaseKey,
    url: process.env.SUPABASE_URL?.substring(0, 20),
    keyPrefix: process.env.SUPABASE_SERVICE_KEY?.substring(0, 15),
    keyLength: process.env.SUPABASE_SERVICE_KEY?.length
  });

  if (!hasSupabaseUrl || !hasSupabaseKey) {
    console.error('ERROR: Supabase env vars not loaded properly');
  }
}
