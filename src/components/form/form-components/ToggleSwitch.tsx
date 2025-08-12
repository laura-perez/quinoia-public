import React from "react";

interface ToggleSwitchProps {
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  description?: string;
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  name,
  checked,
  onChange,
  label,
  description,
  className = "",
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-[#414535] mb-2">{label}</label>
    <div className="flex items-center gap-4 mb-1">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-14 h-7 bg-[#EAEAEA] border-2 border-[#EAEAEA] rounded-full appearance-none cursor-pointer checked:bg-[#F4C95D] focus:ring-2 focus:ring-[#F4C95D] focus:border-[#F4C95D] transition relative shadow-md"
        style={{ boxShadow: checked ? "0 0 0 2px #F4C95D" : undefined }}
      />
      <span className={`text-sm font-semibold ${checked ? "text-[#F4C95D]" : "text-[#8A8A8A]"}`}>
        {checked ? "Oui" : "Non"}
      </span>
    </div>
    {description && <p className="text-xs text-[#8A8A8A] mt-1">{description}</p>}
  </div>
);

export default ToggleSwitch;
