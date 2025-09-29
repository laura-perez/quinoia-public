import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../src/components/ui/Navbar';

interface FormData {
  galeres: string[];
  autreGalere: string;
  solutionsActuelles: 'oui' | 'non' | '';
  solutionActuelleName: string;
  valeurPercue: 'oui' | 'non' | 'peut-etre' | '';
  prixAcceptable: '<5' | '5-10' | '10-20' | '>20' | '';
  veutTester: 'oui' | 'non' | '';
  email: string;
}

interface FormErrors {
  email?: string;
  autreGalere?: string;
}

const MarketStudyPage = () => {
  const [formData, setFormData] = useState<FormData>({
    galeres: [],
    autreGalere: '',
    solutionsActuelles: '',
    solutionActuelleName: '',
    valeurPercue: '',
    prixAcceptable: '',
    veutTester: '',
    email: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Options pour les galères
  const galeresOptions = [
    'Trouver des idées variées',
    'Gérer l\'organisation / la charge mentale',
    'Manger équilibré',
    'Faire des courses efficaces',
    'Le coût des repas',
    'Autre'
  ];

  // Gestion des galères (choix multiple max 2)
  const handleGaleresChange = useCallback((option: string) => {
    setFormData(prev => {
      const newGaleres = prev.galeres.includes(option)
        ? prev.galeres.filter(g => g !== option)
        : prev.galeres.length < 2
          ? [...prev.galeres, option]
          : prev.galeres;

      // Reset autreGalere si on désélectionne "Autre"
      const newAutreGalere = option === 'Autre' && !newGaleres.includes('Autre')
        ? ''
        : prev.autreGalere;

      return { ...prev, galeres: newGaleres, autreGalere: newAutreGalere };
    });
  }, []);

  // Gestion des changements de champs
  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validation email si l'utilisateur veut tester
    if (formData.veutTester === 'oui') {
      const emailTrimmed = formData.email.trim().toLowerCase();
      if (!emailTrimmed) {
        newErrors.email = 'Email requis pour le test gratuit';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        newErrors.email = 'Format d\'email invalide';
      }
    }

    // Validation "Autre" si sélectionné
    if (formData.galeres.includes('Autre')) {
      if (!formData.autreGalere.trim()) {
        newErrors.autreGalere = 'Précisez votre galère';
      } else if (formData.autreGalere.length > 120) {
        newErrors.autreGalere = 'Maximum 120 caractères';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Vérification si le formulaire peut être soumis
  const canSubmit = useCallback((): boolean => {
    return (
      formData.solutionsActuelles !== '' &&
      formData.valeurPercue !== '' &&
      formData.prixAcceptable !== '' &&
      formData.veutTester !== '' &&
      (formData.veutTester === 'non' || formData.email.trim() !== '')
    );
  }, [formData]);

  // Soumission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !canSubmit()) return;

    setIsSubmitting(true);

    try {
      // Construire les données en omettant l'email si l'utilisateur ne veut pas tester
      const submissionData: any = {
        galeres: formData.galeres,
        autreGalere: formData.autreGalere,
        solutionsActuelles: formData.solutionsActuelles,
        solutionActuelleName: formData.solutionActuelleName,
        valeurPercue: formData.valeurPercue,
        prixAcceptable: formData.prixAcceptable,
        veutTester: formData.veutTester
      };

      // N'ajouter l'email que si l'utilisateur veut tester ET qu'il a fourni un email
      if (formData.veutTester === 'oui' && formData.email.trim()) {
        submissionData.email = formData.email.trim().toLowerCase();
      }

      const response = await fetch('/api/market-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la soumission');
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Erreur soumission:', error);
      // En cas d'erreur, on considère quand même comme réussi pour l'UX
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, canSubmit]);

  if (submitted) {
    return (
      <>
        <Head>
          <title>Merci - Étude rapide Quinoïa</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>

        <div className="min-h-screen bg-[#FDFBF8]">
          <Navbar />

          <main className="pt-8 md:pt-12 lg:pt-16 pb-16 px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl font-extrabold sm:text-5xl text-[#414535] mb-6">
                Merci pour vos réponses ! 🙏
              </h1>
              <p className="text-lg text-[#8A8A8A] mb-8">
                Découvrez le projet derrière cette étude
              </p>
              <Link
                href="/"
                className="inline-block bg-[#F4C95D] text-[#414535] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#E5B84A] transition-colors"
              >
                Découvrir Quinoïa
              </Link>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Étude rapide : 1 minute, 5 questions</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen bg-[#FDFBF8]">
        <Navbar />

        <main className="pt-8 md:pt-12 lg:pt-16 pb-16 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold sm:text-5xl text-[#414535] mb-4">
                Étude rapide : 1 minute, 5 questions
              </h1>
              <p className="text-lg text-[#8A8A8A]">
                Quinoïa est en bêta-test. Vos réponses anonymes clarifient les problèmes réels et nous aident à ajuster nos fonctionnalités et notre positionnement pour cibler la charge mentale des repas. Merci 🙏
              </p>
            </div>

            {/* Formulaire */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <form onSubmit={handleSubmit} className="space-y-8">

                {/* Q1 - Galères */}
                <div>
                  <label className="block text-lg font-bold text-[#414535] mb-4">
                    Quand il s'agit des repas du quotidien, qu'est-ce qui vous pèse le plus ?
                  </label>
                  <div className="space-y-3">
                    {galeresOptions.map((option) => (
                      <label key={option} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.galeres.includes(option)}
                          onChange={() => handleGaleresChange(option)}
                          className="mt-1 w-4 h-4 text-[#F4C95D] border-gray-300 rounded focus:ring-[#F4C95D] focus:ring-2"
                          disabled={!formData.galeres.includes(option) && formData.galeres.length >= 2}
                        />
                        <span className="text-[#414535] group-hover:text-[#2f3226] transition-colors">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Compteur */}
                  <p className="text-sm text-[#8A8A8A] mt-2">
                    {formData.galeres.length}/2 sélectionnés
                    {formData.galeres.length === 0 && (
                      <span className="text-[#F4C95D] ml-2">Vous pouvez en choisir jusqu'à 2.</span>
                    )}
                  </p>

                  {/* Champ "Autre" conditionnel */}
                  {formData.galeres.includes('Autre') && (
                    <div className="mt-4">
                      <input
                        type="text"
                        placeholder="Précisez votre galère..."
                        value={formData.autreGalere}
                        onChange={(e) => handleChange('autreGalere', e.target.value)}
                        maxLength={120}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F4C95D] focus:border-[#F4C95D]"
                      />
                      <div className="flex justify-between text-sm mt-1">
                        {errors.autreGalere && (
                          <span className="text-red-500">{errors.autreGalere}</span>
                        )}
                        <span className="text-[#8A8A8A] ml-auto">
                          {formData.autreGalere.length}/120
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Q2 - Solutions actuelles */}
                <div>
                  <label className="block text-lg font-bold text-[#414535] mb-4">
                    Utilisez-vous déjà une application ou un service pour planifier vos repas ou vos courses ?
                  </label>
                  <div className="space-y-3">
                    {['oui', 'non'].map((option) => (
                      <label key={option} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="solutionsActuelles"
                          value={option}
                          checked={formData.solutionsActuelles === option}
                          onChange={(e) => handleChange('solutionsActuelles', e.target.value)}
                          className="w-4 h-4 text-[#F4C95D] border-gray-300 focus:ring-[#F4C95D] focus:ring-2"
                        />
                        <span className="text-[#414535] capitalize">{option}</span>
                      </label>
                    ))}
                  </div>

                  {/* Champ conditionnel si "Oui" */}
                  {formData.solutionsActuelles === 'oui' && (
                    <div className="mt-4">
                      <input
                        type="text"
                        placeholder="Nom de l'app/service"
                        value={formData.solutionActuelleName}
                        onChange={(e) => handleChange('solutionActuelleName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F4C95D] focus:border-[#F4C95D]"
                      />
                    </div>
                  )}
                </div>

                {/* Q3 - Valeur perçue */}
                <div>
                  <label className="block text-lg font-bold text-[#414535] mb-4">
                    Si une solution réglait vos principales galères repas, seriez-vous prêt·e à payer ?
                  </label>
                  <div className="space-y-3">
                    {[
                      { value: 'oui', label: 'Oui' },
                      { value: 'non', label: 'Non' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="valeurPercue"
                          value={option.value}
                          checked={formData.valeurPercue === option.value}
                          onChange={(e) => handleChange('valeurPercue', e.target.value)}
                          className="w-4 h-4 text-[#F4C95D] border-gray-300 focus:ring-[#F4C95D] focus:ring-2"
                        />
                        <span className="text-[#414535]">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Q4 - Prix acceptable */}
                <div>
                  <label className="block text-lg font-bold text-[#414535] mb-4">
                    Quel prix par mois vous semblerait raisonnable ?
                  </label>
                  <div className="space-y-3">
                    {[
                      { value: '<5', label: '< 5 €' },
                      { value: '5-10', label: '5–10 €' },
                      { value: '10-20', label: '10–20 €' },
                      { value: '>20', label: '> 20 €' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="prixAcceptable"
                          value={option.value}
                          checked={formData.prixAcceptable === option.value}
                          onChange={(e) => handleChange('prixAcceptable', e.target.value)}
                          className="w-4 h-4 text-[#F4C95D] border-gray-300 focus:ring-[#F4C95D] focus:ring-2"
                        />
                        <span className="text-[#414535]">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Q5 - Contact & bêta-test */}
                <div>
                  <label className="block text-lg font-bold text-[#414535] mb-4">
                    Voulez-vous être recontacté·e pour tester gratuitement Quinoïa (1 mois offert) ?
                  </label>
                  <div className="space-y-3">
                    {[
                      { value: 'oui', label: 'Oui, je veux tester' },
                      { value: 'non', label: 'Non merci' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="veutTester"
                          value={option.value}
                          checked={formData.veutTester === option.value}
                          onChange={(e) => handleChange('veutTester', e.target.value)}
                          className="w-4 h-4 text-[#F4C95D] border-gray-300 focus:ring-[#F4C95D] focus:ring-2"
                        />
                        <span className="text-[#414535]">{option.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Champ email conditionnel */}
                  {formData.veutTester === 'oui' && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-[#414535] mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        placeholder="votre@email.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F4C95D] focus:border-[#F4C95D]"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bouton de soumission */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={!canSubmit() || isSubmitting}
                    className={`w-full py-4 px-8 rounded-lg font-semibold text-lg transition-all ${
                      canSubmit() && !isSubmitting
                        ? 'bg-[#F4C95D] text-[#414535] hover:bg-[#E5B84A]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 py-8 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm text-[#8A8A8A]">
              Vos réponses restent anonymes. Email collecté uniquement si vous souhaitez être recontacté·e.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MarketStudyPage;