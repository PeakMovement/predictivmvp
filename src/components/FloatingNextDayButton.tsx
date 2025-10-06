import { SkipForward } from "lucide-react";
import { useLiveData } from "@/contexts/LiveDataContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { getDailyInsight, getToastVariant } from "@/lib/dailyInsights";
import { useRef } from "react";

export const FloatingNextDayButton = () => {
  const { isSimulating, currentDayIndex, totalDays, setDayIndex, csvData } = useLiveData();
  const { toast } = useToast();
  const lastClickTime = useRef(0);

  // Only show when simulation is active
  if (!isSimulating) return null;

  const handleNextDay = () => {
    // Debounce: prevent multiple clicks within 500ms
    const now = Date.now();
    if (now - lastClickTime.current < 500) return;
    lastClickTime.current = now;

    const nextIndex = currentDayIndex + 1;
    const newIndex = nextIndex >= totalDays ? 0 : nextIndex;
    setDayIndex(newIndex);
    
    // Show daily insight toast
    const dayData = csvData[newIndex];
    const insight = getDailyInsight(dayData);
    
    toast({
      title: `Day ${newIndex + 1}`,
      description: insight.message,
      variant: getToastVariant(insight.level),
      duration: 3500,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNextDay();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleNextDay}
            onKeyDown={handleKeyDown}
            className={cn(
              "fixed z-50",
              "bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4",
              "md:bottom-24 md:left-6 lg:left-8",
              "w-14 h-14 rounded-full",
              "bg-primary text-primary-foreground",
              "transition-all duration-300 ease-out",
              "hover:scale-110 hover:-translate-y-1 active:scale-95",
              "flex items-center justify-center",
              "animate-pulse hover:animate-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "shadow-[0_0_15px_rgba(120,64,255,0.4)] hover:shadow-[0_0_25px_rgba(120,64,255,0.6)]",
              "light:border-2 light:border-border",
              "touch-none"
            )}
            aria-label="Advance Simulation Day"
            tabIndex={0}
          >
            <SkipForward size={24} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-semibold">Advance Simulation Day</p>
          <p className="text-xs text-muted-foreground">
            Currently on Day {currentDayIndex + 1} of {totalDays}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
