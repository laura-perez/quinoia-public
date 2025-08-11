import React from "react";

interface RadioGroupProps {
  name: string;
  options: Array<string | number>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  label: string;
  className?: string;
  optionClassName?: string;
  ariaDescribedBy?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  error,
  label,
  className = "",
  optionClassName = "",
  ariaDescribedBy,
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-[#414535] mb-2">{label}</label>
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <label
          key={option}
          className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
            value === String(option)
              ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
              : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#B7D3C6]"
          } ${optionClassName}`}
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === String(option)}
            onChange={onChange}
            className="sr-only"
            aria-checked={value === String(option)}
            aria-describedby={error ? ariaDescribedBy || `${name}-error` : undefined}
          />
          {option}
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

export default RadioGroup;
