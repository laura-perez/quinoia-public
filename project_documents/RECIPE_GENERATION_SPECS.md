# Quinoïa - Spécifications Génération Recettes & Gestion Ingrédients

## Objectif: 50-100 Recettes Validées en 4 Semaines

**Approche**: Semi-automatisée avec validation experte humaine
**Cible**: 10 recettes validées/jour = 50 recettes base → 200 recettes total avec variants

---

## 1) Architecture Solution

### **Pipeline en 3 Phases**
1. **Custom GPT #1**: Génération recettes base (françaises + internationales)
2. **Custom GPT #2**: Variants automatiques (omni→flexi→végé→vegan)  
3. **n8n + AI**: Gestion ingrédients automatisée

### **Workflow Quotidien (30 minutes)**
- 2 batches × 5 recettes = 10 recettes générées
- Validation qualité: 2 min/recette = 20 minutes
- Import base de données: 10 minutes automatisé

---

## 2) Custom GPT #1: "Générateur Recettes Quinoïa"

### **Prompt Principal Optimisé**
```
Tu es un chef français expert en cuisine saine du quotidien. 

MISSION: Générer exactement {{number_of_recipes}} plats principaux simples, sains, gourmands et rassasiants, parfaitement adaptés à la vie de tous les jours.

CONTRAINTES ABSOLUES:
- Temps préparation: 15-30 minutes maximum
- Fenêtre calorique: {{calorie_min}}-{{calorie_max}} kcal par portion
- Protéines: minimum {{protein_min}}g par portion
- Ingrédients: frais, bruts, non transformés (sauf de base: pâtes, riz, conserves)
- Privilégier ingrédients populaires que tout le monde aime
- OBLIGATOIRE: une part significative de légumes dans chaque recette
- Favoriser légumes très appréciés ou de saison

INSPIRATION CUISINE:
- Française moderne (70%): plats familiaux revisités sainement
- Méditerranéenne (15%): simplicité et fraîcheur  
- Asiatique accessible (10%): woks, currys simples
- Autres cuisines (5%): adaptées aux goûts français

STRUCTURE RÉPONSE JSON:
{
  "recipes": [
    {
      "title_fr": "Nom appétissant du plat",
      "cuisine_type": "française|méditerranéenne|asiatique|autre",
      "prep_time_minutes": 20,
      "servings_base": 2,
      "calories_per_serving": 550,
      "protein_g_per_serving": 25,
      "carbs_g_per_serving": 45,
      "fat_g_per_serving": 18,
      "diet_base": "omnivore",
      "protein_category": "Poultry|Beef|Fish|Eggs|Dairy",
      "cooking_level": "beginner",
      "batch_friendly": true,
      "equipment_required": ["Poêle", "Casserole"],
      "ingredients": [
        {
          "nom": "Blanc de poulet",
          "quantite": 300,
          "unite": "g"
        }
      ],
      "instructions": [
        "Étape 1 claire et précise",
        "Étape 2...",
        "Étape finale"
      ],
      "cooking_tip": "Conseil pratique pour réussir le plat",
      "why_popular": "Pourquoi ce plat plaît (goût, texture, familiarité)",
      "nutrition_balance": "Équilibre nutritionnel expliqué"
    }
  ]
}

VALIDATION QUALITÉ:
- Chaque recette doit être un plat que 80%+ des français aimeraient manger
- Instructions claires pour quelqu'un qui cuisine occasionnellement  
- Combinaisons d'ingrédients cohérentes et appétissantes
- Temps de préparation réaliste et précis
```

### **Variables d'Entrée par Fenêtre**
- **Fenêtre 400-600 kcal**: protein_min=20g, focus légèreté
- **Fenêtre 600-800 kcal**: protein_min=25g, équilibre standard
- **Fenêtre 800+ kcal**: protein_min=30g, plats consistants

---

## 3) Custom GPT #2: "Générateur Variants Quinoïa"

### **Prompt Transformation Automatique**
```
Tu es un expert en adaptations culinaires pour différents régimes alimentaires.

MISSION: Transformer cette recette omnivore validée en 3 variants authentiques.

RECETTE BASE:
{{recipe_json}}

GÉNÉRER 3 VARIANTS:
1. FLEXITARIAN: Réduire portion protéine animale de 30%, ajouter protéine végétale
2. VEGETARIAN: Remplacer protéine animale par œufs/légumineuses/fromage approprié
3. VEGAN: Protéines 100% végétales (légumineuses, tofu, tempeh, seitan)

RÈGLES TRANSFORMATION:
- Conserver l'esprit du plat original (saveurs, texture, apparence)
- Maintenir équilibre nutritionnel (±10% calories, ±15% protéines)
- Garder temps préparation identique
- Adaptations cohérentes avec les habitudes alimentaires françaises
- Ingredients facilement trouvables en France

RÉPONSE JSON:
{
  "base_recipe_id": "{{original_id}}",
  "variants": [
    {
      "variant_type": "flexitarian",
      "title_fr": "Titre adapté",
      "diet": "flexitarian",
      "protein_category": "Légumineuses principale + animal secondaire",
      "ingredients": [...],
      "instructions": [...],
      "adaptation_note": "Explication transformation"
    }
  ]
}
```

