

import { useState } from "react";
import RadioGroup from "./form-components/RadioGroup";
import PhysicalActivityRadioGroup from "./form-components/PhysicalActivityRadioGroup";
import HighIntensityToggle from "./form-components/HighIntensityToggle";

// Initial state for the physical activity group
const INITIAL_PHYSICAL_ACTIVITY = {
  deskJob: null,
  dailySteps: null,
  sessionsPerWeek: null,
  highIntensity: null,
};

const GENDER_OPTIONS = ["Femme", "Homme", "Pas précisé"];

/**
 * Controlled text input with label and error display.
 */
function TextInput({ label, name, type = "text", value, onChange, error, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#414535] mb-1" htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <p id={`${name}-error`} className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}


/**
 * Step 1: User profile and physical activity form.
 */
export default function Step1({ formData, updateFormData, goToNext }) {
  const [errors, setErrors] = useState({});
  const pa = formData.physicalActivity ?? INITIAL_PHYSICAL_ACTIVITY;

  // Handle text/radio input changes
  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  // Validate all required fields and physical activity group
  const handleSubmit = () => {
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
    if (pa.highIntensity === null) paErrors.highIntensity = "Ce champ est requis";
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
      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
          <div className="h-full bg-[#F4C95D] transition-all duration-500" style={{ width: "25%" }} />
        </div>
        <p className="text-sm text-[#8A8A8A] mt-2 text-right">1 sur 4</p>
      </div>

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
          <legend className="block text-lg font-bold text-[#414535] mb-2">Activité physique</legend>
          <div className="space-y-6">
            <PhysicalActivityRadioGroup
              name="deskJob"
              label="Poste sédentaire"
              options={[
                { label: "Oui", value: true },
                { label: "Non", value: false },
              ]}
              value={pa.deskJob}
              onChange={(deskJob) => updateFormData({ physicalActivity: { ...pa, deskJob } })}
              error={errors?.physicalActivity?.deskJob}
            />
            <PhysicalActivityRadioGroup
              name="dailySteps"
              label="Pas par jour"
              options={[
                { label: "< 5 000", value: "<5k" },
                { label: "5 000 – 8 000", value: "5-8k" },
                { label: "> 8 000", value: ">8k" },
              ]}
              value={pa.dailySteps}
              onChange={(dailySteps) => updateFormData({ physicalActivity: { ...pa, dailySteps } })}
              error={errors?.physicalActivity?.dailySteps}
              optionClassName="flex-1 text-center font-medium"
            />
            <PhysicalActivityRadioGroup
              name="sessionsPerWeek"
              label="Séances de sport/semaine"
              options={[
                { label: "0", value: "0" },
                { label: "1-2", value: "1-2" },
                { label: "3-4", value: "3-4" },
                { label: ">=5", value: ">=5" },
              ]}
              value={pa.sessionsPerWeek}
              onChange={(sessionsPerWeek) => updateFormData({ physicalActivity: { ...pa, sessionsPerWeek } })}
              error={errors?.physicalActivity?.sessionsPerWeek}
            />
            <HighIntensityToggle
              checked={!!pa.highIntensity}
              onChange={(checked) => updateFormData({ physicalActivity: { ...pa, highIntensity: checked } })}
              error={errors?.physicalActivity?.highIntensity}
            />
          </div>
        </fieldset>
      </div>

      {/* Next button */}
      <button
        onClick={handleSubmit}
        className="mt-8 bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition"
        type="button"
      >
        Étape suivante
      </button>
    </div>
  );
}
