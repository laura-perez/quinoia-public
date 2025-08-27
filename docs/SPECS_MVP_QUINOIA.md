# Quinoïa MVP - Spécification Technique v2.0

## Architecture & Objectif

**Mission**: Sélection automatisée de recettes françaises personnalisées avec génération de listes de courses intelligentes.

**Workflow hybride v2.0**: Next.js (sélection algorithmique) + n8n (traitement IA & email)

**Sortie**: Email personnalisé + page publique `/menu/{shareId}` (noindex, sans PII)

---

## 1) Données d'Entrée Utilisateur

### Champs Obligatoires

- **Identité**: email, firstName, consent, age [16-100], gender
- **Physique**: heightCm [100-250], weightKg [40-150]
- **Alimentaire**: diet (omnivore|flexitarian|vegetarian|vegan), proteinPreferences[], cookingLevel (beginner|intermediate|advanced)
- **Menu**: numRecipes [2-7], numServings [1-4]

### Champs Optionnels

- **Préférences**: favoriteFoods, dislikedFoods (texte libre)
- **Technique**: equipmentAvailable[], batchMode
- **Communication**: freeTextMessage

### Activité Physique (3 micro-questions)

- `deskJob` (oui/non) + `dailySteps` (<5k|5-8k|>8k) + `sessionsPerWeek` (0|1-2|3-4|≥5) + `highIntensity` (oui/non)
- **Calcul activityFactor**: Base 1.35 + ajustements → clamp [1.35, 1.60]

---

## 2) Calculs Nutritionnels (BMR→TDEE→Meal)

### Formules Mifflin-St Jeor

- **Femme**: 10×kg + 6.25×cm - 5×âge - 161
- **Homme**: 10×kg + 6.25×cm - 5×âge + 5
- **TDEE**: round(BMR × activityFactor)

### Cibles par Objectif

- **saveTime|eatHealthier**: dailyTarget = TDEE (±15%)
- **weightLoss**: dailyTarget = TDEE × 0.85 (±10%)
- **Repas**: mealTarget = dailyTarget × 0.35
- **Protéines**: 25g (saveTime), 30g (eatHealthier), 35g (weightLoss) +5g si highProtein

---

## 3) Algorithme de Sélection (Next.js)

### Pipeline de Sélection

1. **Récupération historique**: Recency user (21 derniers jours)
2. **Filtres durs**: Régime, équipement, fenêtre calorique, plancher protéique, exclusion récence stricte (≤14j)
3. **Scoring déterministe**: 7 composants avec pondération
4. **Stratégie diversité**: Rotation protéique par régime alimentaire
5. **Sélection finale**: Top N recipes selon score

### Scoring (7 composants)

- **Catégorie protéique**: +3 si préférée, -2 sinon
- **Densité protéique**: +0.8 × (proteinGPerServing / 100_kcal)
- **Proximité calorique**: -0.02 × |kcal-target| (weightLoss), -0.01 (autres)
- **Batch bonus**: +0.5 si batchMode ET recipe.batchFriendly
- **Favoris**: +1 par mot trouvé dans titre/tags
- **Détestés**: -3 par mot trouvé
- **Récence souple**: -1.5 pour 14-21 jours (max 2 en fallback)

### Stratégie Diversité (Rotation protéique)

- **Omnivore**: Beef → Poultry → Meat alternatives → Fish → Eggs → Dairy → Legumes → Tofu
- **Flexitarian**: Poultry → Meat alternatives → Fish → Eggs → Dairy → Legumes → Tofu → Beef
- **Vegetarian**: Meat alternatives → Eggs → Dairy → Legumes → Tofu
- **Vegan**: Meat alternatives → Legumes → Tofu

### Fallback Gracieux

1. Récence partielle (max 2 de recentSoft avec pénalité)
2. Élargissement calorique (±5% → ±10% → ±15% → ±20%)
3. Sinon -> notification email de manque de recettes

---

## 4) Traitement IA (n8n Workflow)

### Input n8n

- Recettes sélectionnées (par Next.js)
- Contexte utilisateur complet
- Cibles nutritionnelles

### Nodes IA Critiques

#### A) Agrégation Shopping List (Custom GPT)

**Challenge**: Variants français → canonique

- "quinoa blanc" + "quinoa rouge" = "Quinoa"
- "oeufs" + "oeuf" + "œuf" = "Œufs"

**Traitement**:

- Combinaison variantes couleur/description
- Standardisation orthographique (pluriel, accents)
- Addition quantités automatique
- Mise à l'échelle selon numServings
- Organisation rayons magasin français

#### B) Conseils Personnalisés (Custom GPT)

