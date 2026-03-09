import { CircleCheck as CheckCircle, Calendar, Clock, User, FileText, Play, CalendarPlus, Download, Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import { useTrainingTrends } from "@/hooks/useTrainingTrends";
import OuraSyncStatus from "@/components/OuraSyncStatus";

// Load accepted challenges from localStorage
const getAcceptedChallenges = () => {
  try {
    const stored = localStorage.getItem("acceptedAdjustments");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading accepted challenges:", error);
  }
  return [];
};

// Load bookings from localStorage
const getUpcomingBookings = () => {
  try {
    const stored = localStorage.getItem('userBookings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading bookings:", error);
  }
  return [];
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

// Dynamic graph data for PDF generation - uses metrics from hook
interface PDFMetrics {
  avgACWR: number;
  avgStrain: number;
  avgMonotony: number;
  avgEWMA: number;
  avgHRV: number;
  recoveryScore: number | null;
  fatigueIndex: number | null;
  riskScore: number;
}

const getGraphDataForPDF = (metrics: PDFMetrics) => {
  const { avgACWR, avgMonotony, avgStrain, avgEWMA } = metrics;
  
  return [
    {
      title: "Acute:Chronic Workload (ACWR)",
      currentValue: avgACWR > 0 ? avgACWR.toFixed(2) : "–",
      riskZone: avgACWR > 1.5 ? "high-risk" : avgACWR > 1.3 ? "caution" : "optimal"
    },
    {
      title: "Training Monotony",
      currentValue: avgMonotony > 0 ? avgMonotony.toFixed(2) : "–",
      riskZone: avgMonotony > 2.0 ? "caution" : "optimal"
    },
    {
      title: "Training Strain",
      currentValue: avgStrain > 0 ? avgStrain.toFixed(0) : "–",
      riskZone: avgStrain > 150 ? "high-risk" : avgStrain > 100 ? "caution" : "optimal"
    },
    {
      title: "EWMA Load",
      currentValue: avgEWMA > 0 ? avgEWMA.toFixed(0) : "–",
      riskZone: "optimal"
    }
  ];
};

interface PDFOptions {
  metrics: PDFMetrics;
  insightText: string;
  recommendations: Array<{color: string; text: string}>;
}

const generateWeeklyReportPDF = (options: PDFOptions) => {
  const { metrics, insightText, recommendations } = options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;
  const graphData = getGraphDataForPDF(metrics);

  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Health Summary", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${format(new Date(), "PPP")}`, pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 20;
  doc.setTextColor(0, 0, 0);

  // Key Metrics Summary Section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Key Metrics Summary", 20, yPosition);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Recovery & Risk Scores
  const recoveryColor = metrics.recoveryScore !== null && metrics.recoveryScore < 60 ? [239, 68, 68] : 
                        metrics.recoveryScore !== null && metrics.recoveryScore < 75 ? [251, 146, 60] : [34, 197, 94];
  const riskColor = metrics.riskScore > 60 ? [239, 68, 68] : 
                    metrics.riskScore > 30 ? [251, 146, 60] : [34, 197, 94];
  const fatigueColor = metrics.fatigueIndex !== null && metrics.fatigueIndex > 70 ? [239, 68, 68] : 
                       metrics.fatigueIndex !== null && metrics.fatigueIndex > 50 ? [251, 146, 60] : [34, 197, 94];

  doc.text("• Recovery Score:", 25, yPosition);
  doc.setTextColor(recoveryColor[0], recoveryColor[1], recoveryColor[2]);
  doc.text(`${metrics.recoveryScore !== null ? metrics.recoveryScore + '/100' : 'N/A'}`, 80, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 8;

  doc.text("• Risk Score:", 25, yPosition);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`${metrics.riskScore}/100`, 80, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 8;

  doc.text("• Fatigue Index:", 25, yPosition);
  doc.setTextColor(fatigueColor[0], fatigueColor[1], fatigueColor[2]);
  doc.text(`${metrics.fatigueIndex !== null ? metrics.fatigueIndex + '%' : 'N/A'}`, 80, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 8;

  doc.text("• Average HRV:", 25, yPosition);
  doc.text(`${metrics.avgHRV.toFixed(1)} ms`, 80, yPosition);
  yPosition += 15;

  // Training Metrics Section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Training Metrics", 20, yPosition);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  if (graphData.length > 0) {
    graphData.forEach((graph) => {
      const riskColorArr = graph.riskZone === "optimal" ? [34, 197, 94] : 
                        graph.riskZone === "caution" ? [251, 146, 60] : 
                        [239, 68, 68];
      
      doc.setTextColor(0, 0, 0);
      doc.text(`• ${graph.title}:`, 25, yPosition);
      doc.text(`${graph.currentValue}`, 90, yPosition);
      
      doc.setTextColor(riskColorArr[0], riskColorArr[1], riskColorArr[2]);
      doc.text(`(${graph.riskZone.toUpperCase()})`, 120, yPosition);
      doc.setTextColor(0, 0, 0);
      
      yPosition += 8;
    });
  } else {
    doc.text("• No training data available", 25, yPosition);
    yPosition += 8;
  }

  yPosition += 15;

  // Weekly Insights Section (dynamic)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Analysis", 20, yPosition);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const splitInsight = doc.splitTextToSize(insightText, pageWidth - 50);
  doc.text(splitInsight, 25, yPosition);
  yPosition += splitInsight.length * 6 + 10;

  // Recommendations Section (dynamic)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Recommendations for Next Week", 25, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  recommendations.forEach((rec) => {
    const recColor = rec.color === "red" ? [239, 68, 68] : 
                     rec.color === "yellow" ? [251, 146, 60] : 
                     rec.color === "blue" ? [59, 130, 246] : [34, 197, 94];
    
    doc.setTextColor(recColor[0], recColor[1], recColor[2]);
    doc.text("●", 30, yPosition);
    doc.setTextColor(60, 60, 60);
    const recText = doc.splitTextToSize(rec.text, pageWidth - 65);
    doc.text(recText, 38, yPosition);
    yPosition += recText.length * 6 + 4;
  });

  yPosition += 15;

  // Accepted Challenges Section
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Accepted Challenges", 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const acceptedChallenges = getAcceptedChallenges();
  if (acceptedChallenges.length > 0) {
    acceptedChallenges.forEach((challenge: any, index: number) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${challenge.text}`, 25, yPosition, { maxWidth: pageWidth - 50 });
      yPosition += 7;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`   Category: ${challenge.category} | Accepted: ${challenge.dateAccepted}`, 25, yPosition);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    });
  } else {
    doc.text("No accepted challenges yet", 25, yPosition);
    yPosition += 10;
  }

  yPosition += 10;

  // Upcoming Bookings Section
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Upcoming Bookings", 20, yPosition);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const bookings = getUpcomingBookings();
  if (bookings.length > 0) {
    bookings.forEach((booking: any, index: number) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`${index + 1}. ${booking.service}`, 25, yPosition);
      yPosition += 7;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`   Clinician: ${booking.clinician}`, 25, yPosition);
      yPosition += 5;
      doc.text(`   Date: ${booking.date} at ${booking.time} (${booking.type})`, 25, yPosition);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    });
  } else {
    doc.text("No upcoming bookings", 25, yPosition);
  }

  // Save the PDF
  doc.save(`weekly-health-summary-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

const AcceptedChallengesSection = () => {
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [allChallenges, setAllChallenges] = useState<any[]>([]);

  // Load accepted adjustments from localStorage on mount
  useEffect(() => {
    const storedAdjustments = getAcceptedChallenges();
    setAllChallenges(storedAdjustments);
  }, []);

  const handleCalendarClick = (challenge: any) => {
    setSelectedChallenge(challenge);
    setIsCalendarModalOpen(true);
  };

  const handleAddToCalendar = () => {
    if (selectedChallenge) {
      // Create Google Calendar URL with prefilled event using selected date and time
      const eventTitle = encodeURIComponent(selectedChallenge.text);
      const eventDescription = encodeURIComponent(`${selectedChallenge.category} challenge from your training plan`);
      
      // Parse selected time and create start date
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      // Create end date (1 hour duration)
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1);
      
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDescription}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`;
      
      window.open(googleCalendarUrl, '_blank');
    }
    setIsCalendarModalOpen(false);
    setSelectedChallenge(null);
  };

  return (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu mb-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <CheckCircle size={16} className="text-green-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Accepted Challenges</h3>
      <div className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
        {allChallenges.length} Active
      </div>
    </div>
    <div className="space-y-4">
      {allChallenges.map((challenge) => (
        <div key={challenge.id} className={cn(
          "bg-glass/30 backdrop-blur-sm border border-glass-border rounded-xl p-4 transition-all duration-200 border-l-4",
          getAccentColor(challenge.accentColor)
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded-md border transition-colors duration-200",
                  getCategoryStyle(challenge.category)
                )}>
                  {challenge.category}
                </span>
                <div className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-md border border-green-400/30">
                  Active
                </div>
              </div>
              <p className="font-medium text-foreground leading-relaxed">{challenge.text}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Accepted: {challenge.dateAccepted}</span>
                {challenge.scheduledDate && challenge.scheduledTime && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md border border-primary/30">
                    <Calendar size={12} className="text-primary" />
                    <span className="text-primary font-medium">
                      Scheduled: {format(new Date(challenge.scheduledDate), "MMM dd")} at {challenge.scheduledTime}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Action Icons */}
              {(challenge.hasPdf || challenge.hasVideo) && (
                <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity duration-200">
                  {challenge.hasPdf && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            className="p-2 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                            onClick={() => {}}
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
                  {challenge.hasVideo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            className="p-2 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                            onClick={() => {}}
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="p-2 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                          onClick={() => handleCalendarClick(challenge)}
                        >
                          <CalendarPlus size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to calendar?</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              
              <div className="px-4 py-2 text-sm font-medium bg-green-500/20 text-green-400 rounded-lg shadow-glow">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  <span>In Progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Calendar Modal */}
    <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
      <DialogContent className="sm:max-w-md bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Add to Google Calendar
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <p className="text-muted-foreground">
            Select when you want to schedule this challenge:
          </p>
          
          <div className="bg-glass/30 rounded-lg border border-glass-border p-3">
            <p className="text-sm font-medium text-foreground mb-3">
              {selectedChallenge?.text}
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="date" className="text-sm text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1 bg-glass/30 border-glass-border hover:bg-glass-highlight",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-glass backdrop-blur-xl border border-glass-border" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="time" className="text-sm text-muted-foreground">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="mt-1 bg-glass/30 border-glass-border focus:border-primary"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleAddToCalendar}
              className="flex-1 p-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
            >
              Add to calendar
            </button>
            <button
              onClick={() => {
                setIsCalendarModalOpen(false);
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
  </div>
);

};

const WeeklyInsightsSection = () => {
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const { trends, isLoading } = useTrainingTrends({ days: 7 });
  
  // Calculate 7-day rolling averages using unified calculator
  const metrics = useMemo(() => {
    if (trends.length === 0) {
      return {
        avgHRV: 0,
        avgACWR: 0,
        avgSleepScore: null,
        avgStrain: 0,
        avgMonotony: 0,
        avgEWMA: 0,
        recoveryScore: null,
        fatigueIndex: null,
        riskScore: null
      };
    }
    
    const avgHRV = trends.reduce((sum, t) => sum + (t.hrv || 0), 0) / trends.length;
    const avgACWR = trends.reduce((sum, t) => sum + (t.acwr || 0), 0) / trends.length;
    
    // Sleep score from wearable trends
    const sleepScores = trends
      .filter((t: any) => t.sleep_score != null && t.sleep_score > 0)
      .map((t: any) => t.sleep_score);
    const avgSleepScore = sleepScores.length > 0
      ? sleepScores.reduce((sum: number, score: number) => sum + score, 0) / sleepScores.length
      : null;
    
    // Training Strain: Weekly Load × Monotony (from calculate-oura-trends)
    const avgStrain = trends.reduce((sum, t) => sum + (t.strain || 0), 0) / trends.length;
    
    // Training Monotony: Mean Daily Load ÷ SD of Daily Load
    const avgMonotony = trends.reduce((sum, t) => sum + (t.monotony || 0), 0) / trends.length;
    
    // EWMA Load (Exponentially Weighted Moving Average)
    const avgEWMA = trends.reduce((sum, t) => sum + (t.ewma || 0), 0) / trends.length;
    
    // Recovery Score: Based on sleep score and HRV (higher = better recovery)
    // Formula: (Sleep Score × 0.6) + (HRV normalized × 0.4)
    const recoveryScore = avgSleepScore !== null && avgHRV > 0
      ? Math.round((avgSleepScore * 0.6) + (Math.min(avgHRV / 100, 1) * 40))
      : null;
    
    // Fatigue Index: Inversely related to recovery, based on strain and monotony
    // Formula: (Strain / 2000) × 50 + (cappedMonotony / 2.5) × 50, capped at 100
    const cappedStrain = Math.min(avgStrain, 2000);
    const cappedMonotony = Math.min(avgMonotony, 2.5);
    const fatigueIndex = avgStrain > 0 || avgMonotony > 0
      ? Math.min(100, Math.round((cappedStrain / 2000) * 50 + (cappedMonotony / 2.5) * 50))
      : null;
    
    // Risk Score: Composite based on ACWR, strain, and fatigue
    // Higher ACWR (>1.3) or high fatigue = higher risk
    let riskScore = 0;
    if (avgACWR > 1.5) riskScore += 40;
    else if (avgACWR > 1.3) riskScore += 25;
    else if (avgACWR > 1.0) riskScore += 10;
    
    if (avgStrain > 150) riskScore += 30;
    else if (avgStrain > 100) riskScore += 15;
    
    if (fatigueIndex && fatigueIndex > 70) riskScore += 30;
    else if (fatigueIndex && fatigueIndex > 50) riskScore += 15;
    
    return {
      avgHRV,
      avgACWR,
      avgSleepScore,
      avgStrain,
      avgMonotony,
      avgEWMA,
      recoveryScore,
      fatigueIndex,
      riskScore: Math.min(100, riskScore)
    };
  }, [trends]);
  
  const { avgHRV, avgACWR, avgSleepScore, avgStrain, avgMonotony, avgEWMA, recoveryScore, fatigueIndex, riskScore } = metrics;
  
  // Generate dynamic summary based on all metrics
  const generateSummary = () => {
    const parts = [];
    
    // Recovery assessment
    if (recoveryScore !== null && recoveryScore < 60) {
      parts.push("Your recovery was below target this week");
    } else if (recoveryScore !== null && recoveryScore > 75) {
      parts.push("Excellent recovery this week");
    } else if (recoveryScore !== null) {
      parts.push("Recovery was moderate this week");
    }
    
    // Training load assessment
    if (avgACWR > 1.5) {
      parts.push("Training load was very high, increasing injury risk");
    } else if (avgACWR > 1.3) {
      parts.push("Training load was elevated, causing increased strain");
    } else if (avgACWR < 0.8) {
      parts.push("Training load was light, allowing for good recovery");
    }
    
    // Risk assessment
    if (riskScore > 60) {
      parts.push("High risk detected - consider reducing training intensity");
    } else if (fatigueIndex && fatigueIndex > 70) {
      parts.push("Fatigue levels are elevated - prioritize rest");
    }
    
    if (parts.length === 0) {
      parts.push("Training and recovery are well balanced this week");
    }
    
    return parts.join(". ") + ".";
  };
  
  // Generate dynamic recommendations based on all metrics
  const generateRecommendations = () => {
    const recommendations = [];
    
    // Risk-based recommendations (highest priority)
    if (riskScore > 60) {
      recommendations.push({
        color: "red",
        text: "High risk detected: Reduce training intensity by 30-40% this week"
      });
    }
    
    // Fatigue-based recommendations
    if (fatigueIndex && fatigueIndex > 70) {
      recommendations.push({
        color: "yellow",
        text: "Fatigue is high: Add extra rest day and focus on active recovery"
      });
    }
    
    // ACWR-based recommendations
    if (avgACWR > 1.5) {
      recommendations.push({
        color: "red",
        text: "ACWR in danger zone: Significantly reduce training volume to prevent injury"
      });
    } else if (avgACWR > 1.3) {
      recommendations.push({
        color: "yellow",
        text: "Reduce training volume by 15-20% to prevent overtraining"
      });
    }
    
    // Monotony recommendations
    if (avgMonotony > 2.0) {
      recommendations.push({
        color: "yellow",
        text: "Training monotony is high: Vary your workout intensity more throughout the week"
      });
    }
    
    // HRV-based recommendations
    if (avgHRV < 50) {
      recommendations.push({
        color: "red",
        text: "Low HRV indicates stress: Prioritize sleep and consider lighter workouts"
      });
    } else if (avgHRV < 60) {
      recommendations.push({
        color: "green",
        text: "Add recovery sessions focusing on mobility and light stretching"
      });
    }
    
    // Recovery score recommendations
    if (recoveryScore !== null && recoveryScore < 60) {
      recommendations.push({
        color: "blue",
        text: "Prioritize sleep quality with 8+ hours per night to improve recovery"
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        color: "green",
        text: "Maintain current training balance and recovery practices"
      });
    }
    
    return recommendations;
  };

  return (
    <>
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <TrendingUp size={16} className="text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Weekly Insights</h3>
          <button
            onClick={() => setIsInfoDialogOpen(true)}
            className="ml-auto p-1.5 rounded-md hover:bg-glass/30 hover:scale-110 active:scale-95 transition-all duration-200"
            aria-label="Information about Weekly Insights"
          >
            <Info size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
          </button>
        </div>

        {/* Primary Metrics - 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">ACWR</p>
            <p className={cn(
              "text-lg font-bold",
              avgACWR > 1.5 ? "text-red-400" : avgACWR > 1.3 ? "text-yellow-400" : "text-green-400"
            )}>{avgACWR.toFixed(2)}</p>
          </div>
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">Training Strain</p>
            <p className={cn(
              "text-lg font-bold",
              avgStrain > 150 ? "text-red-400" : avgStrain > 100 ? "text-yellow-400" : "text-foreground"
            )}>{avgStrain.toFixed(0)}</p>
          </div>
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">Monotony</p>
            <p className={cn(
              "text-lg font-bold",
              avgMonotony > 2.0 ? "text-yellow-400" : "text-foreground"
            )}>{avgMonotony.toFixed(2)}</p>
          </div>
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">EWMA Load</p>
            <p className="text-lg font-bold text-foreground">{avgEWMA.toFixed(0)}</p>
          </div>
        </div>
        
        {/* Secondary Metrics - 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">Recovery Score</p>
            <p className={cn(
              "text-lg font-bold",
              recoveryScore !== null && recoveryScore < 60 ? "text-red-400" : 
              recoveryScore !== null && recoveryScore < 75 ? "text-yellow-400" : "text-green-400"
            )}>{recoveryScore !== null ? recoveryScore : "—"}</p>
          </div>
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">Fatigue Index</p>
            <p className={cn(
              "text-lg font-bold",
              fatigueIndex !== null && fatigueIndex > 70 ? "text-red-400" : 
              fatigueIndex !== null && fatigueIndex > 50 ? "text-yellow-400" : "text-green-400"
            )}>{fatigueIndex !== null ? fatigueIndex : "—"}</p>
          </div>
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
            <p className={cn(
              "text-lg font-bold",
              riskScore > 60 ? "text-red-400" : riskScore > 30 ? "text-yellow-400" : "text-green-400"
            )}>{riskScore}</p>
          </div>
          <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 transition-all duration-300 hover:bg-glass-highlight">
            <p className="text-xs text-muted-foreground mb-1">Avg HRV</p>
            <p className="text-lg font-bold text-foreground">{avgHRV.toFixed(1)}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-xl p-4 mb-4 transition-all duration-300">
          <p className="text-foreground leading-relaxed">
            {generateSummary()}
          </p>
        </div>

        {/* Recommendations */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recommendations for Next Week
          </h4>
          <div className="space-y-2">
            {generateRecommendations().map((rec, index) => (
              <div key={index} className="flex items-start gap-3 bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 hover:bg-glass-highlight transition-all duration-300">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
                  rec.color === "green" && "bg-green-400",
                  rec.color === "yellow" && "bg-yellow-400",
                  rec.color === "blue" && "bg-blue-400",
                  rec.color === "red" && "bg-red-400"
                )} />
                <p className="text-sm text-foreground">{rec.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={() => generateWeeklyReportPDF({
            metrics: {
              avgACWR,
              avgStrain,
              avgMonotony,
              avgEWMA,
              avgHRV,
              recoveryScore,
              fatigueIndex,
              riskScore
            },
            insightText: generateSummary(),
            recommendations: generateRecommendations()
          })}
          disabled={trends.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-400/30 hover:bg-purple-500/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Download size={18} />
          <span>Download Weekly Report</span>
        </button>
      </div>

      {/* Info Dialog */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-md bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Info size={20} className="text-primary" />
              About Weekly Insights
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <p className="text-foreground leading-relaxed">
              Weekly Insights summarize your progress and risks from the last 7 days.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This analysis combines your training load, recovery metrics, and health data to provide personalized recommendations that help you optimize performance while minimizing injury risk.
            </p>
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mt-4">
              <p className="text-sm text-primary font-medium">
                💡 Tip: Review these insights every Monday to plan your week effectively.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const UpcomingBookingsSection = () => {
  const [allBookings, setAllBookings] = useState<any[]>([]);

  useEffect(() => {
    // Load bookings from localStorage
    const userBookings = getUpcomingBookings();
    setAllBookings(userBookings);
  }, []);
  
  if (allBookings.length === 0) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 shadow-glass text-center">
        <div className="space-y-4">
          <Calendar size={48} className="mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold text-foreground">No Upcoming Bookings</h3>
          <p className="text-muted-foreground">Schedule appointments to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
          <Calendar size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Upcoming Bookings</h3>
        <div className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
          {allBookings.length} Scheduled
        </div>
      </div>
      <div className="space-y-4">
        {allBookings.map((booking) => (
          <div key={booking.id} className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-xl p-4 transition-all duration-200 border-l-4 border-l-primary hover:bg-glass-highlight">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-1 text-xs font-medium rounded-md border border-primary/30 text-primary bg-primary/10"
                  )}>
                    {booking.type}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{booking.service}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>{booking.clinician}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{booking.time}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-2 text-sm font-medium bg-primary/20 text-primary rounded-lg">
                Confirmed
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const YourPlan = () => {
  const { userId } = useTrainingTrends({ days: 7 });
  
  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
          <div className="animate-fade-in-slow">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Your Plan</h1>
          </div>
          <div className="animate-slide-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <p className="text-muted-foreground text-base md:text-lg">
              {userId ? "Track your active challenges and upcoming appointments" : "Please connect your Ōura Ring to see your plan"}
            </p>
          </div>
          
          {/* Sync Status */}
          <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <OuraSyncStatus />
          </div>
          
          {/* Generate Report Button */}
          {userId && (
            <div className="flex justify-center mt-6">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        // Use default empty metrics - user should use the button in WeeklyInsightsSection
                        generateWeeklyReportPDF({
                          metrics: {
                            avgACWR: 0,
                            avgStrain: 0,
                            avgMonotony: 0,
                            avgEWMA: 0,
                            avgHRV: 0,
                            recoveryScore: null,
                            fatigueIndex: null,
                            riskScore: 0
                          },
                          insightText: "Connect your wearable device to see personalized insights.",
                          recommendations: [{ color: "blue", text: "Connect your wearable device to generate personalized recommendations." }]
                        });
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-primary/20 text-primary rounded-lg border border-primary/30 hover:bg-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-glow"
                    >
                      <Download size={18} />
                      <span>Generate Weekly Report</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download a PDF summary of your weekly health data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {!userId ? (
          <div className="text-center py-12 px-4 bg-glass backdrop-blur-xl border border-glass-border rounded-2xl">
            <p className="text-muted-foreground mb-4">No user authenticated</p>
            <p className="text-sm text-muted-foreground">Please log in to view your plan and challenges</p>
          </div>
        ) : (
          <>
            {/* Accepted Challenges */}
            <AcceptedChallengesSection />

            {/* Weekly Insights */}
            <WeeklyInsightsSection />

            {/* Upcoming Bookings */}
            <UpcomingBookingsSection />
          </>
        )}
      </div>
    </div>
  );
};