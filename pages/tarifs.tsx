import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Check, X, Star, Gift, Zap } from 'lucide-react';
import Navbar from '../src/components/ui/Navbar';

const PricingPage = () => {
  const plans = [
    {
      id: 'essai',
      name: 'Essai Gratuit',
      price: 'Gratuit',
      duration: '',
      badge: null,
      icon: <Gift className="w-6 h-6" />,
      description: 'Découvre Quinoïa sans engagement',
      features: [
        { text: '1 menu personnalisé', included: true },
        { text: '3 recettes pour 2 portions', included: true },
        { text: 'Liste de courses organisée', included: true },
        { text: 'Astuces personnalisées', included: true },
        { text: '1 seul essai par email', included: true, note: true },
        { text: 'Historique des menus', included: false },
        { text: 'Export PDF', included: false },
        { text: 'Favoris & blacklist', included: false },
        { text: 'Support prioritaire', included: false }
      ],
      cta: 'Essayer gratuitement',
      ctaStyle: 'border-2 border-[#F4C95D] text-[#414535] hover:bg-[#F4C95D]'
    },
    {
      id: 'decouverte',
      name: 'Pack Découverte',
      price: '9,90€',
      originalPrice: '19€',
      duration: '4 semaines',
      badge: 'Recommandé',
      icon: <Star className="w-6 h-6" />,
      description: 'Parfait pour tester Quinoïa sur un mois',
      features: [
        { text: '4 menus hebdomadaires', included: true },
        { text: 'Jusqu\'à 7 recettes de 2 à 4 portions', included: true },
        { text: 'Listes de courses optimisées', included: true },
        { text: 'Astuces illimitées', included: true },
        { text: 'Historique des 4 menus', included: true },
        { text: 'Export PDF des listes', included: true },
        { text: 'Favoris & blacklist', included: true },
        { text: 'Support par email', included: true },
        { text: 'Support prioritaire', included: false }
      ],
      cta: 'Choisir ce pack',
      ctaStyle: 'bg-[#F4C95D] text-[#414535] hover:bg-[#E5B84A]'
    },
    {
      id: 'mensuel',
      name: 'Abonnement',
      price: '9,90€',
      duration: '/mois',
      yearlyPrice: '95€/an',
      yearlyDiscount: '-20%',
      badge: null,
      icon: <Zap className="w-6 h-6" />,
      description: 'Pour une expérience complète et continue',
      features: [
        { text: '4 nouveaux menus/mois', included: true },
        { text: 'Jusqu\'à 7 recettes de 2 à 4 portions', included: true },
        { text: 'Listes de courses optimisées', included: true },
        { text: 'Astuces illimitées', included: true },
        { text: 'Historique illimité', included: true },
        { text: 'Export PDF des listes', included: true },
        { text: 'Favoris & blacklist', included: true },
        { text: 'Bibliothèque complète (40+ recettes)', included: true },
        { text: 'Support prioritaire', included: true }
      ],
      cta: "S'abonner",
      ctaStyle: 'border-2 border-[#414535] text-[#414535] hover:bg-[#414535] hover:text-white'
    }
  ];

  return (
    <>
      <Head>
        <title>Tarifs - Quinoïa | Menus personnalisés et listes de courses</title>
        <meta
          name="description"
          content="Découvrez nos tarifs pour des menus équilibrés personnalisés. Essai gratuit, pack découverte à 9,90€ ou abonnement mensuel. Éliminez la charge mentale des repas !"
        />
        <meta name="robots" content="index,follow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF8] to-white">
        {/* Header - Same as landing page */}
        <Navbar />

        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[#414535] mb-6">
              Éliminez la charge mentale des repas
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Des menus équilibrés, frais et non transformés, avec leurs listes de courses optimisées.
              Chaque semaine, en quelques minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2 text-[#414535]">
                <Check className="w-5 h-5 text-[#F4C95D]" />
                <span>Menu simple et savoureux</span>
              </div>
              <div className="flex items-center gap-2 text-[#414535]">
                <Check className="w-5 h-5 text-[#F4C95D]" />
                <span>Recettes non transformées</span>
              </div>
              <div className="flex items-center gap-2 text-[#414535]">
                <Check className="w-5 h-5 text-[#F4C95D]" />
                <span>Annulation facile</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg border-2 p-8 flex flex-col h-full ${
                    plan.badge ? 'border-[#F4C95D] transform scale-105' : 'border-gray-100'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#F4C95D] text-[#414535] px-4 py-2 rounded-full text-sm font-semibold">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-4 text-[#414535]">
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-[#414535] mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-2">
                        {plan.originalPrice && (
                          <span className="text-gray-400 line-through text-lg">{plan.originalPrice}</span>
                        )}
                        <span className="text-3xl font-bold text-[#414535]">{plan.price}</span>
                        {plan.duration && (
                          <span className="text-gray-600">{plan.duration}</span>
                        )}
                      </div>
                      {plan.yearlyPrice && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">ou </span>
                          <span className="text-lg font-semibold text-[#414535]">{plan.yearlyPrice}</span>
                          <span className="text-sm bg-[#F4C95D] text-[#414535] px-2 py-1 rounded ml-2">
                            {plan.yearlyDiscount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {feature.included ? (
                            <Check className="w-5 h-5 text-[#F4C95D]" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            feature.included ? 'text-[#414535]' : 'text-gray-400'
                          } ${feature.note ? 'italic' : ''}`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div className="mt-auto">
                    <button
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${plan.ctaStyle}`}
                    >
                      {plan.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#414535] text-center mb-12">
              Questions fréquentes
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-[#414535] mb-2">
                    Comment fonctionne la sélection des recettes ?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Notre algorithme analyse tes préférences alimentaires, ton régime et ton historique pour
                    sélectionner des recettes variées et équilibrées, sans jamais répéter les mêmes plats.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#414535] mb-2">
                    Puis-je annuler mon abonnement facilement ?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Oui, tu peux annuler ton abonnement en 1 clic depuis ton compte,
                    sans frais ni pénalité. L'accès reste actif jusqu'à la fin de la période payée.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#414535] mb-2">
                    Les recettes conviennent-elles aux débutants ?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Absolument ! Nos recettes sont conçues pour tous les niveaux, avec des instructions
                    claires et des astuces adaptées selon ton expérience en cuisine.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-[#414535] mb-2">
                    Que contient exactement un menu ?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Chaque menu contient jusqu'à 7 recettes équilibrées (2 à 4 portions), leurs listes de courses
                    organisées par rayon, et des astuces personnalisées pour optimiser ta préparation.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#414535] mb-2">
                    Les recettes sont-elles adaptées aux régimes spéciaux ?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Oui ! Nous proposons des options pour végétariens, végétaliens, flexitariens,
                    et prenons en compte tes allergies et intolérances alimentaires.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#414535] mb-2">
                    Y a-t-il des frais cachés ?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Aucun frais caché ! Le prix affiché est le prix final.
                    Pas de frais d'inscription, pas de frais de résiliation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-[#414535]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Prêt à éliminer la charge mentale des repas ?
            </h2>
            <p className="text-gray-200 mb-8 max-w-2xl mx-auto">
              Rejoins les femmes actives qui ont déjà simplifié leur quotidien avec Quinoïa.
              Un menu personnalisé t'attend !
            </p>
            <Link
              href="/formulaire"
              className="inline-block bg-[#F4C95D] text-[#414535] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#E5B84A] transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-50 py-8 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex justify-center gap-8 mb-6">
              <Link href="/" className="text-gray-600 hover:text-[#414535] transition-colors">
                Accueil
              </Link>
              <Link href="/tarifs" className="text-gray-600 hover:text-[#414535] transition-colors">
                Tarifs
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-[#414535] transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 Quinoïa. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PricingPage;