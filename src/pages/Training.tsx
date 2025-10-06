import { BarChart3, Activity, Calendar, TrendingUp, Gauge, ChevronLeft, ChevronRight, FileText, Play, CheckCircle, HelpCircle, Check, X, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLiveData } from "@/contexts/LiveDataContext";
import { HealthDataRow } from "@/lib/healthDataStore";
import { FloatingNextDayButton } from "@/components/FloatingNextDayButton";

const sessionLogs = [
  { title: "Upper Body Strength", date: "2024-01-15", load: 125, type: "Strength" },
  { title: "HIIT Cardio", date: "2024-01-14", load: 89, type: "Cardio" },
  { title: "Lower Body Power", date: "2024-01-13", load: 156, type: "Power" },
  { title: "Recovery Run", date: "2024-01-12", load: 45, type: "Recovery" },
  { title: "Olympic Lifting", date: "2024-01-11", load: 178, type: "Strength" },
];

// Generate dynamic suggestions based on current day data
const generateSuggestions = (currentData: HealthDataRow | null) => {
  if (!currentData) return [];
  
  const suggestions = [];
  const hrv = parseFloat(currentData.HRV || "0");
  const acwr = parseFloat(currentData.ACWR || "0");
  const monotony = parseFloat(currentData.Monotony || "0");
  const sleepHours = parseFloat(currentData.SleepHours || "0");
  const sleepScore = parseFloat(currentData.SleepScore || "0");
  const strain = parseFloat(currentData.Strain || "0");
  
  // HRV < 65 → recommend mobility/recovery
  if (hrv < 65) {
    suggestions.push({
      id: 1,
      text: "Your HRV is below optimal. Add 2 mobility sessions focusing on recovery.",
      type: "actionable",
      category: "Recovery",
      accentColor: "yellow",
      hasVideo: true,
      hasPdf: true
    });
  }
  
  // ACWR > 1.5 → warn of overload
  if (acwr > 1.5) {
    suggestions.push({
      id: 2,
      text: "Overload risk detected. Schedule a deload week to reduce training intensity by 20%.",
      type: "actionable",
      category: "Training",
      accentColor: "red",
      hasVideo: true,
      hasPdf: true
    });
  }
  
  // Sleep > 7h and score > 80 → suggest performance session
  if (sleepHours >= 7 && sleepScore > 80) {
    suggestions.push({
      id: 3,
      text: "Excellent recovery! This is a great day for a high-intensity performance session.",
      type: "actionable",
      category: "Training",
      accentColor: "green",
      hasVideo: true,
      hasPdf: false
    });
  }
  
  // Monotony > 2.0 → add variety
  if (monotony > 2.0) {
    suggestions.push({
      id: 4,
      text: "Training is too repetitive. Add varied training modalities this week.",
      type: "actionable",
      category: "Training",
      accentColor: "yellow",
      hasVideo: false,
      hasPdf: true
    });
  }
  
  // High strain
  if (strain > 150) {
    suggestions.push({
      id: 5,
      text: "Strain is elevated. Consider adding an extra recovery day this week.",
      type: "actionable",
      category: "Recovery",
      accentColor: "red",
      hasVideo: true,
      hasPdf: true
    });
  }
  
  // Optimal window (good insight)
  if (acwr >= 0.8 && acwr <= 1.3 && hrv >= 65) {
    suggestions.push({
      id: 6,
      text: "Your acute:chronic ratio suggests optimal adaptation window. Great progress!",
      type: "insight",
      category: "Insight",
      accentColor: "green",
      hasVideo: false,
      hasPdf: false
    });
  }
  
  return suggestions;
};

