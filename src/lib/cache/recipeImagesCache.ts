/**
 * Recipe Images Cache
 * In-memory LRU cache for recipe image URLs (public or signed)
 *
 * Purpose: Reduce Supabase Storage API calls for frequently accessed recipe images
 * TTL: 6 days (518400 seconds) - refreshed before 7-day signed URL expiry
 * Max entries: 500 images (most popular recipes)
 * Expected hit rate: ~95% for popular recipes
 */

interface CacheEntry {
  url: string;
  expires: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: string;
}

class RecipeImagesCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 6 * 24 * 60 * 60 * 1000; // 6 days in milliseconds
  private readonly MAX_ENTRIES = 500; // Cache top 500 recipe images
  private hits = 0;
  private misses = 0;

  /**
   * Get image URL from cache or fetch from Supabase Storage
   * @param filename - Recipe image filename
   * @param fetchFn - Function to fetch URL if not in cache
   * @returns Image URL (public or signed)
   */
  async get(filename: string, fetchFn: () => Promise<string | null>): Promise<string | null> {
    const now = Date.now();
    const entry = this.cache.get(filename);

    // Cache hit - return cached URL if not expired
    if (entry && entry.expires > now) {
      this.hits++;
      return entry.url;
    }

    // Cache miss or expired - fetch from Supabase
    this.misses++;

    // Remove expired entry
    if (entry) {
      this.cache.delete(filename);
    }

    // Fetch fresh URL
    const url = await fetchFn();

    if (url) {
      this.set(filename, url);
    }

    return url;
  }

  /**
   * Batch get multiple image URLs with cache optimization
   * @param filenames - Array of recipe image filenames
   * @param fetchFn - Function to fetch URLs for uncached filenames
   * @returns Map of filename to URL
   */
  async getMultiple(
    filenames: string[],
    fetchFn: (uncachedFilenames: string[]) => Promise<Map<string, string | null>>
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    const uncachedFilenames: string[] = [];
    const now = Date.now();

    // Check cache for each filename
    for (const filename of filenames) {
      const entry = this.cache.get(filename);

      if (entry && entry.expires > now) {
        // Cache hit
        this.hits++;
        result.set(filename, entry.url);
      } else {
        // Cache miss or expired
        this.misses++;
        uncachedFilenames.push(filename);

        if (entry) {
          this.cache.delete(filename);
        }
      }
    }

    // Fetch uncached filenames in batch
    if (uncachedFilenames.length > 0) {
      const fetchedUrls = await fetchFn(uncachedFilenames);

      // Store in cache and add to result
      fetchedUrls.forEach((url, filename) => {
        if (url) {
          this.set(filename, url);
        }
        result.set(filename, url);
      });
    }

    return result;
  }

  /**
   * Store URL in cache with TTL
   * Implements LRU eviction when cache is full
   */
  private set(filename: string, url: string): void {
    // LRU eviction: remove oldest entry if cache is full
    if (this.cache.size >= this.MAX_ENTRIES && !this.cache.has(filename)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(filename, {
      url,
      expires: Date.now() + this.TTL
    });
  }

  /**
   * Clear all expired entries from cache
   * Can be called periodically to free memory
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [filename, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        expiredKeys.push(filename);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : '0.00';

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Singleton instance
export const recipeImagesCache = new RecipeImagesCache();

// Cleanup expired entries every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    recipeImagesCache.cleanup();
  }, 60 * 60 * 1000); // 1 hour
}
