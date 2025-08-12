## applyTo: "src/api/\*_/_.ts"

# Quinoïa — API Instructions (Server Only)

## Boundaries

- **Server-only**. Never import server secrets from client code.
- Use **Route Handlers** (App Router). Use Node runtime for secrets.

## `/api/submit` must:

1. **Rate-limit** by IP/email (e.g., 3 req / 10 min). If Upstash envs unset → no-op.
2. **Verify reCAPTCHA** server-side with `RECAPTCHA_SECRET_KEY`; capture `{success, score, hostname, action, challengeTs}`.
3. **Validate** body with the shared **Zod schema** (same as client).
4. **Normalize** to `NormalizedInput` (camelCase; FR→EN values; store FR text fields as text).
5. **Persist** with Supabase service client:
   - Upsert `user` by email
   - Insert `submission`:
     - `rawFormJson` = exact payload
     - `normalizedInput` = mapped & typed
     - `recaptcha*`, `ipAddress`, `userAgent`
     - `consentedAt`, `consentVersion:'v1'`
     - `status:'pending'`
6. **Trigger n8n**:
   - `runId` (ULID/UUID)
   - `x-signature` = HMAC-SHA256(body, `N8N_WEBHOOK_SECRET`) → base64url
   - Body: `{ submissionId, source:'web', version:'v1' }`
7. **Respond 202** with minimal JSON.

## Other endpoints

- `/api/menu/[shareId]`: return `resultBundle` if `shareActive`; **410** if revoked, **404** if unknown; add `X-Robots-Tag: noindex`.
- `/api/feedback`: insert `menuFeedback` (rating up/down, optional reasons). Basic abuse guard.

## Error model

- JSON `{ error: string, code?: string, details?: unknown }`
- Status codes: 400 (validation), 401 (auth/signature), 409 (conflict), 422 (unprocessable), 429 (rate limit), 500 (unexpected).

## Security notes

- **Never** include secrets in responses.
- **Never** pass PII to public `/menu` responses.
- **Do not** store BMI.
- Log `runId` to correlate with n8n.
