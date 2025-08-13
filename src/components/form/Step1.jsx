import { useState, useEffect } from "react";
import RadioGroup from "./form-components/RadioGroup";
import ProgressBar from "./form-components/ProgressBar";
import TextInput from "./form-components/TextInput";

// Initial state for the physical activity group
const INITIAL_PHYSICAL_ACTIVITY = {
  deskJob: null,
  dailySteps: null,
  sessionsPerWeek: null,
  highIntensity: null,
};

const GENDER_OPTIONS = ["Femme", "Homme", "Pas précisé"];

/**
 * Step 1: User profile and physical activity form.
 */
export default function Step1({ formData, updateFormData, goToNext }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [errors, setErrors] = useState({});
  const pa = formData.physicalActivity ?? INITIAL_PHYSICAL_ACTIVITY;

  // Handle text/radio input changes
  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  // Validate all required fields and physical activity group
  const handleSubmit = () => {
    // Use camelCase keys for validation and error reporting
    const requiredFields = ["name", "age", "gender", "height_cm", "weight_kg"];
    const newErrors = {};
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === "") {
        newErrors[field] = "Ce champ est requis";
      }
    }
    // Validate physical activity fields
    const paErrors = {};
    if (pa.deskJob === null) paErrors.deskJob = "Ce champ est requis";
    if (pa.dailySteps === null) paErrors.dailySteps = "Ce champ est requis";
    if (pa.sessionsPerWeek === null) paErrors.sessionsPerWeek = "Ce champ est requis";
    if (Object.keys(paErrors).length > 0) {
      newErrors.physicalActivity = paErrors;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    goToNext();
  };

  return (
    <div>
      <ProgressBar step={1} total={4} />

      <h2 className="text-2xl font-bold text-[#414535] mb-2">Ton profil de base</h2>
      <p className="text-[#8A8A8A] mb-6">
        Pour ajuster les repas à ton corps et ton rythme. Rien de médical, juste du sur-mesure.
      </p>

      <div className="space-y-6">
        <TextInput
          label="Comment t'appelles-tu ?"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Prénom"
        />
        <TextInput
          label="Quel est ton âge ?"
          name="age"
          type="number"
          value={formData.age}
          onChange={handleChange}
          error={errors.age}
          placeholder="Âge"
        />
        <RadioGroup
          name="gender"
          options={GENDER_OPTIONS}
          value={formData.gender}
          onChange={handleChange}
          error={errors.gender}
          label="Quel est ton genre ?"
          optionClassName="flex-1 text-center font-medium"
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <TextInput
            label="Taille (cm)"
            name="height_cm"
            type="number"
            value={formData.height_cm}
            onChange={handleChange}
            error={errors.height_cm}
            placeholder="cm"
          />
          <TextInput
            label="Poids (kg)"
            name="weight_kg"
            type="number"
            value={formData.weight_kg}
            onChange={handleChange}
            error={errors.weight_kg}
            placeholder="kg"
          />
        </div>
        {/* Activité physique */}
        <fieldset className="border border-[#EAEAEA] rounded-lg px-4 py-4 mb-6">
          <legend className="block text-lg font-bold text-[#414535] mb-2">
            Ton activité physique 🏃
          </legend>
          <div className="space-y-6">
            <RadioGroup
              name="deskJob"
              label="Travailles tu assis ?"
              options={["Oui", "Non"]}
              value={pa.deskJob === true ? "Oui" : pa.deskJob === false ? "Non" : ""}
              onChange={(e) => {
                const val =
                  e.target.value === "Oui" ? true : e.target.value === "Non" ? false : null;
                updateFormData({ physicalActivity: { ...pa, deskJob: val } });
              }}
              error={errors?.physicalActivity?.deskJob}
              optionClassName="flex-1 text-center font-medium"
            />
            <RadioGroup
              name="dailySteps"
              label="Combien de pas/jour ?"
              options={["< 5 000", "5 000 – 8 000", "> 8 000"]}
              value={
                pa.dailySteps === "<5k"
                  ? "< 5 000"
                  : pa.dailySteps === "5-8k"
                    ? "5 000 – 8 000"
                    : pa.dailySteps === ">8k"
                      ? "> 8 000"
                      : ""
              }
              onChange={(e) => {
                let val = null;
                if (e.target.value === "< 5 000") val = "<5k";
                else if (e.target.value === "5 000 – 8 000") val = "5-8k";
                else if (e.target.value === "> 8 000") val = ">8k";
                updateFormData({ physicalActivity: { ...pa, dailySteps: val } });
              }}
              error={errors?.physicalActivity?.dailySteps}
              optionClassName="flex-1 text-center font-medium"
            />
            <RadioGroup
              name="sessionsPerWeek"
              label="Combien de séances de sport/semaine ?"
              options={["0", "1-2", "3-4", ">=5"]}
              value={pa.sessionsPerWeek || ""}
              onChange={(e) => {
                updateFormData({ physicalActivity: { ...pa, sessionsPerWeek: e.target.value } });
              }}
              error={errors?.physicalActivity?.sessionsPerWeek}
              optionClassName="flex-1 text-center font-medium"
            />
            {pa.sessionsPerWeek && pa.sessionsPerWeek !== "0" && (
              <RadioGroup
                name="highIntensity"
                label="Séances intenses ? (cardio, HIIT, muscu)"
                options={["Oui", "Non"]}
                value={pa.highIntensity === true ? "Oui" : pa.highIntensity === false ? "Non" : ""}
                onChange={(e) => {
                  const val =
                    e.target.value === "Oui" ? true : e.target.value === "Non" ? false : null;
                  updateFormData({ physicalActivity: { ...pa, highIntensity: val } });
                }}
                optionClassName="flex-1 text-center font-medium"
              />
            )}
          </div>
        </fieldset>
      </div>

      {/* Next button aligned right */}
      <div className="mt-8 flex justify-end">
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
