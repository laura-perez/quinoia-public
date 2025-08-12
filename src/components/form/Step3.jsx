
// Step 3: Cooking habits and kitchen equipment
import { useState, useEffect } from "react";
import RadioGroup from "./form-components/RadioGroup";
import CheckboxGroup from "./form-components/CheckboxGroup";
import ToggleSwitch from "./form-components/ToggleSwitch";

// Cooking level options
const COOKING_LEVELS = [
  "Débutant·e : Je veux juste que ce soit simple et rapide",
  "Intermédiaire : Je suis à l’aise, mais pas un chef non plus",
  "Confirmé·e : Cuisiner, c’est mon terrain de jeu",
];

// Equipment options
const EQUIPMENT_OPTIONS = ["Four", "Mixeur/Blender", "Thermomix", "Air Fryer"];

// Recipe and portion count options
const RECIPE_COUNTS = [2, 3, 4, 5, 6, 7];
const PORTION_COUNTS = [1, 2, 3, "4+"];


export default function Step3({ formData, updateFormData, goToNext, goToPrev }) {
  const [errors, setErrors] = useState({});
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Handle text and radio input changes
  const handleInputChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  // Handle checkbox group changes (for arrays)
  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    const current = formData[name] || [];
    const updated = checked ? [...current, value] : current.filter((v) => v !== value);
    updateFormData({ [name]: updated });
  };

  // Handle toggle switches (boolean values)
  const handleToggleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.checked });
  };

  // Validate required fields and proceed to next step if valid
  const handleSubmit = () => {
    const requiredFields = ["cooking_level", "nbRecipes", "nbPortions"];
    const newErrors = {};
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === "") {
        newErrors[field] = "Ce champ est requis";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    goToNext();
  };

  // Main render
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
        {/* Cooking level radio group */}
        <RadioGroup
          name="cooking_level"
          options={COOKING_LEVELS}
          value={formData.cooking_level || ""}
          onChange={handleInputChange}
          error={errors.cooking_level}
          label="Quel est ton niveau en cuisine ?"
        />

        {/* Equipment checkbox group */}
        <CheckboxGroup
          name="equipment"
          options={EQUIPMENT_OPTIONS}
          values={formData.equipment || []}
          onChange={handleCheckboxChange}
          label="Quels équipements de cuisine as-tu ?"
        />

        {/* Number of recipes radio group */}
        <RadioGroup
          name="nbRecipes"
          options={RECIPE_COUNTS}
          value={formData.nbRecipes || ""}
          onChange={handleInputChange}
          error={errors.nbRecipes}
          label="Combien de recettes veux tu cette semaine ?"
        />

        {/* Number of portions radio group */}
        <RadioGroup
          name="nbPortions"
          options={PORTION_COUNTS}
          value={formData.nbPortions || ""}
          onChange={handleInputChange}
          error={errors.nbPortions}
          label="Combien de portions par recette ?"
        />

        {/* Batch cooking radio group */}
        <RadioGroup
          name="batch"
          label="Souhaites-tu recevoir des conseils en batch cooking ?"
          options={["Oui", "Non"]}
          value={formData.batch === true ? "Oui" : formData.batch === false ? "Non" : ""}
          onChange={e => {
            const val = e.target.value === "Oui" ? true : e.target.value === "Non" ? false : null;
            updateFormData({ batch: val });
          }}
          optionClassName="flex-1 text-center font-medium"
        />
        <div className="text-xs text-[#8A8A8A] mt-1">
          💡 Le batch cooking, c’est une méthode pour s'organiser en avance, cuisiner plusieurs plats d’un coup, puis assembler ou réchauffer facilement la semaine.
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


