import React from "react";

interface PhysicalActivityRadioGroupProps<T extends string | number> {
  name: string;
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  className?: string;
  optionClassName?: string;
  ariaDescribedBy?: string;
}

function PhysicalActivityRadioGroup<T extends string | number>({
  name,
  label,
  options,
  value,
  onChange,
  error,
  className = "",
  optionClassName = "",
  ariaDescribedBy,
}: PhysicalActivityRadioGroupProps<T>) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#414535] mb-2">{label}</label>
      <div className="flex flex-wrap gap-3">
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
              name={name}
              value={String(opt.value)}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
              aria-checked={value === opt.value}
              aria-describedby={error ? ariaDescribedBy || `${name}-error` : undefined}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={ariaDescribedBy || `${name}-error`} className="text-sm text-red-500 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}

export default PhysicalActivityRadioGroup;
