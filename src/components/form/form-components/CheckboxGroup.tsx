import React from "react";

interface CheckboxGroupProps {
  name: string;
  options: readonly string[] | string[];
  values: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  className?: string;
  optionClassName?: string;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  name,
  options,
  values,
  onChange,
  label,
  className = "",
  optionClassName = "",
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-[#414535] mb-2">{label}</label>
    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
      {options.map((option) => (
        <label
          key={option}
          className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
            values.includes(option)
              ? "bg-[#F4C95D] text-[#414535] border-[#F4C95D]"
              : "bg-white border-[#EAEAEA] text-[#414535] hover:border-[#F4C95D]"
          } ${optionClassName}`}
        >
          <input
            type="checkbox"
            name={name}
            value={option}
            checked={values.includes(option)}
            onChange={onChange}
            className="sr-only"
          />
          {option}
        </label>
      ))}
    </div>
  </div>
);

export default CheckboxGroup;
