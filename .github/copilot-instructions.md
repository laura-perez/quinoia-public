
# Quinoïa — AI Agent Coding Instructions

## Project Architecture & Data Flow
- **Next.js** app with file-based routing in `/pages`. All routes and API endpoints are defined here.
- **UI**: Modular React components in `src/components` (UI, forms, layout). Use composition and props for reusability.
- **Business logic & utilities**: In `src/lib` (e.g., `env.ts`, `hmac.ts`, `rateLimits.ts`, `recaptcha.ts`).
- **Static assets**: In `/public`.
- **Styling**: Tailwind CSS (see `tailwind.config.js`), global styles in `/styles`.
- **Data flow**: User input flows from forms (multi-step in `components/form/`) to API routes, then to external services (Supabase, n8n, Upstash, reCAPTCHA).
- **Environment variables**: Always import via `src/lib/env`. Never introduce new names.

## Developer Workflows
- **Start dev server**: `npm run dev` (Next.js, hot reload)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Unit tests**: `npm run test` (Vitest, happy-dom, MSW, jest-dom)
- **E2E tests**: `npm run e2e` (Playwright, see `playwright.config.ts`)
- **Test setup**: All test env setup in `tests/setupTests.ts` (MSW, jest-dom). Add new handlers in `tests/msw/handlers.ts`.
- **PRs**: All changes via PR to `develop`. Use Conventional Commits for titles. One logical change per PR. All code, comments, and text in English.

## Project-Specific Conventions
- **No secrets on client**: Never import server-only modules (e.g., `lib/env`, `lib/supabaseServer`) in client code.
- **Validation**: All env validated at boot with Zod (`lib/env.ts`). Use Zod for all schema validation (client & server).
- **Error handling**: API responses must use `{ error, code?, details? }` shape. Show user-friendly errors, log details for ops.
- **Accessibility**: All interactive elements must be keyboard accessible and have ARIA labels/attributes. Use `aria-describedby` for error messages.
- **Security**: Rate-limit `/api/submit` (see `lib/rateLimits.ts`). HMAC-sign payloads to n8n (`lib/hmac.ts`). Verify reCAPTCHA server-side (`lib/recaptcha.ts`).
- **SEO**: `/menu/{shareId}` must send `X-Robots-Tag: noindex` and `<meta name="robots" content="noindex,nofollow">`.

## Integration Points & External Services
- **Supabase**: Server-only, initialized in `lib/supabaseServer.ts`.
- **Upstash**: Used for rate limiting (see `lib/rateLimits.ts`).
- **n8n**: Receives HMAC-signed payloads (see `lib/hmac.ts`).
- **reCAPTCHA**: Verified server-side (see `lib/recaptcha.ts`).

## Testing Patterns
- **Unit tests**: Place in `tests/unit/`. Use Vitest, MSW for mocking, jest-dom for DOM assertions.
- **E2E tests**: Place in `tests/e2e/`. Use Playwright. Example: `smoke.spec.ts` checks home page loads.
- **Test setup**: All test env setup in `tests/setupTests.ts`.
- **Coverage**: Run `npm run test:coverage` for coverage report.

## Examples
- **Env import**: `import { env } from '@/lib/env'`
- **API error shape**: `{ error: 'Invalid input', code: 400, details: { ... } }`
- **Unit test**: See `tests/unit/hmac.test.ts` for env mocking and signature checks.

## Glossary
BMR: Basal Metabolic Rate
TDEE: Total Daily Energy Expenditure
HMAC: Hash-based Message Authentication Code
PII: Personally Identifiable Information
RLS: Row-Level Security (DB policy)
SPF/DKIM/DMARC: Email auth & policies (DNS records)