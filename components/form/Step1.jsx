import { useState } from "react"

export default function Step1({ formData, updateFormData, goToNext }) {
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value })
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  const handleSubmit = () => {
    const requiredFields = ["name", "age", "gender", "height_cm", "weight_kg", "exercise_level"]
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
          <div className="h-full bg-[#F4C95D] transition-all duration-500" style={{ width: "25%" }} />
        </div>
        <p className="text-sm text-[#8A8A8A] mt-2 text-right">1 sur 4</p>
      </div>

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Ton profil de base</h2>
      <p className="text-[#8A8A8A] mb-6">
        Ces infos me permettent d’adapter les portions et les repas à ton corps et ton rythme de vie.<br />
        Rien de médical ici, juste de quoi te proposer un menu qui te correspond vraiment.
      </p>

      <div className="space-y-6">
        {/* Prénom */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-1">Comment t'appelles-tu ?</label>
          <input
            type="text"
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
            placeholder="Prénom"
          />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Âge */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-1">Quel est ton âge ?</label>
          <input
            type="number"
            name="age"
            value={formData.age || ""}
            onChange={handleChange}
            className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
            placeholder="Âge"
          />
          {errors.age && <p className="text-sm text-red-500 mt-1">{errors.age}</p>}
        </div>

        {/* Genre (Radio Group) */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Quel est ton genre ?</label>
          <div className="flex flex-col sm:flex-row gap-3">
            {["Femme", "Homme", "Pas précisé"].map((option) => (
              <label
                key={option}
                className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium transition
                  ${
                    formData.gender === option
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={option}
                  checked={formData.gender === option}
                  onChange={handleChange}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {errors.gender && <p className="text-sm text-red-500 mt-2">{errors.gender}</p>}
        </div>

        {/* Taille + Poids */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#414535] mb-1">Taille (cm)</label>
            <input
              type="number"
              name="height_cm"
              value={formData.height_cm || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
              placeholder="cm"
            />
            {errors.height_cm && <p className="text-sm text-red-500 mt-1">{errors.height_cm}</p>}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#414535] mb-1">Poids (kg)</label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
              placeholder="kg"
            />
            {errors.weight_kg && <p className="text-sm text-red-500 mt-1">{errors.weight_kg}</p>}
          </div>
        </div>

        {/* Activité physique (Radio Group) */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-2">Niveau d’activité physique</label>
          <div className="flex flex-col gap-3">
            {[
              "Faible (travail de bureau, peu de sport)",
              "Modéré (1-2 séances de sport/semaine)",
              "Élevé (3 séances ou plus/semaine)",
            ].map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition
                  ${
                    formData.exercise_level === option
                      ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                      : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
                  }`}
              >
                <input
                  type="radio"
                  name="exercise_level"
                  value={option}
                  checked={formData.exercise_level === option}
                  onChange={handleChange}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {errors.exercise_level && <p className="text-sm text-red-500 mt-2">{errors.exercise_level}</p>}
        </div>
      </div>

      {/* Bouton suivant */}
      <button
        onClick={handleSubmit}
        className="mt-8 bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition"
      >
        Étape suivante
      </button>
    </div>
  )
}
