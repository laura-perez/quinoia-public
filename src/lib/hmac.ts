import { env, assertServerEnv } from './env';
import crypto from 'crypto';

/**
 * Signe un body avec HMAC-SHA256 et retourne la signature en base64url.
 * @param body Le contenu à signer
 * @returns La signature HMAC en format base64url
 */
export function signBody(body: string): string {
  assertServerEnv();
  const hmac = crypto.createHmac('sha256', env.N8N_WEBHOOK_SECRET);
  hmac.update(body);
  const signature = hmac.digest('base64url');
  return signature;
}

/**
 * Vérifie une signature HMAC-SHA256 pour un body donné.
 * @param body Le contenu original
 * @param signature La signature à vérifier (format base64url)
 * @returns true si la signature est valide, false sinon
 */
export function verifySignature(body: string, signature: string): boolean {
  assertServerEnv();
  const expectedSignature = signBody(body);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64url'),
    Buffer.from(expectedSignature, 'base64url')
  );
}