# Spéc MVP - la bible Quinoïa

## Changelog

- **v1.1**
    - Activité : coefficients, clamp 1.35–1.60
    - Scoring n8n: pénalité calories dépendante de l’objectif (0.02 weightLoss, 0.01 autres), batchMode +0.5, récence partielle 14–21 j (max 2).
    - Notifications proactives “catalogue insuffisant” (WARN tôt, ERROR final).
    - Workflow contract‑first API ⇄ n8n consolidé, zéro PII côté n8n.
- **v1.0**
    - Vision MVP, formulaires, targets BMR/TDEE, sélection déterministe, liste de courses, partage, RGPD.

## 1) Vision produit & périmètre

Quinoïa sélectionne (ne génère pas) des recettes FR validées depuis un catalogue, selon un profil utilisateur et des cibles énergétiques/protéines, avec contraintes temps/équipements/allergènes. Sorties: email compact + page publique `/menu/{shareId}` sans PII et noindex.

---

## 2) Architecture & flux (Front → API → n8n)

- **Frontend**: formulaire, reCAPTCHA, UX.
- **API Next.js (passerelle mince)**: validation Zod + normalisation, calcul `activityFactor` et `targets`, persistance `user`/`submission`, appel **webhook n8n** (non‑PII), réception du **draft** résultat, validation/persistance `menuResult` + `shareId`, page `/menu/{shareId}`.
- **n8n**: sélection déterministe, liste de courses, composition du **draft** `resultBundle` (sans `shareId`), notifications d’insuffisance catalogue.

**Conventions**: clés/contrats en **anglais camelCase**, contenus recettes en **FR**. BMI calculable côté front uniquement, non stocké.

## 3) Contrats & conventions

- **Unités**: personnes en cm/kg; nutrition par portion en kcal, g; ingrédients en `g | ml | piece`.
- **Enums**: côté logique en EN; côté contenu en FR.
- **Page publique**: `/menu/{shareId}` noindex, nofollow, sans PII; lien désactivable/régénérable.

---

## 4) Specs API / Next.js

### 4.1 Formulaire — champs (MVP)

Obligatoires: `email`, `consent=true`, `firstName`, `age [16–100]`, `gender`, `heightCm [100–250]`, `weightKg [40–150]`, `diet`, `proteinPreferences[]`, `cookingLevel`, `numRecipes[2–7]`, `numServings[1–4]`.

Optionnels: `dislikedFoods`, `favoriteFoods`, `equipmentAvailable[]`, `freeTextMessage`, `batchMode`.

### 4.2 Activité — Policy v1.1

**Trois micro‑questions**: `deskJob` (oui/non), `dailySteps` (`<5k|5-8k|>8k`), `sessionsPerWeek` (`0|1-2|3-4|>=5`) + `highIntensity` (oui/non).

**Calcul `activityFactor`**:

- Base 1.35
- +0.00 / +0.02 / +0.05 selon `dailySteps`
- +0.00 / +0.05 / +0.10 / +0.15 selon `sessionsPerWeek`
- +0.05 si `highIntensity` et `sessionsPerWeek !== '0'`
- −0.05 si `deskJob` et `dailySteps === '<5k'`
- Clamp `[1.35, 1.70]`, arrondi à 2 décimales. L’extrême actuel somme à **1.60**, pas 1.70, et c’est voulu.
    
    (Spéc validée en conversation; tests mis à jour en conséquence.)
    

### 4.3 Targets (BMR→TDEE→Daily→Meal)

- **BMR (Mifflin–St Jeor)**:
    - Femme: `10×kg + 6.25×cm − 5×âge − 161`
    - Homme: `10×kg + 6.25×cm − 5×âge + 5`
    - `unspecified` traité comme **femme**.
- **TDEE**: `round(BMR × activityFactor)`
- **Objectif** (`primaryGoal`):
    - `saveTime | eatHealthier` → `dailyTarget = TDEE`, tolérance ±15%
    - `weightLoss` → `dailyTarget = round(TDEE × 0.85)`, tolérance ±10%
