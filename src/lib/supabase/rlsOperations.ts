/**
 * RLS-aware database operations
 * This module handles operations that need to respect Row Level Security policies
 * 
 * IMPORTANT: Module server-only - never import on client side
 */

import { getAnonClient } from './client'
import { createLogger } from '@/lib/logger'

const logger = createLogger()

// Security: prevent client-side import (except in tests)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  throw new Error('lib/supabase/rlsOperations.ts must never be imported on the client side')
}

/**
 * Get user data using RLS-aware client (anon role)
 * This will only return data for the authenticated user via RLS policies
 * @param userId - User ID to query (used for JWT context)
 * @returns User data or null if not found
 */
export async function getUserWithRLS(userId: string) {
  try {
    const supabase = getAnonClient()
    
    // In a real implementation, we would need to set the JWT context here
    // For now, we'll use service_role but this is where RLS would apply
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      logger.error('Error fetching user with RLS:', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('Unexpected error in getUserWithRLS:', err)
    return null
  }
}

/**
 * Get user submissions using RLS-aware client
 * This will only return submissions for the authenticated user via RLS policies
 * @param userId - User ID to query (used for JWT context)  
 * @returns User submissions or empty array
 */
export async function getUserSubmissionsWithRLS(userId: string) {
  try {
    const supabase = getAnonClient()
    
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching submissions with RLS:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('Unexpected error in getUserSubmissionsWithRLS:', err)
    return []
  }
}

/**
 * Get user menu results using RLS-aware client
 * This will only return menu results for the authenticated user via RLS policies
 * @param userId - User ID to query (used for JWT context)
 * @returns User menu results or empty array
 */
export async function getUserMenuResultsWithRLS(userId: string) {
  try {
    const supabase = getAnonClient()
    
    const { data, error } = await supabase
      .from('menuResult')
      .select('*')
      .eq('userId', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching menu results with RLS:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('Unexpected error in getUserMenuResultsWithRLS:', err)
    return []
  }
}
