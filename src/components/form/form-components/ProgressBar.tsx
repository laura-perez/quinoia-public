import React from "react";

interface ProgressBarProps {
  step: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ step, total }) => {
  const percent = Math.round((step / total) * 100);
  return (
    <div className="mb-6">
      <div className="h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#F4C95D] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-[#8A8A8A] mt-2 text-right">
        {step} sur {total}
      </p>
    </div>
  );
};

export default ProgressBar;
