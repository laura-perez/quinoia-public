# Integration Tests Setup

## Overview

Integration tests run against **real local services** with **mocked external APIs**:

- ✅ **Real Next.js server** (localhost:3000)
- ✅ **Real local Supabase** (localhost:54321)
- ✅ **Real HTTP requests** (using fetch)
- ❌ **Mocked Stripe API calls** (no external calls)

## Prerequisites

### 1. Start Supabase Local
```bash
npx supabase start
```

Verify it's running:
```bash
npx supabase status
```

Expected output:
```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 2. Start Next.js Dev Server with Integration Test Mode
```bash
# Set INTEGRATION_TESTS=true to enable Stripe mocking
INTEGRATION_TESTS=true npm run dev
```

Or on Windows:
```bash
cross-env INTEGRATION_TESTS=true npm run dev
```

Verify it's running:
```bash
curl http://localhost:3000
```

**Important**: The server MUST be started with `INTEGRATION_TESTS=true` to enable Stripe SDK mocking.

### 3. Ensure .env.local Points to Local Supabase
```bash
# .env.local
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

## Running Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Test Suite
```bash
npm run test:integration -- stripe-webhook-security
```

### Run with Verbose Output
```bash
npm run test:integration -- --reporter=verbose
```

## How Mocking Works

### Stripe SDK is Globally Mocked
**File**: `src/tests/setup-stripe-mocks.ts`

All Stripe API calls (like `stripe.subscriptions.retrieve()`) are automatically mocked to return test data.

**What's mocked**:
- ✅ `stripe.subscriptions.retrieve()` - Returns mock subscription data

**What's NOT mocked**:
- ❌ `stripe.webhooks.constructEvent()` - Uses real Stripe SDK for signature verification

### Example: Webhook Test Flow

```typescript
// 1. Test creates mock webhook event
const event = createCheckoutCompletedEvent(email, subId, cusId, priceId);
const payload = JSON.stringify(event);
const signature = signStripeWebhook(payload, WEBHOOK_SECRET);

// 2. Test sends HTTP POST to real Next.js server
const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
  method: 'POST',
  headers: { 'stripe-signature': signature },
  body: payload,
});

// 3. Webhook handler runs on Next.js server:
//    - Verifies signature (real Stripe SDK)
//    - Calls stripe.subscriptions.retrieve() (MOCKED - returns test data)
//    - Writes to local Supabase (REAL database)

// 4. Test verifies result in database
const user = await getUserByEmail(email);
expect(user.status).toBe('paid_active');
```

## Test Helpers

### Stripe Event Helpers
**File**: `helpers/stripe-helpers.ts`

- `createCheckoutCompletedEvent()` - Create checkout.session.completed event
- `createInvoicePaymentSucceededEvent()` - Create invoice.payment_succeeded event
- `signStripeWebhook()` - Sign event with HMAC SHA256
- `createInvalidSignature()` - Create invalid signature for rejection tests
- `createOldTimestampSignature()` - Create expired signature for replay tests

### Database Helpers
**File**: `helpers/database-helpers.ts`

- `createTestUser()` - Create test user in local DB
- `getUserByEmail()` - Fetch user from local DB
- `deleteTestUserByEmail()` - Delete test user
- `cleanupTestUsers()` - Delete all test-* users
- `createMockStripeCustomerId()` - Generate mock Stripe customer ID
- `createMockStripeSubscriptionId()` - Generate mock Stripe subscription ID

### Stripe SDK Mocks
**File**: `helpers/stripe-mocks.ts`

- `createMockSubscription()` - Create mock Stripe subscription object

## Troubleshooting

### Tests Fail with "ECONNREFUSED localhost:3000"
**Problem**: Next.js dev server not running

**Solution**:
```bash
npm run dev
```

### Tests Fail with "PGRST" Errors
**Problem**: Supabase local not running

**Solution**:
```bash
npx supabase start
```

### Tests Create Users in Production Database
**Problem**: `.env.local` points to production Supabase

**Solution**: Update `.env.local` to use local Supabase URL:
```bash
SUPABASE_URL=http://127.0.0.1:54321
```

### Webhook Signature Verification Fails
**Problem**: `STRIPE_WEBHOOK_SECRET` mismatch

**Solution**: Ensure `.env.local` and `.env.local.test` use same webhook secret:
```bash
# Both files should have:
STRIPE_WEBHOOK_SECRET=whsec_your_local_stripe_cli_secret
```

### Real Stripe API Calls Being Made
**Problem**: Stripe SDK mock not loading

**Solution**: Check `src/tests/setup-stripe-mocks.ts` is in `vitest.config.ts` setupFiles

## Architecture

```
┌─────────────────────────────────────────────┐
│  Integration Test (Vitest)                 │
│  - Creates mock Stripe event               │
│  - Signs with real HMAC                    │
│  - Sends HTTP POST                         │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTP POST
                  ▼
┌─────────────────────────────────────────────┐
│  Next.js Dev Server (localhost:3000)       │
│  /api/webhooks/stripe                      │
│  - Verifies signature (real Stripe SDK)    │
│  - Calls stripe.subscriptions.retrieve()   │ ◄── MOCKED
│  - Writes to database                      │
└─────────────────┬───────────────────────────┘
                  │
                  │ PostgreSQL queries
                  ▼
┌─────────────────────────────────────────────┐
│  Supabase Local (localhost:54321)          │
│  - Real PostgreSQL database                │
│  - Service role authentication             │
│  - RLS disabled for tests                  │
└─────────────────────────────────────────────┘
```

## Best Practices

### 1. Always Clean Up Test Data
```typescript
afterAll(async () => {
  await cleanupTestUsers(); // Deletes all test-*@example.com users
});
```

### 2. Use Unique Email Addresses
```typescript
const email = `test-unique-${Date.now()}@example.com`;
```

### 3. Don't Mock What You're Testing
- ✅ Mock external APIs (Stripe, OpenAI)
- ❌ Don't mock your own code under test
- ❌ Don't mock the database

### 4. Test Real Integration Points
- ✅ HTTP requests to API routes
- ✅ Database read/write operations
- ✅ Webhook signature verification

## Security

### Production Protection
The following safeguards prevent production writes:

1. **Local Supabase URL Check**: Tests verify `SUPABASE_URL` contains `127.0.0.1`
2. **Separate .env.local.test**: Integration tests use different config
3. **Test User Cleanup**: All test users have `test-*@example.com` emails

### Future Enhancements
Add to `src/tests/integration/setup.ts`:

```typescript
beforeAll(() => {
  const url = process.env.SUPABASE_URL;
  if (!url?.includes('127.0.0.1') && !url?.includes('localhost')) {
    throw new Error('🚨 Tests must use local Supabase');
  }
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Start Supabase
  run: npx supabase start

- name: Build Next.js
  run: npm run build

- name: Start Next.js
  run: npm run start &

- name: Wait for server
  run: npx wait-on http://localhost:3000

- name: Run integration tests
  run: npm run test:integration
```

## References

- [Vitest Docs](https://vitest.dev/)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Stripe Webhook Testing](https://stripe.com/docs/webhooks/test)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
