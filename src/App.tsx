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
import { DataUpload } from "@/pages/DataUpload";
import { InsightsTree } from "@/pages/InsightsTree";
import FitbitAuth from "@/pages/FitbitAuth";
import FitbitCallback from "@/pages/FitbitCallback";
import TestSupabase from "@/pages/TestSupabase";
import FitbitSyncNow from "@/pages/FitbitSyncNow";
import { Settings as SettingsIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Check if we're on the Fitbit auth callback route
  const currentPath = window.location.pathname;
  const isFitbitAuth = currentPath === "/auth/fitbit";
  const isFitbitCallback = currentPath === "/fitbit/callback";

  // Listen for custom navigation event from the previous-based navigation
  useEffect(() => {
    const handleNavigateInsights = () => setActiveTab("insights-tree");
    window.addEventListener("navigate-insights", handleNavigateInsights);
    return () => window.removeEventListener("navigate-insights", handleNavigateInsights);
  }, []);

  // If on Fitbit auth route, render only that page
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

  // If on Fitbit callback route, render the new callback page
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

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div key="dashboard" className="animate-fade-in">
            <Dashboard />
          </div>
        );
      case "training":
        return (
          <div key="training" className="animate-fade-in">
            <Training />
          </div>
        );
      case "health":
        return (
          <div key="health" className="animate-fade-in">
            <Health />
          </div>
        );
      case "your-plan":
        return (
          <div key="your-plan" className="animate-fade-in">
            <YourPlan />
          </div>
        );
      case "data-upload":
        return (
          <div key="data-upload" className="animate-fade-in">
            <DataUpload />
          </div>
        );
      case "find-help":
        return (
          <div key="find-help" className="animate-fade-in">
            <FindHelp />
          </div>
        );
      case "settings":
        return (
          <div key="settings" className="animate-fade-in">
            <Settings onNavigate={setActiveTab} />
          </div>
        );
      case "insights-tree":
        return (
          <div key="insights-tree" className="animate-fade-in">
            <InsightsTree onNavigate={setActiveTab} />
          </div>
        );
      case "test-supabase":
        return (
          <div key="test-supabase" className="animate-fade-in">
            <TestSupabase />
          </div>
        );
      case "fitbit-sync-now":
        return (
          <div key="fitbit-sync-now" className="animate-fade-in">
            <FitbitSyncNow />
          </div>
        );
      default:
        return (
          <div key="dashboard" className="animate-fade-in">
            <Dashboard />
          </div>
        );
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
                      "w-12 h-12 rounded-xl",
                      "bg-glass backdrop-blur-xl border-glass-border",
                      "flex items-center justify-center",
                      "hover:bg-glass-highlight hover:scale-110 active:scale-95",
                      "transition-all duration-300 ease-out transform-gpu",
                      "animate-fade-in",
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
              <div className="transition-all duration-500 ease-out">{renderContent()}</div>
              <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
              <SimulationControl />
            </div>
          </TooltipProvider>
        </LiveDataProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
