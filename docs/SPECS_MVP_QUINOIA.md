# Quinoïa MVP - Spécification Technique v3.0

## Architecture & Objectif

**Mission**: Sélection automatisée de recettes françaises personnalisées avec génération de listes de courses.

**Architecture native v3.0**: Next.js full-stack avec sélection algorithmique native et traitement intégré

**Sortie**: Page publique interactive `/menu/{shareId}` (noindex, sans PII) avec liste de courses

---

## 1) Données d'Entrée Utilisateur

### Champs Obligatoires

- **Identité**: email, firstName (optionnel), consent, age [13-100], gender (female|male|unspecified)
- **Alimentaire**: diet (omnivore|flexitarian|vegetarian|vegan), proteinPreferences[], cookingLevel (beginner|intermediate|advanced)
- **Menu**: numRecipes [2-7], numServings [1-4]

### Champs Optionnels

- **Préférences**: favoriteFoods, dislikedFoods (texte libre, max 500 caractères chacun)
- **Allergies**: allergiesText (texte libre, max 300 caractères), allergens[] (enum canoniques)
- **Technique**: equipmentAvailable[] (Oven, Blender, Thermomix, Air Fryer), batchMode (forcé à false)

### Simplifications v3.0

- **Suppression physique**: Plus de heightCm, weightKg, activité physique
- **Suppression objectifs**: Plus de primaryGoal, secondaryFocus
- **Batch mode**: Toujours false dans le formulaire (masqué à l'utilisateur)

---

## 2) Logique Nutritionnelle Simplifiée

### Suppression des Calculs Métaboliques

- **Plus de BMR/TDEE**: Suppression complète des calculs Mifflin-St Jeor
- **Plus de cibles caloriques**: Aucun filtrage par fenêtre calorique
- **Plus d'objectifs utilisateur**: Suppression de saveTime/eatHealthier/weightLoss

### Protéines Simplifiées

- **Plancher unique**: 25g minimum par recette (valeur fixe)
- **Plus de modulation**: Aucun ajustement par objectif ou profil utilisateur

---

## 3) Algorithme de Sélection (Next.js)

### Pipeline de Sélection

1. **Récupération historique**: Recency user (21 derniers jours)
2. **Filtres durs**: Régime, équipement, plancher protéique, exclusion récence stricte (≤14j), préférences protéiques
3. **Scoring déterministe**: 6 composants avec pondération
4. **Filtrage doublons**: Suppression recettes similaires (seuil 70%)
5. **Stratégie diversité**: Rotation protéique par régime alimentaire
6. **Sélection finale**: Top N recipes selon score

### Scoring (6 composants)

- **Préférence protéique**: +1 si catégorie préférée, 0 sinon
- **Densité protéique**: +0.8 × (proteinGPerServing / 100_kcal)
- **Batch bonus**: +0.5 si batchMode ET recipe.batchFriendly (toujours 0 car batchMode=false)
- **Favoris**: +1 par mot trouvé dans titre/tags/ingrédients
- **Détestés**: -3 par mot trouvé dans titre/tags/ingrédients
- **Récence souple**: -1.5 pour 14-21 jours (max 2 en fallback)

### Suppressions v3.0

- **Plus de proximité calorique**: Suppression du scoring basé sur la distance à une cible calorique
- **Filtrage protéines obligatoire**: Seules les recettes avec protéines préférées passent les filtres durs

### Stratégie Diversité (Rotation protéique)

- **Omnivore**: Beef → Poultry → Meat alternatives → Fish → Eggs → Dairy → Legumes → Tofu
- **Flexitarian**: Poultry → Meat alternatives → Fish → Eggs → Dairy → Legumes → Tofu → Beef
- **Vegetarian**: Meat alternatives → Eggs → Dairy → Legumes → Tofu
- **Vegan**: Meat alternatives → Legumes → Tofu

### Fallback Gracieux

1. Récence partielle (max 2 de recentSoft avec pénalité)
2. Sinon -> erreur explicite utilisateur de catalogue insuffisant

### Filtrage Anti-Doublons

- **Algorithme de similarité**: Comparaison titre, ingrédients, pattern de cuisson
- **Seuil de rejet**: 70% de similarité
- **Protection**: Maximum 40% du pool peut être supprimé par sécurité

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

### Enum Canoniques

```typescript
// Genres supportés
gender: ["female", "male", "unspecified"]

// Régimes alimentaires
diet: ["omnivore", "flexitarian", "vegetarian", "vegan"]

// Catégories protéiques
proteinCategory: ["Beef", "Poultry", "Meat alternatives", "Fish", "Eggs", "Dairy", "Legumes", "Tofu"]

// Équipements (en anglais canonique)
equipment: ["Oven", "Blender", "Thermomix", "Air Fryer"]

// Niveaux de cuisine
cookingLevel: ["beginner", "intermediate", "advanced"]

// Allergènes canoniques
allergens: ["Gluten", "Milk", "Eggs", "Fish", "Peanuts", "Tree nuts", "Soy", "Sesame", "Shellfish", "Mustard"]
```

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

### Filtres Jamais Compromis

- Régime alimentaire strict
- Équipement disponible requis
- Niveau cuisine compatible
- Plancher protéique minimum (25g)
- **Préférences protéiques obligatoires**: Seules les recettes matchant les protéines sélectionnées

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
- Scripts d'import automatisés

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

- Sélection algorithmique des recettes (sans calculs métaboliques)
- Génération et agrégation shopping list
- Interface utilisateur responsive
- Gestion base de données via Supabase
- Authentification et sécurité

### Évolution Architecture

- **v1.0**: Architecture distribuée avec services externes
- **v2.0**: Migration progressive vers traitement natif
- **v3.0**: **Native Next.js complet** - Traitement unifié

**Bénéfices v3.0**:
- Latence réduite (traitement local)
- Debugging simplifié (stack unifié)
- Coûts opérationnels réduits
- Déploiement atomique
- Meilleur contrôle qualité

**Trade-offs acceptés v3.0**:
- Suppression complète calculs métaboliques (BMR/TDEE)
- Suppression objectifs utilisateur (perte poids, santé...)
- Protéines fixes à 25g minimum
- Tips cuisson statiques (non AI-générés)
- Batch mode masqué (toujours false)
- Focus MVP sur sélection intelligente simplifiée

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

## 12) Différences Majeures v3.0 vs Spécifications Originales

### Simplifications Majeures Implémentées

1. **Suppression physique/métabolisme**: Plus de collecte taille/poids/activité, plus de BMR/TDEE
2. **Suppression objectifs**: Plus de goals (saveTime/eatHealthier/weightLoss), logique unified
3. **Protéines simplifiées**: Plancher fixe 25g au lieu de modulation par objectif
4. **Batch mode masqué**: Option supprimée du formulaire, forcée à false
5. **Scoring allégé**: 6 composants au lieu de 7 (suppression proximité calorique)
6. **Préférences protéiques obligatoires**: Seules les protéines choisies passent les filtres

### Architecture Actuelle

- **Formulaire**: 3 steps au lieu de 4 (suppression physique/objectifs)
- **Validation**: Zod strict avec enum canoniques
- **Sélection**: Algorithme basé préférences + diversité uniquement
- **Interface**: Mobile-first, focus simplicité

---

**Note**: Document mis à jour pour refléter l'implémentation réelle v3.0 - Architecture Next.js simplifiée sans calculs métaboliques
