/**
 * Service client for Supabase - compatibility export
 */

import { getServiceClient } from './client';

// Export with expected naming for compatibility
export const createSupabaseServiceClient = getServiceClient;
export { getServiceClient, getAnonClient } from './client';