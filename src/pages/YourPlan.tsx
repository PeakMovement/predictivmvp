import { CheckCircle, Calendar, Clock, User, FileText, Play, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const acceptedChallenges = [
  {
    id: 1,
    text: "Schedule a deload week to reduce training intensity by 20%",
    category: "Training",
    accentColor: "yellow",
    hasVideo: true,
    hasPdf: true,
    dateAccepted: "2024-01-15"
  },
  {
    id: 3,
    text: "Add 2 mobility sessions focusing on hip flexors and thoracic spine",
    category: "Recovery", 
    accentColor: "green",
    hasVideo: true,
    hasPdf: true,
    dateAccepted: "2024-01-14"
  },
  {
    id: 5,
    text: "Consider periodizing toward strength phase next week",
    category: "Training",
    accentColor: "red",
    hasVideo: true,
    hasPdf: false,
    dateAccepted: "2024-01-13"
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

const AcceptedChallengesSection = () => {
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<typeof acceptedChallenges[0] | null>(null);

  const handleCalendarClick = (challenge: typeof acceptedChallenges[0]) => {
    setSelectedChallenge(challenge);
    setIsCalendarModalOpen(true);
  };

  const handleAddToCalendar = () => {
    if (selectedChallenge) {
      // Create Google Calendar URL with prefilled event
      const eventTitle = encodeURIComponent(selectedChallenge.text);
      const eventDescription = encodeURIComponent(`${selectedChallenge.category} challenge from your training plan`);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1); // Tomorrow
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1); // 1 hour duration
      
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
              <p className="text-xs text-muted-foreground">Accepted on {challenge.dateAccepted}</p>
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
            Do you want to add this challenge to your Google Calendar?
          </p>
          
          <div className="bg-glass/30 rounded-lg border border-glass-border p-3">
            <p className="text-sm font-medium text-foreground">
              {selectedChallenge?.text}
            </p>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleAddToCalendar}
              className="flex-1 p-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
            >
              Yes, add to calendar
            </button>
            <button
              onClick={() => {
                setIsCalendarModalOpen(false);
                setSelectedChallenge(null);
              }}
              className="flex-1 p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
            >
              No, cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);

};

const UpcomingBookingsSection = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <Calendar size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Upcoming Bookings</h3>
      <div className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
        {upcomingBookings.length} Scheduled
      </div>
    </div>
    <div className="space-y-4">
      {upcomingBookings.map((booking) => (
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
        </div>

        {/* Accepted Challenges */}
        <AcceptedChallengesSection />

        {/* Upcoming Bookings */}
        <UpcomingBookingsSection />
      </div>
    </div>
  );
};