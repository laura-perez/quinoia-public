# Quinoïa - Analyse UX Workflow & Persona Pauline

## 👤 **Persona Cible : Pauline**

### **Profil démographique**

- **Âge** : 34 ans
- **Profession** : UX designer freelance
- **Localisation** : Ville moyenne/grande (Lyon, Nantes, Bordeaux)
- **Mode de vie** : Urbaine, active, indépendante

### **Comportement alimentaire**

- **Régime** : Flexitarienne (sans militantisme)
- **Attitude** : Curieuse, attentive à son alimentation, sans dogme
- **Valeurs** : Produits bruts, équilibre, goût, simplicité

### **Pain Points alimentaires**

- **Charge mentale insupportable** : décider quoi manger, équilibrer, lister les courses
- **Apps testées décevantes** : trop fitness, trop simplistes, trop impersonnelles
- **Besoin principal** : Mieux manger sans effort, avec du goût, sans suivre de régime

### **Motivations & Objectifs**

- **Déléguer les décisions** culinaires à un système intelligent
- **Gagner du temps** sur la planification des repas
- **Manger équilibré** avec des produits de qualité
- **Variété** et **goût** sans effort de réflexion

---

## 🎯 **Workflow UX Complet Quinoïa**

### **Phase 1 : Découverte & Landing Page**

#### **Point d'entrée : Landing Page (`/`)**

**Actions utilisateur possibles :**

1. **Lecture** du contenu principal
2. **Scroll** pour découvrir les sections
3. **Click "Voir mon menu"** → Redirection `/formulaire`
4. **Click "Tarifs"** → Redirection `/tarifs`
5. **Navigation** via menu (si présent)

**Expérience de Pauline :**

