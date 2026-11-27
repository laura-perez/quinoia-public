# Quinoïa — AI Agent Coding Instructions

## Project Architecture & Data Flow

- **Next.js 15.4.5** app with file-based routing in `/pages`. All routes and API endpoints are defined here.
- **UI**: Modular React components in `src/components` (UI, forms, layout). Use composition and props for reusability.
- **Business logic & utilities**: In `src/lib` organized by domain:
  - `src/lib/auth/` - Authentication (magic links, sessions, reCAPTCHA, rate limiting)
  - `src/lib/recipes/` - Core business logic (recipe selection, shopping list generation)
  - `src/lib/constants/` - Business constants (nutrition, activity factor, recipe selection)
  - `src/lib/supabase/` - Database operations and queries
  - `src/lib/logger/` - Structured logging system
  - `src/lib/config/` - Environment and configuration
- **Static assets**: In `/public`.
- **Styling**: Tailwind CSS (see `tailwind.config.js`), global styles in `src/styles/globals.css`.
- **Data flow**: User input flows from forms (multi-step in `components/form/`) to API routes, then to native processing (recipe selection, shopping list generation) and database persistence (Supabase).
- **Environment variables**: Always import via `src/lib/config` (`src/lib/config/env.ts`). Never introduce new names.

## Developer Workflows

- **Start dev server**: `npm run dev` (Next.js, hot reload)
- **Build**: `npm run build` (Next.js production build - always validate after changes)
- **Lint**: `npm run lint`
- **Unit tests**: `npx vitest run` (Vitest, happy-dom, MSW, jest-dom)
- **E2E tests**: `npx playwright test` (Playwright, see `playwright.config.ts`)
- **Test setup**: All test env setup in `src/tests/setupTests.ts` (MSW, jest-dom), env loading in `src/tests/setup-env.ts`. Add new handlers in `src/tests/msw/handlers.ts`.
- **PRs**: All changes via PR to `main`. Use Conventional Commits for titles. One logical change per PR. All code, comments, and text in English.

## AI Agent Implementation Workflow

When implementing new features, follow this systematic approach:

### 1. Analysis & Planning

- **Understand the request**: Break down user requirements into technical concepts
- **Identify affected files**: Use `semantic_search` and `grep_search` to understand current codebase
- **Architectural decisions**: Choose patterns consistent with existing code

### 2. Technical Design Choices

- **Error handling**: Always use structured logging (`createLogger()`) instead of `console.error`
- **Validation**: Zod schemas for all data validation (client & server)
- **Testing**: Write/update tests BEFORE implementing to define expected behavior

### 3. Implementation Steps

1. **Create/modify schemas** (`src/schemas/`) if data structures change
2. **Implement core logic** in appropriate `src/lib/` subdirectory
3. **Update API routes** in `/pages/api/` if needed
4. **Update UI components** in `src/components/` if needed
5. **Export new functions** in relevant `index.ts` files

### 4. Testing & Validation Protocol

1. **Run tests**: `npx vitest run` - ALL tests must pass
2. **Production build**: `npm run build` - Must complete without errors
3. **Manual testing**: Use provided test scenarios or create new ones
4. **Edge cases**: Test error conditions and fallbacks

### 5. Code Quality Standards

- **No `console.error`**: Use `logger.error()` for server-side logging
- **Proper imports**: Use `@/` aliases and organize imports logically
- **Type safety**: Leverage TypeScript and Zod for runtime validation
- **Clean exports**: Maintain organized `index.ts` files for each module

### 6. Validation & Iteration

- **Wait for user validation** before considering task complete
- **Document breaking changes** and migration steps if needed
- **Clean up temporary files** and debug code before finalizing

### 7. Auto Evaluation

Perform a comprehensive quality assessment before finalizing:

#### Feature Implementation Verification

- **Functional completeness**: All requested features work as expected
- **Edge cases coverage**: Error conditions and boundary values handled
- **User requirements**: Original request fully satisfied without scope creep
- **Integration points**: New code properly connects with existing systems

#### Code Quality Assessment

- **Type safety**: Full TypeScript coverage with proper type definitions
- **Error handling**: Structured logging used consistently, graceful error boundaries
- **Performance**: No unnecessary computations, efficient algorithms chosen
- **Security**: No exposed secrets, proper input validation, secure patterns used

#### Refactoring Opportunities

- **DRY principle**: No code duplication, shared logic properly extracted
- **Single responsibility**: Functions and classes have clear, focused purposes
- **Naming clarity**: Variables, functions, and types have descriptive names
- **Code complexity**: Functions are concise and understandable

#### Architecture & Repository Impact

- **File organization**: New files placed in appropriate directories (`src/lib/<domain>/`)
- **Import/export consistency**: Clean module boundaries, organized index.ts files
- **Dependency management**: No circular dependencies, minimal external additions
- **Breaking changes**: Backward compatibility maintained or migration path provided

