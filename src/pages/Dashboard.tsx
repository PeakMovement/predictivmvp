import { TrendingUp, Target, AlertTriangle, FileText, Play, ChevronLeft, ChevronRight, RefreshCw, Download, AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { format } from "date-fns";

const metrics = [
  { name: "Acute:Chronic Workload Ratio", value: "1.2", status: "green" },
  { name: "Training Monotony", value: "2.4", status: "yellow" },
  { name: "Training Strain", value: "156", status: "red" },
  { name: "Weekly Training Load", value: "420", status: "green" },
  { name: "EWMA Trend", value: "+5.2%", status: "green" },
];

// Demo health metrics for Today's Plan
const healthMetrics = {
  hrv: { value: 45, status: "low", change: -15 }, // HRV dropped by 15
  strain: { value: 156, status: "high", weeklyChange: 22 }, // Increased 22% this week
  sleep: { value: 7.5, status: "good" },
  recovery: { value: 65, status: "moderate" }
};

const generateAlerts = () => {
  const alerts = [];
  
  const acwr = parseFloat(metrics.find(m => m.name === "Acute:Chronic Workload Ratio")?.value || "0");
  const monotony = parseFloat(metrics.find(m => m.name === "Training Monotony")?.value || "0");
  const strain = parseFloat(metrics.find(m => m.name === "Training Strain")?.value || "0");
  const strainStatus = metrics.find(m => m.name === "Training Strain")?.status;
  
  // Critical alerts (red)
  if (acwr > 1.5) {
    alerts.push({
      severity: "critical",
      message: "Overload risk detected. ACWR is above safe threshold.",
      actionText: "Reduce training load by 20% this week",
      metric: "ACWR",
      value: acwr.toFixed(1),
      category: "Training"
    });
  }
  
  // Warning alerts (orange/yellow)
  if (monotony > 2.0) {
    alerts.push({
      severity: "warning",
      message: "Training is too repetitive. Add variation to your sessions.",
      actionText: "Add 2 varied training sessions this week",
      metric: "Monotony",
      value: monotony.toFixed(1),
      category: "Training"
    });
  }
  
  if (strainStatus === "red" || healthMetrics.strain.weeklyChange > 15) {
    alerts.push({
      severity: "warning",
      message: `Strain increased ${healthMetrics.strain.weeklyChange}% this week. Plan a deload.`,
      actionText: "Schedule a deload week to reduce intensity",
      metric: "Strain",
      value: strain.toString(),
      category: "Recovery"
    });
  }
  
  return alerts;
};

const generateTodaysPlan = () => {
  const recommendations = [];
  
  // Priority 1: Check HRV drop
  if (healthMetrics.hrv.status === "low" && healthMetrics.hrv.change < -10) {
    recommendations.push({
      priority: "high",
      title: "Recovery Day Recommended",
      message: "Your HRV dropped significantly overnight. Swap today's training for mobility work or light stretching.",
      actionText: "Swap training for mobility work today",
      icon: "🧘",
      category: "Recovery"
    });
  }
  
  // Priority 2: Check high strain
  if (healthMetrics.strain.status === "high" && healthMetrics.strain.value > 150) {
    recommendations.push({
      priority: "medium",
      title: "Reduce Training Load",
      message: "Your strain is elevated. Consider a lighter session today—focus on technique over intensity.",
      actionText: "Reduce training intensity today",
      icon: "⚖️",
      category: "Training"
    });
  }
  
  // Priority 3: All metrics green - performance push
  if (healthMetrics.hrv.status === "good" && 
      healthMetrics.strain.status === "optimal" && 
      healthMetrics.recovery.value > 75) {
    recommendations.push({
      priority: "low",
      title: "Performance Day",
      message: "All systems are optimal! This is a great day to add interval training or push intensity.",
      actionText: "Add interval training session today",
      icon: "🚀",
      category: "Training"
    });
  }
  
  // Default if no specific conditions met but some caution
  if (recommendations.length === 0 && healthMetrics.recovery.value < 70) {
    recommendations.push({
      priority: "medium",
      title: "Moderate Training",
      message: "Your recovery is moderate. Stick to your planned session but listen to your body.",
      actionText: "Continue with planned training",
      icon: "💪",
      category: "Training"
    });
  }
  
  // If still no recommendations, give a general positive message
  if (recommendations.length === 0) {
    recommendations.push({
      priority: "low",
      title: "Balanced Day",
      message: "Your metrics look balanced. Continue with your planned training session.",
      actionText: "Continue with planned training",
      icon: "✅",
      category: "Training"
    });
  }
  
  // Return top 2 recommendations
  return recommendations.slice(0, 2);
};

const graphData = [
  {
    title: "EWMA Trend Analysis",
    subtitle: "Exponentially weighted moving average over 28 days",
    currentValue: "+5.2%",
    riskZone: "optimal", // optimal, caution, high-risk
    dataPoints: [65, 68, 72, 70, 75, 78, 82, 80, 85, 88, 90, 87, 89, 92, 95]
  },
  {
    title: "Acute:Chronic Workload",
    subtitle: "Training load ratio over time",
    currentValue: "1.2",
    riskZone: "optimal",
    dataPoints: [1.3, 1.2, 1.1, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 1.2, 1.3, 1.2, 1.1, 1.2]
  },
  {
    title: "Weekly Training Load",
    subtitle: "Total training stress by week",
    currentValue: "420 TSS",
    riskZone: "caution",
    dataPoints: [380, 390, 400, 420, 440, 430, 420, 410, 430, 450, 440, 420, 410, 420, 420]
  },
  {
    title: "Training Strain Trend",
    subtitle: "Daily strain accumulation",
    currentValue: "156",
    riskZone: "high-risk",
    dataPoints: [120, 130, 140, 145, 150, 155, 160, 158, 162, 165, 160, 158, 156, 154, 156]
  }
];

const getRiskColor = (zone: string, isGlow = false) => {
  const colors = {
    optimal: isGlow ? "rgba(34, 197, 94, 0.6)" : "#22c55e",
    caution: isGlow ? "rgba(251, 146, 60, 0.6)" : "#fb923c", 
    "high-risk": isGlow ? "rgba(239, 68, 68, 0.6)" : "#ef4444"
  };
  return colors[zone as keyof typeof colors] || colors.optimal;
};

const recommendations = [
  "Consider reducing training intensity by 15% this week",
  "Add 2 recovery sessions to prevent overreaching",
  "Focus on sleep quality to improve adaptation"
];

// Helper function to save accepted adjustment to localStorage
const saveAcceptedAdjustment = (adjustmentText: string, category: string) => {
  const existingAdjustments = JSON.parse(localStorage.getItem("acceptedAdjustments") || "[]");
  
  const newAdjustment = {
    id: Date.now(),
    text: adjustmentText,
    category: category,
    accentColor: category === "Recovery" ? "green" : category === "Training" ? "yellow" : "red",
    hasVideo: false,
    hasPdf: false,
    dateAccepted: format(new Date(), "yyyy-MM-dd"),
    scheduledDate: null,
    scheduledTime: null
  };
  
  existingAdjustments.push(newAdjustment);
  localStorage.setItem("acceptedAdjustments", JSON.stringify(existingAdjustments));
  
  toast({
    title: "Adjustment added to Your Plan",
    description: "You can view it in the Your Plan section.",
  });
};

const generateDailyNudge = () => {
  const acwr = parseFloat(metrics.find(m => m.name === "Acute:Chronic Workload Ratio")?.value || "0");
  const monotony = parseFloat(metrics.find(m => m.name === "Training Monotony")?.value || "0");
  const strainStatus = metrics.find(m => m.name === "Training Strain")?.status;

  // Priority-based logic
  if (acwr > 1.5) {
    return "Load is high. Add a recovery day.";
  }
  if (monotony > 2.0) {
    return "Your training is repetitive. Add variety this week.";
  }
  if (strainStatus === "red") {
    return "Strain is elevated. Consider reducing intensity tomorrow.";
  }
  return "Great balance this week. Keep it up.";
};

const focusAreas = [
  { area: "Recovery Quality", score: "6.8/10", status: "yellow" },
  { area: "Training Consistency", score: "8.2/10", status: "green" },
  { area: "Load Progression", score: "4.5/10", status: "red" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "green": return "bg-green-500";
    case "yellow": return "bg-yellow-500";
    case "red": return "bg-red-500";
    default: return "bg-muted";
  }
};

const MetricCard = ({ metric }: { metric: typeof metrics[0] }) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu will-change-transform active:scale-95">
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-sm font-medium text-muted-foreground leading-tight">{metric.name}</h3>
      <div className={cn("w-3 h-3 rounded-full shadow-glow animate-bounce-subtle", getStatusColor(metric.status))} />
    </div>
    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
  </div>
);

