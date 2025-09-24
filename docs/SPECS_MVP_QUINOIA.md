# Quinoïa MVP - Spécification Technique v3.0

## Architecture & Objectif

**Mission**: Sélection automatisée de recettes françaises personnalisées avec génération de listes de courses.

**Architecture native v3.0**: Next.js full-stack avec sélection algorithmique et traitement intégré

**Sortie**: Page publique interactive `/menu/{shareId}` (noindex, sans PII) avec liste de courses

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
3. Sinon -> erreur explicite utilisateur de catalogue insuffisant

---

## 4) Génération Liste de Courses (Next.js Native)

### Pipeline de Génération

1. **Agrégation des ingrédients** de toutes les recettes sélectionnées
2. **Mapping canonique** via repository d'ingrédients en base
3. **Consolidation des quantités** par ingrédient canonique
4. **Mise à l'échelle** selon numServings utilisateur
5. **Organisation par catégories** de rayons magasin français

### Logique de Consolidation

**Mapping automatique**: Base de données d'ingrédients canoniques
- Recherche par nom exact puis similarité
- Standardisation unités (g, ml, pièce)
- Gestion des variants courants en base

**Agrégation intelligente**:
- Addition quantités même ingrédient canonique
- Conversion unités compatibles (g ↔ kg)
- Préservation source recipe pour traçabilité

### Organisation Rayons

**Catégories prédéfinies**:
- Fruits & Légumes
- Boucherie & Poissonnerie  
- Crémerie
- Épicerie Salée
- Épicerie Sucrée
- Surgelés
- Produits Frais

### Interface Interactive

- **Accordéons par rayon** avec compteurs
- **Cases à cocher** pour tracking progression
- **Items cochés** déplacés en section séparée
- **Compteur temps réel** items restants/total

---

## 5) Interface Menu Interactif

### Page Menu Publique (`/menu/{shareId}`)

**Design responsive** mobile-first avec version desktop optimisée

### Sections Principales

#### A) Carousel Recettes
- **Mobile**: Vue carte unique avec pagination dots
- **Desktop**: Grille 2x2 avec sélection interactive
- **Métadonnées**: Temps préparation, calories, macros
- **Images**: Fallback system avec placeholder Unsplash

#### B) Liste de Courses Interactive
- **Organisation**: Accordéons par rayon magasin
- **Fonctionnalités**: Checkbox, compteur progression, items barrés
- **État persistant**: Items cochés conservés en session
- **UX**: Smooth animations, feedback visuel immédiat

#### C) Navigation Sticky
- **Mobile**: Bottom tab bar fixe (Recettes, Liste, Astuces, Batch)
- **Desktop**: Floating navigation center avec scroll smooth
- **État actif**: Highlighting section courante

#### D) Contenu Statique Enrichi
- **Astuces cuisson**: 4 tips pratiques avec icônes
- **Batch cooking**: Timeline 3 jours avec étapes
- **Design**: Cards avec couleurs brand (#F4C95D, #414535)

### Spécifications Techniques

- **SEO**: `noindex,nofollow` + X-Robots-Tag header
- **Performance**: Images optimisées, lazy loading
- **Accessibilité**: ARIA labels, keyboard navigation
- **Sécurité**: Aucune PII exposée, shareId révocable

---

## 6) Base de Données

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

## 7) Contraintes & Performance

### Cibles Performance

- **Sélection recettes**: <2s pour 200+ recettes
- **Génération shopping list**: <1s pour consolidation
- **Menu page load**: <1s optimisé
- **Queries DB**: <100ms avec index

### Contraintes MVP

- Temps préparation ≤30min
- Nutrition plausible: calories = 4×(prot+carbs) + 9×fat ±15%
- Catalogue minimum: 200 recettes validées
- Coverage: 90%+ ingrédients mappés par base canonique

### Fallbacks Jamais Relâchés

- Régime alimentaire strict
- Équipement disponible requis
- Niveau cuisine compatible
- Plancher protéique minimum

---

## 8) Intégrations Externes

### Base de Données (Supabase)

- PostgreSQL avec Row Level Security (RLS)
- Repository ingrédients canoniques
- Tracking historique utilisateur
- Storage recettes et métadonnées

### Services d'Infrastructure

- **Authentification**: reCAPTCHA v3 pour validation formulaire
- **Rate Limiting**: Upstash Redis pour protection API
- **Analytics**: Vercel Analytics pour métriques usage
- **Logging**: Système structuré avec redaction PII

### Recipe Generation (Hors scope MVP)

- Import manuel recettes avec validation nutrition
- Mapping ingrédients vers base canonique
- Review qualité avant publication

---

## 9) Conventions Techniques

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

## 10) Architecture Décisionnelle v3.0

### Choix Technique: Next.js Full-Stack Native

**Rationale**: Simplicité architecture + Performance uniforme + Maintenance réduite

**Next.js Responsabilités Complètes**:

- Sélection algorithmique des recettes
- Calculs nutritionnels (BMR/TDEE/fenêtres)
- Génération et agrégation shopping list
- Interface utilisateur responsive
- Gestion base de données via Supabase
- Authentification et sécurité

### Évolution Architecture

- **v1.0**: Dépendance externe n8n pour toute logique métier
- **v2.0**: Hybride Next.js (sélection) + n8n (IA)
- **v3.0**: **Native Next.js complet** - Suppression n8n

**Bénéfices v3.0**:
- Latence réduite (pas de webhooks externes)
- Debugging simplifié (stack unifié)
- Coûts opérationnels réduits
- Déploiement atomique

**Trade-offs acceptés**:
- Pas de tips cuisson AI-générés (content statique)
- Shopping list basique (pas de variants linguistiques IA)
- Focus MVP sur fonctionnalité core

---

## 11) Métriques de Succès

### Technique

- Menu génération <5s end-to-end
- 95%+ availability du service
- 90%+ ingrédients mappés base canonique

### UX

- Journey Form→Menu >80% completion
- Recettes perçues "très pertinentes" 
- Shopping list interactive et organisée
- Interface mobile-first fluide

### Business

- Validation proposition valeur MVP
- Foundation scalable 1000+ early adopters
- Path clear vers modèle revenue

---

**Note**: Document single source of truth pour compréhension technique complète projet Quinoïa v3.0 - Architecture Next.js native
