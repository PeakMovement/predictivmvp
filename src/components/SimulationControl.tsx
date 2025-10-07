import { SkipForward, SkipBack } from "lucide-react";
import { useLiveData } from "@/contexts/LiveDataContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { getDailyInsight, getToastVariant } from "@/lib/dailyInsights";
import { useRef, useState } from "react";
import { SimulationTimeline } from "./SimulationTimeline";

export const SimulationControl = () => {
  const { isSimulating, currentDayIndex, totalDays, setDayIndex, csvData } = useLiveData();
  const { toast } = useToast();
  const lastActionTime = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Only show when simulation is active
  if (!isSimulating) return null;

  const showDayInsight = (index: number, prefix: string = "") => {
    const dayData = csvData[index];
    const insight = getDailyInsight(dayData);
    
    toast({
      title: `${prefix}Day ${index + 1}`,
      description: insight.message,
      variant: getToastVariant(insight.level),
      duration: 3500,
    });
  };

  const navigateToDay = (newIndex: number, action: "next" | "previous" | "jump") => {
    // Debounce: prevent multiple actions within 500ms
    const now = Date.now();
    if (now - lastActionTime.current < 500 || isNavigating) return;
    
    lastActionTime.current = now;
    setIsNavigating(true);

    // Wrap around if needed
    const wrappedIndex = newIndex < 0 ? totalDays - 1 : newIndex >= totalDays ? 0 : newIndex;
    setDayIndex(wrappedIndex);

    // Show appropriate toast
    const prefix = action === "previous" ? "⏮️ Rewound to " : action === "jump" ? "⏭️ Jumped to " : "";
    showDayInsight(wrappedIndex, prefix);

    setTimeout(() => setIsNavigating(false), 500);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Shift-click or right-click → previous day
    if (e.shiftKey || e.button === 2) {
      navigateToDay(currentDayIndex - 1, "previous");
      return;
    }

    // Normal click → next day
    navigateToDay(currentDayIndex + 1, "next");
  };

  const handleMouseDown = () => {
    // Start long press timer (1 second)
    longPressTimerRef.current = setTimeout(() => {
      setIsTimelineVisible(true);
    }, 1000);
  };

  const handleMouseUp = () => {
    // Cancel long press if released early
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    navigateToDay(currentDayIndex - 1, "previous");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.shiftKey) {
        navigateToDay(currentDayIndex - 1, "previous");
      } else {
        navigateToDay(currentDayIndex + 1, "next");
      }
    }
  };

  const handleDaySelect = (dayIndex: number) => {
    navigateToDay(dayIndex, "jump");
    setIsTimelineVisible(false);
  };

  return (
    <>
      <SimulationTimeline
        totalDays={totalDays}
        currentDayIndex={currentDayIndex}
        onDaySelect={handleDaySelect}
        onClose={() => setIsTimelineVisible(false)}
        isVisible={isTimelineVisible}
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              onContextMenu={handleContextMenu}
              onKeyDown={handleKeyDown}
              className={cn(
                "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 md:bottom-24 md:left-6 lg:left-8 z-50",
                "w-14 h-14 rounded-full",
                "bg-primary text-primary-foreground",
                "transition-all duration-300 ease-out",
                "hover:scale-110 hover:-translate-y-1 active:scale-95",
                "flex items-center justify-center",
                "animate-pulse hover:animate-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "shadow-[0_0_15px_rgba(120,64,255,0.4)] hover:shadow-[0_0_25px_rgba(120,64,255,0.6)]",
                "group"
              )}
              aria-label="Simulation Control"
              tabIndex={0}
            >
              <SkipForward 
                size={24} 
                className="transition-transform group-hover:translate-x-0.5" 
              />
              <SkipBack 
                size={16} 
                className="absolute opacity-0 group-hover:opacity-30 -translate-x-3 transition-all" 
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Simulation Control</p>
              <p className="text-xs text-muted-foreground">Click = Next Day</p>
              <p className="text-xs text-muted-foreground">Hold (1s) = Timeline</p>
              <p className="text-xs text-muted-foreground">Shift/Right-click = Previous Day</p>
              <p className="text-xs text-muted-foreground mt-1">
                Day {currentDayIndex + 1} of {totalDays}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};
