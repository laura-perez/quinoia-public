/**
 * Shared test utilities - centralized exports
 */

export * from './types';
export * from './constants';
export * from './assertions';
export { generateTestEmail } from './test-utils';

import { createClient } from '@supabase/supabase-js';

export function createTestSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function cleanupTestData(emails: string[]) {
  const supabase = createTestSupabaseClient();

  // Delete test users and related data
  for (const email of emails) {
    const { data: user } = await supabase
      .from('user')
      .select('id')
      .eq('email', email)
      .single();

    if (user) {
      // Delete sessions
      await supabase.from('userSession').delete().eq('userId', user.id);

      // Delete menu results
      await supabase.from('menuResult').delete().eq('userId', user.id);

      // Delete user
      await supabase.from('user').delete().eq('id', user.id);
    }

    // Delete magic links
    await supabase.from('magicLink').delete().eq('email', email);
  }
}
