import { useState } from "react"

/**
 * Types for formData
 */
/**
 * @typedef {"saveTime" | "eatHealthier" | "weightLoss"} PrimaryGoal
 * @typedef {"highProtein" | null} SecondaryFocus
 */
import RadioGroup from "./form-components/RadioGroup";
import ToggleSwitch from "./form-components/ToggleSwitch";
import TextInput from "./form-components/TextInput"
import TextArea from "./form-components/TextArea"
import FormError from "./form-components/FormError"
import ConsentCheckbox from "./form-components/ConsentCheckbox"

export default function Step4({ formData, updateFormData, goToPrev }) {
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
    const [errors, setErrors] = useState({});
  // Remove goal state, use formData.primaryGoal
  const [note, setNote] = useState(formData.note || "")
  const [email, setEmail] = useState(formData.email || "")

  const handleSubmit = async () => {
      // Validate required fields
      const newErrors = {};
      if (!formData.primaryGoal || formData.primaryGoal === "") {
        newErrors.primaryGoal = "Merci de sélectionner un objectif principal.";
      }
      if (!agreed) {
        newErrors.consent = "Merci d'accepter l'utilisation de tes données.";
      }
      if (!email) {
        setError("Merci de renseigner ton adresse email.");
        setErrors(newErrors);
        return;
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    if (!email) {
      setError("Merci de renseigner ton adresse email.");
      return;
    }

    // Log form data in development only
    if (process.env.NODE_ENV === "development") {
      console.log("Form data submitted:", {
        ...formData,
        physicalActivity: formData.physicalActivity,
        email,
        primaryGoal: formData.primaryGoal,
        note,
        consent: agreed,
      });
    }

    setIsSubmitting(true);
    setError("");
      setErrors({});

    try {
      const token = await grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: "submit_form" });

      // Ensure latest physicalActivity is included
      const body = JSON.stringify({
        ...formData,
        physicalActivity: formData.physicalActivity,
        email,
        recaptchaToken: token,
        primaryGoal: formData.primaryGoal,
        note,
        consent: agreed,
      });

      const response = await fetch("https://your-n8n-instance.example/webhook/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) throw new Error("Erreur lors de l’envoi.");

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const PRIMARY_GOAL_OPTIONS = [
    { label: "Gagner du temps", value: "saveTime" },
    { label: "Manger plus sainement", value: "eatHealthier" },
    { label: "Perdre du poids", value: "weightLoss" },
  ];
  const PRIMARY_GOAL_VALUES = PRIMARY_GOAL_OPTIONS.map(opt => opt.value);

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
          <div className="h-full bg-[#F4C95D] transition-all duration-500" style={{ width: "100%" }} />
        </div>
        <p className="text-sm text-[#8A8A8A] mt-2 text-right">4 sur 4</p>
      </div>

      {submitted ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#414535] mb-4">C’est envoyé 🎉</h2>
          <p className="text-[#8A8A8A] max-w-md mx-auto">
            Merci ! Tu vas recevoir très bientôt ton menu personnalisé directement dans ta boîte mail.
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-[#414535] mb-2">Tu es à 2 doigts de recevoir ton menu personnalisé ✨</h2>
          <p className="text-[#8A8A8A] mb-6">
            Dernière question avant de générer ton menu. Merci pour ta confiance !
          </p>

          {/* Objectif principal */}
          <div className="mb-6">
            <RadioGroup
              name="primaryGoal"
              options={PRIMARY_GOAL_VALUES}
              value={formData.primaryGoal || ""}
              onChange={e => updateFormData({ primaryGoal: e.target.value })}
              error={errors && errors.primaryGoal}
              label="Quel est ton objectif principal avec ce menu ?"
              helpText="Utilisé pour calculer la cible calorique et la tolérance."
              optionClassName="text-sm"
              renderOptionLabel={val => PRIMARY_GOAL_OPTIONS.find(opt => opt.value === val)?.label || val}
            />
            <div className="mt-4">
              <ToggleSwitch
                name="secondaryFocus"
                checked={formData.secondaryFocus === "highProtein"}
                onChange={e => updateFormData({ secondaryFocus: e.target.checked ? "highProtein" : null })}
                label="Je souhaite prioriser les protéines"
              />
            </div>
          </div>


          {/* Message libre */}
          <div className="mb-6">
            <TextArea
              label="Autre chose que tu souhaites ajouter ?"
              name="note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex : j'aime le régime méditerranéen, anti-inflammatoire etc."
            />
          </div>

          <div className="mb-6">
            <TextInput
              label="Ton adresse email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e)}
              required
              placeholder="exemple@email.com"
            />
          </div>

          {/* consent */}
          <ConsentCheckbox
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            label="J’accepte que mes données soient utilisées pour générer mon menu personnalisé. Elles ne seront jamais partagées."
          />

          <FormError error={error} />

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={goToPrev}
              className="bg-white border border-[#414535] text-[#414535] px-6 py-3 rounded-md font-medium hover:bg-[#FDFBF8] transition"
            >
              Retour
            </button>
            <button
              onClick={handleSubmit}
              disabled={!agreed || isSubmitting}
              className={`px-6 py-3 rounded-md font-semibold transition text-white ${
                agreed ? "bg-[#414535] hover:bg-[#2f3226]" : "bg-[#8A8A8A] cursor-not-allowed"
              }`}
            >
              {isSubmitting ? "Envoi en cours…" : "C’est parti !"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
