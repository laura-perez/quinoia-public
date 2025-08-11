
import { useState } from "react";
import RadioGroup from "./form-components/RadioGroup";
import CheckboxGroup from "./form-components/CheckboxGroup";

const DIET_OPTIONS = ["Omnivore", "Flexitarien", "Végétarien", "Vegan"];
const PROTEIN_OPTIONS = [
  "Boeuf",
  "Volaille",
  "Poisson",
  "Œufs",
  "Fromages, Produits laitiers",
  "Tofu",
  "Légumineuses (Pois chiches, lentilles ..)",
  "Simili-viandes (Heura, LaVie etc ..)",
];

/**
 * Step 2: Dietary preferences and restrictions.
 */
export default function Step2({ formData, updateFormData, goToNext, goToPrev }) {
  const [errors, setErrors] = useState({});

  // Handle text/radio input changes
  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  // Handle checkbox group changes
  const handleCheckbox = (e) => {
    const { name, value, checked } = e.target;
    const current = formData[name] || [];
    const updated = checked ? [...current, value] : current.filter((v) => v !== value);
    updateFormData({ [name]: updated });
  };

  // Validate required fields
  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.diet_type || formData.diet_type.trim() === "") {
      newErrors.diet_type = "Ce champ est requis";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    goToNext();
  };

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
      <p className="text-[#8A8A8A] mb-6">Raconte moi un peu comment tu manges aujourd’hui, ce que tu veux éviter, et ce que tu veux retrouver dans ton assiette.</p>

      <div className="space-y-6">
        {/* Diet type radio group */}
        <RadioGroup
          name="diet_type"
          options={DIET_OPTIONS}
          value={formData.diet_type || ""}
          onChange={handleChange}
          error={errors.diet_type}
          label="Quel est ton type d’alimentation ?"
          optionClassName="flex-1 text-center font-medium"
        />

        {/* Protein preferences checkbox group */}
        <CheckboxGroup
          name="protein_preference"
          options={PROTEIN_OPTIONS}
          values={formData.protein_preference || []}
          onChange={handleCheckbox}
          label="Quels types de protéines aimes-tu consommer ?"
        />

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-1" htmlFor="allergies">As-tu des allergies ou intolérances ?</label>
          <input
            id="allergies"
            type="text"
            name="allergies"
            value={formData.allergies || ""}
            onChange={handleChange}
            placeholder="Ex : lactose, noix, gluten..."
            className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
          />
        </div>

        {/* Disliked foods */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-1" htmlFor="disliked_food">Des aliments que tu n'aimes pas ?</label>
          <input
            id="disliked_food"
            type="text"
            name="disliked_food"
            value={formData.disliked_food || ""}
            onChange={handleChange}
            placeholder="Ex : tofu, lentilles, fenouil…"
            className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
          />
        </div>

        {/* Favorite foods */}
        <div>
          <label className="block text-sm font-medium text-[#414535] mb-1" htmlFor="favourite_food">À l'inverse, des aliments que tu adores ?</label>
          <input
            id="favourite_food"
            type="text"
            name="favourite_food"
            value={formData.favourite_food || ""}
            onChange={handleChange}
            placeholder="Ex : tomates, poulet, pâtes…"
            className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={goToPrev}
          className="bg-white border border-[#414535] text-[#414535] px-6 py-3 rounded-md font-medium hover:bg-[#FDFBF8] transition"
          type="button"
        >
          Retour
        </button>
        <button
          onClick={handleSubmit}
          className="bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition"
          type="button"
        >
          Étape suivante
        </button>
      </div>
    </div>
  );
}