const graphData = [
  {
    title: "EWMA Trend Analysis",
    subtitle: "Exponentially weighted moving average over 28 days",
    currentValue: "+5.2%",
    riskZone: "optimal", // optimal, caution, high-risk
    dataPoints: [65, 68, 72, 70, 75, 78, 82, 80, 85, 88, 90, 87, 89, 92, 95],
    thresholds: { optimal: [60, 85] as [number, number], caution: [85, 95] as [number, number], highRisk: [95, 100] as [number, number] },
    interpretation: {
      optimal: "Your training load is progressing well. Maintain consistency.",
      caution: "Training load is increasing rapidly. Monitor recovery carefully.",
      highRisk: "High training load detected. Consider reducing volume to prevent overtraining."
    }
  },
  {
    title: "Acute:Chronic Workload",
    subtitle: "Training load ratio over time",
    currentValue: "1.2",
    riskZone: "optimal",
    dataPoints: [1.3, 1.2, 1.1, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 1.2, 1.3, 1.2, 1.1, 1.2],
    thresholds: { optimal: [0.8, 1.3] as [number, number], caution: [1.3, 1.5] as [number, number], highRisk: [1.5, 2.0] as [number, number] },
    interpretation: {
      optimal: "Optimal training adaptation. You're in the sweet spot for gains.",
      caution: "Slightly elevated ratio. Monitor fatigue and adjust if needed.",
      highRisk: "High risk of overload. Consider reducing volume immediately."
    }
  },
  {
    title: "Weekly Training Load",
    subtitle: "Total training stress by week",
    currentValue: "420 TSS",
    riskZone: "caution",
    dataPoints: [380, 390, 400, 420, 440, 430, 420, 410, 430, 450, 440, 420, 410, 420, 420],
    thresholds: { optimal: [300, 430] as [number, number], caution: [430, 470] as [number, number], highRisk: [470, 600] as [number, number] },
    interpretation: {
      optimal: "Training stress is well-managed. Keep up the good work.",
      caution: "Approaching high training stress. Ensure adequate recovery.",
      highRisk: "Excessive training stress detected. Prioritize rest and recovery."
    }
  },
  {
    title: "Training Strain Trend",
    subtitle: "Daily strain accumulation",
    currentValue: "156",
    riskZone: "high-risk",
    dataPoints: [120, 130, 140, 145, 150, 155, 160, 158, 162, 165, 160, 158, 156, 154, 156],
    thresholds: { optimal: [100, 150] as [number, number], caution: [150, 165] as [number, number], highRisk: [165, 200] as [number, number] },
    interpretation: {
      optimal: "Strain levels are balanced. Continue current training approach.",
      caution: "Elevated strain detected. Monitor recovery markers closely.",
      highRisk: "Critical strain levels. Immediate deload recommended."
    }
  }
];

// Helper function to determine risk zone based on value and thresholds
const getRiskZoneForValue = (value: number, thresholds: { optimal: [number, number], caution: [number, number], highRisk: [number, number] }) => {
  if (value >= thresholds.optimal[0] && value < thresholds.optimal[1]) return "optimal";
  if (value >= thresholds.caution[0] && value < thresholds.caution[1]) return "caution";
  if (value >= thresholds.highRisk[0]) return "highRisk";
  return "optimal"; // default
};

const getRiskColor = (zone: string, isGlow = false) => {
  const colors = {
    optimal: isGlow ? "rgba(34, 197, 94, 0.6)" : "#22c55e",
    caution: isGlow ? "rgba(251, 146, 60, 0.6)" : "#fb923c", 
    "high-risk": isGlow ? "rgba(239, 68, 68, 0.6)" : "#ef4444"
  };
  return colors[zone as keyof typeof colors] || colors.optimal;
};

const getAccentColor = (color: string) => {
  switch (color) {
    case "green": return "border-l-green-500";
    case "yellow": return "border-l-yellow-500";
    case "red": return "border-l-red-500";
    default: return "border-l-primary";
  }
};

