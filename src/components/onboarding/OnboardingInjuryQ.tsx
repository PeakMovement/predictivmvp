import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { injuryHistory: string; injuryDescription: string };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const INJURY_OPTIONS = [
  {
    value: "none",
    label: "No Significant Injuries",
    description: "Clean slate — allows aggressive load monitoring",
  },
  {
    value: "overuse",
    label: "Overuse History",
    description: "Tendon issues, shin splints, repetitive strain",
  },
  {
    value: "acute",
    label: "Acute Injuries",
    description: "Tears, fractures, or surgery in the past",
  },
  {
    value: "current",
    label: "Currently Managing an Injury",
    description: "Active rehab or recovery in progress",
  },
  {
    value: "multiple",
    label: "Multiple / Recurring",
    description: "Several past or recurring injury patterns",
  },
];

export function OnboardingInjuryQ({ data, onUpdate }: Props) {
  const showDescription = data.injuryHistory && data.injuryHistory !== "none";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Injury History</h2>
        <p className="text-sm text-muted-foreground">This helps Yves calibrate safety thresholds and load advice</p>
      </div>

      <OnboardingChips
        options={INJURY_OPTIONS}
        value={data.injuryHistory}
        onChange={(v) => {
          const val = v as string;
          onUpdate({
            injuryHistory: val,
            // Clear description if switching to "none"
            ...(val === "none" ? { injuryDescription: "" } : {}),
          });
        }}
        columns={1}
        size="md"
      />

      {showDescription && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="injuryDesc" className="text-sm font-medium text-foreground">
            Brief description of your injury
          </Label>
          <Textarea
            id="injuryDesc"
            placeholder="e.g. Left ACL reconstruction 6 months ago, currently in return-to-sport phase..."
            value={data.injuryDescription}
            onChange={(e) => onUpdate({ injuryDescription: e.target.value.slice(0, 500) })}
            rows={3}
            maxLength={500}
            className="bg-card border-border"
          />
          <p className="text-[10px] text-muted-foreground/60 text-right">{data.injuryDescription.length}/500</p>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          This is private — it's only used to keep AI recommendations safe.
        </p>
      </div>
    </div>
  );
}