**Input contexte**:

- Niveau cuisine, équipement, batch mode, objectif, portions
- Recettes spécifiques sélectionnées

**Génération**:

- 3-4 tips cuisson actionnables
- Conseils meal prep si batch activé
- Insights nutrition selon objectif
- Techniques gain temps selon niveau

### Email Composition

- Header personnalisé avec prénom
- Preview nbRecipes recettes
- Section conseils IA (2 premiers tips)
- Section shopping list (statistiques + exemple)
- CTA vers menu complet avec shareId

---

## 5) Base de Données

### Table Recipe (Core)

**Identifiants**: id, titleFr, slug, servingsBase [1-4], prepTimeMinutes ≤30min
**Nutrition**: caloriesPerServing, proteinGPerServing, carbsGPerServing, fatGPerServing (par portion)
**Classification**: diet, proteinCategory, cookingLevel
**Features**: equipmentRequired[], batchFriendly
**Contenu**: ingredients (JSONB), instructions[]
**Tagging**: tags[] (for user preference matching via ingredients/tags)
**Qualité**: cookingTip, gptAutoEvaluation, status

### Index Performance (Sub-seconde)

- diet, proteinCategory, cookingLevel
- caloriesPerServing, proteinGPerServing
- equipmentRequired (GIN), status, prepTimeMinutes

### Table Recency Tracking

- user_id, recipe_id, consumed_at, menu_result_id
- Index: (user_id, consumed_at DESC) pour lookup rapide

---

## 6) Contraintes & Performance

### Cibles Performance

- **Sélection recettes**: <2s pour 200+ recettes
- **Email delivery**: <30s depuis form submit
- **Menu page load**: <1s optimisé
- **Queries DB**: <100ms avec index

### Contraintes MVP

- Temps préparation ≤30min
- Nutrition plausible: calories = 4×(prot+carbs) + 9×fat ±15%
- Catalogue minimum: 200 recettes validées
- Coverage: 90%+ ingrédients auto-mappés par IA

### Fallbacks Jamais Relâchés

- Régime alimentaire strict
- Équipement disponible requis
- Niveau cuisine compatible
- Plancher protéique minimum

---

## 7) Intégrations Externes

### n8n Workflow Platform

- Webhook endpoints Next.js → n8n
- AI Agent nodes pour traitement IA
- Template email + Resend integration

### AI agent nodes

- Shopping list: Expert variants français
- Cooking tips: Chef expert pédagogique
- Prompting structuré pour consistance

### Resend Email Service

- Domain: menu@quinoia.fr (SPF/DKIM)
- Tags campagne pour analytics
- Templates responsive mobile

### Recipe Generation (Offline)

- Custom GPT schema v2.0 aligné DB
- Validation nutrition + mapping ingrédients
- Pipeline import avec review manuelle

---

## 8) Conventions Techniques

### Données

- **Unités**: cm/kg (personnes), kcal/g (nutrition), g|ml|piece (ingrédients)
- **Langue**: Contrats EN camelCase, contenu FR
- **Page publique**: noindex/nofollow, PII-free, shareId désactivable

### Sécurité

- reCAPTCHA v3 validation
- PII redaction logs structurés
- Rate limiting API endpoints
- RLS database policies

### Qualité

- Logging structuré avec runId
- Alertes "catalogue insuffisant" proactives
- Tests 48 combinaisons activityFactor
- Validation déterminisme scoring (même input = même output)

---

## 9) Architecture Décisionnelle v2.0

### Choix Technique: Hybride Next.js + n8n

**Rationale**: Performance (Next.js) + Flexibilité IA (n8n)

**Next.js Responsabilités**:

- Sélection algorithmique complexe
- Accès direct DB optimisé
- Calculs nutritionnels précis

**n8n Responsabilités**:

- Traitement IA temps réel
- Agrégation shopping list intelligente
- Composition email professionnelle

### Migration v1.1 → v2.0

- **BREAKING**: Suppression dépendance n8n pour sélection
- **Ajout**: Traitement IA pour shopping list + conseils
- **Conservation**: Architecture user/submission existante
- **Enhancement**: Menu pages avec contenu IA

---

## 10) Métriques de Succès

### Technique

- Email <60s
- 95%+ delivery rate email
- 90%+ ingrédients auto-mappés IA

### UX

- Journey Form→Email→Menu >80% completion
- Recettes perçues "très pertinentes"
- Shopping list pratique et organisée

### Business

- Validation proposition valeur MVP
- Foundation scalable 1000+ early adopters
- Path clear vers modèle revenue

---

**Note**: Document single source of truth pour compréhension technique complète projet Quinoïa v2.0
