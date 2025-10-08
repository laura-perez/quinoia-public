# Quinoia — Dashboard & User Flows (scan)

Ce document synthétise le scan complet du code lié au dashboard, à l'auth, aux quotas, à la génération de menus et aux services Supabase. Il recense les endpoints, les modèles de données, les composants front, les middlewares et décrit les user flows principaux avec diagrammes.

## Fichiers et zones scannés

- Pages / API (Next.js pages/api)
  - `pages/api/dashboard/generate-menu.ts`
  - `pages/api/dashboard/menu/[id].ts`
  - `pages/api/dashboard/status.ts`
  - `pages/api/auth/request-magic-link.ts`
  - `pages/api/auth/verify-magic-link.ts`
  - `pages/api/checkout/*` (paiement)
- Backend libs
  - `src/lib/supabase/*` (client, repositories, services, storage, recency, menuResults, rlsOperations)
  - `src/lib/recipes/recipeSelector.ts` (sélecteur de recettes)
  - `src/lib/quotas/checker.ts` (quota logic)
  - `src/lib/ingredients/ingredientMapper.ts` (mapping d'ingrédients)
- Repositories spécifiques
  - `src/lib/supabase/repositories/users.ts`
  - `src/lib/supabase/repositories/menuResults.ts`
  - `src/lib/supabase/repositories/recipes.ts`
  - `src/lib/supabase/repositories/ingredients.ts`
- Middlewares
  - `src/middleware/withAuth.ts`
  - `src/middleware/withQuotaCheck.ts` (+ `withAuthAndQuota` composition)
- Frontend dashboard
  - `pages/dashboard/index.tsx`
  - `src/components/dashboard/*` (MenuSection, DashboardLayout, ShoppingListDrawer, UpsellModals, ProfilSection, HistoriqueSection)
- Tests & infra
  - `package.json`, test suites (`vitest`), MSW handlers

## Objectifs du scan

- Documenter les user flows (login -> onboarding -> generate -> swap -> share -> history)
- Lister endpoints API et data shapes attendues
- Repérer les règles freemium / quotas et points critiques
- Proposer prochains pas techniques et priorités pour améliorer UI/UX et fiabilité

---

## Résumé des user flows (haut niveau)

1. Login passwordless (magic link)
   - Entrée : e‑mail
   - Endpoint : `POST /api/auth/request-magic-link`
   - Envoi d'un token -> mail
   - Vérif : `GET /api/auth/verify-magic-link?token=...` → crée session, set-cookie, redirect `/dashboard`

2. Onboarding
   - L'utilisateur complète un formulaire de préférences -> insertion en table `submission` via `upsertUserAndSubmission` ou autre route `api/submit`
   - `generate-menu` vérifie présence d'une submission (sinon renvoie `requiresOnboarding` avec redirect `/onboarding`)

3. Génération de menu
   - Endpoint : `POST /api/dashboard/generate-menu` (protégé par `withAuthAndQuota('menu')`)
   - Vérifications : user existant, submission, quotas via `checkUserQuota`
   - Calcul : `selectRecipes(selectionContext)` → récupère `numRecipes + poolSize` (poolSize = 10 premium / 1 free)
   - Persistance : `menuResultsRepository.create(...)` puis `usersRepository.updateLastSubmission(...)`
   - Réponse : `menu` (activeRecipes, swapPool), `ingredientsCatalog`, `quotas`

4. Swap & sauvegarde
   - Front effectue swaps localement (UI hook `useMenuSwap`) puis envoie `PATCH /api/dashboard/menu/[id]` pour persister
   - Endpoint vérifie `menuResultsRepository.verifyOwnership(menuId, userId)` et verifie swap quota (`withAuth`)
   - Free users : swap quotas limités (e.g., swapQuotaLimit = 1)

5. Dashboard & historique
   - GET `/api/dashboard/status` (withAuth) retourne user + quotas + currentMenu hydraté + ingredientsCatalog
   - UI `pages/dashboard/index.tsx` consomme et affiche sections: Menu, Historique, Profil

6. Partage public
   - `menuResult.shareId` est un identifiant URL-safe (base64url) généré côté serveur
   - Règles d'expiration : 30 jours par défaut (vérification dans `menuResults.ts`) ; peut être désactivé via deactivate

---

## Endpoints API (détail)

- POST /api/auth/request-magic-link
  - Auth: public
  - Input: { email }
  - Rate limit: 3 req/hour/email (via `limit`)
  - Actions: create user if needed, create magic link (token, expiresAt), save to DB, send email
  - Output: { success: true }

- GET /api/auth/verify-magic-link?token=...
  - Auth: public (token in query)
  - Actions: validate token, mark used, create session (createSession), set HTTP-only cookie, redirect to `/dashboard`

- POST /api/dashboard/generate-menu
  - Auth: requires session (withAuth) + quota check `withAuthAndQuota('menu')`
  - Input: validated by Zod `generateMenuSchema` ({ numRecipes, numServings, ... })
  - Actions: check submission, compute poolSize (premium=10/free=1), call `selectRecipes`, create menuResult, update user, return menu + catalog
  - Possible errors: 403 onboarding required, 403 quota exceeded, 500 insufficient recipes or server error

- PATCH /api/dashboard/menu/[id]
  - Auth: requires session (withAuth)
  - Input: `updateMenuSwapSchema` (activeRecipeIds, swapPoolRecipeIds, swapsCount)
  - Actions: verify ownership, check swap quota (in handler), persist via `menuResultsRepository.updateSwap`
  - Errors: 403 ownership/quota, 500 server error

- GET /api/dashboard/status
  - Auth: requires session (withAuth)
  - Output: { user, quotas, currentMenu, ingredientsCatalog }
  - Actions: fetch user, quotas (`checkUserQuota`), hydrate menu if lastMenuResultId present (get recipes by ids, fetch canonical ingredient info)

- Public share endpoints (server-only `menuResults` utilities)
  - `getMenuResultByShareId(shareId)`: fetch and check shareActive + expiration (30d)
  - `deactivateMenuResult(shareId)`: set shareActive=false

---

## Modèles de données (principaux)

- users (via `usersRepository` / `TABLE_NAMES.USERS`)
  - id, email, firstName, status (trial_available|trial_used|paid_active|paid_expired), hasUsedTrial, paidUntil, lastMenuResultId, lastSubmissionAt, isFirstLogin, lastLoginAt

- submission (onboarding data)
  - id, userId, normalizedInput (preferences: diet, proteinPreferences, equipmentAvailable, cookingLevel, numRecipes, numServings, etc.), createdAt

- menuResult (table `menuResult`)
  - id, submissionId, userId, resultBundle (recipes + nutritionSummary), numRecipes, numServings, shareId, shareActive, shareCreatedAt, createdAt, activeRecipeIds[], swapPoolRecipeIds[], swapsCount, updatedAt

- recipes (table `recipe` / Repository interfaces)
  - id, titleFr, ingredients (JSON array with fields nom, quantite, unite, canonicalId), proteinCategory, proteinGPerServing, caloriesPerServing, prepTimeMinutes, equipmentRequired, cookingLevel, batchFriendly, imageUrl, tags

- ingredient canonical/alias
  - ingredientCanonical: id, nameFr, category, sectionCode, defaultUnit, commonAliases
  - ingredientAlias: aliasName, canonicalId, normalizedForm

- magicLinks
  - id, token, email, expiresAt, usedAt, ipAddress, userAgent

- userQuotaStatus / userQuotaStatus view
  - userId, email, status, menusGeneratedThisWindow, swapQuotaLimit, swapsUsedThisMenu, menuQuotaLimit, nextQuotaReset, canGenerateMenu, etc.

---

## Middlewares et règles serveur

- withAuth(reqHandler)
  - Récupère token via `getSessionToken`, utilise `validateSession` pour obtenir `sessionUser`, injecte `userId` dans le handler
  - Répond 401 si pas de session

- withQuotaCheck(quotaType)
  - Appelé après withAuth (`withAuthAndQuota`) pour vérifier `checkUserQuota(userId, quotaType)`
  - Répond 403 si quota dépassé, inclut `upgradeUrl` et `quotaStatus`

- withAuthAndQuota(quotaType)
  - Composition pratique pour `generate-menu` etc.

---

## Sélecteur de recettes (algorithme)

Fichier principal: `src/lib/recipes/recipeSelector.ts`

- Étapes:
  1. Parallel: getUserRecencyFromView(userId) + getFilteredRecipes(...) (repository)
  2. applyRemainingFilters: equipment, cookingLevel, proteinPreferences, and exclusion sets (recency.recentStrict + excludeRecipeIds)
  3. scoreRecipes: scoring multi-composants (protein preference, density, batch, favorites/dislikes, recency soft penalty)
  4. filterNearDuplicates: suppression de doublons par similarité
  5. applyDiversitySelection: stratégie par catégorie protéine selon diet
  6. calculateNutritionSummary

- Entrée: SelectionContext (userId, diet, proteinPreferences, equipmentAvailable, cookingLevel, numRecipes, numServings, proteinFloorG, primaryGoal)
- Sortie: RecipeSelectionResult { selectedRecipes, scoringDetails, nutritionSummary }

Points d'optimisation déjà présents:

- Requêtes parallèles (recency + base recipes)
- In-memory filters avec Set (O(1) includes)

---

## Hooks et composants front clés

- Hook `useMenuSwap` (src/hooks/useMenuSwap.ts)
  - Gère l'état local des activeRecipes / swapPool, effectue `PATCH /api/dashboard/menu/[id]` (debounced save), expose fonctions swapRecipe/addRecipe/removeRecipe

- `MenuSection` (UI)
  - Carousel (mobile) + grid (desktop) pour active recipes
  - Bouton add recipe / swap / delete
  - Bouton shopping list (ouvre `ShoppingListDrawer`)
  - Upsell overlays pour contenu premium dans historique

- `DashboardLayout`
  - 3 tabs: menu, historique, profil

- `ShoppingListDrawer` / `generateShoppingList` util
  - Generateur de liste de courses depuis recipes + ingredientsCatalog

---

## Diagrammes (Mermaid)

### Auth & Onboarding flow

```mermaid
flowchart TD
  A[User enters email] --> B[POST /api/auth/request-magic-link]
  B --> C[Magic link email sent]
  C --> D[User clicks link]
  D --> E[GET /api/auth/verify-magic-link?token]
  E --> F[validate token]
  F --> G[create session cookie]
  G --> H[redirect /dashboard]
  H --> I{has submission?}
  I -- No --> J[/onboarding (form)]
  I -- Yes --> K[Dashboard loaded]
```

### Generate menu flow (freemium)

```mermaid
flowchart TD
  U[Authenticated user] --> GM[POST /api/dashboard/generate-menu]
  GM --> Q[checkUserQuota(menu)]
  Q -- denied --> U2[403 quota -> show upgrade]
  Q -- ok --> S[check submission]
  S -- missing --> U3[403 onboarding -> redirect /onboarding]
  S -- present --> SS[selectRecipes(context)]
  SS --> DB[persist menuResult via menuResultsRepository.create]
  DB --> UP[usersRepository.updateLastSubmission]
  UP --> RESP[return menu + ingredientsCatalog + quotas]
```

### Swap flow

```mermaid
flowchart TD
  UI[User swaps in UI] --> Hook[useMenuSwap updates local state]
  Hook --> Save[debounced PATCH /api/dashboard/menu/[id]]
  Save --> Verify[menuResultsRepository.verifyOwnership]
  Verify --> Quota[checkUserQuota('swap')]
  Quota -- denied --> 403[return 403 -> show upsell modal]
  Quota -- ok --> Persist[menuResultsRepository.updateSwap]
  Persist --> 200[OK]
```

### Share/Expiration

```mermaid
flowchart TD
  PersistMenu --> GenShare[generateShareId()]
  GenShare --> SaveShare[menuResult.shareId stored]
  UserShare --> PublicGET[getMenuResultByShareId(shareId)]
  PublicGET --> CheckActive{shareActive? and createdAt < 30d}
  CheckActive -- OK --> Serve[return menuResult]
  CheckActive -- expired/false --> 404[Menu not found or expired]
```

---

## Points d'amélioration & priorités recommandées

1. Tests & CI
   - Ajouter tests d'intégration pour `generate-menu` (happy path + onboarding missing + quota exceeded) et `PATCH /api/dashboard/menu/[id]` (ownership + quota)
2. RLS / Security
   - Vérifier les usages de `getServiceClient()` vs `getAnonClient()` ; s'assurer que les opérations qui devraient respecter RLS utilisent un client avec contexte JWT (si prévu)
   - Revoir `rlsOperations.ts` et implémenter usage du JWT via headers si nécessaire pour tests et infra
3. UX Freemium
   - Expliciter quota/swap restants dans UI (bulle/toast quand quota dépassé)
   - Améliorer le flow d'upgrade (pré-remplir checkout avec email)
   - Débounce/optimisation des saves pour éviter races et appels trop fréquents
4. Performance
   - Mettre en cache les catalogues d'ingrédients fréquemment demandés (ex: memoization côté serveur pour `getCanonicalIngredientsByIds` si appelé souvent)
   - Limiter la quantité de champs renvoyés dans `getRecipesByIds` pour alléger payload
5. Observabilité
   - Ajouter métriques (menus generated, swap attempts, quota rejections) et alerting pour insufficient recipes
6. Small quick wins
   - Ajouter un message d'erreur frontend lisible si `generate-menu` échoue pour cause d'insuffisance
   - Ajouter un bouton « désactiver partage » dans UI (call to deactivate endpoint via repository)

---

## Fichiers à consulter pour chaque responsabilité

- Auth: `src/lib/auth/*` + `pages/api/auth/*` + `src/lib/supabase/repositories/magicLinks.ts`
- Menu persistence: `src/lib/supabase/repositories/menuResults.ts` + `src/lib/supabase/menuResults.ts`
- Recipe selection: `src/lib/recipes/recipeSelector.ts` + `src/lib/supabase/repositories/recipes.ts`
- Quotas: `src/lib/quotas/checker.ts` + view `userQuotaStatus` (DB)
- UI: `pages/dashboard/index.tsx` + `src/components/dashboard/*` + `src/hooks/useMenuSwap.ts`

---

## Prochaine étape proposée (je peux lancer immédiatement)

1. Générer un diagramme plus complet (PlantUML / mermaid) exportable si tu veux l'intégrer à Confluence/Notion.
2. Produire une checklist de tickets prioritaires (ex: tests `generate-menu`, fix RLS, swap quota UI tweaks).
3. Implémenter la première fonctionnalité que tu me commanderas via ton prompt (ex: augmenter poolSize pour premium, changer swap limit, améliorer UI swap flow).

Dis‑moi quelle prochaine action tu veux que je fasse maintenant :

- Je rédige la checklist de tâches priorisées (tickets) ; ou
- Je commence par écrire les tests d'intégration pour `generate-menu` et `PATCH /api/dashboard/menu/[id]`; ou
- Je commence une PR qui ajoute un affichage clair du quota swap restant dans le `MenuSection`.

---

Documentation générée automatiquement depuis le scan du code base — demande-moi si tu veux que j'ajoute ce fichier au README ou que j'en fasse une version plus synthétique pour les non-techs.
