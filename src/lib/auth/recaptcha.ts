import { env, assertServerEnv } from "../config";
import { createLogger, redact } from "../logger";

// Helper: verify and extract reCAPTCHA metadata for API
export async function verifyAndExtractRecaptcha(token: string, ip?: string) {
  const logger = createLogger();
  
  // Bypass pour le développement local
  const testTokens = ['bypass-local', 'test-token', 'test_token_valid', 'postman-test'];
  if (process.env.NODE_ENV === 'development' && testTokens.includes(token)) {
    logger.info('reCAPTCHA bypass activated for local development', { 
      token: token,
      environment: process.env.NODE_ENV 
    });
    return {
      ok: true,
      meta: {
        score: 0.9,
        action: 'submit',
        success: true,
        challengeTs: new Date().toISOString(),
        hostname: 'localhost',
        challenge_ts: new Date().toISOString(),
      },
    };
  }
  
  logger.info('Starting reCAPTCHA verification', { 
    hasToken: Boolean(token),
    ip: ip ? redact(ip) : undefined
  });
  
  const result = await verifyRecaptcha(token, ip);

  if (!result.success || (result.score !== undefined && result.score < 0.5)) {
    logger.warn('reCAPTCHA verification failed', { 
      success: result.success, 
      score: result.score,
      ip: ip ? redact(ip) : undefined
    });
    return { ok: false, error: "Échec de la vérification reCAPTCHA. Veuillez réessayer." };
  }
  
  logger.info('reCAPTCHA verification successful', { 
    score: result.score,
    action: result.action
  });
  
  return {
    ok: true,
    meta: {
      score: result.score || 0,
      success: result.success,
      action: result.action || 'unknown',
      challengeTs: result.challengeTs || new Date().toISOString(),
      hostname: result.hostname || 'unknown',
      challenge_ts: result.challengeTs || new Date().toISOString(),
    },
  };
}

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
  const logger = createLogger();
  assertServerEnv();
  const params = new URLSearchParams({
    secret: env.RECAPTCHA_SECRET_KEY,
    response: token,
  });
  if (ip) params.append("remoteip", ip);

  let res: Response;
  try {
    logger.debug('Sending reCAPTCHA verification request', { 
      hasToken: Boolean(token),
      hasIp: Boolean(ip)
    });
    
    res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) {
    logger.error('Network error during reCAPTCHA verification', { error: err });
    throw new Error(
      "Network error during reCAPTCHA verification" +
        (err && typeof err === "object" && "message" in err ? (err as Error).message : String(err))
    );
  }

  let data: RecaptchaResponse;
  try {
    data = await res.json();
  } catch (err) {
    logger.error('Invalid reCAPTCHA response', { error: err });
    throw new Error(
      "Invalid reCAPTCHA response: " + (err instanceof Error ? err.message : String(err))
    );
  }

  logger.debug('reCAPTCHA verification response received', { 
    success: data.success,
    score: data.score,
    action: data.action
  });

  return {
    success: data.success,
    score: data.score,
    hostname: data.hostname,
    action: data.action,
    challengeTs: data.challenge_ts,
  };
}
