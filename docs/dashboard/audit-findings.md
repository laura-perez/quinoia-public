# 📊 Audit du code existant - Synthèse

**Date**: 5 octobre 2025
**Objectif**: Comprendre la structure avant d'implémenter le système Auth + Dashboard

---

## ✅ Findings - Structure src/

### Organisation des dossiers

```
src/
├── components/          # Components React (Form, UI, etc.)
├── config/             # Configuration
├── hooks/              # Custom React hooks
├── lib/                # Business logic & utilities
│   ├── auth/           # ✅ Existe déjà (rate limiting, recaptcha, IP detection)
│   ├── email/          # ✅ Service email (Resend client + templates)
│   ├── supabase/       # ✅ Repositories pattern
│   ├── stripe/         # ✅ Paiements
│   ├── recipes/        # ✅ Sélection recettes, shopping list
│   └── logger/         # ✅ Logging structuré
├── schemas/            # Zod schemas validation
├── tests/              # Tests
└── types/              # TypeScript types
```

### 🎯 Conventions identifiées

1. **Naming**: camelCase pour fichiers, PascalCase pour components
2. **Repositories**: Pattern singleton (`usersRepository = new UsersRepository()`)
3. **Logging**: `createLogger()` - structured logging avec runId
4. **Error handling**: Zod validation + formatZodErrors (FR)
5. **TypeScript**: Strict typing, pas de `any`

---

## ✅ Findings - Auth existant

### `src/lib/auth/rateLimits.ts`

**✅ Système de rate limiting déjà implémenté !**

- Library: `@upstash/ratelimit` avec Redis
- Fonction: `limit(key, max, windowSec)`
- No-op mode si Redis pas configuré (dev friendly)
- Token bucket algorithm

**Exemple utilisation :**
```typescript
const result = await limit(`magic-link:${email}`, 3, 3600); // 3 req/heure
if (!result.success) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

### `src/lib/auth/recaptcha.ts`

- Fonction: `verifyAndExtractRecaptcha(token)`
- Déjà utilisé dans `/api/submit`

### `src/lib/auth/ipDetection.ts`

- Fonction: `detectClientIP(req)`
- Gestion headers proxy (x-forwarded-for, etc.)
- Confidence assessment

---

## ✅ Findings - Supabase

### `src/lib/supabase/repositories/users.ts`

**✅ Repository pattern déjà implémenté !**

Méthodes disponibles :
- `create(input)` - Créer user
- `upsert(input)` - Créer ou update (onConflict: email)
- `findByEmail(email)`
- `findById(id)`
- `updateLastSubmission(userId, menuResultId)`
- `updateStatus(userId, status)`
- `markTrialAsUsed(userId)`

**Pattern**: Singleton exporté `usersRepository`

**Logging**: Intégré avec `createLogger()`, emails redacted

---

## ✅ Findings - Email

### `src/lib/email/service.ts`

**✅ Service email déjà structuré !**

- Client: `sendEmail(params)` depuis `./client`
- Templates: Fonctions `getXxxSubject()` et `getXxxHtml()`
- Mock mode pour tests: `process.env.INTEGRATION_TESTS === 'true'`

**Exemple template existant:**
```typescript
// src/lib/email/templates/welcome-menu.ts
export function getWelcomeMenuSubject(user) { ... }
export function getWelcomeMenuHtml(user, menu) { ... }
```

**Pattern à suivre pour magic link:**
```typescript
// src/lib/email/templates/magic-link.ts
export function getMagicLinkSubject(firstName?) { ... }
export function getMagicLinkHtml(magicLinkUrl, firstName?) { ... }
```

---

## ✅ Findings - Database

### Migrations existantes

```
supabase/migrations/
├── 20251001_initial_schema.sql        # Tables user, submission, menuResult, etc.
├── 20251003_add_stripe_fields_to_user.sql
├── 20251004_seed_ingredients.sql
└── 20251005_disable_rls_for_tests.sql
```

### Table `user` (existant)

**Champs déjà présents :**
- `id`, `email` ✅
- `firstName` ✅
- `createdAt` ✅
- `lastSubmissionAt` ✅
- `lastMenuResultId` ✅
- `status` ✅ (CHECK: trial_available, trial_used, paid_active, paid_expired)
- `subscriptionType` ✅
- `paidUntil` ✅
- Stripe fields ✅
- `updatedAt` ✅

**Champs manquants (à ajouter) :**
- `lastLoginAt` ❌
- `isFirstLogin` ❌

### Table `menuResult` (existant)

**Champs présents :**
- `id`, `submissionId`, `userId` ✅
- `resultBundle` (jsonb) ✅
- `numRecipes`, `numServings` ✅
- `shareId`, `shareActive` ✅
- `createdAt` ✅

**Champs manquants (à ajouter) :**
- `activeRecipeIds uuid[]` ❌
- `swapPoolRecipeIds uuid[]` ❌
- `swapsCount integer` ❌

**Tables à créer :**
- `magicLink` ❌
- `userSession` ❌

---

## ✅ Findings - API Routes

### Pattern #1 : Routes classiques (`/api/submit.ts`)

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createLogger();
  const ipDetection = detectClientIP(req);

  // Set runId in headers for tracing
  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  // Parse body
  let raw: any;
  try {
    raw = req.body;
    if (typeof raw === "string") raw = JSON.parse(raw);
  } catch (e) {
    return res.status(400).json({ error: "Corps de requête invalide" });
  }

  // Zod validation
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return res.status(400).json({ errors: formatZodErrors(parsed.error) });
  }

  // Business logic...
}
```

