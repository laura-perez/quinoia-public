import React from "react";


interface DailyStepsRadioGroupProps {
  value: "<5k" | "5-8k" | ">8k" | null;
  onChange: (value: "<5k" | "5-8k" | ">8k") => void;
  error?: string;
  className?: string;
  optionClassName?: string;
  ariaDescribedBy?: string;
}


const options = [
  { label: "< 5 000", value: "<5k" },
  { label: "5 000 – 8 000", value: "5-8k" },
  { label: "> 8 000", value: ">8k" },
];

function DailyStepsRadioGroup({
  value,
  onChange,
  error,
  className = "",
  optionClassName = "",
  ariaDescribedBy,
}: DailyStepsRadioGroupProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#414535] mb-2">Pas par jour</label>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
              value === opt.value
                ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
            } ${optionClassName}`}
          >
            <input
              type="radio"
              name="dailySteps"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value as "<5k" | "5-8k" | ">8k")}
              className="sr-only"
              aria-checked={value === opt.value}
              aria-describedby={error ? ariaDescribedBy || "dailySteps-error" : undefined}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={ariaDescribedBy || "dailySteps-error"} className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}

export default DailyStepsRadioGroup;