const getCategoryStyle = (category: string) => {
  switch (category) {
    case "Training": return "border-blue-400/30 text-blue-400 bg-blue-500/10";
    case "Recovery": return "border-green-400/30 text-green-400 bg-green-500/10";
    case "Insight": return "border-purple-400/30 text-purple-400 bg-purple-500/10";
    default: return "border-muted text-muted-foreground bg-muted/10";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "Strength": return "bg-blue-500/20 text-blue-400";
    case "Cardio": return "bg-red-500/20 text-red-400";
    case "Power": return "bg-purple-500/20 text-purple-400";
    case "Recovery": return "bg-green-500/20 text-green-400";
    default: return "bg-muted/20 text-muted-foreground";
  }
};

const AccountabilityChallenges = ({ suggestions }: { suggestions: ReturnType<typeof generateSuggestions> }) => {
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<number>>(new Set());
  const [processingStates, setProcessingStates] = useState<Record<number, 'accepting' | 'added' | 'cancelling' | 'cancelled'>>({});
  const [removedSuggestions, setRemovedSuggestions] = useState<Set<number>>(new Set());
  const [selectedInsight, setSelectedInsight] = useState<typeof suggestions[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<typeof suggestions[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [suggestedSlots, setSuggestedSlots] = useState<Array<{ date: Date; time: string; label: string }>>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [scheduledChallenges, setScheduledChallenges] = useState<Array<{ id: number; text: string; startTime: Date; endTime: Date }>>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictingBooking, setConflictingBooking] = useState<{ id: number; text: string; startTime: Date; endTime: Date } | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const { toast } = useToast();

  const generateSuggestedSlots = (category: string) => {
    const now = new Date();
    const slots: Array<{ date: Date; time: string; label: string }> = [];
    
    if (category === "Recovery") {
      // Mid-week (Wednesday) + weekend (Saturday)
      const wednesday = new Date(now);
      wednesday.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7 || 7));
      slots.push({ date: wednesday, time: "18:00", label: "Wednesday Evening" });
      
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
      slots.push({ date: saturday, time: "10:00", label: "Saturday Morning" });
      
      const sundayAlt = new Date(saturday);
      sundayAlt.setDate(saturday.getDate() + 1);
      slots.push({ date: sundayAlt, time: "14:00", label: "Sunday Afternoon" });
    } else if (category === "Training") {
      // Early week (Monday, Tuesday)
      const monday = new Date(now);
      monday.setDate(now.getDate() + ((1 - now.getDay() + 7) % 7 || 7));
      slots.push({ date: monday, time: "06:00", label: "Monday Morning" });
      
      const tuesday = new Date(now);
      tuesday.setDate(now.getDate() + ((2 - now.getDay() + 7) % 7 || 7));
      slots.push({ date: tuesday, time: "17:00", label: "Tuesday Evening" });
      
      const thursdayAlt = new Date(now);
      thursdayAlt.setDate(now.getDate() + ((4 - now.getDay() + 7) % 7 || 7));
      slots.push({ date: thursdayAlt, time: "06:00", label: "Thursday Morning" });
    } else {
      // Default: next 3 weekdays
      for (let i = 1; i <= 3; i++) {
        const nextDay = new Date(now);
        nextDay.setDate(now.getDate() + i);
        const dayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
        slots.push({ date: nextDay, time: "12:00", label: `${dayName} Noon` });
      }
    }
    
    return slots;
  };

  const handleAccept = (suggestion: typeof suggestions[0]) => {
    // Generate suggested slots based on challenge category
    const slots = generateSuggestedSlots(suggestion.category);
    setSuggestedSlots(slots);
    setSelectedSlotIndex(null);
    
    // Open scheduling modal for time-based challenges
    setSelectedChallenge(suggestion);
    setIsScheduleModalOpen(true);
  };

  const handleSlotSelect = (index: number) => {
    const slot = suggestedSlots[index];
    setSelectedDate(slot.date);
    setSelectedTime(slot.time);
    setSelectedSlotIndex(index);
  };

  const checkForConflicts = (startDate: Date, endDate: Date) => {
    return scheduledChallenges.find(booking => {
      // Check if the new time overlaps with existing booking
      return (startDate < booking.endTime && endDate > booking.startTime);
    });
  };

  const proceedWithScheduling = (startDate: Date, endDate: Date) => {
    if (!selectedChallenge) return;
    
    // Format dates for Google Calendar
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    
    // Create Google Calendar URL
    const eventTitle = encodeURIComponent(selectedChallenge.text);
    const eventDetails = encodeURIComponent("Event from Predictiv");
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${dates}&details=${eventDetails}`;
    
    // Add to scheduled challenges
    setScheduledChallenges(prev => [...prev, {
      id: selectedChallenge.id,
      text: selectedChallenge.text,
      startTime: startDate,
      endTime: endDate
    }]);
    
    // Set to accepting state immediately
    setProcessingStates(prev => ({ ...prev, [selectedChallenge.id]: 'accepting' }));
    
    // Open Google Calendar
    window.open(googleCalendarUrl, '_blank');
    
    // Show "Added" for 2 seconds
    setTimeout(() => {
      setProcessingStates(prev => ({ ...prev, [selectedChallenge.id]: 'added' }));
      
      setTimeout(() => {
        setAcceptedSuggestions(prev => new Set([...prev, selectedChallenge.id]));
        setRemovedSuggestions(prev => new Set([...prev, selectedChallenge.id]));
        setProcessingStates(prev => {
          const newState = { ...prev };
          delete newState[selectedChallenge.id];
          return newState;
        });
        
        toast({
          title: "Event added to Google Calendar (demo)",
          description: `Scheduled for ${format(startDate, "PPP")} at ${format(startDate, "p")}`,
          duration: 3000,
        });
      }, 2000);
    }, 100);
    
    setIsScheduleModalOpen(false);
    setSelectedChallenge(null);
    setPendingSchedule(null);
  };

  const handleScheduleConfirm = () => {
    if (selectedChallenge) {
      // Parse selected time and create dates
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1);
      
      // Check for conflicts
      const conflict = checkForConflicts(startDate, endDate);
      
      if (conflict) {
        // Store pending schedule and show conflict dialog
        setPendingSchedule({ startDate, endDate });
        setConflictingBooking(conflict);
        setConflictDialogOpen(true);
      } else {
        // No conflict, proceed with scheduling
        proceedWithScheduling(startDate, endDate);
      }
    }
  };

  const handleKeepBoth = () => {
    if (pendingSchedule) {
      proceedWithScheduling(pendingSchedule.startDate, pendingSchedule.endDate);
    }
    setConflictDialogOpen(false);
    setConflictingBooking(null);
  };

  const handleReschedule = () => {
    setConflictDialogOpen(false);
    setConflictingBooking(null);
    setPendingSchedule(null);
    // Keep the scheduling modal open for user to pick a different time
  };

  const handleCancel = (suggestionId: number) => {
    // Set to cancelling state and fade out
    setProcessingStates(prev => ({ ...prev, [suggestionId]: 'cancelling' }));
    
    setTimeout(() => {
      setRemovedSuggestions(prev => new Set([...prev, suggestionId]));
      setProcessingStates(prev => {
        const newState = { ...prev };
        delete newState[suggestionId];
        return newState;
      });
    }, 300);
  };

  const handleInsightClick = (suggestion: typeof suggestions[0]) => {
    setSelectedInsight(suggestion);
    setIsModalOpen(true);
  };

  const handleFeedback = (isUseful: boolean) => {
    toast({
      title: isUseful ? "Thank you!" : "Feedback received",
      description: isUseful 
        ? "We're glad you found this insight helpful." 
        : "We'll work to improve our insights for you.",
      duration: 3000,
    });
    setIsModalOpen(false);
    setSelectedInsight(null);
  };

  const visibleSuggestions = suggestions.filter(suggestion => 
    !removedSuggestions.has(suggestion.id)
  );

  return (
    <>
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Accountability Challenges</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-md hover:bg-primary/10 transition-all duration-200 hover:scale-110">
                  <HelpCircle size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">These are personalized challenges designed to help you improve your health. Accept a challenge to commit, and we'll track your progress</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="space-y-4">
          {visibleSuggestions.map((suggestion) => {
            const isActionable = suggestion.type === "actionable";
            const processingState = processingStates[suggestion.id];
            
            return (
              <div 
                key={suggestion.id} 
                className={cn(
                  "bg-glass/30 backdrop-blur-sm border border-glass-border rounded-xl p-4 transition-all duration-300 border-l-4",
                  getAccentColor(suggestion.accentColor),
                  processingState === 'cancelling' && "opacity-0 scale-95",
                  processingState === 'added' && "opacity-0 scale-95",
                  !isActionable && !processingState && "hover:bg-glass-highlight cursor-pointer",
                  isActionable && !processingState && "hover:bg-glass-highlight"
                )}
                onClick={!isActionable && !processingState ? () => handleInsightClick(suggestion) : undefined}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-md border transition-colors duration-200",
                        getCategoryStyle(suggestion.category)
                      )}>
                        {suggestion.category}
                      </span>
                    </div>
                    <p className="font-medium text-foreground leading-relaxed">
                      {processingState === 'accepting' ? 'Added' : suggestion.text}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Action Icons */}
                    {!processingState && (suggestion.hasPdf || suggestion.hasVideo) && (
                      <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity duration-200">
                        {suggestion.hasPdf && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  className="p-2 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Download PDF for suggestion:', suggestion.id);
                                  }}
                                >
                                  <FileText size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Download PDF</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {suggestion.hasVideo && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  className="p-2 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Watch Video for suggestion:', suggestion.id);
                                  }}
                                >
                                  <Play size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Watch Video</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                    
                    {/* Action Buttons or Insight Label */}
                    {!processingState && isActionable ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAccept(suggestion)}
                          className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:scale-110 active:scale-95 transition-all duration-200"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleCancel(suggestion.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:scale-110 active:scale-95 transition-all duration-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : !processingState && !isActionable ? (
                      <div className="px-4 py-2 text-sm font-medium text-muted-foreground/60 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors duration-200">
                        Insight
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {selectedInsight?.category} Insight
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedInsight?.text}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 p-4 bg-glass/30 rounded-lg border border-glass-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This insight is generated based on your recent training patterns and performance metrics. 
              It helps you understand your current adaptation status and provides context for making 
              informed decisions about your training approach.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-glass-border">
            <span className="text-sm font-medium text-foreground">Did you find this useful?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback(true)}
                className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:scale-110 active:scale-95 transition-all duration-200"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:scale-110 active:scale-95 transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheduling Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-md bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Schedule Challenge
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="bg-glass/30 rounded-lg border border-glass-border p-3">
              <p className="text-sm font-medium text-foreground">
                {selectedChallenge?.text}
              </p>
            </div>
            
            {/* Suggested Time Slots */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Suggested Times</Label>
              <div className="grid grid-cols-1 gap-2">
                {suggestedSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleSlotSelect(index)}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-200 text-left",
                      selectedSlotIndex === index
                        ? "bg-primary/20 border-primary text-primary font-medium scale-105"
                        : "bg-glass/30 border-glass-border hover:bg-glass-highlight hover:scale-102"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{slot.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(slot.date, "MMM d, yyyy")} at {slot.time}
                        </div>
                      </div>
                      {selectedSlotIndex === index && (
                        <CheckCircle size={18} className="text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-glass-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-glass px-2 text-muted-foreground">or choose custom time</span>
              </div>
            </div>
            
            {/* Custom Date/Time Picker */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="schedule-date" className="text-sm text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1 bg-glass/30 border-glass-border hover:bg-glass-highlight",
                        !selectedDate && "text-muted-foreground"
                      )}
                      onClick={() => setSelectedSlotIndex(null)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-glass backdrop-blur-xl border border-glass-border z-50" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setSelectedSlotIndex(null);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="schedule-time" className="text-sm text-muted-foreground">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => {
                    setSelectedTime(e.target.value);
                    setSelectedSlotIndex(null);
                  }}
                  className="mt-1 bg-glass/30 border-glass-border focus:border-primary"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleScheduleConfirm}
                className="flex-1 p-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setIsScheduleModalOpen(false);
                  setSelectedChallenge(null);
                }}
                className="flex-1 p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="sm:max-w-md bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="text-yellow-500" size={20} />
              Schedule Conflict
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This overlaps with another booking. Do you want to reschedule?
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Conflicting booking:</p>
              <p className="text-sm text-muted-foreground">{conflictingBooking?.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {conflictingBooking && format(conflictingBooking.startTime, "PPP 'at' p")}
              </p>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleReschedule}
                className="flex-1 p-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
              >
                Reschedule
              </button>
              <button
                onClick={handleKeepBoth}
                className="flex-1 p-3 rounded-lg bg-glass/30 border border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
              >
                Keep Both
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SessionLogCard = ({ session }: { session: typeof sessionLogs[0] }) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-foreground">{session.title}</h4>
      <span className={cn("px-2 py-1 text-xs rounded-lg font-medium hover:scale-105 transition-transform duration-200", getTypeColor(session.type))}>
        {session.type}
      </span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar size={14} />
        <span>{session.date}</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-primary animate-bounce-subtle" />
        <span className="font-medium text-foreground">{session.load}</span>
        <span className="text-muted-foreground text-xs">load</span>
      </div>
    </div>
  </div>
);

const SessionLogList = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <Activity size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
    </div>
    <div className="space-y-3">
      {sessionLogs.map((session, index) => (
        <SessionLogCard key={index} session={session} />
      ))}
    </div>
  </div>
);

const CircularGauge = ({ title, value, maxValue, unit }: { title: string; value: number; maxValue: number; unit: string }) => {
  const percentage = (value / maxValue) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
          <Gauge size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              fill="transparent"
              className="opacity-20"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuggestionsCard = ({ suggestions }: { suggestions: ReturnType<typeof generateSuggestions> }) => {
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<number>>(new Set());

  const handleAccept = (suggestionId: number) => {
    setAcceptedSuggestions(prev => new Set([...prev, suggestionId]));
  };

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
          <TrendingUp size={16} className="text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Accountability Challenges</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 rounded-md hover:bg-primary/10 transition-all duration-200 hover:scale-110">
                <HelpCircle size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">These are personalized challenges designed to help you improve your health. Accept a challenge to commit, and we'll track your progress</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="space-y-3">
        {suggestions.map((suggestion) => {
          const isAccepted = acceptedSuggestions.has(suggestion.id);
          const isActionable = suggestion.type === "actionable";
          
          return (
            <div key={suggestion.id} className="flex items-center justify-between gap-3 hover:bg-glass-highlight rounded-lg p-3 -m-3 transition-all duration-200">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0 animate-bounce-subtle" />
                <p className="text-sm text-muted-foreground">{suggestion.text}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Action Icons */}
                {(suggestion.hasPdf || suggestion.hasVideo) && (
                  <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity duration-200">
                    {suggestion.hasPdf && (
                      <button 
                        className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                        onClick={() => console.log('Download PDF for suggestion:', suggestion.id)}
                      >
                        <FileText size={14} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                      </button>
                    )}
                    {suggestion.hasVideo && (
                      <button 
                        className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                        onClick={() => console.log('Watch Video for suggestion:', suggestion.id)}
                      >
                        <Play size={14} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Action Button or Insight Label */}
                {isActionable ? (
                  <button
                    onClick={() => handleAccept(suggestion.id)}
                    disabled={isAccepted}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300",
                      isAccepted
                        ? "bg-green-500/20 text-green-400 shadow-glow cursor-default"
                        : "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95"
                    )}
                  >
                    {isAccepted ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>Added to Plan</span>
                      </div>
                    ) : (
                      "Accept"
                    )}
                  </button>
                ) : (
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground/60 bg-muted/10 rounded-lg">
                    Insight
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GraphCarousel = () => {
  const [currentGraph, setCurrentGraph] = useState(0);
  const [timeRange, setTimeRange] = useState(30);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  
  const timeRanges = [
    { days: 7, label: "7 Days" },
    { days: 14, label: "14 Days" },
    { days: 30, label: "30 Days" }
  ];
  
  // Auto-rotation every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentGraph((prev) => (prev + 1) % graphData.length);
        setIsTransitioning(false);
      }, 150);
    }, 5000);

    return () => clearInterval(interval);
  }, []);
  
  const nextGraph = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentGraph((prev) => (prev + 1) % graphData.length);
      setIsTransitioning(false);
    }, 150);
  };
  
  const prevGraph = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentGraph((prev) => (prev - 1 + graphData.length) % graphData.length);
      setIsTransitioning(false);
    }, 150);
  };
  
  const selectGraph = (index: number) => {
    if (index !== currentGraph) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentGraph(index);
        setIsTransitioning(false);
      }, 150);
    }
  };
  
  const graph = graphData[currentGraph];
  
  // Generate data points based on selected time range
  const getDataForRange = (days: number) => {
    const fullData = graph.dataPoints;
    if (days >= fullData.length) return fullData;
    return fullData.slice(-days);
  };
  
  const currentData = getDataForRange(timeRange);
  const maxValue = Math.max(...currentData);
  const minValue = Math.min(...currentData);
  const range = maxValue - minValue || 1;
  
  // SVG viewBox dimensions
  const viewBoxWidth = 400;
  const viewBoxHeight = 200;
  const padding = 30;
  
  const generatePath = (data: number[]) => {
    return data.map((value, index) => {
      const x = padding + (index * (viewBoxWidth - 2 * padding)) / Math.max(data.length - 1, 1);
      const y = viewBoxHeight - padding - ((value - minValue) / range) * (viewBoxHeight - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
  };
  
  const points = generatePath(currentData);
  
  // Generate gradient stops based on risk zones
  const generateGradient = () => {
    return currentData.map((value, index) => {
      const zone = getRiskZoneForValue(value, graph.thresholds);
      const color = zone === "optimal" ? "#22c55e" : zone === "caution" ? "#fb923c" : "#ef4444";
      const offset = (index / (currentData.length - 1)) * 100;
      return { offset: `${offset}%`, color };
    });
  };
  
  const gradientStops = generateGradient();
  
  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{graph.title}</h3>
            <p className="text-xs text-muted-foreground">{graph.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevGraph}
            className="p-2 rounded-lg hover:bg-glass-highlight transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          </button>
          <div className="flex gap-1">
            {graphData.map((_, index) => (
              <button
                key={index}
                onClick={() => selectGraph(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentGraph 
                    ? "bg-primary scale-125" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
          <button 
            onClick={nextGraph}
            className="p-2 rounded-lg hover:bg-glass-highlight transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronRight size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>
      
      {/* Time Range Selector */}
      <div className="flex justify-end mb-4">
        <div className="flex bg-muted/10 rounded-lg p-1 border border-glass-border">
          {timeRanges.map((range) => (
            <button
              key={range.days}
              onClick={() => setTimeRange(range.days)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                timeRange === range.days
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-glass-highlight"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className={cn(
        "h-80 bg-muted/5 rounded-xl border border-glass-border relative overflow-hidden transition-all duration-300 ease-out",
        isTransitioning ? "opacity-50 scale-95" : "opacity-100 scale-100"
      )}>
        <svg 
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className={cn(
            "w-full h-full transition-all duration-300 ease-out",
            isTransitioning ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"
          )}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          <defs>
            <pattern id={`grid-training-${currentGraph}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
            {/* Dynamic gradient based on risk zones */}
            <linearGradient id={`line-gradient-${currentGraph}`} x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops.map((stop, idx) => (
                <stop key={idx} offset={stop.offset} stopColor={stop.color} className="transition-all duration-500" />
              ))}
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-training-${currentGraph})`} />
          
          {/* Trend line with dynamic gradient */}
          <polyline
            fill="none"
            stroke={`url(#line-gradient-${currentGraph})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))`,
            }}
          />
          
          {/* Data points with tooltips */}
          {currentData.map((value, index) => {
            const x = padding + (index * (viewBoxWidth - 2 * padding)) / Math.max(currentData.length - 1, 1);
            const y = viewBoxHeight - padding - ((value - minValue) / range) * (viewBoxHeight - 2 * padding);
            const zone = getRiskZoneForValue(value, graph.thresholds);
            const pointColor = zone === "optimal" ? "#22c55e" : zone === "caution" ? "#fb923c" : "#ef4444";
            const interpretation = graph.interpretation[zone as keyof typeof graph.interpretation];
            
            return (
              <g key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <circle
                      cx={x}
                      cy={y}
                      r={hoveredPoint === index ? "5" : "3"}
                      fill={pointColor}
                      className="transition-all duration-300 ease-out cursor-pointer"
                      style={{
                        filter: `drop-shadow(0 0 ${hoveredPoint === index ? '6px' : '2px'} ${pointColor})`,
                      }}
                      onMouseEnter={() => setHoveredPoint(index)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{value.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{interpretation}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </g>
            );
          })}
        </svg>
        
        <div className={cn(
          "absolute top-4 right-4 text-right transition-all duration-300 ease-out",
          isTransitioning ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
        )}>
          <div className="text-2xl font-bold text-foreground transition-colors duration-300">
            {graph.currentValue}
          </div>
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full transition-all duration-300",
            graph.riskZone === "optimal" && "bg-green-500/20 text-green-400",
            graph.riskZone === "caution" && "bg-orange-500/20 text-orange-400", 
            graph.riskZone === "high-risk" && "bg-red-500/20 text-red-400"
          )}>
            {graph.riskZone.toUpperCase().replace('-', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Training = () => {
  const { currentDayData } = useLiveData();
  const [suggestions, setSuggestions] = useState<ReturnType<typeof generateSuggestions>>([]);
  
  // Update suggestions when currentDayData changes
  useEffect(() => {
    const newSuggestions = generateSuggestions(currentDayData);
    setSuggestions(newSuggestions);
  }, [currentDayData]);
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-32">
        <div className="container mx-auto px-6 pt-8">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-2">Training Analytics</h1>
            <p className="text-muted-foreground">Track your workouts and training progression</p>
          </div>

        {/* Accountability Challenges */}
        <div>
          <AccountabilityChallenges suggestions={suggestions} />
        </div>

        {/* Session Log and Gauges Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Session Log - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <SessionLogList />
          </div>
          
          {/* Gauges - Stacked vertically in 1 column */}
          <div className="space-y-6">
            <CircularGauge 
              title="Training Monotony" 
              value={parseFloat(currentDayData?.Monotony || "2.4")} 
              maxValue={5} 
              unit="ratio" 
            />
            <CircularGauge 
              title="Training Strain" 
              value={parseFloat(currentDayData?.Strain || "156")} 
              maxValue={200} 
              unit="TSS" 
            />
          </div>
        </div>

        {/* Trend Analysis Carousel */}
        <div>
          <GraphCarousel />
        </div>
        </div>
        <FloatingNextDayButton />
      </div>
    </TooltipProvider>
  );
};