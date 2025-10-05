# 📋 Tâches d'implémentation - Dashboard & Auth System

**Version**: 1.0
**Date**: 5 octobre 2025
**Références**:
- `docs/technical-architecture.md`
- `docs/user-flow-ux-strategy.md`

---

## 🎯 Règles d'implémentation

### Avant chaque tâche

1. ✅ **Lire cette section du fichier** pour comprendre la tâche complète
2. ✅ **Lire le code existant** pertinent (fichiers mentionnés dans la tâche)
3. ✅ **En cas de doute**:
   - Consulter `docs/technical-architecture.md`
   - Consulter `docs/user-flow-ux-strategy.md`
   - Si doute persiste → **DEMANDER** (ne jamais supposer)

### Pendant l'implémentation

1. ✅ **Qualité maximale** : code propre, commentaires si nécessaire
2. ✅ **Architecture parfaite** : respect des patterns existants
3. ✅ **TypeScript strict** : typage complet, pas de `any`
4. ✅ **Tests** : écrire les tests en même temps que le code

### Après chaque tâche

1. ✅ **Relire le code changé** ligne par ligne
2. ✅ **Vérifier la qualité** : clarté, maintenabilité, performance
3. ✅ **Tester manuellement** si possible
4. ✅ **Cocher la tâche** dans ce fichier

---

## 📦 Sprint 1 : Auth + Dashboard basique (5-7 jours)

### 🔍 Phase 0 : Audit du code existant

**Objectif** : Comprendre la structure actuelle avant d'ajouter du code.

- [ ] **0.1** Lire et documenter la structure actuelle de `src/`
  - Fichiers à lire : `src/lib/`, `src/schemas/`, `src/types/`
  - Documenter : conventions de nommage, patterns utilisés
  - Questions à se poser : Comment sont organisés les utils ? Y a-t-il des helpers auth existants ?

- [ ] **0.2** Lire la structure DB actuelle
  - Fichiers à lire : `supabase/migrations/`, `src/lib/supabase/`
  - Documenter : schéma user existant, repositories pattern
  - Questions : Y a-t-il déjà des fonctions helper Supabase ? Comment sont gérées les queries ?

- [ ] **0.3** Lire la structure API Routes existante
  - Fichiers à lire : `pages/api/`, notamment `pages/api/webhooks/stripe.ts`
  - Documenter : patterns middleware, error handling
  - Questions : Y a-t-il un middleware d'auth existant ? Comment sont gérées les erreurs ?

- [ ] **0.4** Lire la config email existante
  - Fichiers à lire : `src/lib/email/service.ts`
  - Documenter : templates existants, service Resend
  - Questions : Comment sont envoyés les emails actuellement ?

---

### 🗄️ Phase 1 : Migrations DB

**Référence** : `docs/technical-architecture.md` section "Schema base de données"

