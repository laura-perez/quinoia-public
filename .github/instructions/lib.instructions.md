---
applyTo: "src/lib/**/*.ts"
---

# Quinoïa — Library Instructions

## Modules to provide (and how)

- `env.ts`: Zod-validate required env vars; throw early on missing; export `env`.
- `supabaseServer.ts`: `getServiceClient()` initialized with service key; **server-only**.
- `recaptcha.ts`: `verifyRecaptcha(token, ip?)` via `fetch` (no axios); return `{ success, score, hostname, action, challengeTs }`.
- `hmac.ts`: `signBody(body)` & `verifySignature(body, signature)` with HMAC-SHA256; base64url output.
- `constants.ts`: export locked string-literal arrays (protein categories, equipment, goals, etc.) for typing.
- `normalize.ts`: FR→EN mapping; unaccent/lowercase compare; keep FR user text as-is.
- `zodSchemas.ts`: single source of truth for client+server validation (parse → typed object).
- `rateLimit.ts` (optional): Upstash token bucket wrapper; returns `{ success, remaining, reset }`; no-op if envs missing.

## Coding standards

- TypeScript strict: no `any`. Return precise types.
- Pure, composable functions; no hidden side-effects.
- No magic strings: import from `constants.ts`.
- Server-only modules must **not** be imported in client components.

## Security & privacy

- Never embed secrets in client bundles.
- Do not persist BMI.
- Ensure PII never leaks into `resultBundle`.

## Testing

- Unit tests for normalizers and schemas.
- Provide small fixtures for realistic profiles/recipes.
