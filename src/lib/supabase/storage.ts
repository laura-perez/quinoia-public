/**
 * Supabase Storage utilities for recipe images
 *
 * Performance optimization strategy:
 * 1. Try public URL first (if bucket is public) - fastest, no expiration
 * 2. Fallback to signed URL (7-day TTL) - works with private bucket
 * 3. In-memory cache (6-day TTL) - reduces API calls by ~95%
 */

import { getServiceClient } from './client';
import { createLogger } from '@/lib/logger';
import { recipeImagesCache } from '@/lib/cache/recipeImagesCache';

const logger = createLogger();

// Configuration
const BUCKET_NAME = 'recipes_photos';
const SIGNED_URL_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const USE_PUBLIC_BUCKET = process.env.NEXT_PUBLIC_RECIPES_PHOTOS_PUBLIC === 'true';

/**
 * Get public URL for recipe image (if bucket is public)
 * @param pictureFile - The filename of the recipe image
 * @returns Public URL or null
 */
function getPublicUrl(pictureFile: string): string | null {
  if (!USE_PUBLIC_BUCKET) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  // Public URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{filename}
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(pictureFile)}`;
}

/**
 * Get signed URL for recipe image (fallback for private bucket)
 * @param pictureFile - The filename of the recipe image
 * @returns Promise<string | null> - Signed URL or null if error
 */
async function getSignedUrl(pictureFile: string): Promise<string | null> {
  try {
    const supabase = getServiceClient();

    // Get signed URL for private bucket (expires in 7 days)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(pictureFile, SIGNED_URL_TTL);

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
 * Get recipe image URL with caching
 * Tries public URL first, falls back to signed URL
 * @param pictureFile - The filename of the recipe image (e.g., "Cabillaud_au_gingembre_nouilles_de_riz_et_pak_choi.png")
 * @returns Promise<string | null> - Image URL or null if error
 */
export async function getRecipeImageUrl(pictureFile: string): Promise<string | null> {
  if (!pictureFile) {
    return null;
  }

  // Use cache to avoid repeated API calls
  return recipeImagesCache.get(pictureFile, async () => {
    // Try public URL first (if enabled)
    const publicUrl = getPublicUrl(pictureFile);
    if (publicUrl) {
      return publicUrl;
    }

    // Fallback to signed URL (private bucket)
    return getSignedUrl(pictureFile);
  });
}

/**
 * Get multiple recipe image URLs in batch with caching
 * @param pictureFiles - Array of picture filenames
 * @returns Promise<Map<string, string | null>> - Map of filename to URL
 */
export async function getRecipeImageUrls(pictureFiles: string[]): Promise<Map<string, string | null>> {
  if (pictureFiles.length === 0) {
    return new Map();
  }

  // Use batch cache method for optimal performance
  return recipeImagesCache.getMultiple(pictureFiles, async (uncachedFiles) => {
    const urlMap = new Map<string, string | null>();

    // Check if using public bucket
    if (USE_PUBLIC_BUCKET) {
      // Generate public URLs (instant, no API call)
      for (const pictureFile of uncachedFiles) {
        const publicUrl = getPublicUrl(pictureFile);
        urlMap.set(pictureFile, publicUrl);
      }
      return urlMap;
    }

    // Fallback: Generate signed URLs in parallel
    const promises = uncachedFiles.map(async (pictureFile) => {
      const url = await getSignedUrl(pictureFile);
      return [pictureFile, url] as const;
    });

    const results = await Promise.all(promises);

    for (const [pictureFile, url] of results) {
      urlMap.set(pictureFile, url);
    }

    return urlMap;
  });
}
