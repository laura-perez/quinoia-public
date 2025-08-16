# QuinOIA 🥗

Un générateur de menus personnalisés alimenté par l'IA, conçu pour simplifier la planification des repas en fonction de vos préférences alimentaires, objectifs de santé et contraintes de temps.

## 🎯 Vue d'ensemble

QuinOIA collecte vos préférences alimentaires via un formulaire multi-étapes et génère des menus personnalisés adaptés à vos besoins. L'application utilise une architecture Next.js robuste avec intégration n8n pour le traitement des données et génération de contenu IA.

## 🏗️ Architecture Technique

### Stack Principal

- **Frontend**: Next.js 15.4.5 avec React 18.2.0
- **Styling**: Tailwind CSS avec animations Framer Motion
- **Backend**: API Routes Next.js
- **Base de données**: Supabase avec Row Level Security (RLS)
- **Workflow IA**: n8n pour orchestration des traitements
- **Tests**: Vitest + Playwright
- **Validation**: Zod pour validation des schémas
- **Authentification**: reCAPTCHA v3

### Architecture de Sécurité

- **Row Level Security (RLS)** : Architecture dual-client Supabase
  - Client `anon` pour opérations RLS-aware (filtrage automatique)
  - Client `service_role` pour opérations admin (contournement RLS)
- **Rate Limiting** : Upstash Redis pour protection API
- **HMAC Signatures** : Sécurisation des webhooks n8n
- **Validation stricte** : Zod pour tous les inputs utilisateur

## 🚀 Installation

### Prérequis

```bash
Node.js >= 18
npm >= 8
```

### Configuration

1. **Cloner le repository**

```bash
git clone https://github.com/laura-perez/quinoia.git
cd quinoia
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configuration environnement**

Créer `.env.local` avec :

```bash
# Base URLs
APP_BASE_URL=http://localhost:3000

# Supabase (Architecture RLS)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx  # Server-only, admin access
SUPABASE_ANON_KEY=xxx     # Server-only, RLS-aware

# n8n Workflow
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/menu
N8N_WEBHOOK_SECRET=your-webhook-secret
HMAC_SECRET=your-hmac-secret

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=xxx
RECAPTCHA_SECRET_KEY=xxx

# Rate Limiting (optionnel)
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx
```

4. **Base de données Supabase**

Créer les tables avec politiques RLS :

```sql
-- Table users avec RLS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Politique RLS : utilisateur ne voit que ses données
CREATE POLICY "is_owner" ON users
  FOR ALL TO anon
  USING (auth.uid() = id);

-- Activer RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

## 🔧 Développement

### Commandes essentielles

```bash
# Serveur développement
npm run dev

# Tests unitaires
npx vitest run

# Tests E2E
npx playwright test

# Build production
npm run build

# Démarrer production
npm start

# Linting
npm run lint
```

### Structure du projet

```
├── pages/              # Routes et API endpoints
│   ├── api/           # API Routes (submit, test-recaptcha)
│   ├── formulaire.jsx # Formulaire multi-étapes
│   └── index.js       # Page d'accueil
├── src/
│   ├── components/    # Composants React réutilisables
│   │   ├── form/     # Composants formulaire (Step1-4)
│   │   └── ui/       # Composants UI (Hero, CTA, etc.)
│   ├── lib/          # Logique métier et utilitaires
│   │   ├── auth/     # Authentication (reCAPTCHA, HMAC)
│   │   ├── business/ # Calculs métier (BMR, TDEE, n8n payload)
│   │   ├── config/   # Configuration environnement
│   │   ├── logger/   # Logging structuré
│   │   └── supabase/ # Clients DB et opérations RLS
│   ├── schemas/      # Validation Zod
│   └── types/        # Types TypeScript
├── tests/
│   ├── unit/         # Tests unitaires
│   ├── integration/  # Tests d'intégration
│   └── e2e/          # Tests end-to-end
└── docs/             # Documentation architecture
```

