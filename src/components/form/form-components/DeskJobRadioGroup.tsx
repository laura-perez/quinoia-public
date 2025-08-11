import React from "react";

interface DeskJobRadioGroupProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  error?: string;
  className?: string;
  optionClassName?: string;
  ariaDescribedBy?: string;
}

const options = [
  { label: "Oui", value: true },
  { label: "Non", value: false },
];

function DeskJobRadioGroup({
  value,
  onChange,
  error,
  className = "",
  optionClassName = "",
  ariaDescribedBy,
}: DeskJobRadioGroupProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#414535] mb-2">Poste sédentaire</label>
      <div className="flex gap-3">
        {options.map((opt) => (
          <label
            key={String(opt.value)}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition flex-1 flex items-center justify-center font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D3C6] ${
              value === opt.value
                ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
            } ${optionClassName}`}
          >
            <input
              type="radio"
              name="deskJob"
              value={String(opt.value)}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
              aria-checked={value === opt.value}
              aria-describedby={error ? ariaDescribedBy || "deskJob-error" : undefined}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={ariaDescribedBy || "deskJob-error"} className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}

export default DeskJobRadioGroup;
