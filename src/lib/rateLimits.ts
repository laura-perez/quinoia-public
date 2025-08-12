import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

// Initialize Redis and Ratelimit if Upstash environment variables are present
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(10, "1m", 10), // Default configuration
    analytics: true,
  });
}

/**
 * Rate limit a key using token bucket algorithm.
 * @param key Unique key to identify the source (IP, user ID, etc.)
 * @param max Maximum number of allowed requests
 * @param windowSec Window in seconds
 * @returns Result of the rate limiting
 */
export async function limit(
  key: string,
  max: number,
  windowSec: number
): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
}> {
  // No-op mode if Redis is not configured
  if (!redis || !ratelimit) {
    return {
      success: true,
      remaining: max,
      reset: Date.now() + windowSec * 1000,
    };
  }

  // Create a specific ratelimiter for these parameters
  const specificRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(max, `${windowSec}s`, max),
    analytics: true,
  });

  const result = await specificRatelimit.limit(key);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