- **Repas**: `mealShare = 0.35` → `mealTarget = dailyTarget × 0.35`
    - Fenêtre: `mealMin = floor(mealTarget × (1 − tol))`, `mealMax = ceil(mealTarget × (1 + tol))`
- **Protein floor**: `≥25/30/35 g` (saveTime/eatHealthier/weightLoss), **+5 g** si `secondaryFocus = highProtein`.
- **Arrondis**: BMR/TDEE/Daily entiers; factor 2 décimales; fenêtres floor/ceil.
    
    (Aligné avec tes fichiers MVP.)
    

### 4.4 `/api/submit` — flux

1. reCAPTCHA v3 ok sinon 400.
2. Zod validate + normalise.
3. calcul `activityFactor` 
4. calcul `targets` via règles ci‑dessus.
5. Persistance: `user`/`submission` (y compris `rawFormJson`, `normalizedInput`, reCAPTCHA meta).
6. Appel **webhook n8n** avec **payload non‑PII** (voir 5.1).
7. Réponse API: `submissionId`, `runId` et éventuellement pré‑targets pour affichage immédiat.
8. Webhook retour n8n: réception du **draft** `resultBundle` (sans `shareId`), validation, génération `shareId`, persistance `menuResult`.

### 4.5 Payload API → n8n (non‑PII)

- Profil sélection: `diet`, `equipmentAvailable[]`, `cookingLevel`, `proteinPreferences[]`, `favoriteFoods?`, `dislikedFoods?`, `batchMode`, `numRecipes`, `numServings`.
- Fenêtre: `window{ mealMinKcal, mealMaxKcal, mealTargetKcal, proteinFloorG }`.
- Policy: `primaryGoal`, `secondaryFocus`, `mealShare`, `tolerancePct`.
- Cibles copiées: `targets{ bmrKcal, activityFactor, tdeeKcal, dailyTargetKcal }`.
- Récence:
    - `excludeRecipeIds[]` (anti‑répétition 21 j, exclus en dur)
    - `recentStrict[]` (≤14 j, exclus en dur)
    - `recentSoft[]` (14–21 j, **autorisés jusqu’à 2 max** en fallback avec malus)
- Traçabilité: `runId`, `submissionId`, `contractVersion`.
    
    (Notre décision récence remplace le palier “relâcher diversité”.)
    

### 4.6 Webhook n8n → API (retour)

- Reçoit un **draft** `resultBundle` (voir 6.3) sans `shareId`.
- API ajoute `shareId`, valide contre le schéma, persiste `menuResult`, met à jour pointeurs, expose `/menu/{shareId}`.

### 4.7 Logs & sécurité

- Logging structuré JSON, `runId` partout, `debug` off en prod; redaction des PII (email, IP, UA, tokens).
- Alerte proactive “catalogue insuffisant”: WARN après filtre dur si pool < `numRecipes`; ERROR final si échec après fallback.

## 5) Specs n8n (sélection déterministe)

### 5.1 Entrée workflow

Payload non‑PII ci‑dessus (4.5). Plus lecture **catalogue via PostgREST** sur une **vue** lecture seule (RLS) qui expose uniquement les colonnes autorisées.

### 5.2 Filter (dur)

Conserver uniquement les recettes qui respectent toutes les contraintes: régime (`dietTags`), allergènes, équipement (`equipmentRequired ⊆ available`), difficulté (`≤ cookingLevel`), temps (`≤ 30 min`), anti‑répétition (exclure `excludeRecipeIds` et `recentStrict`), fenêtre calories, `proteinFloorG`, catégories protéiques **autorisées** (limité à `proteinPreferences[]`).

### 5.3 Score (tri)

Somme pondérée déterministe:

