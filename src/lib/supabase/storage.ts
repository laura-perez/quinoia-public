/**
 * Supabase Storage utilities for recipe images
 */

import { getServiceClient } from './client';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

/**
 * Get signed URL for recipe image from private bucket
 * @param pictureFile - The filename of the recipe image (e.g., "Cabillaud_au_gingembre_nouilles_de_riz_et_pak_choi.png")
 * @returns Promise<string | null> - Signed URL or null if error
 */
export async function getRecipeImageUrl(pictureFile: string): Promise<string | null> {
  if (!pictureFile) {
    return null;
  }

  try {
    const supabase = getServiceClient();
    
    // Get signed URL for private bucket (expires in 1 hour)
    const { data, error } = await supabase.storage
      .from('recipes_photos')
      .createSignedUrl(pictureFile, 3600); // 1 hour expiry

    if (error) {
      logger.warn('Failed to get signed URL for recipe image', { 
        pictureFile, 
        error: error.message 
      });
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    logger.error('Error generating recipe image URL', { 
      pictureFile, 
      error 
    });
    return null;
  }
}

/**
 * Get multiple recipe image URLs in batch
 * @param pictureFiles - Array of picture filenames
 * @returns Promise<Map<string, string | null>> - Map of filename to signed URL
 */
export async function getRecipeImageUrls(pictureFiles: string[]): Promise<Map<string, string | null>> {
  const urlMap = new Map<string, string | null>();
  
  // Process in parallel for better performance
  const promises = pictureFiles.map(async (pictureFile) => {
    const url = await getRecipeImageUrl(pictureFile);
    return [pictureFile, url] as const;
  });

  const results = await Promise.all(promises);
  
  for (const [pictureFile, url] of results) {
    urlMap.set(pictureFile, url);
  }

  return urlMap;
}