---

## 4) Interface Validation Rapide (Next.js)

### **Page Simple /recipe-validator**

**Fonctionnalités**:
- Affichage recette générée (titre, ingrédients, instructions, nutrition)
- Boutons: ✅ **Valider** | 🔄 **Modifier** | ❌ **Rejeter**
- Si Modifier: champs éditables inline
- Auto-génération slug et ID unique
- Import direct en base avec un clic

**Workflow Optimisé**:
1. Copier JSON depuis GPT → Coller dans interface
2. Review visuel 30 secondes par recette
3. Clic Valider → Auto-import DB
4. Passage recette suivante

**Estimation temps**: 2 minutes par recette = 10 recettes en 20 minutes

---

## 5) Gestion Ingrédients Automatisée (n8n)

### **Bootstrap Ingrédients (Phase 0)**
**Base 200 ingrédients français communs** pré-générée:
- 50 légumes (tomates, courgettes, carottes, épinards...)
- 30 protéines (poulet, bœuf, saumon, œufs, fromages...)
- 40 féculents (riz, pâtes, quinoa, pommes de terre...)
- 30 épices/aromates (ail, oignon, persil, thym...)
- 50 autres (huiles, vinaigres, conserves, produits laitiers...)

### **Pipeline Auto-Enrichissement**
**Workflow n8n déclenché après chaque import recette**:

1. **Extraction ingrédients**: Parse ingrédients de recettes validées
2. **Matching intelligent**: 
   - Exact match → auto-approve
   - Fuzzy match >90% → auto-approve avec mapping
   - <90% → queue review humaine
3. **Standardisation AI**:
   - "quinoa blanc" → "quinoa" 
   - "œufs" → "œuf"
   - Pluriel/singulier normalisé
4. **Enrichissement base**: Ajout automatique nouveaux ingrédients validés

### **Review Queue Interface**
**20+ ingrédients/jour facilement reviewables**:
- Interface simple: Nouvel ingrédient → Suggestion mapping → ✅/❌
- Affichage: "courgette jaune" → Suggérer: "courgette" (confiance 85%)
- Bulk actions pour approbations multiples

---

## 6) Distribution Recettes Cible

### **50 Recettes Base Répartition**
- **Française moderne** (35): 
  - Plats familiaux revisités: blanquette légère, hachis parmentier quinoa
  - Gratins santé, one-pots, mijotés express
- **Méditerranéenne** (8):
  - Bowls grec, ratatouille, poissons grillés
- **Asiatique accessible** (5):
  - Woks légumes, currys doux, sautés
- **Autres cuisines** (2):
  - Chili, plats tex-mex adaptés

### **Expansion Automatique 50→200**
- Chaque recette base × 4 variants = 200 recettes total
- Couverture tous régimes alimentaires automatique
- Diversité protéique garantie par transformation

---

## 7) Métriques Qualité & Performance

### **Cibles Vitesse**
- **Génération**: 5 recettes/batch en 3 minutes (GPT)
- **Validation**: 2 minutes/recette = 10 minutes/batch  
- **Import**: 30 secondes automatisé
- **Total**: 15 minutes pour 5 recettes → 200 recettes en 10 heures

### **Critères Qualité**
- **Réalisme culinaire**: 90%+ recettes "faisables et appétissantes"
- **Précision nutritionnelle**: ±10% sur calories/protéines
- **Instructions clarté**: Exécutable par cuisinier occasionnel
- **Ingrédients accessibilité**: 95% disponibles supermarché français

### **Métriques Ingrédients**
- **Coverage auto**: 90%+ nouveaux ingrédients auto-mappés
- **Queue review**: <20 ingrédients/jour nécessitant validation
- **Standardisation**: 95%+ variants français correctement agrégés

---

## 8) Planning Implémentation Rapide

### **Semaine 1: Setup (3 heures)**
- Custom GPT #1 configuration et tests
- Interface validation Next.js (page simple)
- Bootstrap 200 ingrédients base
- n8n workflow ingrédients

### **Semaine 2-3: Production (8 heures/semaine)**
- 50 recettes base générées et validées
- Auto-génération 150 variants 
- Enrichissement base ingrédients

### **Semaine 4: Finalisation (2 heures)**
- Review qualité globale
- Ajustements derniers ingrédients
- Export final pour intégration production

**Total temps investi**: 20 heures pour 200 recettes validées = **efficacité maximale**

---

## 9) Évolutions Post-MVP

### **Optimisations Futures**
- GPT fine-tuning sur vos validations pour améliorer pertinence
- Interface validation mobile pour plus de flexibilité
- Analytics qualité (taux approbation par type recette)
- Expansion automatique par saisons/tendances

### **Scaling 200→500 Recettes**
- Même pipeline optimisé
- Focus recettes spécialisées (batch cooking, express <15min)
- Intégration tendances culinaires automatique

**Cette approche maximise la vitesse tout en garantissant votre contrôle qualité expert sur chaque recette.**