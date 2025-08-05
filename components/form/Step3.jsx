import { useState } from "react"

export default function Step3({ formData, updateFormData, goToNext, goToPrev }) {
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value })
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  const handleCheckbox = (e) => {
    const { name, value, checked } = e.target
    const current = formData[name] || []
    const updated = checked ? [...current, value] : current.filter((v) => v !== value)
    updateFormData({ [name]: updated })
  }

  const handleToggle = (e) => {
    updateFormData({ [e.target.name]: e.target.checked })
  }

  const handleSubmit = () => {
    const requiredFields = ["cuisine", "nbRecettes", "nbPortions"]
    const newErrors = {}
    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].toString().trim() === "") {
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
              "Débutant·e : Je veux juste que ce soit simple et rapide",
              "Intermédiaire : Je suis à l’aise, mais pas un chef non plus",
              "Confirmé·e : Cuisiner, c’est mon terrain de jeu",
            ].map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition ${
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

        {/* Équipements */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Quels équipements de cuisine as-tu ?</label>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            {["Four", "Mixeur/Blender", "Thermomix", "Air Fryer"].map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
                  formData.equipment?.includes(option)
                    ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                    : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                }`}
              >
                <input
                  type="checkbox"
                  name="equipment"
                  value={option}
                  checked={formData.equipment?.includes(option)}
                  onChange={handleCheckbox}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        {/* Nombre de recettes */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Combien de recettes veux tu cette semaine ?</label>
          <div className="flex flex-wrap gap-3">
            {[2, 3, 4, 5, 6, 7].map((num) => (
              <label
                key={num}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
                  formData.nbRecettes === String(num)
                    ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                    : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                }`}
              >
                <input
                  type="radio"
                  name="nbRecettes"
                  value={num}
                  checked={formData.nbRecettes === String(num)}
                  onChange={handleChange}
                  className="sr-only"
                />
                {num}
              </label>
            ))}
          </div>
          {errors.nbRecettes && <p className="text-sm text-red-500 mt-2">{errors.nbRecettes}</p>}
        </div>

        {/* Nombre de portions */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Combien de portions par recette ?</label>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, "4+"].map((num) => (
              <label
                key={num}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
                  formData.nbPortions === String(num)
                    ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                    : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                }`}
              >
                <input
                  type="radio"
                  name="nbPortions"
                  value={num}
                  checked={formData.nbPortions === String(num)}
                  onChange={handleChange}
                  className="sr-only"
                />
                {num}
              </label>
            ))}
          </div>
          {errors.nbPortions && <p className="text-sm text-red-500 mt-2">{errors.nbPortions}</p>}
        </div>

        {/* Toggle batch cooking */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-[#414535]">Souhaites-tu recevoir des conseils en batch cooking ?</label>
            <input
              type="checkbox"
              name="batch"
              checked={formData.batch || false}
              onChange={handleToggle}
              className="w-10 h-5 bg-[#EAEAEA] border-2 border-[#EAEAEA] rounded-full appearance-none cursor-pointer checked:bg-[#F4C95D] relative transition"
            />
          </div>
          <p className="text-xs text-[#8A8A8A] mt-1">
            💡 Le batch cooking, c’est une méthode pour s'organiser en avance, cuisiner plusieurs plats d’un coup, puis assembler ou réchauffer facilement la semaine.
          </p>
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
