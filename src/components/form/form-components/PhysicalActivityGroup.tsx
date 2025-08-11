import React from "react";

export type PhysicalActivity = {
  deskJob: boolean | null;
  dailySteps: "<5k" | "5-8k" | ">8k" | null;
  sessionsPerWeek: "0" | "1-2" | "3-4" | ">=5" | null;
  highIntensity: boolean | null;
};
const sessionsPerWeekOptions = [
  { label: "0", value: "0" },
  { label: "1-2", value: "1-2" },
  { label: "3-4", value: "3-4" },
  { label: ">=5", value: ">=5" },
];

interface Props {
  value: PhysicalActivity;
  updateFormData: (patch: Record<string, any>) => void;
  errors?: Partial<Record<keyof PhysicalActivity, string>>;
}

const deskJobOptions = [
  { label: "Oui", value: true },
  { label: "Non", value: false },
];

const dailyStepsOptions = [
  { label: "< 5 000", value: "<5k" },
  { label: "5 000 – 8 000", value: "5-8k" },
  { label: "> 8 000", value: ">8k" },
];

function PhysicalActivityGroup({ value, updateFormData, errors }: Props) {
  return (
    <fieldset className="border border-[#EAEAEA] rounded-lg p-2 mb-6">
      <legend className="font-semibold text-[#414535] text-lg mb-1">Activité physique</legend>
      {/* Desk Job */}
      <div className="mb-6">
        <label className="block font-medium text-[#414535] mb-1">Poste sédentaire</label>
        <span className="text-xs text-[#8A8A8A] block mb-2" id="deskJob-help">
          Travail principalement assis.
        </span>
        <div className="flex gap-4" role="radiogroup" aria-labelledby="deskJob-help">
          {deskJobOptions.map((opt) => (
            <label
              key={String(opt.value)}
              className={`flex items-center px-4 py-2 rounded-lg border border-[#EAEAEA] cursor-pointer transition-colors
                ${value.deskJob === opt.value ? "bg-[#F4C95D] text-[#414535] border-[#B7D3C6]" : "bg-white text-[#414535]"}
                focus-within:ring-2 focus-within:ring-[#F4C95D]`}
            >
              <input
                type="radio"
                name="deskJob"
                value={String(opt.value)}
                checked={value.deskJob === opt.value}
                onChange={() => updateFormData({ physicalActivity: { ...value, deskJob: opt.value } })}
                className="sr-only"
                aria-invalid={!!errors?.deskJob}
                aria-describedby="deskJob-help deskJob-error"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {errors?.deskJob && (
          <span className="text-xs text-red-600 mt-1 block" id="deskJob-error">
            {errors.deskJob}
          </span>
        )}
      </div>

      {/* Daily Steps */}
      <div className="mb-6">
        <label className="block font-medium text-[#414535] mb-1">Pas par jour</label>
        <span className="text-xs text-[#8A8A8A] block mb-2" id="dailySteps-help">
          Estimation moyenne sur une semaine.
        </span>
        <div className="flex flex-col sm:flex-row gap-4" role="radiogroup" aria-labelledby="dailySteps-help">
          {dailyStepsOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex-1 flex items-center px-4 py-3 rounded-lg border border-[#EAEAEA] cursor-pointer transition-colors
                ${value.dailySteps === opt.value ? "bg-[#F4C95D] text-[#414535] border-[#B7D3C6]" : "bg-white text-[#414535]"}
                focus-within:ring-2 focus-within:ring-[#F4C95D]`}
            >
              <input
                type="radio"
                name="dailySteps"
                value={opt.value}
                checked={value.dailySteps === opt.value}
                onChange={(e) => updateFormData({ physicalActivity: { ...value, dailySteps: e.target.value } })}
                className="sr-only"
                aria-invalid={!!errors?.dailySteps}
                aria-describedby="dailySteps-help dailySteps-error"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {errors?.dailySteps && (
          <span className="text-xs text-red-600 mt-1 block" id="dailySteps-error">
            {errors.dailySteps}
          </span>
        )}
      </div>

      {/* Sessions per week */}
      <div className="mb-6">
        <label className="block font-medium text-[#414535] mb-1">Séances de sport/semaine</label>
        <span className="text-xs text-[#8A8A8A] block mb-2" id="sessionsPerWeek-help">
          Nombre moyen de séances d'activité physique intense par semaine.
        </span>
        <div className="flex flex-col sm:flex-row gap-4" role="radiogroup" aria-labelledby="sessionsPerWeek-help">
          {sessionsPerWeekOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex-1 flex items-center px-4 py-3 rounded-lg border border-[#EAEAEA] cursor-pointer transition-colors
                ${value.sessionsPerWeek === opt.value ? "bg-[#F4C95D] text-[#414535] border-[#B7D3C6]" : "bg-white text-[#414535]"}
                focus-within:ring-2 focus-within:ring-[#F4C95D]`}
            >
              <input
                type="radio"
                name="sessionsPerWeek"
                value={opt.value}
                checked={value.sessionsPerWeek === opt.value}
                onChange={(e) => updateFormData({ physicalActivity: { ...value, sessionsPerWeek: e.target.value } })}
                className="sr-only"
                aria-invalid={!!errors?.sessionsPerWeek}
                aria-describedby="sessionsPerWeek-help sessionsPerWeek-error"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {errors?.sessionsPerWeek && (
          <span className="text-xs text-red-600 mt-1 block" id="sessionsPerWeek-error">
            {errors.sessionsPerWeek}
          </span>
        )}
      </div>

      {/* High Intensity */}
      <div className="mb-2">
        <label className="block font-medium text-[#414535] mb-1">Intensité élevée</label>
        <span className="text-xs text-[#8A8A8A] block mb-2" id="highIntensity-help">
          Au moins ~20 min avec essoufflement marqué. Ex: HIIT, sprint, CrossFit.
        </span>
        <div className="flex items-center gap-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!!value.highIntensity}
              onChange={(e) => updateFormData({ physicalActivity: { ...value, highIntensity: e.target.checked } })}
              aria-invalid={!!errors?.highIntensity}
              aria-describedby="highIntensity-help highIntensity-error"
            />
            <div className="w-11 h-6 bg-[#EAEAEA] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F4C95D] rounded-full peer peer-checked:bg-[#F4C95D] transition-colors"></div>
            <span className="ml-3 text-sm text-[#414535]">{value.highIntensity ? "Oui" : "Non"}</span>
          </label>
        </div>
        {errors?.highIntensity && (
          <span className="text-xs text-red-600 mt-1 block" id="highIntensity-error">
            {errors.highIntensity}
          </span>
        )}
      </div>
    </fieldset>
  );
}

export default PhysicalActivityGroup;
