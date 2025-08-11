import React from "react";
import DeskJobRadioGroup from "./DeskJobRadioGroup";
import DailyStepsRadioGroup from "./DailyStepsRadioGroup";
import SessionsPerWeekRadioGroup from "./SessionsPerWeekRadioGroup";
import HighIntensityToggle from "./HighIntensityToggle";

export type PhysicalActivity = {
  deskJob: boolean | null;
  dailySteps: "<5k" | "5-8k" | ">8k" | null;
  sessionsPerWeek: "0" | "1-2" | "3-4" | ">=5" | null;
  highIntensity: boolean | null;
};

interface Props {
  value: PhysicalActivity;
  updateFormData: (patch: Record<string, any>) => void;
  errors?: Partial<Record<keyof PhysicalActivity, string>>;
}

function PhysicalActivityGroup({ value, updateFormData, errors }: Props) {
  return (
    <fieldset className="border border-[#EAEAEA] rounded-lg px-4 py-4 mb-6">
      <legend className="block text-lg font-bold text-[#414535] mb-2">Activité physique</legend>
      <div className="space-y-6">
        <DeskJobRadioGroup
          value={value.deskJob}
          onChange={(deskJob) => updateFormData({ physicalActivity: { ...value, deskJob } })}
          error={errors?.deskJob}
        />
        <DailyStepsRadioGroup
          value={value.dailySteps}
          onChange={(dailySteps) => updateFormData({ physicalActivity: { ...value, dailySteps } })}
          error={errors?.dailySteps}
          optionClassName="flex-1 text-center font-medium"
        />
        <SessionsPerWeekRadioGroup
          value={value.sessionsPerWeek}
          onChange={(sessionsPerWeek) => updateFormData({ physicalActivity: { ...value, sessionsPerWeek } })}
          error={errors?.sessionsPerWeek}
        />
        <HighIntensityToggle
          checked={!!value.highIntensity}
          onChange={(checked) => updateFormData({ physicalActivity: { ...value, highIntensity: checked } })}
          error={errors?.highIntensity}
        />
      </div>
    </fieldset>
  );
}

export default PhysicalActivityGroup;
