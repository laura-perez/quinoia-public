import React from "react";

interface TextInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  required = false,
}) => (
  <div>
    <label className="block text-sm font-medium text-[#414535] mb-1" htmlFor={name}>
      {label}
    </label>
    <input
      id={name}
      type={type}
      name={name}
      value={value || ""}
      onChange={onChange}
      required={required}
      className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#F4C95D] focus:outline-none focus:ring-1 focus:ring-[#F4C95D]"
      placeholder={placeholder}
      aria-invalid={!!error}
      aria-describedby={error ? `${name}-error` : undefined}
    />
    {error && (
      <p id={`${name}-error`} className="text-sm text-red-500 mt-1">
        {error}
      </p>
    )}
  </div>
);

export default TextInput;
