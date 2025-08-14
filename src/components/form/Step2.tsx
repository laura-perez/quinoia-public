import React, { useState, useEffect } from "react";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import CheckboxGroup from "./form-components/CheckboxGroup";
import TextInput from "./form-components/TextInput";
import type { FormStepProps, FormErrors } from "./types";

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
export default function Step2({ formData, updateFormData, goToNext, goToPrev, email, isLast }: FormStepProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [errors, setErrors] = useState<FormErrors>({});

  // Handle text/radio input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    const newErrors: FormErrors = {};
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
      <ProgressBar step={2} total={4} />

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Tes préférences alimentaires</h2>
      <p className="text-[#8A8A8A] mb-6">
        Raconte moi un peu comment tu manges aujourd’hui, ce que tu veux éviter, et ce que tu veux
        retrouver dans ton assiette.
      </p>

      <div className="space-y-6">
        {/* Diet type radio group */}
        <RadioGroup
          name="diet_type"
          options={DIET_OPTIONS}
          value={formData.diet_type || ""}
          onChange={handleChange}
          error={errors.diet_type as string}
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
        <TextInput
          label="As-tu des allergies ou intolérances ?"
          name="allergies"
          value={formData.allergies || ""}
          onChange={handleChange}
          placeholder="Ex : lactose, noix, gluten..."
        />

        {/* Disliked foods */}
        <TextInput
          label="Des aliments que tu n'aimes pas ?"
          name="disliked_food"
          value={formData.disliked_food || ""}
          onChange={handleChange}
          placeholder="Ex : tofu, lentilles, fenouil…"
        />

        {/* Favorite foods */}
        <TextInput
          label="À l'inverse, des aliments que tu adores ?"
          name="favourite_food"
          value={formData.favourite_food || ""}
          onChange={handleChange}
          placeholder="Ex : tomates, poulet, pâtes…"
        />
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
