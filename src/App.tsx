import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SimulationControl } from "@/components/SimulationControl";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import { Dashboard } from "@/pages/Dashboard";
import { Training } from "@/pages/Training";
import { Health } from "@/pages/Health";
import { YourPlan } from "@/pages/YourPlan";
import { Settings } from "@/pages/Settings";
import { FindHelp } from "@/pages/FindHelp";
import { InsightsTree } from "@/pages/InsightsTree";
import FitbitAuth from "@/pages/FitbitAuth";
import FitbitCallback from "@/pages/FitbitCallback";
import TestSupabase from "@/pages/TestSupabase";
import FitbitSyncNow from "@/pages/FitbitSyncNow";
import MyBaselines from "@/pages/MyBaselines";
import DeveloperBaselinesEngine from "@/pages/DeveloperBaselinesEngine";
import MyDocuments from "@/pages/MyDocuments";
import PlanCompliance from "@/pages/PlanCompliance";
import { ProfileSetup } from "@/pages/ProfileSetup";
import Onboarding from "@/pages/Onboarding";
import { Settings as SettingsIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const currentPath = window.location.pathname;
  const isFitbitAuth = currentPath === "/auth/fitbit";
  const isFitbitCallback = currentPath === "/fitbit/callback";
  const isOnboarding = currentPath === "/onboarding";
  const isDashboardRoute = currentPath === "/dashboard";

  useEffect(() => {
    const handleNavigateInsights = () => setActiveTab("insights-tree");
    window.addEventListener("navigate-insights", handleNavigateInsights);
    return () => window.removeEventListener("navigate-insights", handleNavigateInsights);
  }, []);

  // Fitbit auth routes
  if (isFitbitAuth) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FitbitAuth />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  if (isFitbitCallback) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FitbitCallback />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  if (isOnboarding) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Onboarding />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle /dashboard route
  if (isDashboardRoute) {
    // Redirect to main app with dashboard tab active
    if (activeTab !== "dashboard") {
      setActiveTab("dashboard");
    }
  }

  // Main tab navigation
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "training":
        return <Training />;
      case "health":
        return <Health />;
      case "your-plan":
        return <YourPlan />;
      case "plan-compliance":
        return <PlanCompliance />;
      case "my-documents":
        return <MyDocuments />;
      case "mybaselines":
        return <MyBaselines />;
      case "find-help":
        return <FindHelp />;
      case "settings":
        return <Settings onNavigate={setActiveTab} />;
      case "insights-tree":
        return <InsightsTree onNavigate={setActiveTab} />;
      case "test-supabase":
        return <TestSupabase />;
      case "fitbit-sync-now":
        return <FitbitSyncNow />;
      case "developer-baselines-engine":
        return <DeveloperBaselinesEngine />;
      case "profile-setup": // ✅ added profile tab case
        return <ProfileSetup />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
      <QueryClientProvider client={queryClient}>
        <LiveDataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <div className="relative overflow-hidden min-h-screen">
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={cn(
                      "fixed top-[80px] right-6 z-50",
                      "w-12 h-12 rounded-xl bg-glass backdrop-blur-xl border-glass-border",
                      "flex items-center justify-center",
                      "hover:bg-glass-highlight hover:scale-110 active:scale-95",
                      "transition-all duration-300 ease-out transform-gpu animate-fade-in",
                    )}
                    aria-label="Settings"
                  >
                    <SettingsIcon size={20} className="text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <div className="transition-all duration-500 ease-out animate-fade-in">{renderContent()}</div>
              <BottomNavigation activeTab={activeTab} onNavigate={setActiveTab} />
              <SimulationControl />
            </div>
          </TooltipProvider>
        </LiveDataProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