- Catégorie protéique dans préférences: **+3**, sinon **−2**.
- Densité protéique (g/100 kcal): **+0.8 × densité**.
- Proximité calories: **−c × |kcal − mealTargetKcal|**, avec **c = 0.02** si `primaryGoal = weightLoss`, sinon **0.01**.
- `batchMode` et recette `batchFriendly`: **+0.5**.
- Mots favoris: **+1** par hit; mots rejetés: **−3** par hit.
- Pénalité de récence pour celles autorisées via `recentSoft[]`: **−1.5**.
    
    **Départage** en cas d’égalité: 1) plus proche de la cible calories, 2) plus de protéines par portion, 3) identifiant croissant.
    
    (Notre grille finalise la section “Score” des specs n8n.)
    

### 5.4 Diversité (packing)

Au moins une recette par **catégorie préférée** quand possible, puis complétion en **roulement** selon l’ordre global du régime:

omnivore: `["Beef","Poultry","Meat alternatives","Fish","Eggs","Dairy","Legumes","Tofu"]`

flexitarian: `["Poultry","Meat alternatives","Fish","Eggs","Dairy","Legumes","Tofu","Beef"]`

vegetarian: `["Meat alternatives","Eggs","Dairy","Legumes","Tofu"]`

vegan: `["Meat alternatives","Legumes","Tofu"]`.

### 5.5 Fallback (sans relâcher les préférences)

1. **Récence partielle**: autoriser au plus **2** recettes de `recentSoft[]` avec pénalité de récence.
2. **Élargir fenêtre calories**: ±5% → ±10% → ±15% → ±20%.
3. **Stop** si insuffisant; déclencher ERROR “catalogue insuffisant”.
    
    Jamais relâcher: régime, allergènes, équipement, difficulté, `proteinFloor`, ni catégories non cochées.
    
    (Notre décision remplace l’ancien palier “relâcher diversité”.)
    

### 5.6 Shopping list (agrégation déterministe)

- Canonicalisation FR via `canonicalIngredientId`; sinon fallback par nom normalisé.
- Normalisation unités: `g|ml|piece`, **sans densités** au MVP.
- Agrégation par canonique; sections selon taxonomie; tri alpha; `sources[{recipeId, amount, unit}]`.

### 5.7 Sortie n8n: draft `resultBundle`

- `version: "v1"`, `generatedAt`
- `meta{ primaryGoal, secondaryFocus, numRecipes, numServings }`
- `targets` copiés (n8n ne recalcule pas)
- `recipes[]` FR complets: `id, title, timeMinutes, difficulty, servings, nutritionPerServing{calories,proteins,carbs,fats}, ingredients{name,quantity?,unit?}, steps[], imageUrl?`
- `shoppingList{ items[], summary? }`
- `audit{ selectionPolicyVersion, catalogVersion? }`
    
    API ajoutera `shareId` à la réception.
    

---

## 6) Specs catalogue & import (Supabase)

### 6.1 Principes

- FR pour titres/ingrédients/étapes; enums/flags en EN; nutrition par **portion**.
- Allergènes: flags rapides + liste UE structurée.
- `totalMinutes ≤ 30` pour MVP.

### 6.2 Tables & colonnes (extraits)

- `recipe`: `id`, `titleFr`, `slug`, `totalMinutes`, `servingsBase`, `nutritionPerServing{ kcal, proteinG, carbG, fatG, fiberG? }`, `dietTags[]`, `proteinCategory`, `difficulty`, `equipmentRequired[]`, `cuisine`, `batchFriendly`, flags `glutenFree/dairyFree`, `allergens[]`, `ingredients` JSONB, `stepsFr[]`, `images`, timestamps. Indexes GIN/B‑tree selon colonnes.
- `ingredient`: canonique FR avec `sectionCode` et unités par défaut + conversions optionnelles.
- `ingredient_alias`: mapping robuste FR pour agrégation.

### 6.3 Import & qualité

