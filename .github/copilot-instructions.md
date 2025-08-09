# Quinoïa — Repository Instructions for GitHub Copilot

> Purpose: Guide Copilot to produce **production-grade code** consistent with Quinoïa’s architecture, data contracts, and policies.

## Project context (read first)
- **Product**: Quinoïa selects (does **not** generate) validated FR recipes to build menus aligned with **per-meal calorie windows** and **protein floors**, under constraints: **≤30 min**, allergies, equipment, anti-repetition (21 days).
- **Outputs**:
  1) Transactional email with CTA to `/menu/{shareId}`
  2) Public page (no PII = Personally Identifiable Information, **noindex**) rendering **FR content** (recipes, shopping list, tips).
- **Selection**: 100% **deterministic** (n8n Code node). LLM (Large Language Model) optional for tips only.
- **Contracts**: **camelCase everywhere** (web/API/DB). **Recipe content in French**; **enums/flags in English** (stable for logic).
- **Privacy**: **Never store BMI (Body Mass Index)**. Separate PII from result bundles. Purge IP (Internet Protocol address)/UA (User-Agent)/reCAPTCHA after 30 days.

## Stack & infra
- **Next.js (App Router)** + TypeScript strict. Server code uses Route Handlers/Server Actions.
- **Supabase (Postgres)** via `@supabase/supabase-js` with **service key on server only**.
- **n8n** as orchestrator; webhook protected with **HMAC (Hash-based Message Authentication Code)**.
- **Mailjet** (transactional sender), **Google Workspace** mailbox (`hello@…`).
- **reCAPTCHA** verified **server-side**.
- **Upstash Ratelimit** optional.

## Environment variables (authoritative)
Public:
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`

Server:
- `RECAPTCHA_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `HMAC_SECRET`
- `APP_BASE_URL`
- *(optional)* `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

> Always import via `@/lib/env`. Never introduce new names.


## n8n trigger (from Next API)
POST N8N_WEBHOOK_URL
Headers: x-run-id (ULID/UUID), x-signature = HMAC-SHA256(body, N8N_WEBHOOK_SECRET) base64url
Body: { "submissionId": "uuid", "source": "web", "version": "v1" }


## Non-negotiable rules
No secrets on client. Server-only modules in lib/ must not be imported in client code.
Never store BMI. Do not include PII in resultBundle or public pages.
/menu/{shareId} must send X-Robots-Tag: noindex + <meta name="robots" content="noindex,nofollow">.

## Security & quality checklist
Validate env at boot (Zod).
Verify reCAPTCHA server-side; log {success, score, hostname, action, challengeTs}; never store token.
Rate-limit /api/submit (429 on exceed). If Upstash envs missing → safe no-op.
HMAC-sign payloads to n8n; verify on n8n.
Zod validation both client & server with the same schema.
Explicit error shape { error, code?, details? }; actionable messages.
Accessibility: labels, aria-describedby for errors, keyboard focus.
Tests: unit (normalizers/schemas), integration (/api/submit), E2E (submit→menu page with mocked bundle).

## Glossary (first use expansions)
BMR: Basal Metabolic Rate.

TDEE: Total Daily Energy Expenditure.

HMAC: Hash-based Message Authentication Code.

PII: Personally Identifiable Information.

RLS: Row-Level Security (DB policy).

SPF/DKIM/DMARC: Email auth & policies (DNS records).