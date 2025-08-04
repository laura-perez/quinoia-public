import { useState } from "react"

export default function Step4({ formData, goToPrev }) {
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!agreed) return

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("YOUR_N8N_WEBHOOK_URL", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l’envoi.")
      }

      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError("Une erreur est survenue. Merci de réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

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
            Récap’ : tu vas recevoir chaque semaine un menu équilibré, une liste de courses organisée et des recettes simples à suivre.
          </p>

          {/* Case à cocher */}
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
                agreed
                  ? "bg-[#414535] hover:bg-[#2f3226]"
                  : "bg-[#8A8A8A] cursor-not-allowed"
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
