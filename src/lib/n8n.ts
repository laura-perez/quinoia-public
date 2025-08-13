import { env } from "./env";
import { signBody } from "./hmac";

/**
 * Trigger n8n workflow with strict, non-PII payload
 * @param payload - normalized input and submissionId
 * @returns n8n response (resultBundle or error)
 */
export async function triggerN8n(payload: object) {
  const body = JSON.stringify(payload);
  const signature = signBody(body);
  const res = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature": signature,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`n8n webhook error: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}
