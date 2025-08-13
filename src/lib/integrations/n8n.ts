import { env } from "../config";
import { signBody } from "../auth";
import { createLogger, redact } from "../logger";

/**
 * Trigger n8n workflow with strict, non-PII payload
 * @param payload - normalized input and submissionId
 * @returns n8n response (resultBundle or error)
 */
export async function triggerN8n(payload: object) {
  const logger = createLogger();
  const body = JSON.stringify(payload);
  const signature = signBody(body);
  
  logger.info('Triggering n8n workflow', { 
    url: redact(env.N8N_WEBHOOK_URL),
    payloadSize: body.length,
    hasSignature: Boolean(signature)
  });
  
  const res = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature": signature,
    },
    body,
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    logger.error('n8n webhook error', { 
      status: res.status, 
      statusText: res.statusText,
      error: errorText 
    });
    throw new Error(`n8n webhook error: ${res.status} ${errorText}`);
  }
  
  const result = await res.json();
  logger.info('n8n workflow completed', { 
    status: res.status,
    hasResult: Boolean(result)
  });
  
  return result;
}
