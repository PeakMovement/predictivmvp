import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import { OnboardingData } from "./OnboardingFlow";

interface Props {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
}

const TIME_OPTIONS = [
  { value: 15,  label: "15 min" },
  { value: 30,  label: "30 min" },
  { value: 45,  label: "45 min" },
  { value: 60,  label: "60 min" },
  { value: 90,  label: "90+ min" },
];

export function OnboardingPreferences({ data, onUpdate }: Props) {
  const [q1Text, setQ1Text] = useState(data.preferredActivities.join(", "));
  const [q2Text, setQ2Text] = useState(data.excludedActivities.join(", "));

  const handleQ1Blur = () => {
    const parsed = parseActivities(q1Text);
    const equipment = inferEquipmentFromActivities(parsed);
    onUpdate({ preferredActivities: parsed, equipmentAccess: equipment });
  };

  const handleQ2Blur = () => {
    const excluded = parseActivities(q2Text);
    onUpdate({ excludedActivities: excluded });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <MessageCircle className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">A few quick questions</h2>
        <p className="text-sm text-muted-foreground">
          Yves uses these to personalise every recommendation — not generic advice.
        </p>
      </div>

      {/* Q1 */}
      <YvesQuestion
        question="What kind of activity do you actually enjoy? Name anything — doesn't have to be sport."
        hint='e.g. "swimming, trail running, pilates"'
      >
        <textarea
          className="w-full rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={2}
          placeholder='swimming, trail running, walking…'
          value={q1Text}
          onChange={(e) => setQ1Text(e.target.value)}
          onBlur={handleQ1Blur}
        />
      </YvesQuestion>

      {/* Q2 */}
      <YvesQuestion
        question="Is there anything you don't enjoy or can't access?"
        hint='e.g. "gym, yoga, no pool" — these become hard exclusions'
      >
        <textarea
          className="w-full rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={2}
          placeholder='gym, yoga, no pool…'
          value={q2Text}
          onChange={(e) => setQ2Text(e.target.value)}
          onBlur={handleQ2Blur}
        />
      </YvesQuestion>

      {/* Q3 */}
      <YvesQuestion
        question="On a typical day when you want to train, how much time do you usually have?"
      >
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ availableMinutes: opt.value })}
              className={cn(
                "px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200",
                data.availableMinutes === opt.value
                  ? "border-primary bg-primary/10 text-foreground shadow-[0_0_12px_rgba(139,92,246,0.12)]"
                  : "border-border/50 bg-card/30 text-muted-foreground hover:bg-muted/40"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </YvesQuestion>
    </div>
  );
}

// ── Yves question wrapper ────────────────────────────────────────────

function YvesQuestion({
  question,
  hint,
  children,
}: {
  question: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[12px] font-bold text-primary">Y</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground leading-snug">{question}</p>
          {hint && <p className="text-xs text-muted-foreground/70 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </div>
  );
}

// ── Parsing helpers ──────────────────────────────────────────────────

function parseActivities(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/[,\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Infer equipment access from Q1 preferred activities
// swimming → pool, trail running/hiking → trails, cycling/running/walking → road, gym/crossfit → gym
function inferEquipmentFromActivities(activities: string[]): string[] {
  const equipment = new Set<string>();
  for (const act of activities) {
    if (/swim/.test(act)) equipment.add("pool");
    if (/trail|hik/.test(act)) equipment.add("trails");
    if (/cycl|bike|walk|\brun\b/.test(act)) equipment.add("road");
    if (/gym|crossfit|boxing|weightlift|lift/.test(act)) equipment.add("gym");
    if (/pilates|yoga|home/.test(act)) equipment.add("home_gym");
  }
  return Array.from(equipment);
}