- [ ] **1.1** Migration : Créer table `magicLink`
  - Fichier : `supabase/migrations/20251005_create_magic_link_table.sql`
  - Lire avant : `supabase/migrations/20251003_add_stripe_fields_to_user.sql` (pattern existant)
  - Contenu :
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
    CREATE INDEX idx_magicLink_token ON public."magicLink"(token);
    CREATE INDEX idx_magicLink_email ON public."magicLink"(email);
    CREATE INDEX idx_magicLink_expiresAt ON public."magicLink"("expiresAt");
    ```
  - ⚠️ Vérifier : Conventions de nommage conformes au schéma existant ?

- [ ] **1.2** Migration : Créer table `userSession`
  - Fichier : `supabase/migrations/20251005_create_user_session_table.sql`
  - Contenu : voir `docs/technical-architecture.md` ligne 88-110
  - ⚠️ Vérifier : Index bien créés ? Cascade ON DELETE ?

- [ ] **1.3** Migration : Ajouter champs auth à table `user`
  - Fichier : `supabase/migrations/20251005_add_auth_fields_to_user.sql`
  - Lire avant : Schéma user actuel dans migrations existantes
  - Champs à ajouter : `firstName`, `lastLoginAt`, `isFirstLogin`
  - ⚠️ Vérifier : Champs déjà existants ? Utiliser `ADD COLUMN IF NOT EXISTS`

- [ ] **1.4** Migration : Modifier table `menuResult` pour swaps
  - Fichier : `supabase/migrations/20251005_add_swap_fields_to_menu_result.sql`
  - Lire avant : Schéma menuResult actuel
  - Champs à ajouter : `activeRecipeIds uuid[]`, `swapPoolRecipeIds uuid[]`, `swapsCount integer`
  - ⚠️ **IMPORTANT** : Ne PAS ajouter `shoppingListCache` (calculé frontend)
  - Index : `idx_menuResult_userId_createdAt`

- [ ] **1.5** Migration : Créer vue `userQuotaStatus`
  - Fichier : `supabase/migrations/20251005_create_quota_view.sql`
  - Contenu : voir `docs/technical-architecture.md` ligne 161-217
  - ⚠️ Vérifier : Vue utilise bien `user.lastSubmissionAt` comme source de vérité

- [ ] **1.6** Tester les migrations localement
  - Commande : `npx supabase db reset`
  - Vérifier : Toutes les tables créées, indexes présents, vue fonctionne

---

### 🔧 Phase 2 : Utils & Helpers

**Objectif** : Créer les fonctions utilitaires réutilisables.

- [ ] **2.1** Créer générateur de tokens sécurisés
  - Fichier : `src/lib/auth/tokens.ts`
  - Lire avant : Y a-t-il déjà un fichier crypto utils ?
  - Fonctions : `generateMagicLinkToken()`, `generateSessionToken()`
  - Test : `src/lib/auth/tokens.test.ts`
  - ⚠️ Vérifier : Utiliser `crypto.randomBytes` (Node.js built-in)

- [ ] **2.2** Créer utils de session
  - Fichier : `src/lib/auth/session.ts`
  - Lire avant : Existe-t-il déjà un système de session ?
  - Fonctions :
    - `createSession(userId: string)`: Créer session en DB + return token
    - `verifySession(req: NextApiRequest)`: Vérifier cookie + return user
    - `renewSession(sessionId: string)`: Extend expiration
    - `deleteSession(sessionId: string)`: Logout
  - Types : Créer `src/types/auth.ts` si nécessaire
  - ⚠️ Vérifier : Cookie HTTP-only, Secure en prod, SameSite strict

- [ ] **2.3** Créer checker de quotas
  - Fichier : `src/lib/quotas/checker.ts`
  - Référence : `docs/technical-architecture.md` ligne 649-679
  - Fonction : `checkUserQuota(userId: string, type: 'menu' | 'swap')`
  - Return : `{ canGenerate: boolean, remaining: number | null, nextReset: Date }`
  - Test : `src/lib/quotas/checker.test.ts` (use cases ligne 1480-1490)
  - ⚠️ Vérifier : Utilise la vue `userQuotaStatus`

- [ ] **2.4** Créer middleware d'authentification
  - Fichier : `src/middleware/withAuth.ts`
  - Référence : `docs/technical-architecture.md` ligne 905-943
  - Pattern : Higher-order function qui wrappe les API handlers
  - Injecte `userId` dans le handler
  - Return 401 si non authentifié
  - ⚠️ Vérifier : Compatible avec les routes existantes ?

- [ ] **2.5** Créer middleware de quota
  - Fichier : `src/middleware/withQuotaCheck.ts`
  - Référence : `docs/technical-architecture.md` ligne 649-679
  - Utilise `checkUserQuota`
  - Return 403 si quota dépassé avec `upgradeUrl`
  - ⚠️ Vérifier : Peut être composé avec `withAuth` ?

---

### 📧 Phase 3 : Email Templates

**Objectif** : Templates pour magic link et autres emails.

- [ ] **3.1** Template email magic link
  - Fichier : `src/lib/email/templates/magicLink.ts`
  - Lire avant : `src/lib/email/service.ts` (voir structure templates existants)
  - Référence : `docs/technical-architecture.md` ligne 528-583
  - Variables : `magicLinkUrl`, `firstName?`
  - ⚠️ Vérifier : Compatible avec le service Resend existant ?

- [ ] **3.2** Template email welcome (après première connexion)
  - Fichier : `src/lib/email/templates/welcome.ts`
  - Référence : `docs/user-flow-ux-strategy.md` (email "désirable")
  - Contenu : Confirmation menu sauvegardé, avantages gratuit
  - ⚠️ Si doute sur le contenu → demander

- [ ] **3.3** Fonction d'envoi d'email générique
  - Fichier : `src/lib/email/send.ts`
  - Lire avant : `src/lib/email/service.ts`
  - Fonction : `sendEmail(to: string, template: EmailTemplate)`
  - Gestion erreurs : Log + retry logic ?
  - ⚠️ Vérifier : Rate limiting ? Déjà géré par Resend ?

---

### 🔌 Phase 4 : API Routes - Auth

**Référence** : `docs/technical-architecture.md` section "API Routes"

- [ ] **4.1** Route `POST /api/auth/request-magic-link`
  - Fichier : `pages/api/auth/request-magic-link.ts`
  - Lire avant : Routes API existantes pour comprendre le pattern
  - Logic :
    1. Valider email (zod schema)
    2. Rate limiting (3 req/heure/email) - ⚠️ Comment implémenter ? Vérifier si système existant
    3. Vérifier si user existe, sinon créer
    4. Générer token (15 min expiration)
    5. Sauvegarder dans `magicLink` table
    6. Envoyer email
    7. Return 200 (même si email n'existe pas = sécurité)
  - Test : `src/tests/integration/auth/magic-link.test.ts` (use cases ligne 1544-1552)
  - ⚠️ Questions :
    - Rate limiting déjà implémenté ailleurs ?
    - Créer user avec quel `status` initial ? (`trial_available`)

- [ ] **4.2** Route `GET /api/auth/verify-magic-link`
  - Fichier : `pages/api/auth/verify-magic-link.ts`
  - Logic :
    1. Vérifier token existe et non expiré
    2. Vérifier token non utilisé (one-time)
    3. Marquer token comme `used`
    4. Créer session (90 jours)
    5. Set cookie HTTP-only
    6. Update `user.lastLoginAt`, `user.isFirstLogin`
    7. Redirect to `/dashboard`
  - Error cases : Redirect to `/login?error=invalid_token`
  - Test : Use cases ligne 1544-1552
  - ⚠️ Vérifier : Redirect URL configuré où ?

- [ ] **4.3** Route `POST /api/auth/logout`
  - Fichier : `pages/api/auth/logout.ts`
  - Logic :
    1. Récupérer session depuis cookie
    2. Invalider session en DB
    3. Clear cookie
    4. Return 200
  - ⚠️ Vérifier : Gestion si session déjà expirée ?

---

### 🔌 Phase 5 : API Routes - Dashboard

- [ ] **5.1** Route `GET /api/dashboard/status`
  - Fichier : `pages/api/dashboard/status.ts`
  - Middleware : `withAuth`
  - Référence : `docs/technical-architecture.md` ligne 302-347
  - Logic :
    1. Fetch user (déjà injecté par middleware)
    2. Fetch quotas (vue `userQuotaStatus`)
    3. Fetch dernier menu (`user.lastMenuResultId`)
    4. Hydrate full recipe objects depuis IDs
    5. Fetch ingredients catalog
    6. Return data (PAS de shoppingList, calculée frontend)
  - ⚠️ Questions :
    - Comment hydrate recipe objects ? Repository existant ?
    - Ingredients catalog : fonction existante ? Où ?

- [ ] **5.2** Route `POST /api/dashboard/generate-menu`
  - Fichier : `pages/api/dashboard/generate-menu.ts`
  - Middleware : `withAuth` + `withQuotaCheck`
  - Référence : `docs/technical-architecture.md` ligne 345-395
  - Logic :
    1. Vérifier quota (middleware)
    2. Fetch user preferences (dernière submission)
    3. Déterminer pool size : `isPremium ? 10 : 1`
    4. Sélectionner recettes : `totalRecipes = numRecipes + poolSize`
    5. Diviser : `activeRecipes = slice(0, numRecipes)`, `swapPool = slice(numRecipes)`
    6. Sauvegarder IDs uniquement en `menuResult`
    7. Update `user.lastMenuResultId` et `user.lastSubmissionAt`
    8. Return menu complet + ingredients catalog
  - Test : Use cases ligne 1500-1506
  - ⚠️ **CRITIQUE** :
    - Algorithme sélection recettes existe où ? (`src/lib/recipes/recipeSelector.ts` ?)
    - Ne PAS sauvegarder `shoppingListCache` en DB
    - Vérifier : `user.lastSubmissionAt` = source de vérité pour rolling window

- [ ] **5.3** Route `PATCH /api/dashboard/menu/:id`
  - Fichier : `pages/api/dashboard/menu/[id].ts`
  - Middleware : `withAuth`
  - Référence : `docs/technical-architecture.md` ligne 398-426
  - Logic :
    1. Vérifier ownership (menu.userId === session.userId)
    2. Vérifier quota swap si gratuit (swapsCount <= 1)
    3. Simple UPDATE des IDs et compteur
    4. Return success
  - Test : Use cases ligne 1515-1521
  - ⚠️ **IMPORTANT** : Pas de recalcul côté serveur, juste persistence

- [ ] **5.4** Route `POST /api/dashboard/menu/:id/refetch-pool`
  - Fichier : `pages/api/dashboard/menu/[id]/refetch-pool.ts`
  - Middleware : `withAuth`
  - Référence : `docs/technical-architecture.md` ligne 429-456
  - Logic :
    1. Vérifier user premium
    2. Fetch 10 nouvelles recettes (exclure active + pool actuel)
    3. Update `menuResult.swapPoolRecipeIds`
    4. Return full recipe objects
  - Test : Use cases ligne 1530-1535
  - ⚠️ Vérifier : 403 si user gratuit

---

### ⚛️ Phase 6 : Frontend - Hooks & Utils

**Objectif** : Créer les hooks React et pure functions.

- [ ] **6.1** Pure function `generateShoppingList`
  - Fichier : `src/utils/shoppingList/generator.ts`
  - Référence : `docs/technical-architecture.md` ligne 662-733
  - **FONCTION PURE** : pas d'effets de bord
  - Inputs : `activeRecipes`, `numServings`, `ingredientsCatalog`
  - Output : `{ bySection, totals }`
  - Test : `src/utils/shoppingList/generator.test.ts` (use cases ligne 1451-1457)
  - ⚠️ **CRITIQUE** : 100% coverage requis, cette fonction est au cœur du système

- [ ] **6.2** Hook `useMenuSwap`
  - Fichier : `src/hooks/useMenuSwap.ts`
  - Référence : `docs/technical-architecture.md` ligne 560-660
  - State : `activeRecipes`, `swapPool`, `swapsCount`
  - Computed : `shoppingList` (useMemo avec `generateShoppingList`)
  - Fonctions :
    - `swapRecipe(recipe)` : Swap frontend pur (0ms)
    - `refetchPool()` : Premium uniquement
  - Debounce : `saveToServer` (500ms)
  - Test : `src/hooks/useMenuSwap.test.ts` (use cases ligne 1467-1475)
  - ⚠️ **CRITIQUE** :
    - Ordre des hooks : `refetchPool` AVANT `swapRecipe` (dependencies)
    - Vérifier : Shopping list se recalcule auto après swap

- [ ] **6.3** Types TypeScript
  - Fichier : `src/types/dashboard.ts`
  - Types à créer :
    ```typescript
    interface Menu {
      id: string;
      activeRecipes: Recipe[];
      swapPool: Recipe[];
      swapsCount: number;
      numServings: number;
    }
    interface ShoppingList {
      bySection: Record<string, ShoppingItem[]>;
      totals: { totalItems: number };
    }
    ```
  - ⚠️ Vérifier : Types Recipe et IngredientCanonical existent déjà ?

---

### 🎨 Phase 7 : Frontend - Pages & Components

**Référence** : `docs/user-flow-ux-strategy.md`

- [ ] **7.1** Page `/login`
  - Fichier : `pages/login.tsx`
  - Lire avant : Structure pages existantes, layout utilisé
  - Composants :
    - Form email (React Hook Form + Zod)
    - Bouton "Recevoir le lien de connexion"
    - Message success (toast)
  - Logic :
    - POST `/api/auth/request-magic-link`
    - Afficher toast "✔️ Lien envoyé ! Vérifie tes emails" (3s)
  - ⚠️ Questions :
    - Système toast existant ? (react-hot-toast déjà installé ?)
    - Style : Tailwind classes existantes ? Design system ?

- [ ] **7.2** Page `/dashboard`
  - Fichier : `pages/dashboard.tsx`
  - Lire avant : Structure pages existantes
  - État : Protected route (redirect si non auth)
  - Fetch : `GET /api/dashboard/status` au mount
  - Composants :
    - Header user (email, status badge)
    - Quota display (barre progression)
    - Menu actuel (liste recettes + swap buttons)
    - Shopping list
  - Hook : `useMenuSwap` pour gérer swaps
  - ⚠️ **IMPORTANT** :
    - Confetti MICRO première visite (5-6 particules, opacity 0.4, 1s) - voir ligne 121-147 user-flow
    - Vérifier : `user.isFirstLogin` pour afficher confetti

- [ ] **7.3** Component `RecipeCard` avec swap button
  - Fichier : `src/components/dashboard/RecipeCard.tsx`
  - Lire avant : Composants recette existants ?
  - Props : `recipe`, `onSwap`, `canSwap`, `isSwapping`
  - UI : Icône 🔄, animation fade out/in
  - ⚠️ Vérifier : Animation budget (max 0.3s, smooth)

- [ ] **7.4** Component `ShoppingList`
  - Fichier : `src/components/dashboard/ShoppingList.tsx`
  - Props : `shoppingList`, `isPremium`
  - Premium : Checkboxes interactives
  - Gratuit : Liste simple (pas de checkboxes)
  - Groupement par rayon (collapsible sections)
  - ⚠️ Vérifier : Premium badge 💎 si premium

- [ ] **7.5** Component `QuotaDisplay`
  - Fichier : `src/components/dashboard/QuotaDisplay.tsx`
  - Props : `quotas`, `isPremium`
  - UI :
    - Barre progression (gratuit)
    - Badge "Illimité" (premium)
    - Countdown prochain reset
  - ⚠️ Vérifier : CTA "Passer Premium" si quota dépassé

- [ ] **7.6** Modal création compte (sticky banner)
  - Fichier : `src/components/modals/CreateAccountModal.tsx`
  - Référence : `docs/user-flow-ux-strategy.md` ligne 88-104
  - Trigger :
    - Scroll 30% de la page résultat essai OU
    - 5 secondes sur la page
  - UI :
    - Sticky bottom banner
    - Email pré-rempli
    - Bouton "Créer mon compte gratuit"
    - Bouton "Plus tard" (dismiss)
  - ⚠️ Vérifier : Hiérarchie visuelle mobile (ligne 106-112)

---

### 🎨 Phase 8 : UX Polish

**Référence** : `docs/user-flow-ux-strategy.md`

- [ ] **8.1** Animations confetti
  - Library : `canvas-confetti` (installer si pas déjà fait)
  - Emplacements :
    - Page résultat essai : opacity 0.3, 0.8s (ligne 42)
    - Dashboard première visite : 5-6 particules, opacity 0.4, 1s (ligne 143)
  - ⚠️ **IMPORTANT** : Budget attentionnel = 1 animation majeure/page max

- [ ] **8.2** Toast notifications
  - Library : `react-hot-toast` (vérifier si installé)
  - Messages :
    - "✔️ Lien envoyé ! Vérifie tes emails" (3s, auto-dismiss)
    - "✔️ Ton menu est sauvegardé ici" (dashboard première visite)
  - ⚠️ Vérifier : Position coin supérieur droit

- [ ] **8.3** Micro-feedbacks animations
  - Bouton hover : translateY -2px (0.2s)
  - Swap : fade out/in (0.3s max)
  - Badge 💎 Premium : pulse subtil (2s loop, scale 1.0 → 1.03)
  - ⚠️ Vérifier : Respect budget attentionnel (ligne 190-208)

---

### ✅ Phase 9 : Tests & Validation

- [ ] **9.1** Écrire tests unitaires
  - `generateShoppingList.test.ts` : 5 use cases (ligne 1451-1457)
  - `useMenuSwap.test.ts` : 8 use cases (ligne 1467-1475)
  - `checkUserQuota.test.ts` : 4 use cases (ligne 1485-1490)
  - ⚠️ Target : 90%+ coverage

- [ ] **9.2** Écrire tests d'intégration
  - `generate-menu.test.ts` : 5 use cases (ligne 1500-1506)
  - `update-menu.test.ts` : 5 use cases (ligne 1515-1521)
  - `magic-link.test.ts` : 6 use cases (ligne 1544-1552)
  - ⚠️ Utiliser test database Supabase

- [ ] **9.3** Tests manuels critiques (checklist)
  - [ ] Magic link : email reçu + connexion OK
  - [ ] Session : persiste 90 jours
  - [ ] Quota gratuit : bloqué après 1 menu/7j
  - [ ] Quota premium : illimité
  - [ ] Swap gratuit : instantané, 1 max
  - [ ] Swap premium : instantané, illimité
  - [ ] Liste courses : recalcul auto après swap
  - [ ] Network tab : 0 API call pendant swap
  - [ ] DB : shopping list JAMAIS en cache

- [ ] **9.4** Review code complet Sprint 1
  - Relire tous les fichiers créés
  - Vérifier qualité : clarté, maintenabilité
  - Vérifier TypeScript : pas de `any`, typage complet
  - Vérifier tests : coverage > 85%

---

## 📦 Sprint 2 : Quotas + Génération menu avancée (5-7 jours)

### Phase 10 : Système de quotas avancé

- [ ] **10.1** Améliorer vue `userQuotaStatus`
  - Ajouter calculs détaillés
  - Optimiser performance (indexes)
  - Test : Requêtes SQL

- [ ] **10.2** Dashboard : Affichage quotas détaillé
  - Barre de progression animée
  - Countdown temps réel prochain reset
  - Historique consommation (optionnel)

- [ ] **10.3** Modal upgrade Premium
  - Trigger : Quota dépassé
  - CTA : Lien vers Stripe checkout
  - Copy : Avantages Premium (voir user-flow)

---

### Phase 11 : Génération menu optimisée

- [ ] **11.1** Améliorer algorithme sélection recettes
  - Lire avant : `src/lib/recipes/recipeSelector.ts`
  - Optimiser : Diversité, préférences user
  - Éviter : Répétitions, ingrédients déjà vus

- [ ] **11.2** Personnalisation menu
  - Formulaire préférences dans dashboard
  - Override temporaire (modal)
  - Sauvegarde préférences

- [ ] **11.3** Historique menus
  - Table `menuHistory` (optionnel)
  - Page `/dashboard/history`
  - Réactiver ancien menu

---

## 📦 Sprint 3 : Swaps + Features Premium (5-7 jours)

### Phase 12 : Features Premium

- [ ] **12.1** Liste de courses interactive (premium)
  - Checkboxes avec state persisté
  - Sections collapsibles
  - Animation checkboxes (scale 0.8 → 1.0, 0.15s)

- [ ] **12.2** Export PDF liste de courses
  - Library : `pdf-lib` ou `jsPDF`
  - Template PDF branded
  - Bouton download

- [ ] **12.3** Partage liste de courses
  - Générer lien shareable
  - Page publique `/share/[id]`
  - Copie lien (clipboard)

- [ ] **12.4** Page `/welcome-premium`
  - Redirection après Stripe success
  - Confetti 8-10 particules, 1.2s (ligne 182)
  - CTA "Créer mon premier menu"
  - Features list (collapsée par défaut)

---

### Phase 13 : UX Premium

- [ ] **13.1** Badge Premium 💎
  - Pulse subtil (2s loop)
  - Couleur ambre #F4C95D
  - Positions : Header, quotas, features

- [ ] **13.2** Shimmer Premium
  - Gradient slide (3s loop, opacity 0.2)
  - Sur boutons premium
  - Sur features premium

- [ ] **13.3** Différenciation visuelle
  - Gratuit : UI standard
  - Premium : Couleurs ambrées, badges
  - Transitions smooth entre états

---

## 📦 Sprint 4 : Polish + Edge Cases (3-5 jours)

### Phase 14 : Error Handling

- [ ] **14.1** Error boundaries React
  - Component `ErrorBoundary`
  - Fallback UI
  - Logging errors (Sentry ?)

- [ ] **14.2** Error states API
  - 401 : Redirect `/login`
  - 403 : Modal upgrade
  - 500 : Toast error + retry
  - Network errors : Offline mode ?

- [ ] **14.3** Loading states
  - Skeleton loaders
  - Optimistic UI (swaps)
  - Progress indicators

---

### Phase 15 : Accessibility & Performance

- [ ] **15.1** A11y
  - Keyboard navigation
  - ARIA labels
  - Screen reader testing
  - Focus management

- [ ] **15.2** Performance
  - Code splitting (lazy load routes)
  - Image optimization
  - Bundle size analysis
  - Lighthouse score > 90

- [ ] **15.3** Mobile
  - Responsive design
  - Touch gestures
  - Sticky banner mobile (ligne 211-244)

---

## 📦 Sprint 5 : Email Marketing (2-3 jours)

### Phase 16 : Email automation

- [ ] **16.1** Templates emails retention
  - J+1 : "Comment s'est passée ta semaine"
  - J+5 : "Quota se réinitialise dans 2 jours"
  - J+7 : "Ton nouveau menu t'attend"
  - J+14 : "Tu nous manques (-20% promo)"

- [ ] **16.2** Cron jobs (Vercel)
  - Cleanup magic links expirés
  - Envoi emails automatiques
  - Fallback manuel si needed

- [ ] **16.3** Tracking emails
  - Open rate
  - Click rate
  - Conversion rate

---

## 🚀 Déploiement Production

### Phase 17 : Pre-production

- [ ] **17.1** Variables environnement
  - `SESSION_SECRET`
  - `APP_BASE_URL`
  - Vérifier toutes les vars (ligne 1261-1283)

- [ ] **17.2** Migrations DB production
  - Backup DB
  - Run migrations
  - Vérifier intégrité

- [ ] **17.3** Tests E2E (Playwright)
  - User flow complet
  - Paiement Stripe (test mode)
  - Magic link

---

### Phase 18 : Monitoring & Analytics

- [ ] **18.1** Logging
  - Structured logs
  - Error tracking (Sentry)
  - Performance monitoring

- [ ] **18.2** Analytics
  - Events tracking
  - Conversion funnel
  - Retention metrics

- [ ] **18.3** Alerting
  - Error rate spikes
  - Quota abuse
  - Payment failures

---

## 📊 Métriques de succès

### KPIs techniques

- [ ] Tests coverage > 85%
- [ ] Lighthouse score > 90
- [ ] API response time < 500ms
- [ ] Zero bugs critiques en prod
- [ ] Uptime > 99.5%

### KPIs produit

- [ ] Conversion essai → compte > 30%
- [ ] Conversion gratuit → premium > 5%
- [ ] Retention J7 > 40%
- [ ] Satisfaction user > 4/5

---

## 🔄 Process de travail

### Chaque matin

1. ✅ Lire ce fichier - section du jour
2. ✅ Lire `docs/technical-architecture.md` - section pertinente
3. ✅ Lire code existant - fichiers à modifier
4. ✅ Si doute → **DEMANDER** (ne jamais supposer)

### Chaque tâche

1. ✅ Cocher "début tâche"
2. ✅ Implémenter avec qualité maximale
3. ✅ Écrire tests en même temps
4. ✅ Relire code changé
5. ✅ Tester manuellement
6. ✅ Cocher "tâche terminée"

### Chaque fin de journée

1. ✅ Review code du jour
2. ✅ Commit avec message descriptif
3. ✅ Mettre à jour ce fichier (progression)

---

## ⚠️ Points d'attention critiques

### Architecture frontend-first

- ✅ **Swaps : Frontend PUR pour TOUS** (gratuits ET premium)
- ✅ **Shopping list : TOUJOURS calculée frontend** (jamais en DB)
- ✅ **API calls pendant swap : ZÉRO** (juste save debounced)
- ✅ **Latency : 0ms** (pas de loading)

### Sécurité

- ✅ Magic link : one-time use, 15 min expiration
- ✅ Sessions : HTTP-only cookies, 90 jours
- ✅ Rate limiting : 3 req/heure magic link
- ✅ Ownership : Toujours vérifier userId

### Performance

- ✅ Debounce : 500ms save après swap
- ✅ DB writes : Minimal (-90% vs approche naïve)
- ✅ Pure functions : Pas d'effets de bord
- ✅ Memoization : useMemo pour shopping list

### UX

- ✅ Budget attentionnel : 1 animation/page max
- ✅ Confetti : Dosé (opacity 0.3-0.4)
- ✅ Feedback : Immédiat (toast 3s)
- ✅ Mobile : Sticky banner 48px height

---

## 📚 Ressources

- **Architecture** : `docs/technical-architecture.md`
- **UX** : `docs/user-flow-ux-strategy.md`
- **Tests** : `docs/technical-architecture.md` section Tests (ligne 1432-1618)
- **Supabase** : https://supabase.com/docs
- **Next.js** : https://nextjs.org/docs
- **Vitest** : https://vitest.dev

---

**Dernière mise à jour** : 5 octobre 2025
**Version** : 1.0
**Statut** : Sprint 1 en cours
