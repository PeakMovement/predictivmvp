import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLiveData } from "@/contexts/LiveDataContext";
import { 
  demoProfiles, 
  DemoProfileType, 
  getActiveDemoProfile, 
  setActiveDemoProfile,
  hasUploadedData,
  getActiveProfileId
} from "@/lib/healthDataStore";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDailyInsight, getToastVariant } from "@/lib/dailyInsights";

// Calculate average stats for a profile
const calculateProfileStats = (data: any[]) => {
  const avgHRV = (data.reduce((sum, d) => sum + parseFloat(d.HRV || "0"), 0) / data.length).toFixed(0);
  const avgSleep = (data.reduce((sum, d) => sum + parseFloat(d.SleepHours || "0"), 0) / data.length).toFixed(1);
  const avgACWR = (data.reduce((sum, d) => sum + parseFloat(d.ACWR || "0"), 0) / data.length).toFixed(1);
  
  return { avgHRV, avgSleep, avgACWR };
};

// Profile descriptors
const profileDescriptors: Record<DemoProfileType, string> = {
  athletic: "High-Performance",
  overtraining: "Overtrained",
  moderate: "Rehab Focus"
};

export const DemoProfileSelector = () => {
  const { refreshData, setDayIndex, csvData } = useLiveData();
  const [activeProfile, setActiveProfile] = useState<DemoProfileType>(getActiveDemoProfile());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUploadNotice, setShowUploadNotice] = useState(false);
  const lastClickTime = useRef(0);
  const { toast } = useToast();

  // Check if custom data is active
  useEffect(() => {
    setShowUploadNotice(hasUploadedData() && getActiveProfileId() !== "demo");
  }, []);

  const handleProfileSelect = useCallback((profileType: DemoProfileType) => {
    // Debounce: only allow one click per second
    const now = Date.now();
    if (now - lastClickTime.current < 1000) {
      return;
    }
    lastClickTime.current = now;

    // Don't do anything if already active
    if (profileType === activeProfile && getActiveProfileId() === "demo") {
      return;
    }

    // Start transition animation
    setIsTransitioning(true);

    // Update profile and refresh data
    setActiveDemoProfile(profileType);
    setActiveProfile(profileType);
    setDayIndex(0); // Reset to day 1
    
    // Refresh context after a brief delay for animation
    setTimeout(() => {
      refreshData();
      setIsTransitioning(false);
      
      // Show profile switch toast
      const profile = demoProfiles[profileType];
      const dayData = csvData[0];
      const insight = getDailyInsight(dayData);
      
      toast({
        title: `${profile.emoji} ${profile.name.replace(" Profile", "")} Active`,
        description: insight.message,
        variant: getToastVariant(insight.level),
        duration: 3500,
      });
    }, 300);

    // Hide notice after switching back to demo
    setShowUploadNotice(false);
  }, [activeProfile, refreshData, setDayIndex]);

  return (
    <div className="mb-8 space-y-4">
      {/* Upload Notice Banner */}
      {showUploadNotice && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              Custom data active — switching profile will reset to demo mode.
            </p>
          </div>
        </div>
      )}

      {/* Profile Selector Cards */}
      <div 
        className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity duration-300",
          isTransitioning && "opacity-50"
        )}
      >
        {Object.values(demoProfiles).map((profile) => {
          const stats = calculateProfileStats(profile.data);
          const isActive = activeProfile === profile.id && getActiveProfileId() === "demo";

          return (
            <button
              key={profile.id}
              onClick={() => handleProfileSelect(profile.id)}
              disabled={isTransitioning}
              className={cn(
                "relative bg-glass backdrop-blur-xl border rounded-2xl p-5 text-left transition-all duration-300 shadow-glass",
                "hover:scale-105 hover:-translate-y-1 active:scale-95 transform-gpu will-change-transform",
                isActive 
                  ? "border-primary/50 ring-2 ring-primary/30 bg-primary/5" 
                  : "border-glass-border hover:bg-glass-highlight hover:border-primary/20",
                isTransitioning && "pointer-events-none"
              )}
              style={{
                boxShadow: isActive 
                  ? "0 0 24px hsl(var(--primary) / 0.3), 0 8px 16px rgba(0,0,0,0.1)" 
                  : undefined
              }}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-pulse pointer-events-none" />
              )}

              {/* Emoji indicator */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{profile.emoji}</span>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              {/* Profile info */}
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-foreground text-base mb-0.5">
                    {profile.name.replace(" Profile", "")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {profileDescriptors[profile.id]}
                  </p>
                </div>

                {/* Mini stats */}
                <div className="pt-3 border-t border-glass-border space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg HRV</span>
                    <span className="font-medium text-foreground">{stats.avgHRV}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg Sleep</span>
                    <span className="font-medium text-foreground">{stats.avgSleep}h</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg ACWR</span>
                    <span className="font-medium text-foreground">{stats.avgACWR}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
