# Configuration Stripe pour Quinoïa

## 📋 Étapes de configuration

### 1. Créer les produits dans Stripe Dashboard

1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com) → **Produits**
2. Créer les produits suivants :

#### Produit 1: Quinoïa Premium Mensuel

- **Nom** : Quinoïa Premium Mensuel
- **Prix** : 9,90€ récurrent mensuel
- **ID Prix** : Copier et ajouter à `STRIPE_PRICE_MONTHLY_PROMO`

#### Produit 2: Quinoïa Premium Annuel

- **Nom** : Quinoïa Premium Annuel
- **Prix** : 99€ récurrent annuel
- **ID Prix** : Copier et ajouter à `STRIPE_PRICE_YEARLY`

### 2. Configurer les webhooks

1. Aller sur **Développeurs** → **Webhooks**
2. Créer un nouveau webhook :
   - **URL** : `https://quinoia.fr/api/webhooks/stripe`
   - **Événements à écouter** :
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
3. Copier le **secret de signature** → `STRIPE_WEBHOOK_SECRET`

### 3. Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

```bash
cp .env.example .env.local
```

### 4. Tester en mode Test

1. Utiliser les clés de test (commencent par `sk_test_` et `pk_test_`)
2. Utiliser les cartes de test Stripe :
   - **Succès** : `4242 4242 4242 4242`
   - **Échec** : `4000 0000 0000 0002`

### 5. Base de données Supabase

Ajouter les nouvelles colonnes à la table `users` :

```sql
ALTER TABLE users
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN stripe_price_id TEXT;
```

## 🚀 Déploiement en production

1. Remplacer les clés test par les clés live
2. Configurer l'URL de webhook avec votre domaine de production
3. Tester le flow complet avec de vrais paiements (petits montants)

## 🔧 Debug

Pour tester les webhooks en local, utiliser [Stripe CLI](https://stripe.com/docs/stripe-cli) :

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 📚 Documentation

- [Stripe Checkout Documentation](https://stripe.com/docs/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