### Pattern #2 : Webhooks (`/api/webhooks/stripe.ts`)

**✅ Pattern webhooks déjà implémenté !**

```typescript
export const config = {
  api: {
    bodyParser: false,  // ⚠️ Important pour webhooks
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    // Verify webhook signature
    const event = verifyWebhookSignature(buf.toString(), signature);

    // Handle events with switch
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      // ...
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error });
    return res.status(400).json({ error: 'Webhook error' });
  }
}
```

**Pattern handlers séparés :**
- Fonctions `async handleXxx(object)` pour chaque event type
- Logging structuré dans chaque handler
- Upserts pour idempotence (webhooks peuvent retry)
- Re-throw errors pour que Stripe retry (status 500)

**À suivre pour nos nouvelles routes :**
- ✅ Logger avec runId
- ✅ IP detection (si pertinent)
- ✅ Method check
- ✅ Zod validation
- ✅ Error handling FR
- ✅ Webhooks: disable bodyParser, verify signature, separate handlers

---

## ✅ Findings - Tests

### Structure

```
src/tests/
├── integration/
│   ├── onboarding/
│   ├── stripe/
│   └── ...
├── setup-env.ts
└── setupTests.ts
```

### Vitest config (existant)

- Environment: `node` pour integration, `happy-dom` pour unit
- Timeout: 30s
- Setup files: `setup-env.ts`, `setupTests.ts`

---

## 🎯 Décisions d'implémentation

### ✅ Ce qu'on PEUT réutiliser

1. **Rate limiting**: `src/lib/auth/rateLimits.ts` - fonction `limit()`
2. **Users repository**: `src/lib/supabase/repositories/users.ts`
3. **Email service**: `src/lib/email/service.ts` et client
4. **Logger**: `createLogger()`
5. **IP detection**: `detectClientIP(req)`
6. **Pattern API routes**: Validation Zod, error handling

### ✅ Ce qu'on DOIT créer

1. **Nouvelles tables**: `magicLink`, `userSession`
2. **Nouveaux champs**: `user.lastLoginAt`, `user.isFirstLogin`, `menuResult.activeRecipeIds`, etc.
3. **Auth utils**: `src/lib/auth/tokens.ts`, `src/lib/auth/session.ts`
4. **Repositories**: `src/lib/supabase/repositories/magicLinks.ts`, `sessions.ts`
5. **Email templates**: `src/lib/email/templates/magic-link.ts`
6. **Middleware**: `src/middleware/withAuth.ts`, `withQuotaCheck.ts`
7. **API routes**: `/api/auth/*`, `/api/dashboard/*`
8. **Frontend hooks**: `src/hooks/useMenuSwap.ts`
9. **Pure functions**: `src/utils/shoppingList/generator.ts`

### ⚠️ Points d'attention

1. **Naming conventions**: Suivre camelCase pour fichiers, PascalCase pour components
2. **Repository pattern**: Singleton avec logging intégré
3. **Pas de `any`**: TypeScript strict
4. **Zod schemas**: Validation + error messages FR
5. **Logging**: Toujours logger avec runId, redact PII
6. **Tests**: Mock email en mode `INTEGRATION_TESTS=true`

---

## 🚀 Prochaines étapes

Phase 1 (migrations DB) peut commencer !

**Ordre recommandé:**
1. ✅ Migrations DB (Phase 1)
2. ✅ Utils & Helpers (Phase 2) - réutiliser rate limiting
3. ✅ Email templates (Phase 3) - suivre pattern existant
4. ✅ API Routes (Phase 4-5) - suivre pattern `/api/submit.ts`
5. ✅ Frontend (Phase 6-7)

---

**Document créé**: 5 octobre 2025
**Statut**: ✅ Audit terminé, prêt pour implémentation
