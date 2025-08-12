import { env, assertServerEnv } from "./env";
import crypto from "crypto";

/**
 * Sign a body with HMAC-SHA256 and return the signature in base64url format.
 * @param body The content to sign
 * @returns The HMAC signature in base64url format
 */
export function signBody(body: string): string {
  assertServerEnv();
  const hmac = crypto.createHmac("sha256", env.N8N_WEBHOOK_SECRET);
  hmac.update(body);
  const signature = hmac.digest("base64url");
  return signature;
}

/**
 * Verify an HMAC-SHA256 signature for a given body.
 * @param body The original content
 * @param signature The signature to verify (base64url format)
 * @returns true if the signature is valid, false otherwise
 */
export function verifySignature(body: string, signature: string): boolean {
  assertServerEnv();
  const expectedSignature = signBody(body);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "base64url"),
    Buffer.from(expectedSignature, "base64url")
  );
}
