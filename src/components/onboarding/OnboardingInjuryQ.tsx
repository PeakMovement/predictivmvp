import { Textarea } from "@/components/ui/textarea";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { injuryHistory: string; injuryDescription: string };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const INJURY_OPTIONS = [
  { value: "none", label: "No Significant Injuries", description: "Clean slate — allows aggressive load monitoring" },
  { value: "overuse", label: "Overuse History", description: "Tendon issues, shin splints, repetitive strain" },
  { value: "acute", label: "Acute Injuries", description: "Tears, fractures, or surgery in the past" },
  { value: "current", label: "Currently Managing an Injury", description: "Active rehab or recovery in progress" },
  { value: "multiple", label: "Multiple / Recurring", description: "Several past or recurring injury patterns" },
];

export function OnboardingInjuryQ({ data, onUpdate }: Props) {
  const showDescription = data.injuryHistory && data.injuryHistory !== "none";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40">Safety</p>
        <h2 className="font-display font-light text-3xl text-foreground">Injury History</h2>
        <p className="font-sans text-sm text-muted-foreground tracking-wide">Helps Yves calibrate safety thresholds</p>
      </div>

      <OnboardingChips
        options={INJURY_OPTIONS}
        value={data.injuryHistory}
        onChange={(v) => {
          const val = v as string;
          onUpdate({
            injuryHistory: val,
            ...(val === "none" ? { injuryDescription: "" } : {}),
          });
        }}
        columns={1}
        size="md"
      />

      {showDescription && (
        <div className="space-y-1.5 animate-fade-in">
          <label htmlFor="injuryDesc" className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground">
            Brief description
          </label>
          <Textarea
            id="injuryDesc"
            placeholder="e.g. Left ACL reconstruction 6 months ago, currently in return-to-sport phase..."
            value={data.injuryDescription}
            onChange={(e) => onUpdate({ injuryDescription: e.target.value.slice(0, 500) })}
            rows={3}
            maxLength={500}
            className="bg-card border-border text-foreground placeholder:text-muted-foreground/40 font-sans text-sm"
          />
          <p className="font-mono text-[11px] tracking-wider text-muted-foreground/40 text-right">{data.injuryDescription.length}/500</p>
        </div>
      )}

      <div className="border border-border p-3">
        <p className="font-mono text-[11px] tracking-[0.03em] text-coldBlue/30">
          This information is private and only used to calibrate safety thresholds.
        </p>
      </div>
    </div>
  );
}
