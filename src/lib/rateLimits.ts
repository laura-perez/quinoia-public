import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env';

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

// Initialise Redis et Ratelimit si les variables d'environnement sont présentes
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(10, '1m', 10), // Configuration par défaut
    analytics: true,
  });
}

/**
 * Rate limit une clé avec token bucket.
 * @param key Clé unique pour identifier la source (IP, user ID, etc.)
 * @param max Nombre maximum de requêtes autorisées
 * @param windowSec Fenêtre en secondes
 * @returns Résultat du rate limiting
 */
export async function limit(key: string, max: number, windowSec: number): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
}> {
  // Mode no-op si Redis n'est pas configuré
  if (!redis || !ratelimit) {
    return {
      success: true,
      remaining: max,
      reset: Date.now() + windowSec * 1000,
    };
  }

  // Crée un ratelimiter spécifique pour ces paramètres
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