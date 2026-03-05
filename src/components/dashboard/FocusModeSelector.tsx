import { cn } from "@/lib/utils";
import { FocusMode, FocusModeConfig } from "@/hooks/useDashboardFocusMode";
import { Focus, Zap, Heart, Scale, Sliders, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FocusModeSelectorProps {
  currentMode: FocusMode;
  allModes: FocusModeConfig[];
  onModeChange: (mode: FocusMode) => void;
  onEditCustom?: () => void;
  hasCustomPreferences?: boolean;
  className?: string;
}

const modeIcons: Record<FocusMode, React.ReactNode> = {
  recovery: <Heart className="h-4 w-4" />,
  performance: <Zap className="h-4 w-4" />,
  pain_management: <Heart className="h-4 w-4" />,
  balance: <Scale className="h-4 w-4" />,
  custom: <Sliders className="h-4 w-4" />,
};

const toneColors: Record<'coach' | 'warm' | 'strategic', string> = {
  coach: 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20',
  warm: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20',
  strategic: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20',
};

const selectedToneColors: Record<'coach' | 'warm' | 'strategic', string> = {
  coach: 'bg-primary text-primary-foreground border-primary',
  warm: 'bg-emerald-500 text-white border-emerald-500',
  strategic: 'bg-blue-500 text-white border-blue-500',
};

export function FocusModeSelector({
  currentMode,
  allModes,
  onModeChange,
  onEditCustom,
  hasCustomPreferences,
  className,
}: FocusModeSelectorProps) {
  const currentConfig = allModes.find(m => m.id === currentMode);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Focus className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Focus Mode</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {allModes.map((mode) => {
          const isSelected = mode.id === currentMode;
          const colorClass = isSelected 
            ? selectedToneColors[mode.tone]
            : toneColors[mode.tone];
          
          return (
            <div key={mode.id} className="flex items-center gap-1">
              <button
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                  colorClass,
                  isSelected && "shadow-md"
                )}
              >
                {modeIcons[mode.id]}
                <span>{mode.label}</span>
              </button>
              
              {/* Edit button for Custom mode when it's selected and has preferences */}
              {mode.id === 'custom' && isSelected && hasCustomPreferences && onEditCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditCustom}
                  className="h-8 w-8 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {currentConfig && (
        <p className="text-sm text-muted-foreground animate-fade-in">
          {currentConfig.description}
        </p>
      )}
    </div>
  );
}
