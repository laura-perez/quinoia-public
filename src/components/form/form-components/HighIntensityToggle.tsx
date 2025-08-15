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
      <label className="block text-sm font-medium text-[#414535] mb-2" htmlFor="highIntensity">
        Intensité élevée
      </label>
      <div className="flex items-center gap-4 mb-1">
        <input
          id="highIntensity"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-14 h-7 bg-[#EAEAEA] border-2 border-[#EAEAEA] rounded-full appearance-none cursor-pointer checked:bg-[#F4C95D] focus:ring-2 focus:ring-[#F4C95D] focus:border-[#F4C95D] transition relative shadow-md"
          aria-describedby={error ? ariaDescribedBy || "highIntensity-error" : undefined}
          style={{ boxShadow: checked ? "0 0 0 2px #F4C95D" : undefined }}
        />
        <span className={`text-sm font-semibold ${checked ? "text-[#F4C95D]" : "text-[#8A8A8A]"}`}>
          {checked ? "Oui" : "Non"}
        </span>
      </div>
      <p className="text-xs text-[#8A8A8A] mt-1">
        Au moins ~20 min avec essoufflement marqué. Ex: HIIT, sprint, CrossFit.
      </p>
      {error && (
        <p id={ariaDescribedBy || "highIntensity-error"} className="text-sm text-red-500 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}

export default HighIntensityToggle;
