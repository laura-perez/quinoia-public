import React from "react";

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  className?: string;
}

const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({ checked, onChange, label, className = "" }) => (
  <label className={`flex items-start space-x-2 text-sm text-[#414535] mb-6 ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-1 rounded border-[#EAEAEA] text-[#414535] focus:ring-[#F4C95D]"
    />
    <span>{label}</span>
  </label>
);

export default ConsentCheckbox;
