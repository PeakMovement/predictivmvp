import { CheckCircle, Calendar, Clock, User, FileText, Play, CalendarPlus, Download, Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";

const acceptedChallenges = [
  {
    id: 1,
    text: "Schedule a deload week to reduce training intensity by 20%",
    category: "Training",
    accentColor: "yellow",
    hasVideo: true,
    hasPdf: true,
    dateAccepted: "2024-01-15",
    scheduledDate: "2024-01-22",
    scheduledTime: "09:00"
  },
  {
    id: 3,
    text: "Add 2 mobility sessions focusing on hip flexors and thoracic spine",
    category: "Recovery", 
    accentColor: "green",
    hasVideo: true,
    hasPdf: true,
    dateAccepted: "2024-01-14",
    scheduledDate: "2024-01-20",
    scheduledTime: "14:30"
  },
  {
    id: 5,
    text: "Consider periodizing toward strength phase next week",
    category: "Training",
    accentColor: "red",
    hasVideo: true,
    hasPdf: false,
    dateAccepted: "2024-01-13",
    scheduledDate: "2024-01-25",
    scheduledTime: "10:00"
  }
];

const upcomingBookings = [
  {
    id: 1,
    clinician: "Dr. Sarah Chen",
    service: "Sports Medicine Consultation",
    date: "2024-01-20",
    time: "2:30 PM",
    type: "In-Person"
  },
  {
    id: 2,
    clinician: "Mike Rodriguez, PT",
    service: "Physical Therapy Session",
    date: "2024-01-22", 
    time: "10:00 AM",
    type: "In-Person"
  },
  {
    id: 3,
    clinician: "Dr. James Wilson",
    service: "Nutrition Consultation",
    date: "2024-01-25",
    time: "1:00 PM", 
    type: "Virtual"
  }
];

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

// Mock graph data for PDF generation
const graphData = [
  {
    title: "Acute:Chronic Workload",
    currentValue: "1.2",
    riskZone: "optimal"
  },
  {
    title: "Training Monotony",
    currentValue: "2.4/5.0",
    riskZone: "optimal"
  },
  {
    title: "Training Strain",
    currentValue: "156/200",
    riskZone: "caution"
  },
  {
    title: "EWMA Trend",
    currentValue: "+5.2%",
    riskZone: "optimal"
  }
];

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
  
  const recommendations = [
    "Add 1 recovery session focusing on mobility and light stretching",
    "Reduce sprint volume by 15-20% to prevent overtraining",
    "Prioritize sleep quality with 8+ hours per night"
  ];

  recommendations.forEach((rec) => {
    doc.text(`• ${rec}`, 30, yPosition, { maxWidth: pageWidth - 60 });
    yPosition += 8;
  });

  yPosition += 15;

  // Accepted Challenges Section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Accepted Challenges", 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  acceptedChallenges.forEach((challenge, index) => {
    if (yPosition > 260) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.text(`${index + 1}. ${challenge.text}`, 25, yPosition, { maxWidth: pageWidth - 50 });
    yPosition += 7;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`   Category: ${challenge.category} | Accepted: ${challenge.dateAccepted}`, 25, yPosition);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;
  });

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
  
  upcomingBookings.forEach((booking, index) => {
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

const AcceptedChallengesSection = () => {
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<typeof acceptedChallenges[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("12:00");

  const handleCalendarClick = (challenge: typeof acceptedChallenges[0]) => {
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
        {acceptedChallenges.length} Active
      </div>
    </div>
    <div className="space-y-4">
      {acceptedChallenges.map((challenge) => (
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
                            onClick={() => console.log('Download PDF for challenge:', challenge.id)}
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
                            onClick={() => console.log('Watch Video for challenge:', challenge.id)}
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

        {/* Summary */}
        <div className="bg-glass/30 backdrop-blur-sm border border-glass-border rounded-xl p-4 mb-4">
          <p className="text-foreground leading-relaxed">
            Your recovery was below target this week. Training load was high on Wednesday, causing increased strain. Consider adjusting your upcoming sessions to allow for better recovery.
          </p>
        </div>

        {/* Recommendations */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recommendations for Next Week
          </h4>
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 hover:bg-glass-highlight transition-all duration-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Add 1 recovery session focusing on mobility and light stretching</p>
            </div>
            <div className="flex items-start gap-3 bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 hover:bg-glass-highlight transition-all duration-200">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Reduce sprint volume by 15-20% to prevent overtraining</p>
            </div>
            <div className="flex items-start gap-3 bg-glass/30 backdrop-blur-sm border border-glass-border rounded-lg p-3 hover:bg-glass-highlight transition-all duration-200">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Prioritize sleep quality with 8+ hours per night</p>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={generateWeeklyReportPDF}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-400/30 hover:bg-purple-500/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-glow"
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
  const [allBookings, setAllBookings] = useState<typeof upcomingBookings>([]);

  useEffect(() => {
    // Load bookings from localStorage
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    
    // Combine static bookings with user bookings
    setAllBookings([...upcomingBookings, ...userBookings]);
  }, []);

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
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-6 pt-8">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="animate-fade-in-slow">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Your Plan</h1>
          </div>
          <div className="animate-slide-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <p className="text-muted-foreground text-lg">Track your active challenges and upcoming appointments</p>
          </div>
          
          {/* Generate Report Button */}
          <div className="flex justify-center mt-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={generateWeeklyReportPDF}
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
        </div>

        {/* Accepted Challenges */}
        <AcceptedChallengesSection />

        {/* Weekly Insights */}
        <WeeklyInsightsSection />

        {/* Upcoming Bookings */}
        <UpcomingBookingsSection />
      </div>
    </div>
  );
};