- ✅ **Accroche immédiate** : "Éliminer la charge mentale des repas"
- ✅ **Design épuré** qui correspond à ses standards UX
- ⚠️ **Manque d'exemples visuels** de menus concrets
- ⚠️ **Pas de preuves sociales** (témoignages d'utilisatrices similaires)

#### **Actions de navigation possibles :**

- `Accueil` → Retour landing page
- `Logo Quinoïa` → Retour landing page
- `Liens footer` → Pages légales/contact

---

### **Phase 2 : Tarification & Réassurance**

#### **Page Tarifs (`/tarifs`)**

**Actions utilisateur possibles :**

1. **Comparaison** des 3 plans (Gratuit, Découverte, Abonnement)
2. **Lecture FAQ** pour lever les objections
3. **Click "Essayer gratuitement"** → Redirection `/formulaire`
4. **Click "Choisir ce pack"** → Redirection système de paiement (futur)
5. **Click "S'abonner"** → Redirection système de paiement (futur)
6. **Navigation retour** vers landing page

**Expérience de Pauline :**

- ✅ **Prix raisonnable** (9,90€) pour le temps gagné
- ✅ **Essai gratuit** sans risque
- ✅ **FAQ claire** sur annulation
- ⚠️ **"Astuces personnalisées"** reste flou
- ⚠️ **Différences plans** pas assez explicites

#### **Objections traitées par la FAQ :**

- Comment fonctionne la sélection ? → Algorithme déterministe
- Contenu des menus ? → Jusqu'à 7 recettes, portions adaptables
- Niveau débutant ? → Instructions claires
- Régimes spéciaux ? → Prise en compte personnalisée
- Frais cachés ? → Transparence totale

---

### **Phase 3 : Onboarding & Essai Gratuit**

#### **Formulaire Multi-étapes (`/formulaire`)**

**Étape 1 : Identité**

- **Actions** : Saisie nom, âge (optionnel), genre
- **Validation** : Contrôle format, champs requis
- **Navigation** : "Étape suivante" ou abandon

**Étape 2 : Préférences Alimentaires**

- **Actions** : Sélection régime, protéines préférées, allergies
- **Options** : Omnivore/Flexitarien/Végétarien/Vegan
- **Navigation** : "Suivant" / "Retour"

**Étape 3 : Contexte Culinaire**

- **Actions** : Niveau cuisine, équipement, goûts
- **Sélections multiples** : Matériel disponible
- **Texte libre** : Aliments aimés/détestés

**Étape 4 : Email & Validation**

- **Actions** : Saisie email, consentement RGPD
- **Validation** : Format email, case obligatoire
- **Soumission** : reCAPTCHA + envoi API

**Expérience de Pauline :**

- ✅ **Questions pertinentes** à son profil
- ✅ **Durée acceptable** (4 étapes)
- ✅ **Âge optionnel** respectueux
- ⚠️ **"Protéines préférées"** → manque option "variée"
- ⚠️ **Progress overlay 10-15s** → anxiogène

#### **Système de Progress Overlay**

- **Phase 1** : "Analyse de tes préférences" (25%)
- **Phase 2** : "Sélection recettes personnalisées" (50%)
- **Phase 3** : "Création liste de courses" (75%)
- **Phase 4** : "Finalisation menu" (100%)

---

### **Phase 4 : Notification & Communication**

#### **Message de Succès (Formulaire)**

**Actions utilisateur possibles :**

1. **Lecture** confirmation "C'est envoyé 🎉"
2. **Click "Voir mon menu"** → Redirection `/menu/{shareId}` (si shareId disponible)
3. **Attente email** de confirmation

**Expérience de Pauline :**

- ✅ **Confirmation immédiate** rassurante
- ✅ **Accès direct** au menu si disponible
- ✅ **Email reçu rapidement**

#### **Email de Bienvenue (Non implémenté dans l'analyse)**

**Contenu attendu :**

- Lien vers le menu généré
- Résumé des recettes sélectionnées
- Présentation de la liste de courses
- CTA vers l'abonnement

---

### **Phase 5 : Expérience Produit Principal**

#### **Page Menu Personnalisé (`/menu/{shareId}`)**

**Actions utilisateur principales :**

1. **Navigation entre recettes :**
   - **Swipe tactile** gauche/droite (mobile)
   - **Clics sur indicators** dots de pagination
   - **Touches clavier** flèches gauche/droite (desktop)

2. **Exploration détaillée des recettes :**
   - **Click sur recette** → Ouverture modal
   - **Pull-to-extend** → Extension modal complète
   - **Scroll dans modal** → Navigation contenu
   - **Fermeture modal** → Bouton X ou swipe down

3. **Gestion liste de courses :**
   - **Checkbox ingrédients** → Marquage fait/pas fait
   - **Accordéons rayons** → Organisation supermarché
   - **Export PDF** (si implémenté)

4. **Utilisation des astuces :**
   - **Lecture tips généraux** → 4 astuces menu
   - **Astuces par recette** → 4 types (préparation, technique, variation, conservation)

**Micro-interactions détaillées :**

**Modal Recettes :**

- **Ouverture** : Animation slide-up depuis le bas
- **Navigation** : Swipe horizontal avec indicateurs
- **Extension** : Pull gesture ou scroll pour mode plein écran
- **Contenu scroll** : Stats → Nutrition → Ingrédients → Instructions → Astuces
- **Fermeture** : Bouton X, swipe down, ou click overlay

**Liste de Courses :**

- **Accordéons** : Collapse/expand par section supermarché
- **Checkboxes** : Animation de validation avec feedback visuel
- **Progression** : Compteur dynamique items cochés/total
- **Réorganisation** : Items cochés déplacés en section séparée

**Expérience de Pauline :**

- ✅ **Interface soignée** → Apprécie en tant qu'UX designer
- ✅ **Navigation intuitive** → Swipe naturel sur mobile
- ✅ **Ingrédients scalés** → Quantités correctes pour portions choisies
- ✅ **Liste de courses organisée** → Exactly ce qu'elle voulait !
- ✅ **Astuces pertinentes** → Valeur ajoutée concrète
- ❓ **Sauvegarde du menu** → Comment le retrouver plus tard ?
- ❓ **Historique** → Accès aux menus précédents ?

---

### **Phase 6 : Conversion & Fidélisation (Workflow Futur)**

#### **Upsell vers Abonnement**

**Points de contact conversion :**

1. **Fin d'essai gratuit** → Modal/email de conversion
2. **Usage intensif** → Proposition upgrade
3. **Retour sur site** → Offres personnalisées

#### **Gestion Abonnement (À venir)**

**Espace utilisateur potentiel :**

- **Historique menus** générés
- **Préférences** mises à jour
- **Gestion abonnement** (pause, résiliation)
- **Bibliothèque recettes** complète

---

## 📊 **Analyse UX Critique du Point de Vue de Pauline**

### **🎯 Forces du Workflow Actuel**

1. **Résolution du pain point principal**
   - Élimine réellement la charge mentale
   - Décisions déléguées à l'algorithme
   - Liste de courses prête et organisée

2. **Onboarding efficace**
   - Questions pertinentes sans être intrusives
   - Durée acceptable (4 étapes)
   - Personnalisation visible du résultat

3. **Interface produit qualitative**
   - Navigation intuitive et fluide
   - Contenu bien organisé et accessible
   - Micro-interactions soignées

4. **Respect des valeurs utilisateur**
   - Produits bruts/non transformés
   - Flexitarisme pris en compte
   - Pas de dogme nutritionnel

### **⚠️ Faiblesses & Points d'Amélioration**

1. **Manque de preuves sociales**
   - Aucun témoignage d'utilisatrices similaires
   - Pas d'indicateurs de popularité
   - Crédibilité à renforcer

2. **Exemples concrets insuffisants**
   - Pas de preview de menus types
   - Astuces IA floues avant test
   - Bibliothèque recettes invisible

3. **Workflow post-essai flou**
   - Que se passe-t-il après l'essai ?
   - Comment accéder aux menus suivants ?
   - Historique et sauvegarde unclear

4. **Conversion path incomplet**
   - Pas de système de paiement intégré
   - Upsell non automatisé
   - Relance email manquante

### **🚀 Recommandations d'Amélioration**

#### **Court terme (MVP+)**

1. **Ajouter témoignages** d'utilisatrices type Pauline
2. **Galerie d'exemples** de menus sur landing page
3. **Email de suivi** post-essai avec CTA conversion
4. **Historique basique** des menus générés

#### **Moyen terme (v2)**

1. **Système de paiement** intégré (Stripe)
2. **Espace utilisateur** avec gestion préférences
3. **Notifications push** pour nouveaux menus
4. **Mode batch cooking** avancé

#### **Long terme (Scale)**

1. **Communauté utilisatrices** avec partage recettes
2. **Intégration courses** en ligne (Courses U, etc.)
3. **App mobile native** avec notifications
4. **Recommandations IA** évolutives

---

### **Décision Probable de Pauline :**

- ✅ **Teste l'essai gratuit** (risque zéro, résout son problème)
- 🤔 **Hésite pour l'abonnement** sans plus de preuves sociales
- 💡 **Recommanderait** à ses amies si l'essai la convainc

### **Facteurs de Conversion Clés :**

1. **Qualité du premier menu** reçu
2. **Facilité d'usage** de la liste de courses
3. **Pertinence** des astuces personnalisées
4. **Simplicité** du processus d'abonnement

---

_Document créé le 27 septembre 2025 - Quinoïa UX Analysis v3.1_
