import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface SimulationTimelineProps {
  totalDays: number;
  currentDayIndex: number;
  onDaySelect: (dayIndex: number) => void;
  onClose: () => void;
  isVisible: boolean;
}

export const SimulationTimeline = ({
  totalDays,
  currentDayIndex,
  onDaySelect,
  onClose,
  isVisible,
}: SimulationTimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide after 3 seconds of inactivity
  useEffect(() => {
    if (!isVisible) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        onClose();
      }, 3000);
    };

    resetTimer();

    const handleActivity = () => resetTimer();
    timelineRef.current?.addEventListener("mousemove", handleActivity);
    timelineRef.current?.addEventListener("touchstart", handleActivity);

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      timelineRef.current?.removeEventListener("mousemove", handleActivity);
      timelineRef.current?.removeEventListener("touchstart", handleActivity);
    };
  }, [isVisible, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (timelineRef.current && !timelineRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={timelineRef}
      className={cn(
        "fixed bottom-40 left-4 md:left-6 lg:left-8 z-50",
        "bg-background/95 backdrop-blur-xl border border-border rounded-2xl",
        "shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        "max-w-xs"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-muted-foreground mb-1">
          Simulation Timeline
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from({ length: totalDays }, (_, i) => (
            <button
              key={i}
              onClick={() => onDaySelect(i)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-medium transition-all duration-200",
                "hover:scale-110 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === currentDayIndex
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(120,64,255,0.6)] scale-110"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              aria-label={`Jump to Day ${i + 1}`}
              aria-current={i === currentDayIndex ? "true" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
