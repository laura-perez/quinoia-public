import { useState } from "react"

export default function Step4({ formData, updateFormData, goToPrev }) {
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [goal, setGoal] = useState(formData.goal || "")
  const [note, setNote] = useState(formData.note || "")
  const [email, setEmail] = useState(formData.email || "")

  const handleSubmit = async () => {
    if (!agreed) return
    if (!email) {
      setError("Merci de renseigner ton adresse email.");
      return;
    }

    setIsSubmitting(true)
    setError("")

    try {
      const token = await grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: "submit_form" })

      // Ensure latest physicalActivity is included
      const body = JSON.stringify({
        ...formData,
        physicalActivity: formData.physicalActivity,
        email,
        recaptchaToken: token,
        goal,
        note,
        consent: agreed,
      })
      
      const response = await fetch("https://your-n8n-instance.example/webhook/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })

      if (!response.ok) throw new Error("Erreur lors de l’envoi.")

      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError("Une erreur est survenue. Merci de réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const goals = [
    "Manger plus sainement",
    "Gagner du temps",
    "Manger plus de protéines",
    "Perdre du poids",
    "Prendre du poids de manière saine",
  ]

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
            <label className="block text-sm font-medium text-[#414535] mb-2">Quel est ton objectif principal avec ce menu ?</label>
            <div className="flex flex-col gap-3">
              {goals.map((opt) => (
                <label
                  key={opt}
                  className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition ${
                    goal === opt
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={opt}
                    checked={goal === opt}
                    onChange={(e) => setGoal(e.target.value)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Message libre */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#414535] mb-1">Autre chose que tu souhaites ajouter ?</label>
            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Ex : j'aime le régime méditerranéen, anti-inflammatoire etc."
              className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#414535] mb-2">Ton adresse email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="exemple@email.com"
              className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
            />
          </div>

          {/* consent */}
          <label className="flex items-start space-x-2 text-sm text-[#414535] mb-6">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 rounded border-[#EAEAEA] text-[#414535] focus:ring-[#B7D3C6]"
            />
            <span>
              J’accepte que mes données soient utilisées pour générer mon menu personnalisé. Elles ne seront jamais partagées.
            </span>
          </label>

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

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