#### Additional Quality Checks

- **Documentation accuracy**: Code comments reflect actual behavior
- **Test coverage**: All critical paths covered by unit/integration tests
- **Build optimization**: Bundle size impact assessed, no bloat introduced
- **Accessibility**: UI changes maintain keyboard navigation and ARIA compliance
- **Cross-browser compatibility**: Modern web standards used, no deprecated APIs

## Project-Specific Conventions

- **No secrets on client**: Never import server-only modules (e.g., `src/lib/config/env`, `src/lib/supabase/`) in client code.
- **Validation**: All env validated at boot with Zod (`src/lib/config/env.ts`). Use Zod for all schema validation (client & server).
- **Error handling**: API responses must use `{ error, code?, details? }` shape. Show user-friendly errors, log details for ops.
- **Accessibility**: All interactive elements must be keyboard accessible and have ARIA labels/attributes. Use `aria-describedby` for error messages.
- **Security**: Protect `/api/submit` with server-side reCAPTCHA (`src/lib/auth/recaptcha.ts`); rate-limit other public endpoints with `src/lib/auth/rateLimits.ts`.
- **SEO**: `/menu/{shareId}` must send `X-Robots-Tag: noindex` and `<meta name="robots" content="noindex,nofollow">`.
- **Logging**: Use structured logging system (`src/lib/logger`) - never `console.error` in production code.
- **Tests**: All tests must pass before any implementation is considered complete.

## Security Guidelines & Standards

### Authentication & Authorization

- **No secrets on client**: Server-only modules must never be imported in client code
- **Environment variables**: All secrets validated at boot with Zod schemas
- **API keys**: Store in environment variables, never hardcode in source
- **Session management**: Use secure, httpOnly cookies for sensitive data

### Input Validation & Sanitization

```typescript
// ✅ Complete input validation pattern
import { z } from "zod";

const userInputSchema = z.object({
  email: z.string().email().max(255),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s]+$/),
  age: z.number().int().min(13).max(120),
});

export function validateUserInput(input: unknown) {
  try {
    return { ok: true, data: userInputSchema.parse(input) };
  } catch (error) {
    return { ok: false, error: "Invalid input format" };
  }
}
```

### Rate Limiting & Protection

- **API endpoints**: All public endpoints must implement rate limiting
- **reCAPTCHA**: Verify server-side for form submissions
- **CORS**: Properly configure allowed origins
- **CSP headers**: Set Content-Security-Policy for XSS protection

### Data Protection

- **PII handling**: Use structured logger with PII redaction
- **Database security**: Row-Level Security (RLS) policies enabled
- **Audit logging**: Log all sensitive operations with structured format
- **Data encryption**: Use HTTPS for all communications

### Security Checklist

- [ ] No hardcoded secrets or API keys in codebase
- [ ] All user inputs validated with Zod schemas
- [ ] Rate limiting configured on public endpoints
- [ ] reCAPTCHA verification on form submissions
- [ ] CORS properly configured for production domains
- [ ] Environment variables properly typed and validated
- [ ] Structured logging with PII redaction enabled
- [ ] Database RLS policies active and tested

### Security Testing

```typescript
// ✅ Security test pattern
describe("Security Tests", () => {
  it("should reject invalid input", async () => {
    const maliciousInput = { email: '<script>alert("xss")</script>' };
    const result = await validateUserInput(maliciousInput);
    expect(result.ok).toBe(false);
  });

  it("should respect rate limits", async () => {
    // Test rate limiting logic
  });
});
```

## Integration Points & External Services

- **Supabase**: Server-only, initialized in `src/lib/supabase/client.ts`. Use `getServiceClient()` for database operations.
- **Upstash**: Used for rate limiting (see `src/lib/auth/rateLimits.ts`).
- **reCAPTCHA**: Verified server-side (see `src/lib/auth/recaptcha.ts`).
- **Logging**: Structured logging with run IDs, PII redaction, and environment-aware levels.

## Testing Patterns

- **Unit tests**: Place in `src/tests/unit/`. Use Vitest, MSW for mocking, jest-dom for DOM assertions.
- **Integration tests**: Place in `src/tests/integration/`. Test complete workflows (e.g., `onboarding/success-flow.test.ts`).
- **E2E tests**: Place in `src/tests/e2e/`. Use Playwright. Example: `smoke.spec.ts` checks home page loads.
- **Test setup**: All test env setup in `src/tests/setupTests.ts`.
- **Mock patterns**:
  - Always mock external services (Supabase, logger)
  - Use `vi.hoisted()` for complex mock objects
  - Mock at module level, not function level
- **Test validation**: All tests must pass before considering implementation complete.

