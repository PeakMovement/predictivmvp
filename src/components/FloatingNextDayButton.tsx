import { SkipForward } from "lucide-react";
import { useLiveData } from "@/contexts/LiveDataContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { getDailyInsight, getToastVariant } from "@/lib/dailyInsights";

export const FloatingNextDayButton = () => {
  const { isSimulating, currentDayIndex, totalDays, setDayIndex, csvData } = useLiveData();
  const { toast } = useToast();

  // Only show when simulation is active
  if (!isSimulating) return null;

  const handleNextDay = () => {
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleNextDay}
            className={cn(
              "fixed bottom-24 right-6 z-50",
              "w-14 h-14 rounded-full",
              "bg-primary text-primary-foreground",
              "shadow-lg hover:shadow-xl",
              "transition-all duration-300",
              "hover:scale-110 active:scale-95",
              "flex items-center justify-center",
              "animate-pulse hover:animate-none",
              "light:border-2 light:border-border",
              "dark:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
            )}
          >
            <SkipForward size={24} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-semibold">Next Day</p>
          <p className="text-xs text-muted-foreground">
            Currently on Day {currentDayIndex + 1} of {totalDays}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
