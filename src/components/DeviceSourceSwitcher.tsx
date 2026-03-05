import { Watch, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceSourceSwitcherProps {
  availableSources: string[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
  className?: string;
}

const DEVICE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  oura: {
    label: "Ōura Ring",
    icon: <Activity className="h-3.5 w-3.5" />,
  },
  garmin: {
    label: "Garmin",
    icon: <Watch className="h-3.5 w-3.5" />,
  },
  polar: {
    label: "Polar",
    icon: <Activity className="h-3.5 w-3.5" />,
  },
};

export const DeviceSourceSwitcher = ({
  availableSources,
  selectedSource,
  onSourceChange,
  className,
}: DeviceSourceSwitcherProps) => {
  // Only render when 2+ sources are available
  if (availableSources.length < 2) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground font-medium">Data from:</span>
      <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1">
        {availableSources.map((source) => {
          const meta = DEVICE_META[source] ?? { label: source, icon: <Activity className="h-3.5 w-3.5" /> };
          const isActive = selectedSource === source;
          return (
            <button
              key={source}
              onClick={() => onSourceChange(source)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {meta.icon}
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
