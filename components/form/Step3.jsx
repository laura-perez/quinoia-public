import { useState } from "react"

export default function Step3({ formData, updateFormData, goToNext, goToPrev }) {
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value })
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  const handleSubmit = () => {
    const requiredFields = ["cuisine", "nbPersonnes", "frequenceRepas"]
    const newErrors = {}
    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].trim() === "") {
        newErrors[field] = "Ce champ est requis"
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
    } else {
      goToNext()
    }
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
          <div className="h-full bg-[#F4C95D] transition-all duration-500" style={{ width: "75%" }} />
        </div>
        <p className="text-sm text-[#8A8A8A] mt-2 text-right">3 sur 4</p>
      </div>

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Ton quotidien en cuisine</h2>
      <p className="text-[#8A8A8A] mb-6">
        Ici, pas de jugement – je veux juste m’adapter à ta réalité : ton emploi du temps, ton niveau, ton style de vie.
      </p>

      <div className="space-y-6">
        {/* Niveau en cuisine */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Quel est ton niveau en cuisine ?</label>
          <div className="flex flex-col gap-3">
            {[
              "Débutant·e : Je fais ce que je peux",
              "Intermédiaire : J’aime bien cuisiner quand j’ai le temps",
              "Confirmé·e : Cuisiner, c’est mon terrain de jeu",
            ].map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition
                  ${
                    formData.cuisine === option
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
              >
                <input
                  type="radio"
                  name="cuisine"
                  value={option}
                  checked={formData.cuisine === option}
                  onChange={handleChange}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {errors.cuisine && <p className="text-sm text-red-500 mt-2">{errors.cuisine}</p>}
        </div>

        {/* Nombre de personnes à table */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Combien de personnes à table au quotidien ?</label>
          <div className="flex flex-col sm:flex-row gap-3">
            {["1", "2", "3 ou +"].map((option) => (
              <label
                key={option}
                className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium transition
                  ${
                    formData.nbPersonnes === option
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
              >
                <input
                  type="radio"
                  name="nbPersonnes"
                  value={option}
                  checked={formData.nbPersonnes === option}
                  onChange={handleChange}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {errors.nbPersonnes && <p className="text-sm text-red-500 mt-2">{errors.nbPersonnes}</p>}
        </div>

        {/* Fréquence repas maison */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Combien de repas fais-tu chez toi en semaine ?</label>
          <div className="flex flex-col gap-3">
            {[
              "Moins de 4 repas maison/semaine",
              "4 à 7 repas maison/semaine",
              "8 à 10 repas maison/semaine",
              "11 repas ou plus / semaine",
            ].map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition
                  ${
                    formData.frequenceRepas === option
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
              >
                <input
                  type="radio"
                  name="frequenceRepas"
                  value={option}
                  checked={formData.frequenceRepas === option}
                  onChange={handleChange}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {errors.frequenceRepas && <p className="text-sm text-red-500 mt-2">{errors.frequenceRepas}</p>}
        </div>
      </div>

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
          className="bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition"
        >
          Étape suivante
        </button>
      </div>
    </div>
  )
}
