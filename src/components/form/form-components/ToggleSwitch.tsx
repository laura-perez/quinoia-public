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
    <div className="flex items-center justify-between">
      <label className="block text-sm font-medium text-[#414535]">{label}</label>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-10 h-5 bg-[#EAEAEA] border-2 border-[#EAEAEA] rounded-full appearance-none cursor-pointer checked:bg-[#F4C95D] relative transition"
      />
    </div>
    {description && <p className="text-xs text-[#8A8A8A] mt-1">{description}</p>}
  </div>
);

export default ToggleSwitch;
