import React from "react";

interface HighIntensityToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  className?: string;
  ariaDescribedBy?: string;
}

function HighIntensityToggle({
  checked,
  onChange,
  error,
  className = "",
  ariaDescribedBy,
}: HighIntensityToggleProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[#414535]" htmlFor="highIntensity">Intensité élevée</label>
        <input
          id="highIntensity"
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="w-10 h-5 bg-[#EAEAEA] border-2 border-[#EAEAEA] rounded-full appearance-none cursor-pointer checked:bg-[#F4C95D] relative transition"
          aria-describedby={error ? ariaDescribedBy || "highIntensity-error" : undefined}
        />
      </div>
      <p className="text-xs text-[#8A8A8A] mt-1">Au moins ~20 min avec essoufflement marqué. Ex: HIIT, sprint, CrossFit.</p>
      {error && <p id={ariaDescribedBy || "highIntensity-error"} className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default HighIntensityToggle;
