import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Check, X, Star, Gift, Zap } from 'lucide-react';
import Navbar from '../src/components/ui/Navbar';

interface Feature {
  text: string;
  included: boolean;
  note?: boolean;
  highlight?: boolean; // Pour mettre en avant une feature clé
}

interface Plan {
  id: string;
  name: string;
  price: string;
  duration?: string;
  originalPrice?: string;
  yearlyPrice?: string;
  yearlyDiscount?: string;
  badge: string | null;
  icon: React.ReactNode;
  description: string;
  features: Feature[];
  cta: string;
  ctaStyle: string;
}

const PricingPage = () => {
  const router = useRouter();
  const isFromTrialExpired = router.query.from === 'trial-expired';

  // Base plans configuration
  const allPlans: Plan[] = [
    {
      id: 'essai',
      name: 'Découverte',
      price: 'Gratuit',
      duration: '',
      badge: null,
      icon: <Gift className="w-6 h-6" />,
      description: 'Un avant-goût de Quinoïa pour tester la simplicité',
      features: [
        { text: '1 menu d\'essai par semaine (jusqu\'à 3 recettes)', included: true, highlight: false },
        { text: '1 swap offert (change 1 recette)', included: true, highlight: false },
        { text: 'Liste de courses basique', included: true },
        { text: 'Accès immédiat aux nouvelles recettes', included: false },
        { text: 'Astuces personnalisées chaque semaine', included: false },
        { text: 'Export & partage de la liste de courses', included: false },
        { text: 'Support', included: false }
      ],
      cta: 'Essayer gratuitement',
      ctaStyle: 'border-2 border-[#F4C95D] text-[#414535] hover:bg-[#F4C95D]'
    },
    {
      id: 'mensuel',
      name: 'Premium Mensuel',
      price: '9,90€',
      duration: '/mois',
      badge: 'Recommandé',
      icon: <Zap className="w-6 h-6" />,
      description: 'Tes menus sans charge mentale, chaque semaine.',
      features: [
        { text: 'Menus hebdomadaires illimités', included: true, highlight: true },
        { text: 'Swaps illimités (changes autant que tu veux)', included: true, highlight: true },
        { text: 'Liste de courses interactive, optimisée par rayons, prête pour ton supermarché.', included: true },
        { text: 'Accès anticipé aux nouvelles recettes', included: true },
        { text: 'Astuces personnalisées chaque semaine', included: true },
        { text: 'Export & partage de la listes de courses', included: true },
        { text: 'Support prioritaire', included: true }
      ],
      cta: "S'abonner",
      ctaStyle: 'bg-[#F4C95D] text-[#414535] hover:bg-[#E5B84A]'
    },
    {
      id: 'annuel',
      name: 'Premium Annuel',
      price: '99€',
      duration: '/an',
      originalPrice: '118,80€',
      badge: '3 mois offerts',
      icon: <Star className="w-6 h-6" />,
      description: '3 mois offerts – ton assistant culinaire pour toute l’année.',
      features: [
        { text: 'Menus hebdomadaires illimités', included: true, highlight: true },
        { text: 'Swaps illimités (changes autant que tu veux)', included: true, highlight: true },
        { text: 'Liste de courses interactive, optimisée par rayons, prête pour ton supermarché.', included: true },
        { text: 'Accès anticipé aux nouvelles recettes', included: true },
        { text: 'Astuces personnalisées chaque semaine', included: true },
        { text: 'Export & partage de la listes de courses', included: true },
        { text: 'Support prioritaire', included: true }
      ],
      cta: "S'abonner",
      ctaStyle: 'bg-[#F4C95D] text-[#414535] hover:bg-[#E5B84A]'
    }
  ];

  // Filter plans based on context
  const plans = isFromTrialExpired
    ? allPlans.filter(plan => plan.id !== 'essai') // Remove trial option
    : allPlans;

  return (
    <>
      <Head>
        <title>Tarifs - Quinoïa | Menus personnalisés et listes de courses</title>
        <meta
          name="description"
          content="Découvrez nos tarifs pour des menus équilibrés personnalisés. Essai gratuit, puis abonnement Premium à 9,90€/mois ou 99€/an. Éliminez la charge mentale des repas !"
        />
        <meta name="robots" content="index,follow" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header - Same as landing page */}
        <Navbar />

        {/* Hero Section */}
        <section className="pt-8 md:pt-12 lg:pt-16 pb-8 px-4 bg-[#FDFBF8]">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-extrabold sm:text-5xl text-[#414535] mb-6">
              Éliminez la charge mentale des repas
            </h1>
            <p className="text-lg text-[#8A8A8A] mb-8 max-w-2xl mx-auto">
              Des menus faciles et équilibrés, avec leur liste de courses optimisée.
              <br/>Chaque semaine dans ta boîte mail. 
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2 text-[#414535]">
                <Check className="w-5 h-5 text-[#F4C95D]" />
                <span>Recettes rapides et variées</span>
              </div>
              <div className="flex items-center gap-2 text-[#414535]">
                <Check className="w-5 h-5 text-[#F4C95D]" />
                <span>100% non transformé</span>
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
            <div className={`grid gap-8 max-w-5xl mx-auto ${
              isFromTrialExpired ? 'md:grid-cols-2' : 'md:grid-cols-3'
            }`}>
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
                      <div
                        key={index}
                        className={`flex items-start gap-3 min-h-[3rem] ${
                          feature.highlight && feature.included
                            ? '-mx-2 px-2 py-1 rounded-lg border-2 border-[#F4C95D]'
                            : ''
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {feature.included ? (
                            feature.highlight ? (
                              <Zap className="w-5 h-5 text-[#F4C95D] fill-[#F4C95D]" />
                            ) : (
                              <Check className="w-5 h-5 text-[#F4C95D]" />
                            )
                          ) : (
                            <X className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            feature.included
                              ? 'text-[#414535]'
                              : 'text-gray-400'
                          } ${'note' in feature && feature.note ? 'italic' : ''}`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div className="mt-auto">
                    {plan.id === 'essai' ? (
                      <Link
                        href="/formulaire"
                        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${plan.ctaStyle} block text-center`}
                      >
                        {plan.cta}
                      </Link>
                    ) : (
                      <Link
                        href={`/checkout/${plan.id === 'mensuel' ? 'monthly' : 'yearly'}`}
                        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${plan.ctaStyle} block text-center`}
                      >
                        {plan.cta}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 bg-[#FDFBF8]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-extrabold sm:text-5xl text-[#414535] text-center mb-12">
              Questions fréquentes
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#414535] mb-2">
                    Comment fonctionne la sélection des recettes ?
                  </h3>
                  <p className="text-[#8A8A8A] text-base">
                    Notre algorithme analyse tes préférences alimentaires, ton régime et ton historique pour
                    sélectionner des recettes variées et équilibrées, sans jamais répéter les mêmes plats.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#414535] mb-2">
                    Puis-je annuler mon abonnement facilement ?
                  </h3>
                  <p className="text-[#8A8A8A] text-base">
                    Oui, tu peux annuler ton abonnement en 1 clic depuis ton compte,
                    sans frais ni pénalité. L'accès reste actif jusqu'à la fin de la période payée.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#414535] mb-2">
                    Les recettes conviennent-elles aux débutants ?
                  </h3>
                  <p className="text-[#8A8A8A] text-base">
                    Absolument ! Nos recettes sont conçues pour tous les niveaux, avec des instructions
                    claires et des astuces adaptées selon ton expérience en cuisine.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#414535] mb-2">
                    Que contient exactement un menu ?
                  </h3>
                  <p className="text-[#8A8A8A] text-base">
                    Chaque menu contient jusqu'à 7 recettes équilibrées (2 à 4 portions), leurs listes de courses
                    organisées par rayon, et des astuces personnalisées pour optimiser ta préparation.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#414535] mb-2">
                    Les recettes sont-elles adaptées aux régimes spéciaux ?
                  </h3>
                  <p className="text-[#8A8A8A] text-base">
                    Oui ! Nous proposons des options pour végétariens, végétaliens, flexitariens,
                    et prenons en compte tes allergies et intolérances alimentaires.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#414535] mb-2">
                    Y a-t-il des frais cachés ?
                  </h3>
                  <p className="text-[#8A8A8A] text-base">
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
            <h2 className="text-4xl font-extrabold sm:text-5xl text-white mb-6">
              Prêt à bien manger, sans y penser ?
            </h2>
            <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
              Rejoins les personnes actives qui ont déjà simplifié leur quotidien avec Quinoïa.
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
              <Link href="mailto:hello@quinoia.fr" className="hover:underline">
                Contact : hello@quinoia.fr
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