/**
 * Menu Result Database Operations
 * Handles saving and retrieving menu results with shareId generation
 * Server-only module for database operations
 */

import { getServiceClient } from './client';
import { createLogger } from '@/lib/logger';
import { randomBytes } from 'crypto';

const logger = createLogger();

// Security: prevent client-side import
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  throw new Error('lib/supabase/menuResults.ts must never be imported on the client side');
}

interface MenuResultInput {
  submissionId: string;
  userId: string;
  resultBundle: any;
  numRecipes: number;
  numServings: number;
}

interface MenuResult {
  id: string;
  shareId: string;
  submissionId: string;
  userId: string;
  resultBundle: any;
  numRecipes: number;
  numServings: number;
  shareActive: boolean;
  createdAt: string;
}

/**
 * Generate a secure, URL-safe shareId
 */
function generateShareId(): string {
  // Generate 12 random bytes and encode as base64url
  return randomBytes(12)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Save menu result to database with generated shareId
 */
export async function saveMenuResult(input: MenuResultInput): Promise<{
  success: boolean;
  menuResult?: MenuResult;
  error?: string;
}> {
  const supabase = getServiceClient();
  
  try {
    logger.info('Saving menu result', {
      submissionId: input.submissionId,
      userId: input.userId,
      numRecipes: input.numRecipes
    });

    // Generate unique shareId
    let shareId = generateShareId();
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure shareId is unique (collision prevention)
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('menuResult')
        .select('id')
        .eq('shareId', shareId)
        .maybeSingle();

      if (!existing) break; // shareId is unique
      
      shareId = generateShareId();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique shareId after multiple attempts');
    }

    // Insert menu result
    const { data, error } = await supabase
      .from('menuResult')
      .insert({
        submissionId: input.submissionId,
        userId: input.userId,
        resultBundle: input.resultBundle,
        numRecipes: input.numRecipes,
        numServings: input.numServings,
        shareId,
        shareActive: true,
        shareCreatedAt: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to save menu result', {
        error: error.message,
        submissionId: input.submissionId
      });
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    logger.info('Menu result saved successfully', {
      menuResultId: data.id,
      shareId: data.shareId,
      submissionId: input.submissionId
    });

    return {
      success: true,
      menuResult: data
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Menu result save failed', {
      error: errorMessage,
      submissionId: input.submissionId
    });

    return {
      success: false,
      error: `Save failed: ${errorMessage}`
    };
  }
}

/**
 * Get menu result by shareId for public access
 */
export async function getMenuResultByShareId(shareId: string): Promise<{
  success: boolean;
  menuResult?: MenuResult;
  error?: string;
}> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('menuResult')
      .select('*')
      .eq('shareId', shareId)
      .eq('shareActive', true)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch menu result', {
        error: error.message,
        shareId
      });
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (!data) {
      logger.warn('Menu result not found or inactive', { shareId });
      return {
        success: false,
        error: 'Menu not found or expired'
      };
    }

    // Check if menu is expired (30 days)
    const menuAge = Date.now() - new Date(data.createdAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    if (menuAge > thirtyDaysMs) {
      logger.warn('Menu result expired', { shareId, ageMs: menuAge });
      return {
        success: false,
        error: 'Menu has expired'
      };
    }

    logger.info('Menu result retrieved successfully', { shareId });

    return {
      success: true,
      menuResult: data
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Menu result retrieval failed', {
      error: errorMessage,
      shareId
    });

    return {
      success: false,
      error: `Retrieval failed: ${errorMessage}`
    };
  }
}

/**
 * Deactivate a menu result (disable sharing)
 */
export async function deactivateMenuResult(shareId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getServiceClient();
  
  try {
    const { error } = await supabase
      .from('menuResult')
      .update({ shareActive: false })
      .eq('shareId', shareId);

    if (error) {
      logger.error('Failed to deactivate menu result', {
        error: error.message,
        shareId
      });
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    logger.info('Menu result deactivated', { shareId });

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Menu result deactivation failed', {
      error: errorMessage,
      shareId
    });

    return {
      success: false,
      error: `Deactivation failed: ${errorMessage}`
    };
  }
}