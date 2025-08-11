import React from "react";

interface SessionsPerWeekRadioGroupProps {
  value: "0" | "1-2" | "3-4" | ">=5" | null;
  onChange: (value: "0" | "1-2" | "3-4" | ">=5") => void;
  error?: string;
  className?: string;
  optionClassName?: string;
  ariaDescribedBy?: string;
}

const options = [
  { label: "0", value: "0" },
  { label: "1-2", value: "1-2" },
  { label: "3-4", value: "3-4" },
  { label: ">=5", value: ">=5" },
];

function SessionsPerWeekRadioGroup({
  value,
  onChange,
  error,
  className = "",
  optionClassName = "",
  ariaDescribedBy,
}: SessionsPerWeekRadioGroupProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#414535] mb-2">Séances de sport/semaine</label>
      <div className="flex flex-col sm:flex-row gap-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition flex-1 flex items-center justify-center font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D3C6] ${
              value === opt.value
                ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
            } ${optionClassName}`}
          >
            <input
              type="radio"
              name="sessionsPerWeek"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value as "0" | "1-2" | "3-4" | ">=5")}
              className="sr-only"
              aria-checked={value === opt.value}
              aria-describedby={error ? ariaDescribedBy || "sessionsPerWeek-error" : undefined}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={ariaDescribedBy || "sessionsPerWeek-error"} className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}

export default SessionsPerWeekRadioGroup;