const WelcomeHeader = () => (
  <div className="text-center mb-12 space-y-4">
    <div className="animate-fade-in-slow">
      <h1 className="text-2xl font-light text-muted-foreground mb-2">Hello,</h1>
      <h2 className="text-4xl font-bold text-foreground tracking-tight">Alex Johnson</h2>
    </div>
    <div className="animate-slide-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
      <p className="text-muted-foreground text-lg">Here's your training overview for today</p>
    </div>
  </div>
);

const generateWeeklyReportPDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

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

  // Current Risk Graphs Section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Current Risk Graphs", 20, yPosition);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  graphData.forEach((graph) => {
    const riskColor = graph.riskZone === "optimal" ? [34, 197, 94] : 
                      graph.riskZone === "caution" ? [251, 146, 60] : 
                      [239, 68, 68];
    
    doc.setTextColor(0, 0, 0);
    doc.text(`• ${graph.title}:`, 25, yPosition);
    doc.text(`${graph.currentValue}`, 80, yPosition);
    
    doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.text(`(${graph.riskZone.toUpperCase()})`, 110, yPosition);
    doc.setTextColor(0, 0, 0);
    
    yPosition += 8;
  });

  yPosition += 15;

  // Weekly Insights Section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Insights", 20, yPosition);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const insightText = "Your recovery was below target this week. Training load was high on Wednesday, causing increased strain. Consider adjusting your upcoming sessions to allow for better recovery.";
  const splitInsight = doc.splitTextToSize(insightText, pageWidth - 50);
  doc.text(splitInsight, 25, yPosition);
  yPosition += splitInsight.length * 6 + 10;

  // Recommendations Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Recommendations for Next Week", 25, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  
  recommendations.forEach((rec) => {
    doc.text(`• ${rec}`, 30, yPosition, { maxWidth: pageWidth - 60 });
    yPosition += 8;
  });

  yPosition += 15;

  // Weekly Highlights Section
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Highlights", 20, yPosition);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("• Best Training Day: Tuesday", 25, yPosition);
  yPosition += 8;
  doc.text("• Total Training Sessions: 5", 25, yPosition);
  yPosition += 8;
  doc.text("• Average Strain: 142 TSS", 25, yPosition);
  yPosition += 8;
  doc.text("• Recovery Score: 8.2/10", 25, yPosition);
  yPosition += 8;
  doc.text("• Peak Heart Rate: 178 bpm", 25, yPosition);

  // Save the PDF
  doc.save(`weekly-health-summary-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

const WeeklyInsightsCard = () => {
  const handleRunReport = () => {
    toast({
      title: "Weekly Report Generated (Demo)",
      description: "Your weekly health summary has been created.",
    });
    generateWeeklyReportPDF();
  };

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
          <TrendingUp size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Weekly Insights</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Your recovery was below target this week. Training load was high on Wednesday, causing increased strain. Consider adjusting your upcoming sessions to allow for better recovery.
      </p>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-3">Recommendations</h4>
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0 animate-bounce-subtle" />
              <p className="text-sm text-muted-foreground">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleRunReport}
        className="w-full bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-glass-border rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-glow active:scale-95"
      >
        <Download size={16} />
        <span className="font-medium">Run Weekly Report (Demo)</span>
      </button>
    </div>
  );
};

const RecommendationCard = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <AlertTriangle size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
    </div>
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div key={index} className="flex items-center justify-between gap-3 hover:bg-glass-highlight rounded-lg p-2 -m-2 transition-all duration-200">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0 animate-bounce-subtle" />
            <p className="text-sm text-muted-foreground">{rec}</p>
          </div>
          <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => console.log('Download PDF for:', rec)}
                >
                  <FileText size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download PDF</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => console.log('Watch Video for:', rec)}
                >
                  <Play size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Watch Video</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AlertsCard = () => {
  const [alerts, setAlerts] = useState(generateAlerts());
  const [acceptedAlerts, setAcceptedAlerts] = useState<number[]>([]);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/30 hover:bg-red-500/15";
      case "warning":
        return "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15";
      default:
        return "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15";
    }
  };

  const getSeverityIcon = (severity: string) => {
    return severity === "critical" ? "🚨" : "⚠️";
  };

  const handleAcceptAlert = (index: number, actionText: string, category: string) => {
    saveAcceptedAdjustment(actionText, category);
    setAcceptedAlerts([...acceptedAlerts, index]);
  };

  const handleDismissAlert = (index: number) => {
    setAlerts(alerts.filter((_, i) => i !== index));
  };

  const activeAlerts = alerts.filter((_, i) => !acceptedAlerts.includes(i));

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <AlertCircle size={16} className="text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Alerts</h3>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <span className="text-2xl">✅</span>
          <p className="text-sm text-muted-foreground">No alerts. All metrics within safe ranges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200 animate-bounce-subtle">
          <AlertCircle size={16} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Alerts</h3>
        <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-red-500/20 text-red-400">
          {activeAlerts.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const isAccepted = acceptedAlerts.includes(index);
          
          return (
            <div 
              key={index}
              className={cn(
                "p-3 rounded-lg border transition-all duration-200",
                isAccepted ? "bg-green-500/10 border-green-500/30" : getSeverityStyle(alert.severity)
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 animate-bounce-subtle">
                  {isAccepted ? "✅" : getSeverityIcon(alert.severity)}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {alert.metric}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {alert.value}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-tight mb-3">{alert.message}</p>
                  
                  {!isAccepted ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptAlert(index, alert.actionText, alert.category)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <CheckCircle size={14} />
                        Accept Adjustment
                      </button>
                      <button
                        onClick={() => handleDismissAlert(index)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <X size={14} />
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-green-400 font-medium">Added to Your Plan</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TodaysPlanCard = () => {
  const [todaysRecommendations, setTodaysRecommendations] = useState(generateTodaysPlan());
  const [acceptedRecommendations, setAcceptedRecommendations] = useState<number[]>([]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 border-red-500/30";
      case "medium": return "bg-yellow-500/10 border-yellow-500/30";
      case "low": return "bg-green-500/10 border-green-500/30";
      default: return "bg-primary/10 border-primary/30";
    }
  };

  const handleAcceptRecommendation = (index: number, actionText: string, category: string) => {
    saveAcceptedAdjustment(actionText, category);
    setAcceptedRecommendations([...acceptedRecommendations, index]);
  };

  const handleDismissRecommendation = (index: number) => {
    setTodaysRecommendations(todaysRecommendations.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
          <Target size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Today's Plan</h3>
      </div>
      
      <div className="space-y-4">
        {todaysRecommendations.map((rec, index) => {
          const isAccepted = acceptedRecommendations.includes(index);
          
          return (
            <div 
              key={index}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200",
                isAccepted ? "bg-green-500/10 border-green-500/30" : getPriorityColor(rec.priority)
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{isAccepted ? "✅" : rec.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{rec.message}</p>
                  
                  {!isAccepted ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRecommendation(index, rec.actionText, rec.category)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <CheckCircle size={14} />
                        Accept Adjustment
                      </button>
                      <button
                        onClick={() => handleDismissRecommendation(index)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <X size={14} />
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-green-400 font-medium">Added to Your Plan</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-glass-border">
        <p className="text-xs text-muted-foreground text-center">
          Based on your HRV ({healthMetrics.hrv.value}ms), Strain ({healthMetrics.strain.value}), and Sleep ({healthMetrics.sleep.value}h)
        </p>
      </div>
    </div>
  );
};

const DailyNudgeCard = () => {
  const [nudgeMessage, setNudgeMessage] = useState(generateDailyNudge());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshNudge = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNudgeMessage(generateDailyNudge());
      setIsRefreshing(false);
    }, 300);
  };

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Daily Nudge</h3>
        <button
          onClick={refreshNudge}
          className={cn(
            "p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-glow",
            isRefreshing && "animate-spin"
          )}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className="text-primary" />
        </button>
      </div>
      <p 
        className={cn(
          "text-muted-foreground transition-all duration-300",
          isRefreshing ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}
      >
        {nudgeMessage}
      </p>
    </div>
  );
};

const FocusAreasCard = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <Target size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Focus Areas</h3>
    </div>
    <div className="space-y-4">
      {focusAreas.map((area, index) => (
        <div key={index} className="flex items-center justify-between hover:bg-glass-highlight rounded-lg p-2 -m-2 transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full animate-bounce-subtle", getStatusColor(area.status))} />
            <span className="text-sm font-medium text-foreground">{area.area}</span>
          </div>
          <span className="text-sm text-muted-foreground">{area.score}</span>
        </div>
      ))}
    </div>
  </div>
);

const GraphCarousel = () => {
  const [currentGraph, setCurrentGraph] = useState(0);
  const [timeRange, setTimeRange] = useState(30);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
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
  const lineColor = getRiskColor(graph.riskZone);
  const glowColor = getRiskColor(graph.riskZone, true);
  
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
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id={`grid-${currentGraph}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${currentGraph})`} />
          
          {/* Trend line */}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 4px ${glowColor})`,
            }}
          />
          
          {/* Data points */}
          {currentData.map((value, index) => {
            const x = padding + (index * (viewBoxWidth - 2 * padding)) / Math.max(currentData.length - 1, 1);
            const y = viewBoxHeight - padding - ((value - minValue) / range) * (viewBoxHeight - 2 * padding);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={lineColor}
                className="transition-all duration-500 ease-out"
                style={{
                  filter: `drop-shadow(0 0 2px ${glowColor})`,
                }}
              />
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

export const Dashboard = () => {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-32">
        <div className="container mx-auto px-6 pt-8">
          {/* Welcome Header */}
          <WelcomeHeader />
          
          {/* Today's Plan Section */}
          <div className="mb-8">
            <TodaysPlanCard />
          </div>
          
          {/* Section Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h3 className="text-xl font-semibold text-foreground mb-2">Training Metrics</h3>
            <p className="text-muted-foreground">Your key performance indicators</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            {metrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>

          {/* Daily Nudge Section */}
          <div className="mb-8">
            <DailyNudgeCard />
          </div>

          {/* Alerts Section */}
          <div className="mb-8">
            <AlertsCard />
          </div>

          {/* Trend Analysis Carousel */}
          <div className="mb-8">
            <GraphCarousel />
          </div>

          {/* Weekly Insights and Focus Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyInsightsCard />
            <FocusAreasCard />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};