## 🧪 Tests

### Tests unitaires

```bash
# Tous les tests
npx vitest run

# Tests spécifiques
npx vitest run tests/unit/hmac.test.ts

# Coverage
npm run test:coverage
```

### Tests E2E

```bash
# Tous les tests E2E
npx playwright test

# Mode interactif
npx playwright test --ui
```

### Tests d'intégration

- Pipeline complet `/api/submit`
- Architecture RLS Supabase
- Génération payload n8n
- Validation sécurité HMAC

## 📊 Pipeline de Données

### Flux utilisateur

1. **Formulaire** → Collecte préférences (4 étapes)
2. **Validation** → Zod + reCAPTCHA
3. **Base données** → Supabase avec RLS
4. **n8n Workflow** → Traitement IA + génération menu
5. **Livraison** → Email avec menu personnalisé

### Calculs métier

- **BMR (Basal Metabolic Rate)** : Formule Mifflin-St Jeor
- **TDEE (Total Daily Energy Expenditure)** : BMR × facteur d'activité
- **Targets nutritionnels** : Protéines, lipides, glucides optimisés
- **Récence recettes** : Évite répétitions via historique utilisateur

## 🔒 Sécurité

### Mesures implémentées

- **RLS Supabase** : Isolation données utilisateur
- **Rate Limiting** : Protection contre abus
- **HMAC Signatures** : Intégrité webhooks n8n
- **Input Validation** : Zod pour tous les inputs
- **reCAPTCHA v3** : Protection anti-spam
- **Environment Validation** : Configuration boottime
- **Structured Logging** : Audit et monitoring

### Architecture sécurisée

```typescript
// ✅ Côté serveur - Séparation des rôles
const anonClient = getAnonClient(); // RLS actif
const serviceClient = getServiceClient(); // RLS contourné

// ❌ Côté client - Aucun client DB direct
// Toute communication via API routes sécurisées
```

## 📈 Performance

### Optimisations

- **Bundle splitting** : Code splitting par route
- **Image optimization** : Next.js Image component
- **API response caching** : Cache stratégique
- **Database indexing** : Index sur colonnes fréquentes
- **Rate limiting** : Protection ressources

### Monitoring

- Structured logging avec niveaux contextuels
- Performance tracking des API routes
- Métriques base de données
- Bundle size monitoring

## 🚢 Déploiement

### Variables production requises

```bash
# Copier et adapter .env.local
APP_BASE_URL=https://yourdomain.com
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
SUPABASE_ANON_KEY=xxx
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/menu
# ... autres variables
```

### Build et déploiement

```bash
# Build optimisé
npm run build

# Vérification
npm start

# Tests pré-déploiement
npm run test && npx playwright test
```

## 🤝 Contribution

### Workflow de développement

1. **Branch** depuis `develop`
2. **Conventional Commits** pour messages
3. **Tests** obligatoires (unit + E2E)
4. **Build** validation avant PR
5. **PR Review** vers `develop`

### Standards code

- **TypeScript strict mode**
- **ESLint + Prettier** configuration
- **Tests coverage** > 80%
- **Documentation** inline JSDoc
- **Architecture patterns** cohérents

## 📝 Licence

Projet privé - Tous droits réservés

## 🆘 Support

### Problèmes courants

**Erreur environnement**

```bash
# Vérifier configuration
npm run build
# Erreurs détaillées dans console
```

**Tests échouent**

```bash
# Variables test manquantes
cp .env.local .env.test
# Adapter pour environnement test
```

**API n8n timeout**

```bash
# Vérifier webhook n8n actif
# Logs structurés pour debugging
```

### Documentation

- [Architecture RLS](./docs/RLS_ARCHITECTURE.md)
- [Guide Migration](./docs/RLS_MIGRATION.md)
- [Specs MVP](./SPECS_MVP_QUINOIA.md)

---

**QuinOIA** - Simplifiez votre alimentation avec l'IA 🚀
