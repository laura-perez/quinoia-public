import React from "react";

interface RadioGroupProps {
  name: string;
  options: Array<string | number>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string | undefined;
  label: string;
  className?: string | undefined;
  optionClassName?: string | undefined;
  ariaDescribedBy?: string | undefined;
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
      {options.map((option) => {
        const optionStr = String(option);
        return (
          <label
            key={optionStr}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
              value === optionStr
                ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
                : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#F4C95D]"
            } ${optionClassName}`}
          >
            <input
              type="radio"
              name={name}
              value={optionStr}
              checked={value === optionStr}
              onChange={onChange}
              className="sr-only"
              aria-checked={value === optionStr}
              aria-describedby={error ? ariaDescribedBy || `${name}-error` : undefined}
            />
            {optionStr}
          </label>
        );
      })}
    </div>
    {error && (
      <p id={ariaDescribedBy || `${name}-error`} className="text-sm text-red-500 mt-2">
        {error}
      </p>
    )}
  </div>
);

export default RadioGroup;