- Validations: minutes ≤ 30, enums valides, cohérence allergènes/flags, unités autorisées, nutrition plausible; normalisation accents; slug unique; rapport d’import.
- Objectif catalogue MVP: **150–300 recettes** pour bonne couverture.

### 6.4 Accès n8n au catalogue

- **Vue PostgREST en lecture seule** exposant uniquement les colonnes autorisées; RLS actif sur les tables sources.
- Requêtes filtrées côté PostgREST quand c’est utile (minutes/kcal/proteins/equipment) pour réduire le volume.
    
    (La vue suit exactement le modèle ci‑dessus.)
    

---

## 7) Sécurité & RGPD

- Minimisation: pas de BMI stocké; PII séparées; reCAPTCHA/IP/UA 30 j max puis purge.
- Partage: `/menu/{shareId}` noindex, pas de PII; gestion disable/regenerate.
- Email transactionnel: domaine dédié, SPF/DKIM/DMARC en place.
- Export/suppression sur demande: endpoints internes prévus.

---

## 8) Critères d’acceptation (QA)

- **ComputeActivityFactor**: 48 combinaisons testées, clamp 1.35–1.70, cas extrême = 1.60 attendu.
- **ComputeTargets**: cas d’ancrage chiffrés (homme/femme/unspecified; goals; highProtein).
- **/api/submit** intégration: reCAPTCHA OK/KO, persistance, appel n8n signé, **aucune PII** côté n8n, `runId` corrélé.
- **n8n sélection**: respect filtres durs, diversité, scoring, fallback révisé, notifications WARN/ERROR.
- **Shopping list**: agrégation multi‑unités correcte, sections et sources.
- **Page publique**: rendu d’un bundle complet, noindex, pas de PII, désactivation/regénération OK.
    
    (Points recoupés avec les documents MVP.)
    

---

## 9) Roadmap post‑MVP (non livrées ici)

- Mode “prise de masse”: pénalité asymétrique ou plancher kcal paramétrable.
- Densités et conversions avancées pour unités.
- Tips IA contextualisés.
- Auth utilisateur et RLS fines.
- Métadonnées recettes enrichies (saisonnalité, budget, etc.).

---

## 10) Section “Copilot‑ready” (périmètre Next.js uniquement)

**Scope Copilot (Next.js / API)**

- Zod schemas (input/targets/resultBundle) et normalisation.
- `computeActivityFactor` (Option B) et `computeTargets` selon cette Bible.
- `/api/submit`: reCAPTCHA, validation, calculs, persistance, appel **webhook n8n** (signé), retour minimal.
- Webhook retour n8n: validation draft `resultBundle`, ajout `shareId`, persistance `menuResult`.
- Page `/menu/[shareId]`: rendu bundle, noindex, disable/regenerate.
- Logging structuré, redaction PII, métriques de base.

**Hors scope Copilot**

- Toute logique n8n (Filter/Score/Diversify/Fallback/Shopping).
- Accès direct DB pour sélection de recettes depuis Next.js.
- Tips IA (sauf placeholder).

**Contrats JSON à respecter**

- **API → n8n**: payload non‑PII (voir 4.5).
- **n8n → API**: draft `resultBundle` conforme au schéma **sans `shareId`** (l’API l’ajoute).

**Critères d’acceptation Copilot**

- Tests unitaires: activityFactor (48 combos), targets (cas A/B/C + highProtein + unspecified).
- Test d’intégration `/api/submit`: PII absentes du payload n8n, signatures, `runId` corrélé, DB à jour.
- Test page publique: no PII, noindex, actions share OK.

---

### Annexes rapides

- Modèle `resultBundle` cible (incluant `recipes`, `shoppingList`, `audit`) déjà défini dans `resultBundle.schema.ts`. Utiliser ces champs et pas d’autres.
- Modèle `targets` dans `targets.schema.ts`: respecter les bornes et types.
