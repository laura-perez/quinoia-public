// Helper: verify and extract reCAPTCHA metadata for API
export async function verifyAndExtractRecaptcha(token: string, ip?: string) {
  const result = await verifyRecaptcha(token, ip);
  if (!result.success || (result.score !== undefined && result.score < 0.5)) {
    return { ok: false, error: "Échec de la vérification reCAPTCHA. Veuillez réessayer." };
  }
  return {
    ok: true,
    meta: {
      score: result.score,
      action: result.action,
      challengeTs: result.challengeTs,
      hostname: result.hostname,
    },
  };
}
import { env, assertServerEnv } from "./env";

type RecaptchaResponse = {
  success: boolean;
  score?: number;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  [key: string]: any;
};

/**
 * Vérifie un token reCAPTCHA v3 côté serveur.
 * @param token Le token reCAPTCHA envoyé par le client
 * @param ip (optionnel) L'adresse IP du client
 * @returns Les champs utiles de la réponse Google
 * @throws Erreur réseau ou parsing
 */
export async function verifyRecaptcha(
  token: string,
  ip?: string
): Promise<{
  success: boolean;
  score?: number;
  hostname?: string;
  action?: string;
  challengeTs?: string;
}> {
  assertServerEnv();
  const params = new URLSearchParams({
    secret: env.RECAPTCHA_SECRET_KEY,
    response: token,
  });
  if (ip) params.append("remoteip", ip);

  let res: Response;
  try {
    res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) {
    throw new Error(
      "Network error during reCAPTCHA verification" +
        (err && typeof err === "object" && "message" in err ? (err as Error).message : String(err))
    );
  }

  let data: RecaptchaResponse;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(
      "Invalid reCAPTCHA response: " + (err instanceof Error ? err.message : String(err))
    );
  }

  return {
    success: data.success,
    score: data.score,
    hostname: data.hostname,
    action: data.action,
    challengeTs: data.challenge_ts,
  };
}
