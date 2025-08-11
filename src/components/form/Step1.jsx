
import { useState } from "react";
import PhysicalActivityGroup from "./form-components/PhysicalActivityGroup";

const initialPhysicalActivity = { deskJob: null, dailySteps: null, sessionsPerWeek: null, highIntensity: null };

function TextInput({ label, name, type = "text", value, onChange, error, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#414535] mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#B7D3C6] focus:outline-none focus:ring-1 focus:ring-[#B7D3C6]"
        placeholder={placeholder}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function RadioGroup({ label, name, options, value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#414535] mb-2">{label}</label>
      <div className="flex flex-col sm:flex-row gap-3">
        {options.map((option) => (
          <label
            key={option}
            className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium transition
              ${value === option ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]" : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"}`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={onChange}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}


export default function Step1({ formData, updateFormData, goToNext }) {
  const [errors, setErrors] = useState({});
  const pa = formData.physicalActivity ?? initialPhysicalActivity;

  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = () => {
    const requiredFields = ["name", "age", "gender", "height_cm", "weight_kg"];
    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].toString().trim() === "") {
        newErrors[field] = "Ce champ est requis";
      }
    });

    // Validate physicalActivity fields
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
    } else {
      goToNext();
    }
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
          label="Quel est ton genre ?"
          name="gender"
          options={["Femme", "Homme", "Pas précisé"]}
          value={formData.gender}
          onChange={handleChange}
          error={errors.gender}
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
        <PhysicalActivityGroup value={pa} updateFormData={updateFormData} errors={errors?.physicalActivity} />
      </div>

      {/* Bouton suivant */}
      <button
        onClick={handleSubmit}
        className="mt-8 bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition"
      >
        Étape suivante
      </button>
    </div>
  );
}