## Performance Monitoring & Standards

### Build Analysis

- **Bundle size**: Monitor with `npm run build` - watch for significant increases
- **Tree shaking**: Ensure unused code is eliminated in production builds
- **Code splitting**: Leverage dynamic imports for route-based splitting

### Runtime Performance

- **API response times**: Target < 200ms for user-facing endpoints
- **Database queries**: Monitor slow queries, add indexes as needed
- **Memory usage**: Profile with React DevTools Profiler for client-side memory leaks
- **Core Web Vitals**: Monitor LCP, FID, CLS in production

### Development Performance

```bash
# Performance testing commands
npm run build                    # Check bundle size impact
npx vitest run --coverage       # Test coverage with performance impact
```

### Performance Checklist

- [ ] No unnecessary re-renders in React components
- [ ] Database queries use appropriate indexes
- [ ] Images optimized with Next.js Image component
- [ ] API responses cached when appropriate
- [ ] Bundle size increase < 10% per feature

## Performance & Quality Standards

- **Type safety**: Leverage TypeScript strict mode and Zod runtime validation
- **Error boundaries**: Graceful degradation with fallback values
- **Logging levels**:
  - `error`: Production issues requiring attention
  - `warn`: Potential issues or unexpected states
  - `info`: Normal business operations
  - `debug`: Development debugging (sampled in production)

## Examples

- **Env import**: `import { env } from '@/lib/config/env'`
- **API error shape**: `{ error: 'Invalid input', code: 400, details: { ... } }`
- **Unit test**: See `src/tests/unit/portion-scaling.test.ts` for business logic testing.
- **Business logic**: See `src/lib/recipes/recipeSelector.ts` for the recipe selection pipeline.

## Technical Patterns & Best Practices

### Database Operations

```typescript
// ✅ Standard database query pattern
import { getServiceClient } from "@/lib/supabase/client";
import { createLogger } from "@/lib/logger";

const logger = createLogger();

export async function getUserData(userId: string) {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("user").select("*").eq("id", userId).single();

    if (error) {
      logger.error("Database query failed:", error);
      return null;
    }

    return data;
  } catch (err) {
    logger.error("Unexpected database error:", err);
    return null;
  }
}
```

### API Payload Construction

```typescript
// ✅ Complete API payload building pattern
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const logger = createLogger();

export async function buildApiPayload<T>(
  input: unknown,
  schema: z.ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    // 1. Input validation
    const validatedInput = schema.parse(input);

    // 2. Parallel data fetching
    const [userData, preferences] = await Promise.all([
      getUserData(validatedInput.userId),
      getUserPreferences(validatedInput.userId),
    ]);

    // 3. Business logic computation
    const payload = {
      ...validatedInput,
      userData,
      preferences,
      timestamp: new Date().toISOString(),
    };

    // 4. Final validation
    return { ok: true, data: payload };
  } catch (error) {
    logger.error("Payload construction failed:", error);
    return {
      ok: false,
      error:
        error instanceof z.ZodError
          ? `Validation error: ${error.issues.map((i) => i.message).join(", ")}`
          : "Internal server error",
    };
  }
}
```

### Error Handling Pattern

```typescript
// ✅ Standard API response type
interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: number;
  details?: Record<string, unknown>;
}

// ✅ Error handler utility
export function createErrorResponse(
  error: string,
  code?: number,
  details?: Record<string, unknown>
): ApiResponse {
  return { ok: false, error, code, details };
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}
```

### Test Mocking Pattern

```typescript
// ✅ Complete test setup with mocking
import { vi } from "vitest";

// Mock logger at module level
const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => mockLogger,
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
};

vi.mock("@/lib/supabase/client", () => ({
  getServiceClient: () => mockSupabaseClient,
}));
```

## File Organization Patterns

```
src/lib/
├── auth/           # Authentication & security
├── config/         # Configuration & environment
├── constants/      # Business constants
├── email/          # Transactional emails (Resend)
├── logger/         # Structured logging system
├── quotas/         # Usage quotas
├── recipes/        # Recipe selection & shopping list
├── stripe/         # Payments
├── supabase/       # Database operations & queries
└── utils/          # Pure utility functions
src/schemas/        # Zod schemas & validators
```

## Troubleshooting Common Issues

- **Tests failing after changes**: Check mock configurations and ensure logger is mocked
- **Build errors**: Verify all imports use correct paths and no circular dependencies
- **Database errors**: Check connection and data structures match expected schema
- **Environment issues**: Ensure all required env vars are in `.env.test` for tests

## Glossary

BMR: Basal Metabolic Rate
TDEE: Total Daily Energy Expenditure
PII: Personally Identifiable Information
RLS: Row-Level Security (DB policy)
SPF/DKIM/DMARC: Email auth & policies (DNS records)
