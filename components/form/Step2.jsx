import { useState } from "react"

export default function Step2({ formData, updateFormData, goToNext, goToPrev }) {
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

  const handleSubmit = () => {
    const newErrors = {}
    if (!formData.regime || formData.regime.trim() === "") {
      newErrors.regime = "Ce champ est requis"
    }
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
          <div className="h-full bg-[#F4C95D] transition-all duration-500" style={{ width: "50%" }} />
        </div>
        <p className="text-sm text-[#8A8A8A] mt-2 text-right">2 sur 4</p>
      </div>

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Tes préférences alimentaires</h2>
      <p className="text-[#8A8A8A] mb-6">Pas besoin d’être stricte – ça me donne juste une idée de ta base alimentaire.</p>

      <div className="space-y-6">
        {/* Régime alimentaire (radio group) */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Quel est ton type d’alimentation ?</label>
          <div className="flex flex-col sm:flex-row gap-3">
            {["Omnivore", "Végétarien", "Vegan", "Flexitarien"].map((option) => (
              <label
                key={option}
                className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium transition
                  ${
                    formData.regime === option
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
              >
                <input
                  type="radio"
                  name="regime"
                  value={option}
                  checked={formData.regime === option}
                  onChange={handleChange}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {errors.regime && <p className="text-sm text-red-500 mt-2">{errors.regime}</p>}
        </div>

        {/* Exclusions alimentaires (checkbox) */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Y a-t-il des aliments que tu ne veux pas qu’on te propose ?</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {["Viande rouge", "Porc", "Poisson", "Produits laitiers", "Gluten", "Œufs"].map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition
                  ${
                    formData.exclusions?.includes(option)
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
              >
                <input
                  type="checkbox"
                  name="exclusions"
                  value={option}
                  checked={formData.exclusions?.includes(option)}
                  onChange={handleCheckbox}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-1">As-tu des allergies ou intolérances ?</label>
          <input
            type="text"
            name="allergies"
            value={formData.allergies || ""}
            onChange={handleChange}
            placeholder="Ex : lactose, noix, gluten..."
            className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
          />
        </div>

        {/* Aliments détestés */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-1">Des aliments que tu détestes ?</label>
          <input
            type="text"
            name="alimentsDetestes"
            value={formData.alimentsDetestes || ""}
            onChange={handleChange}
            placeholder="Ex : brocoli, tofu, lentilles…"
            className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
          />
        </div>
      </div>

      {/* Boutons navigation */}
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
