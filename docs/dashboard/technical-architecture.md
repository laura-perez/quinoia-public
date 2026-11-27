# Architecture technique - Système d'authentification et Dashboard

> Historical design document (2025); the README describes the current architecture.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Schema base de données](#schema-base-de-données)
3. [API Routes](#api-routes)
4. [Système d'authentification Magic Link](#système-dauthentification-magic-link)
5. [Gestion des quotas (Rolling Window)](#gestion-des-quotas-rolling-window)
6. [Stack technique](#stack-technique)
7. [Priorisation par sprints](#priorisation-par-sprints)
8. [Sécurité](#sécurité)

---

## 🏗️ Vue d'ensemble

### Architecture globale

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ /formulaire│ /dashboard │ /login     │             │
│  │ (public)  │ (protected)│ (public)   │             │
│  │            │            │            │             │
│  │ SWAPS:     │ Hook:      │            │             │
│  │ Frontend   │ useMenuSwap│            │             │
│  │ PUR (0ms)  │ (React)    │            │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                        ↓ API calls (minimal)
┌─────────────────────────────────────────────────────────┐
│              API ROUTES (Next.js API)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ /api/auth/request-magic-link                     │  │
│  │ /api/auth/verify-magic-link                      │  │
│  │ /api/auth/logout                                 │  │
│  │ /api/dashboard/status                            │  │
│  │ /api/dashboard/generate-menu                     │  │
│  │ PATCH /api/dashboard/menu/:id (debounced save)   │  │
│  │ POST /api/dashboard/menu/:id/refetch-pool        │  │
│  │ /api/checkout/create-session (existant)         │  │
│  │ /api/webhooks/stripe (existant)                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                  │
│  Tables: user, magicLink, userSession, menuResult       │
│  Note: NO shoppingListCache (calculated frontend)       │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Schema base de données

### Nouvelles tables à créer

#### Table `magicLink`

```sql
CREATE TABLE IF NOT EXISTS public."magicLink" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  "userId" uuid REFERENCES public."user"(id) ON DELETE CASCADE,
  "expiresAt" timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  "usedAt" timestamp with time zone,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "ipAddress" inet,
  "userAgent" text
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_magicLink_token ON public."magicLink"(token);
CREATE INDEX IF NOT EXISTS idx_magicLink_email ON public."magicLink"(email);
CREATE INDEX IF NOT EXISTS idx_magicLink_expiresAt ON public."magicLink"("expiresAt");

-- Cleanup automatique des liens expirés (optionnel)
CREATE INDEX IF NOT EXISTS idx_magicLink_cleanup
  ON public."magicLink"("expiresAt")
  WHERE used = false;

COMMENT ON TABLE public."magicLink" IS 'Magic links for passwordless authentication';
COMMENT ON COLUMN public."magicLink".token IS 'Unique token for magic link (URL-safe random string)';
COMMENT ON COLUMN public."magicLink"."expiresAt" IS 'Token expires after 15 minutes';
COMMENT ON COLUMN public."magicLink".used IS 'Whether the link has been used (one-time use)';
```

#### Table `userSession`

```sql
CREATE TABLE IF NOT EXISTS public."userSession" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  "expiresAt" timestamp with time zone NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "lastActivityAt" timestamp with time zone NOT NULL DEFAULT now(),
  "ipAddress" inet,
  "userAgent" text
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_userSession_token ON public."userSession"(token);
CREATE INDEX IF NOT EXISTS idx_userSession_userId ON public."userSession"("userId");
CREATE INDEX IF NOT EXISTS idx_userSession_expiresAt ON public."userSession"("expiresAt");

COMMENT ON TABLE public."userSession" IS 'User sessions with 90-day cookies';
COMMENT ON COLUMN public."userSession".token IS 'Session token stored in HTTP-only cookie';
COMMENT ON COLUMN public."userSession"."expiresAt" IS 'Session expires after 90 days';
COMMENT ON COLUMN public."userSession"."lastActivityAt" IS 'Updated on each request to track active sessions';
```

### Modifications table `user`

```sql
-- Ajouter champs manquants pour le dashboard
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS "firstName" text,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "isFirstLogin" boolean DEFAULT true;

-- Champs existants (déjà présents) :
-- - email
-- - status (trial_available, trial_used, paid_active, paid_expired)
-- - subscriptionType (monthly, yearly)
-- - paidUntil
-- - hasUsedPromo
-- - hasUsedTrial
-- - stripeCustomerId
-- - stripeSubscriptionId
-- - stripePriceId
-- - lastSubmissionAt
-- - lastMenuResultId
-- - createdAt
-- - updatedAt
```

### Modifications table `menuResult`

```sql
-- Ajouter champs pour swaps (frontend-first approach)
ALTER TABLE public."menuResult"
  ADD COLUMN IF NOT EXISTS "activeRecipeIds" uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "swapPoolRecipeIds" uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "swapsCount" integer NOT NULL DEFAULT 0;

-- Index pour requêtes de quotas
CREATE INDEX IF NOT EXISTS idx_menuResult_userId_createdAt
  ON public."menuResult"("userId", "createdAt");

COMMENT ON COLUMN public."menuResult"."activeRecipeIds" IS 'IDs of currently active recipes in the menu';
COMMENT ON COLUMN public."menuResult"."swapPoolRecipeIds" IS 'Pool of replacement recipes (1 for free, 10 for premium)';
COMMENT ON COLUMN public."menuResult"."swapsCount" IS 'Number of swaps performed (for free user quota: max 1)';

-- Note: Shopping list is NOT cached in DB, it's calculated frontend via pure function
-- Note: No swap history tracking - just simple counter for quota enforcement
```

### Vue pour quotas utilisateur

```sql
-- Vue pour calculer les quotas de la semaine en cours (rolling window 7 jours)
CREATE OR REPLACE VIEW public."userQuotaStatus" AS
SELECT
  u.id as "userId",
  u.email,
  u.status,

  -- Dernière génération de menu (source de vérité pour rolling window)
  u."lastSubmissionAt" as "lastMenuGeneratedAt",

  -- Quota menus : nombre de menus générés depuis lastSubmissionAt
  COALESCE(
    (SELECT COUNT(*)
     FROM public."menuResult" mr
     WHERE mr."userId" = u.id
     AND mr."createdAt" >= u."lastSubmissionAt"
    ), 0
  ) as "menusGeneratedThisWindow",

  -- Quota swaps : nombre total de swaps dans le menu actuel
  COALESCE(
    (SELECT mr."swapsCount"
     FROM public."menuResult" mr
     WHERE mr.id = u."lastMenuResultId"
    ), 0
  ) as "swapsUsedThisMenu",

  -- Limites selon status
  CASE
    WHEN u.status = 'paid_active' THEN NULL -- illimité
    ELSE 1
  END as "menuQuotaLimit",

  CASE
    WHEN u.status = 'paid_active' THEN NULL -- illimité
    ELSE 1
  END as "swapQuotaLimit",

  -- Prochaine réinitialisation quota (7 jours après lastSubmissionAt)
  CASE
    WHEN u."lastSubmissionAt" IS NOT NULL
    THEN u."lastSubmissionAt" + INTERVAL '7 days'
    ELSE NULL
  END as "nextQuotaReset",

  -- Peut générer nouveau menu ?
  CASE
    WHEN u.status = 'paid_active' THEN true
    WHEN u."lastSubmissionAt" IS NULL THEN true
    WHEN u."lastSubmissionAt" + INTERVAL '7 days' <= NOW() THEN true
    ELSE false
  END as "canGenerateMenu"

FROM public."user" u;

COMMENT ON VIEW public."userQuotaStatus" IS 'Real-time quota status for each user (rolling 7-day window based on lastSubmissionAt)';
```

---

## 🔌 API Routes

### 1. Authentification

#### `POST /api/auth/request-magic-link`

**Request body:**
```typescript
{
  email: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string; // "Magic link envoyé ! Vérifie tes emails"
}
```

**Logic:**
1. Valider email (format + rate limiting : 3 demandes/heure/email)
2. Vérifier si user existe → sinon créer compte automatiquement
3. Générer token unique (crypto.randomBytes(32).toString('hex'))
4. Créer entrée `magicLink` (expires in 15 min)
5. Envoyer email via Resend
6. Return 200 (même si email n'existe pas = sécurité)

**Fichier:** `pages/api/auth/request-magic-link.ts`

---

#### `GET /api/auth/verify-magic-link?token=xxx`

**Query params:**
```typescript
{
  token: string;
}
```

**Response:**
```typescript
// Success: Redirect to /dashboard with session cookie
// Error: Redirect to /login?error=invalid_token
```

**Logic:**
1. Vérifier token existe et non expiré
2. Vérifier token non utilisé (one-time use)
3. Marquer token comme utilisé
4. Créer session (token JWT ou UUID in DB)
5. Set HTTP-only cookie (90 jours)
6. Update user.lastLoginAt
7. Redirect to /dashboard

**Fichier:** `pages/api/auth/verify-magic-link.ts`

---

#### `POST /api/auth/logout`

**Response:**
```typescript
{
  success: boolean;
}
```

**Logic:**
1. Invalider session en DB
2. Clear cookie
3. Return 200

**Fichier:** `pages/api/auth/logout.ts`

---

### 2. Dashboard

#### `GET /api/dashboard/status`

**Headers:**
```typescript
Cookie: session_token=xxx
```

**Response:**
```typescript
{
  user: {
    id: string;
    email: string;
    firstName: string | null;
    status: 'trial_available' | 'trial_used' | 'paid_active' | 'paid_expired';
    isFirstLogin: boolean;
  };
  quotas: {
    menusGeneratedThisWindow: number;
    menuQuotaLimit: number | null; // null = illimité
    swapsUsedThisMenu: number;
    swapQuotaLimit: number | null;
    nextQuotaReset: string | null; // ISO date
  };
  currentMenu: {
    id: string;
    activeRecipes: Recipe[]; // Full recipe objects
    swapPool: Recipe[]; // 1 for free, 10 for premium
    swapsCount: number;
    numServings: number;
    createdAt: string;
  } | null;
  ingredientsCatalog: Map<string, IngredientCanonical>; // Pour calcul shopping list frontend
}
```

**Logic:**
1. Vérifier session (middleware)
2. Fetch user + quotas (vue `userQuotaStatus`)
3. Fetch dernier menu (lastMenuResultId) avec activeRecipeIds et swapPoolRecipeIds
4. Hydrate full recipe objects from IDs
5. Fetch ingredients catalog
6. Return data (shopping list sera calculée frontend)

**Fichier:** `pages/api/dashboard/status.ts`

---

#### `POST /api/dashboard/generate-menu`

**Request body:**
```typescript
{
  numRecipes: number; // 3 pour gratuit, 2-7 pour premium
  preferences?: {
    // Si user veut override ses préférences
    diet?: string;
    proteinPreferences?: string[];
    // ...
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  menu: {
    id: string;
    activeRecipes: Recipe[]; // Full recipe objects
    swapPool: Recipe[]; // 1 recipe for free, 10 for premium
    swapsCount: number;
    numServings: number;
  };
  ingredientsCatalog: Map<string, IngredientCanonical>; // Pour calcul shopping list frontend
  quotas: {
    menusGeneratedThisWindow: number;
    menuQuotaLimit: number | null;
    swapLimit: number | null; // 1 for free, null for premium
    nextQuotaReset: string;
  };
}
```

**Logic:**
1. Vérifier session
2. **Vérifier quota** (si gratuit, max 1 menu/7 jours depuis lastSubmissionAt)
3. Si quota dépassé → return 403 avec message upgrade
4. Fetch user preferences (dernière submission)
5. Déterminer taille pool selon status : `poolSize = isPremium ? 10 : 1`
6. Appeler algorithme sélection recettes : `totalRecipes = numRecipes + poolSize`
7. Diviser recettes : `activeRecipes = slice(0, numRecipes)`, `swapPool = slice(numRecipes)`
8. **Sauvegarder IDs uniquement** (pas de shopping list en DB)
9. Update user.lastMenuResultId et lastSubmissionAt
10. Return menu complet + catalog d'ingrédients
11. **Shopping list sera calculée frontend via pure function**

**Fichier:** `pages/api/dashboard/generate-menu.ts`

---

#### `PATCH /api/dashboard/menu/:id` (Debounced save)

**Request body:**
```typescript
{
  activeRecipeIds: string[]; // Updated after frontend swap
  swapsCount: number; // Incremented after frontend swap
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

**Logic:**
1. Vérifier session
2. Fetch menuResult et vérifier ownership (userId match)
3. **Vérifier quota swap** si gratuit (swapsCount ne doit pas dépasser 1)
4. Si quota dépassé → return 403
5. **Simple UPDATE** des IDs et compteur (pas de recalcul côté serveur)
6. Return success

**Fichier:** `pages/api/dashboard/menu/[id].ts`

**Note importante**: Cette route est appelée de manière débounced (500ms) après chaque swap frontend. Le swap lui-même se fait **entièrement côté frontend** (instant, 0 latency). Cette route sert uniquement à persister l'état.

---

#### `POST /api/dashboard/menu/:id/refetch-pool` (Premium only)

**Request body:**
```typescript
{
  excludeRecipeIds: string[]; // Current active recipes + already seen in pool
}
```

**Response:**
```typescript
{
  success: boolean;
  newSwapPool: Recipe[]; // 10 nouvelles recettes
}
```

**Logic:**
1. Vérifier session
2. Vérifier user premium (status = 'paid_active')
3. Si gratuit → return 403
4. Fetch 10 nouvelles recettes (exclure excludeRecipeIds)
5. Update menuResult.swapPoolRecipeIds
6. Return nouvelles recettes

**Fichier:** `pages/api/dashboard/menu/[id]/refetch-pool.ts`

**Note**: Appelé automatiquement quand user premium épuise ses 10 recettes du pool.

---

#### `PUT /api/dashboard/preferences`

**Request body:**
```typescript
{
  firstName?: string;
  diet?: string;
  proteinPreferences?: string[];
  // ... tous les champs du formulaire
}
```

**Response:**
```typescript
{
  success: boolean;
  user: User;
}
```

**Logic:**
1. Vérifier session
2. Valider input (zod schema)
3. Update user preferences (ou créer nouvelle submission si modèle différent)
4. Return user mis à jour

**Fichier:** `pages/api/dashboard/preferences.ts`

---

### 3. Pages existantes à modifier

#### `POST /api/submit` (EXISTANT)

**Modifications nécessaires:**
1. Après génération menu, **proposer création compte** dans la réponse
2. Ajouter flag `isTrialMenu: true` dans menuResult
3. Return `shareId` + `menuResult` comme aujourd'hui

**Nouveau champ response:**
```typescript
{
  // ... existant
  shareId: string;
  menuResult: MenuResult;

  // NOUVEAU
  accountCreationSuggested: true;
  userEmail: string; // Pré-rempli pour modal création compte
}
```

---

## ⚡ Architecture Frontend-First (Swaps & Shopping List)

### Principe clé

**Objectif**: Minimiser les ressources serveur pour les utilisateurs gratuits (majorité des users) tout en offrant une UX fluide (0ms latency sur swaps).

**Solution**: Tous les swaps et calculs de liste de courses se font **côté frontend** (JavaScript pur). Le serveur ne fait que persister l'état de manière débounced.

### Comparaison Architecture

| Aspect | ❌ Backend-heavy (initial) | ✅ Frontend-first (final) |
|--------|---------------------------|---------------------------|
| Swap action | API call per swap | Frontend pure (instant) |
| Shopping list | Calculated server-side | Calculated frontend (pure function) |
| DB writes | On every swap | Debounced (500ms) |
| Latency | 200-500ms | 0ms |
| Server CPU | High (50% users free) | Minimal |
| Data transfer | Full menu + list | IDs only |
| Swap pool size | N/A | 1 (free) vs 10 (premium) |

### 🎯 Architecture réelle (Frontend PUR pour TOUT LE MONDE)

**Objectif**: Économiser ressources serveur (surtout pour gratuits qui sont majoritaires)

| Aspect | Gratuit (économie ressources) | Premium |
|--------|-------------------------------|---------|
| **swapPool size** | 1 recette (moins de données) | 10 recettes |
| **Swap action** | ✅ Frontend PUR (from pool) | ✅ Frontend PUR (from pool) |
| **Liste courses** | ✅ Frontend PUR (recalcul temps réel) | ✅ Frontend PUR (recalcul temps réel) |
| **Sauvegarde swap** | Debounced API (500ms) | Debounced API (500ms) |
| **Pool épuisé** | Désactivé (1 swap max de toute façon) | API refetch (cas rare) |
| **API calls per swap** | 0 (juste save debounced) | 0 (juste save debounced) |

**Pourquoi TOUT en frontend ?**

1. ✅ Gratuits = majorité des users → économiser CPU serveur
2. ✅ 1 appel API au départ (génération menu) → puis ZÉRO appel pendant les swaps
3. ✅ Swap instantané pour gratuits ET premium (UX identique)
4. ✅ Liste courses recalculée côté front → zéro latence
5. ✅ Sauvegarde différée (debounced) → juste pour persistance, pas bloquant

### React Hook `useMenuSwap`

**Fichier**: `hooks/useMenuSwap.ts`

```typescript
import { useState, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { generateShoppingList } from '@/utils/shoppingList/generator';

interface UseMenuSwapProps {
  initialMenu: {
    id: string;
    activeRecipes: Recipe[];
    swapPool: Recipe[];
    swapsCount: number;
    numServings: number;
  };
  ingredientsCatalog: Map<string, IngredientCanonical>;
  swapLimit: number | null; // 1 pour gratuit, null pour premium
}

export const useMenuSwap = ({
  initialMenu,
  ingredientsCatalog,
  swapLimit,
}: UseMenuSwapProps) => {
  const [activeRecipes, setActiveRecipes] = useState(initialMenu.activeRecipes);
  const [swapPool, setSwapPool] = useState(initialMenu.swapPool);
  const [swapsCount, setSwapsCount] = useState(initialMenu.swapsCount);

  const isPremium = swapLimit === null;
  const canSwap = isPremium || swapsCount < swapLimit;

  // Recalcul liste de courses (temps réel, frontend pur)
  const shoppingList = useMemo(() => {
    return generateShoppingList(
      activeRecipes,
      initialMenu.numServings,
      ingredientsCatalog
    );
  }, [activeRecipes, initialMenu.numServings, ingredientsCatalog]);

  // Sauvegarder en DB (debounced 500ms)
  const saveToServer = useCallback(
    debounce(async (activeIds: string[], count: number) => {
      await fetch(`/api/dashboard/menu/${initialMenu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeRecipeIds: activeIds,
          swapsCount: count,
        }),
      });
    }, 500),
    [initialMenu.id]
  );

  // Refetch pool (premium only)
  const refetchPool = useCallback(async () => {
    if (!isPremium) return;

    const excludeIds = [
      ...activeRecipes.map((r) => r.id),
      ...swapPool.map((r) => r.id),
    ];

    const res = await fetch(`/api/dashboard/menu/${initialMenu.id}/refetch-pool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludeRecipeIds: excludeIds }),
    });

    const { newSwapPool } = await res.json();
    setSwapPool(newSwapPool);
  }, [isPremium, activeRecipes, swapPool, initialMenu.id]);

  // Swap une recette (FRONTEND PUR - 0ms latency)
  const swapRecipe = useCallback(
    async (recipeToRemove: Recipe) => {
      // Vérifier quota
      if (!canSwap) {
        // Modal upgrade premium
        return;
      }

      // Vérifier pool non vide
      if (swapPool.length === 0) {
        if (isPremium) {
          // Premium: refetch pool quand épuisé
          await refetchPool();
          return; // User cliquera à nouveau après refetch
        } else {
          // Gratuit : ne devrait jamais arriver (quota = 1 swap, pool = 1 recette)
          return;
        }
      }

      // 1. Swap INSTANTANÉ (React state)
      const newRecipe = swapPool[0];

      setActiveRecipes((prev) =>
        prev.map((r) => (r.id === recipeToRemove.id ? newRecipe : r))
      );

      // 2. Recycler recette retirée dans le pool (end of queue)
      setSwapPool((prev) => [...prev.slice(1), recipeToRemove]);

      // 3. Incrémenter compteur
      setSwapsCount((prev) => prev + 1);

      // 4. Sauvegarder en DB (debounced, non bloquant)
      const newActiveIds = activeRecipes.map((r) =>
        r.id === recipeToRemove.id ? newRecipe.id : r.id
      );
      saveToServer(newActiveIds, swapsCount + 1);

      // shoppingList se met à jour automatiquement (useMemo)
    },
    [activeRecipes, swapPool, swapsCount, canSwap, isPremium, refetchPool, saveToServer]
  );

  return {
    activeRecipes,
    swapPool,
    shoppingList, // Calculée automatiquement via useMemo
    swapsCount,
    swapLimit,
    canSwap,
    swapRecipe, // Fonction principale (instant swap)
    refetchPool, // Premium only
  };
};
```

### Pure Function `generateShoppingList`

**Fichier**: `utils/shoppingList/generator.ts`

```typescript
/**
 * Génère liste de courses à partir des recettes actives
 * FONCTION PURE - peut tourner côté frontend ou backend
 */
export function generateShoppingList(
  activeRecipes: Recipe[],
  numServings: number,
  ingredientsCatalog: Map<string, IngredientCanonical>
): ShoppingList {
  const itemsByCanonicalId = new Map<string, ShoppingItem>();

  // 1. Agréger ingrédients
  activeRecipes.forEach((recipe) => {
    recipe.ingredients.forEach((ing) => {
      const canonical = ingredientsCatalog.get(ing.canonicalId);
      if (!canonical) return;

      const existing = itemsByCanonicalId.get(ing.canonicalId);

      if (existing) {
        existing.quantity += ing.quantity * numServings;
      } else {
        itemsByCanonicalId.set(ing.canonicalId, {
          canonicalId: ing.canonicalId,
          nameFr: canonical.nameFr,
          quantity: ing.quantity * numServings,
          unit: ing.unit,
          sectionCode: canonical.sectionCode,
        });
      }
    });
  });

  // 2. Grouper par rayon
  const bySection: Record<string, ShoppingItem[]> = {};

  itemsByCanonicalId.forEach((item) => {
    const section = item.sectionCode;
    if (!bySection[section]) bySection[section] = [];
    bySection[section].push(item);
  });

  // 3. Trier rayons (ordre standard supermarché)
  const sectionOrder = [
    'fruits-legumes',
    'boucherie',
    'poissonnerie',
    'epicerie-salee',
    'produits-frais',
    'epicerie-sucree',
    'surgeles',
    'boissons',
  ];

  const sortedBySection: Record<string, ShoppingItem[]> = {};
  sectionOrder.forEach((section) => {
    if (bySection[section]) {
      sortedBySection[section] = bySection[section];
    }
  });

  return {
    bySection: sortedBySection,
    totals: { totalItems: itemsByCanonicalId.size },
  };
}
```

### 🔄 Flow swap UNIFIÉ (gratuit ET premium)

```
1. User clique "Swapper recette 1"
   ↓
2. Frontend vérifie quota
   - Gratuit: swapsUsed < 1 ?
   - Premium: toujours true
   ↓
3. Frontend swap IMMÉDIAT (state React)
   - Retire recipe1 de activeRecipes
   - Ajoute recipePool[0] aux activeRecipes
   - Retire recipePool[0] du pool
   - Ajoute recipe1 au pool (recyclage)
   - Incrémente swapsUsed
   ↓
4. Frontend RECALCULE liste de courses (fonction pure)
   - generateShoppingList(newActiveRecipes)
   - Mise à jour instantanée (useMemo)
   ↓
5. Debounced API call (500ms) - MÊME POUR GRATUIT
   PATCH /api/dashboard/menu/:id
   {
     activeRecipeIds: [newId, id2, id3],
     swapsCount: 1
   }
   ↓
6. Backend sauvegarde (PAS de recalcul)
   - Update activeRecipeIds
   - Update swapsCount
   - Return 200 OK
```

**Cas particuliers:**

- **Gratuit avec 1 recette dans pool:**
  - Swap 1 fois → pool épuisé → bouton swap désactivé
  - PAS d'appel API pour refetch (de toute façon quota atteint)

- **Premium avec 10 recettes dans pool:**
  - Swap 10 fois → pool épuisé → appel API refetch
  - Continue de swaper (illimité)

### Bénéfices de cette architecture

| Métrique | Impact |
|----------|--------|
| **Latency swap** | 0ms (vs 200-500ms) |
| **Server CPU** | -50% (swaps frontend, pas d'API calls) |
| **DB writes** | -90% (debounce 500ms au lieu d'instant) |
| **UX fluide** | Instant feedback, pas de loading |
| **Quota enforcement** | Toujours respecté (validation client + server) |
| **Data transfer** | Minimal (IDs uniquement en DB) |
| **Scalabilité** | Excellent (calculs côté client) |

### 📊 Comparaison ressources serveur

**Génération 1 menu pour 100 users**

| Action | Ancienne approche (❌) | Nouvelle approche (✅) |
|--------|------------------------|------------------------|
| Génération menu | 100 API calls | 100 API calls |
| Swap recette | 100 API calls | 0 API calls |
| Calcul liste courses | 100 calculs serveur | 0 calculs serveur |
| Sauvegarde swap | 100 UPDATE DB | 100 UPDATE DB (debounced) |
| **Total CPU serveur** | **400 ops** | **200 ops** |
| **Économie** | - | **50% CPU** |

**Pour 1000 users gratuits:**
- ✅ Économie de 2000 calculs serveur (swaps + listes)
- ✅ Latence swap : 0ms (vs 200-500ms)
- ✅ UX identique gratuit/premium

---

## 🔐 Système d'authentification Magic Link

### Flow complet

```
┌─────────────────────────────────────────────────────────┐
│ 1. User clique "Créer mon compte gratuit"              │
│    → Modal avec email pré-rempli                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. POST /api/auth/request-magic-link                   │
│    {email: "user@example.com"}                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Backend génère token + envoie email                 │
│    INSERT INTO magicLink                               │
│    Email template: "Ton espace Quinoïa est prêt ✨"    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. User clique lien dans email                         │
│    https://quinoia.fr/api/auth/verify?token=xxx        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Backend vérifie token → crée session                │
│    INSERT INTO userSession                             │
│    Set-Cookie: session_token=yyy; HttpOnly; Secure     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Redirect to /dashboard                              │
│    Cookie auto-inclus dans requêtes suivantes          │
└─────────────────────────────────────────────────────────┘
```

### Génération token sécurisé

```typescript
// utils/auth/generateToken.ts
import crypto from 'crypto';

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 caractères hex
}

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('base64url'); // URL-safe
}
```

### Template email Magic Link

```typescript
// lib/email/templates/magicLink.ts
export const magicLinkEmailTemplate = (magicLinkUrl: string, firstName?: string) => ({
  subject: "Ton espace Quinoïa est prêt ✨",
  html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Salut ${firstName || 'toi'} 👋</h2>

      <p><strong>Ton menu personnalisé t'attend dans ton espace !</strong></p>

      <p>
        <a href="${magicLinkUrl}"
           style="display: inline-block; background: #F4C95D; color: #414535;
                  padding: 12px 24px; text-decoration: none; border-radius: 8px;
                  font-weight: bold;">
          Se connecter à mon espace Quinoïa →
        </a>
      </p>

      <p style="color: #666; font-size: 14px;">
        <em>Ce lien expire dans 15 minutes</em>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

      <p>Ce qui t'attend :</p>
      <ul>
        <li>✓ Ton menu de cette semaine (sauvegardé)</li>
        <li>✓ Un nouveau menu gratuit chaque semaine</li>
        <li>✓ Ta liste de courses toute prête</li>
      </ul>

      <p>À tout de suite,<br/>L'équipe Quinoïa</p>
    </body>
    </html>
  `,
  text: `
    Salut ${firstName || 'toi'} 👋

    Ton menu personnalisé t'attend dans ton espace !

    Clique ici pour te connecter : ${magicLinkUrl}
    (Ce lien expire dans 15 minutes)

    Ce qui t'attend :
    - Ton menu de cette semaine (sauvegardé)
    - Un nouveau menu gratuit chaque semaine
    - Ta liste de courses toute prête

    À tout de suite,
    L'équipe Quinoïa
  `
});
```

---

## ⏱️ Gestion des quotas (Rolling Window)

### Principe du rolling window

```
Timeline:
─────────────────────────────────────────────────────►
    Lundi      Mercredi    Lundi      Mercredi
    J0         J2          J7         J9

User gratuit génère menu:
    ↓                      ↓
    Menu 1                 Menu 2 OK (>7 jours)

    Si user essaie de générer menu à J2 → BLOQUÉ
    Quota reset à J7 (7 jours après J0)
```

### Calcul quota en temps réel

```sql
-- Requête pour vérifier si user peut générer menu
SELECT
  u.id,
  u.status,
  u."lastSubmissionAt",

  -- Nombre de menus générés dans les 7 derniers jours
  COUNT(mr.id) FILTER (
    WHERE mr."createdAt" >= NOW() - INTERVAL '7 days'
  ) as "menusLast7Days",

  -- Quota limite selon status
  CASE
    WHEN u.status = 'paid_active' THEN NULL -- illimité
    ELSE 1
  END as "quotaLimit",

  -- Peut générer ?
  CASE
    WHEN u.status = 'paid_active' THEN true
    WHEN COUNT(mr.id) FILTER (
      WHERE mr."createdAt" >= NOW() - INTERVAL '7 days'
    ) < 1 THEN true
    ELSE false
  END as "canGenerateMenu",

  -- Prochaine réinitialisation
  (
    SELECT MIN(mr2."createdAt") + INTERVAL '7 days'
    FROM public."menuResult" mr2
    WHERE mr2."userId" = u.id
    AND mr2."createdAt" >= NOW() - INTERVAL '7 days'
  ) as "nextReset"

FROM public."user" u
LEFT JOIN public."menuResult" mr ON mr."userId" = u.id
WHERE u.id = $1
GROUP BY u.id;
```

### Middleware de vérification quota

```typescript
// middleware/checkQuota.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSession } from '@/lib/auth/session';
import { checkUserQuota } from '@/lib/quotas/checker';

export async function withQuotaCheck(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => Promise<void>
) {
  const session = await getUserSession(req);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const quota = await checkUserQuota(session.userId, 'menu');

  if (!quota.canGenerate) {
    return res.status(403).json({
      error: 'Quota exceeded',
      message: `Prochain menu disponible dans ${quota.daysUntilReset} jours`,
      upgradeUrl: '/tarifs',
      quotaStatus: quota,
    });
  }

  return next();
}
```

---

## 🛠️ Stack technique

### Frontend
- **Framework**: Next.js 14 (App Router ou Pages Router - à confirmer)
- **Styling**: Tailwind CSS (existant)
- **State management**: React Context ou Zustand (léger)
- **Animations**: Framer Motion + canvas-confetti
- **Forms**: React Hook Form + Zod validation

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Custom Magic Link (pas de NextAuth = trop complexe)
- **Email**: Resend (existant)
- **Paiements**: Stripe (existant)

### Libs à installer

```json
{
  "dependencies": {
    "canvas-confetti": "^1.9.2",
    "framer-motion": "^10.16.16",
    "zustand": "^4.4.7",
    "react-hot-toast": "^2.4.1",
    "date-fns": "^3.0.6"
  }
}
```

---

## 🏃 Priorisation par sprints

### 🎯 Sprint 1 : Auth + Dashboard basique (5-7 jours)

**Objectif**: User peut créer compte, se connecter, voir son menu

#### Backend
- [ ] Migration DB : tables `magicLink`, `userSession`
- [ ] API `POST /api/auth/request-magic-link`
- [ ] API `GET /api/auth/verify-magic-link`
- [ ] API `POST /api/auth/logout`
- [ ] API `GET /api/dashboard/status`
- [ ] Middleware auth session
- [ ] Template email magic link

#### Frontend
- [ ] Page `/login` (demande email)
- [ ] Modal création compte (sur page résultat essai)
- [ ] Page `/dashboard` basique (affiche user + menu actuel)
- [ ] Component Toast notification
- [ ] Cookie management utils
- [ ] Protected route wrapper

#### Modifications existantes
- [ ] Modifier `POST /api/submit` pour suggérer création compte
- [ ] Page résultat essai : ajouter sticky banner + modal

**Critère de succès**:
- User peut créer compte après essai
- User reçoit magic link et se connecte
- Dashboard affiche menu de l'essai

---

### 🎯 Sprint 2 : Quotas + Génération menu (5-7 jours)

**Objectif**: User peut générer nouveau menu (avec quotas)

#### Backend
- [ ] Vue `userQuotaStatus`
- [ ] Fonction `checkUserQuota(userId, type)`
- [ ] API `POST /api/dashboard/generate-menu`
- [ ] Middleware quota check
- [ ] Update `user.lastSubmissionAt` après génération

#### Frontend
- [ ] Dashboard : affichage quotas (barre de progression)
- [ ] Dashboard : bouton "Générer menu" avec états (loading, disabled)
- [ ] Dashboard : countdown prochain quota reset
- [ ] Modal upgrade Premium (si quota dépassé)
- [ ] Animation confetti génération menu

**Critère de succès**:
- Gratuit : peut générer 1 menu/7 jours
- Premium : peut générer menus illimités
- Quotas affichés en temps réel
- Blocage + CTA upgrade si quota dépassé

---

### 🎯 Sprint 3 : Swaps + Premium features (5-7 jours)

**Objectif**: User peut swaper recettes (avec quotas) - **Frontend-first approach**

#### Backend
- [ ] API `PATCH /api/dashboard/menu/:id` (debounced save)
- [ ] API `POST /api/dashboard/menu/:id/refetch-pool` (premium only)
- [ ] Quota swap check (validation serveur)
- [ ] ❌ PAS de table `recipeSwap` dédiée (simple compteur suffit)

#### Frontend
- [ ] Hook `useMenuSwap` (gestion swaps frontend pur)
- [ ] Pure function `generateShoppingList` (calcul liste côté client)
- [ ] Bouton swap par recette (icône 🔄)
- [ ] Animation swap (fade out/in)
- [ ] Quotas swap affichés (barre progression)
- [ ] Liste de courses mise à jour automatiquement (useMemo)
- [ ] Différenciation visuelle Premium (badge 💎, couleur ambre)
- [ ] Debounced save (500ms après swap)

**Critère de succès**:
- Gratuit : 1 swap max (pool de 1 recette)
- Premium : swaps illimités (pool de 10 recettes)
- Swap instantané (0ms latency, pas de loading)
- Liste de courses recalculée automatiquement
- Persistence débounced (pas d'appel API à chaque swap)
- UI premium différenciée

---

### 🎯 Sprint 4 : UX polish + Premium perks (3-5 jours)

**Objectif**: Expérience premium complète

#### Backend
- [ ] API `PUT /api/dashboard/preferences`
- [ ] API `GET /api/dashboard/history` (historique menus)
- [ ] Export PDF liste de courses (lib pdf-lib)

#### Frontend
- [ ] Page `/welcome-premium` (après paiement Stripe)
- [ ] Dashboard premium : liste de courses interactive (checkboxes)
- [ ] Export PDF liste de courses
- [ ] Partage liste de courses (génère lien)
- [ ] Historique menus (liste paginée)
- [ ] Formulaire préférences dans dashboard
- [ ] Animations premium (shimmer, pulse badge)

**Critère de succès**:
- Page welcome-premium fonctionnelle
- Liste interactive premium
- Export + partage liste
- Historique consultable

---

### 🎯 Sprint 5 : Email marketing + Retention (2-3 jours)

**Objectif**: Emails automatiques pour conversion

#### Backend
- [ ] Cron job cleanup magic links expirés
- [ ] Cron job envoi emails remarketing (si possible avec Vercel)
- [ ] Templates emails (J+1, J+5, J+7, J+14)

#### Email templates
- [ ] Email essai sans compte (clarification)
- [ ] Email J+1 "Comment s'est passée ta semaine"
- [ ] Email J+5 "Quota se réinitialise dans 2 jours"
- [ ] Email J+7 "Ton nouveau menu t'attend"
- [ ] Email J+14 "Tu nous manques (-20% Premium)"

**Critère de succès**:
- Emails envoyés automatiquement
- Taux ouverture >30%
- Conversion email → compte créé >5%

---

## 🔒 Sécurité

### Magic Link

**✅ Sécurité implémentée:**
- Token cryptographiquement sécurisé (crypto.randomBytes)
- Expiration 15 minutes
- Usage unique (flag `used`)
- Token stocké en DB (pas de JWT pour magic link)
- HTTPS obligatoire en production

**✅ Rate limiting:**
- Max 3 demandes magic link / heure / email
- Stockage tentatives en Redis ou table DB

**⚠️ Attaques possibles:**
- **Email spoofing**: Impossible (on contrôle l'envoi)
- **Token bruteforce**: Impossible (64 chars hex = 2^256 combinaisons)
- **Replay attack**: Bloqué par flag `used`
- **Token leaking**: Lien expire après 15 min

---

### Session Cookie

**✅ Configuration sécurisée:**
```typescript
// Set cookie options
const cookieOptions = {
  httpOnly: true,        // Pas accessible via JavaScript
  secure: true,          // HTTPS uniquement
  sameSite: 'strict',    // Protection CSRF
  maxAge: 90 * 24 * 60 * 60, // 90 jours
  path: '/',
};

res.setHeader('Set-Cookie', serialize('session_token', token, cookieOptions));
```

**✅ Renouvellement automatique:**
```typescript
// Middleware vérifie expiration et renouvelle si < 7 jours restants
if (session.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000) {
  await renewSession(session.id);
}
```

**✅ Invalidation:**
- Bouton logout → supprime session en DB + clear cookie
- Sessions expirées nettoyées par cron (optionnel)

---

### Protection API Routes

**Middleware d'authentification:**

```typescript
// middleware/withAuth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { verifySession } from '@/lib/auth/session';

export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await verifySession(req);

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Reconnecte-toi pour continuer'
      });
    }

    // Inject userId dans req pour usage dans handler
    return handler(req, res, session.userId);
  };
}
```

**Usage:**
```typescript
// pages/api/dashboard/generate-menu.ts
import { withAuth } from '@/middleware/withAuth';

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  // userId injecté automatiquement
  const menu = await generateMenuForUser(userId);
  return res.json({ menu });
}

export default withAuth(handler);
```

---

### Rate Limiting

**Endpoints critiques:**
- `POST /api/auth/request-magic-link`: 3 req/heure/email
- `POST /api/dashboard/generate-menu`: 10 req/heure/user (anti-spam)
- `POST /api/dashboard/swap-recipe`: 20 req/heure/user

**Implémentation:**
Utiliser Upstash Redis existant ou table DB simple:

```typescript
// lib/rateLimit.ts
import { limit } from '@/lib/auth/rateLimits'; // Existant

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const result = await limit(key, maxRequests, windowSeconds);
  return {
    allowed: result.success,
    remaining: result.remaining,
  };
}
```

---

## 📝 Checklist pré-déploiement

### Configuration environnement

**Variables nécessaires (en plus des existantes):**
```bash
# Auth
SESSION_SECRET=xxx  # Clé secrète pour signer cookies (crypto.randomBytes(64).toString('hex'))

# Emails (existants)
RESEND_API_KEY=xxx
FROM_EMAIL=hello@quinoia.fr

# Stripe (existants)
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
STRIPE_PRICE_MONTHLY=xxx
STRIPE_PRICE_YEARLY=xxx

# Supabase (existants)
SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx

# App
APP_BASE_URL=https://quinoia.fr  # Pour magic links
NODE_ENV=production  # Pour activer HTTPS cookies
```

---

### Migrations DB à exécuter

```bash
# 1. Créer tables auth
npx supabase db push --file supabase/migrations/20251004_auth_tables.sql

# 2. Modifier table user
npx supabase db push --file supabase/migrations/20251004_user_updates.sql

# 3. Créer vue quotas
npx supabase db push --file supabase/migrations/20251004_quota_view.sql
```

---

### Tests critiques avant prod

#### Auth & Sessions
- [ ] Magic link fonctionne (email reçu + connexion OK)
- [ ] Session cookie persiste (90 jours)
- [ ] Logout invalide session
- [ ] Rate limiting fonctionne

#### Quotas
- [ ] Quotas gratuit : bloqué après 1 menu/7 jours
- [ ] Quotas premium : illimité
- [ ] Génération menu met à jour quotas (rolling window)
- [ ] Webhook Stripe crée user premium

#### Frontend-first Swaps (CRITIQUE)
- [ ] Swap gratuit : instantané (0ms latency), pas de loading
- [ ] Swap premium : instantané (0ms latency), pas de loading
- [ ] Liste courses recalculée instantanément après swap
- [ ] Sauvegarde débounced (500ms) fonctionne
- [ ] Gratuit : 1 swap max → bouton désactivé après
- [ ] Premium : swaps illimités → refetch pool quand épuisé
- [ ] Pas d'appel API pendant le swap (vérifier Network tab)
- [ ] Shopping list JAMAIS en cache DB (vérifier table menuResult)

#### Dashboard
- [ ] Email essai suggère création compte
- [ ] Dashboard affiche bon menu avec swap pool
- [ ] Ingredients catalog chargé pour calcul frontend

---

## 🧪 Tests unitaires et d'intégration

### Stratégie de test

**Stack de test:**
- **Framework**: Vitest (déjà configuré)
- **Mocking**: vi.mock() pour API calls
- **DOM testing**: @testing-library/react pour composants
- **DB testing**: Supabase local ou test database
- **E2E**: Playwright (optionnel, phase 2)

---

### Tests unitaires

#### 1. Pure Function `generateShoppingList` (PRIORITÉ HAUTE)

**Fichier**: `src/utils/shoppingList/generator.test.ts`

**Use cases:**
- ✅ Agrégation d'ingrédients de plusieurs recettes
- ✅ Multiplication des quantités par numServings
- ✅ Groupement par rayon dans l'ordre correct (fruits-legumes, boucherie, etc.)
- ✅ Gestion cas vide (recettes = [])
- ✅ Gestion ingrédients absents du catalog (skip)

**Coverage attendue: 100%**

---

#### 2. React Hook `useMenuSwap` (PRIORITÉ HAUTE)

**Fichier**: `src/hooks/useMenuSwap.test.ts`

**Use cases:**
- ✅ Initialisation correcte du state
- ✅ Swap instantané (frontend pur, 0ms latency)
- ✅ Recalcul automatique shopping list après swap
- ✅ Debounce save serveur (500ms, pas d'appel immédiat)
- ✅ Quota gratuit: prevent swap si swapsCount >= 1
- ✅ Quota premium: allow unlimited swaps (swapLimit = null)
- ✅ Refetch pool quand épuisé (premium uniquement)
- ✅ PAS de refetch pool si gratuit (pool épuisé = disabled)

**Coverage attendue: 90%+**

---

#### 3. Quota Utils `checkUserQuota` (PRIORITÉ MOYENNE)

**Fichier**: `src/lib/quotas/checker.test.ts`

**Use cases:**
- ✅ Allow menu generation (user sans menu précédent)
- ✅ Block menu generation (quota dépassé, rolling window)
- ✅ Allow unlimited menus (premium user)
- ✅ Calcul correct nextReset (lastSubmissionAt + 7 jours)

**Coverage attendue: 80%+**

---

### Tests d'intégration

#### 4. API Route `POST /api/dashboard/generate-menu` (PRIORITÉ HAUTE)

**Fichier**: `src/tests/integration/dashboard/generate-menu.test.ts`

**Use cases:**
- ✅ Generate menu avec swap pool size correct (1 pour gratuit, 10 pour premium)
- ✅ Block generation si quota dépassé (gratuit, rolling window)
- ✅ Return ingredientsCatalog pour calcul frontend
- ✅ Save IDs uniquement en DB (PAS de shoppingListCache)
- ✅ Update user.lastSubmissionAt et lastMenuResultId

**Coverage attendue: 85%+**

---

#### 5. API Route `PATCH /api/dashboard/menu/:id` (PRIORITÉ HAUTE)

**Fichier**: `src/tests/integration/dashboard/update-menu.test.ts`

**Use cases:**
- ✅ Update menu après swap (debounced save)
- ✅ Reject si quota swap dépassé (gratuit: swapsCount > 1)
- ✅ Allow unlimited swaps (premium)
- ✅ Reject si user ne possède pas le menu (ownership check)
- ✅ Validation des IDs (activeRecipeIds valides)

**Coverage attendue: 85%+**

---

#### 6. API Route `POST /api/dashboard/menu/:id/refetch-pool` (PRIORITÉ MOYENNE)

**Fichier**: `src/tests/integration/dashboard/refetch-pool.test.ts`

**Use cases:**
- ✅ Refetch 10 nouvelles recettes (premium)
- ✅ Reject si user gratuit (403 Forbidden)
- ✅ Exclude recettes déjà dans activeRecipes et swapPool
- ✅ Update menuResult.swapPoolRecipeIds en DB

**Coverage attendue: 80%+**

---

#### 7. Magic Link Auth Flow (PRIORITÉ HAUTE)

**Fichier**: `src/tests/integration/auth/magic-link.test.ts`

**Use cases:**
- ✅ Create user + send magic link
- ✅ Verify token + create session (90 jours)
- ✅ Reject token expiré (> 15 minutes)
- ✅ Reject token déjà utilisé (one-time use)
- ✅ Update user.lastLoginAt
- ✅ Set HTTP-only cookie

**Coverage attendue: 90%+**

---

#### 8. Webhook Stripe `POST /api/webhooks/stripe` (PRIORITÉ HAUTE)

**Fichier**: `src/tests/integration/stripe/webhook.test.ts`

**Use cases:**
- ✅ checkout.session.completed: create/update user premium
- ✅ invoice.payment_succeeded: renew subscription (paidUntil updated)
- ✅ invoice.payment_failed: set status paid_expired
- ✅ customer.subscription.deleted: set status trial_used
- ✅ Verify webhook signature (reject si invalid)

**Coverage attendue: 85%+**

---

#### 9. Quota View `userQuotaStatus` (PRIORITÉ MOYENNE)

**Fichier**: `src/tests/integration/quotas/view.test.ts`

**Use cases:**
- ✅ Calculate menusGeneratedThisWindow correctement
- ✅ Calculate swapsUsedThisMenu depuis menuResult.swapsCount
- ✅ canGenerateMenu: false si < 7 jours depuis lastSubmissionAt (gratuit)
- ✅ canGenerateMenu: true toujours (premium)
- ✅ nextQuotaReset: lastSubmissionAt + 7 jours

**Coverage attendue: 80%+**

---

### Coverage minimale attendue

| Type | Coverage | Priorité |
|------|----------|----------|
| **Pure functions** (generateShoppingList) | 100% | HAUTE |
| **React Hooks** (useMenuSwap) | 90%+ | HAUTE |
| **API Routes** (auth, dashboard) | 85%+ | HAUTE |
| **Utils** (quota checker, validators) | 80%+ | MOYENNE |
| **Components** (UI) | 60%+ | BASSE |

---

### Commandes de test

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests only
INTEGRATION_TESTS=true npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode (dev)
npm run test:watch

# Specific file
npm run test src/hooks/useMenuSwap.test.ts
```

---

## 🚀 Estimation temps total

| Sprint | Durée | Livrables |
|--------|-------|-----------|
| Sprint 1 | 5-7j | Auth + Dashboard basique |
| Sprint 2 | 5-7j | Quotas + Génération menu |
| Sprint 3 | 5-7j | Swaps + Premium features |
| Sprint 4 | 3-5j | UX polish + Premium perks |
| Sprint 5 | 2-3j | Email marketing |
| **TOTAL** | **20-29 jours** | **MVP complet** |

**MVP minimum viable (Sprints 1-2):** 10-14 jours
**MVP avec swaps (Sprints 1-3):** 15-21 jours
**Production-ready (Sprints 1-5):** 20-29 jours

---

## 📞 Points de décision

### Avant de commencer le code :

1. **App Router vs Pages Router ?**
   - Pages Router (actuel) = plus simple pour MVP
   - App Router = meilleur SEO mais refacto nécessaire

2. **State management ?**
   - React Context = suffisant pour MVP
   - Zustand = meilleur si dashboard devient complexe

3. **Tracking swaps ?**
   - Option A : Table `recipeSwap` dédiée (propre)
   - Option B : Compteur dans `user` ou `menuResult` (simple)

4. **Email remarketing automation ?**
   - Option A : Cron job Vercel (limité)
   - Option B : Service externe (Loops, Resend Audiences)
   - Option C : Trigger manuel admin (phase 1)

**Mes recommandations :**
- ✅ Pages Router (pas de refacto)
- ✅ React Context (simple)
- ✅ ~~Table `recipeSwap`~~ → **Simple compteur dans menuResult** (plus simple, moins de tables)
- ✅ Frontend-first pour swaps (0ms latency, -50% CPU serveur)
- ✅ Cron Vercel + fallback manuel (MVP)

---

## 📊 Récapitulatif des décisions d'architecture

### ✅ Choix validés

| Aspect | Décision | Raison |
|--------|----------|--------|
| **Swaps (TOUS users)** | Frontend PUR (React hook) pour gratuits ET premium | 0ms latency + économie ressources serveur |
| **Shopping list (TOUS users)** | Calculée frontend (pure function) pour gratuits ET premium | Instant recalcul + pas de cache DB |
| **Swap pool** | 1 recette (gratuit) vs 10 (premium) | Minimize data transfer for free users |
| **Persistence** | Debounced PATCH (500ms) pour TOUS | -90% DB writes |
| **API calls pendant swap** | ZÉRO pour TOUS (gratuits ET premium) | Économie serveur + UX fluide |
| **Quotas** | Rolling window (lastSubmissionAt) | Simple, pas de cron jobs |
| **Auth** | Magic link (passwordless) | UX moderne, sécurisé |
| **Sessions** | 90 jours HTTP-only cookies | Longue durée, sécurisé |
| **DB schema** | Minimal (pas de swap table) | Maintenable, scalable |

### ❌ Choix rejetés

| Aspect | Raison du rejet |
|--------|-----------------|
| Table `recipeSwap` dédiée | Trop lourd, compteur suffit |
| API call per swap | Latency + surcharge serveur |
| Backend shopping list | Calcul inutile côté serveur |
| `shoppingListCache` en DB | Redondant avec calcul frontend |
| `weekStartDate` dans menuResult | Déjà dans `user.lastSubmissionAt` |
| Swap history tracking | Pas d'intérêt business |

---

*Document créé le : 4 octobre 2025*
*Dernière mise à jour : 5 octobre 2025*
*Version : 2.0 (Frontend-first architecture)*
*Auteur : Architecture technique Quinoïa*
