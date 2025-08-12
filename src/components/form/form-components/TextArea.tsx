import React from "react";

interface TextAreaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  placeholder?: string;
  rows?: number;
}

const TextArea: React.FC<TextAreaProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  rows = 4,
}) => (
  <div>
    <label className="block text-sm font-medium text-[#414535] mb-1" htmlFor={name}>
      {label}
    </label>
    <textarea
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[#EAEAEA] bg-white px-4 py-2 text-sm shadow-sm placeholder:text-[#8A8A8A] focus:border-[#F4C95D] focus:outline-none focus:ring-1 focus:ring-[#F4C95D]"
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

export default TextArea;
