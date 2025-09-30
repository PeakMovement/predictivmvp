import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dashboard } from "@/pages/Dashboard";
import { Training } from "@/pages/Training";
import { Health } from "@/pages/Health";
import { Schedule } from "@/pages/Schedule";
import { YourPlan } from "@/pages/YourPlan";
import { Settings } from "@/pages/Settings";
import { Settings as SettingsIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <div key="dashboard" className="animate-fade-in"><Dashboard /></div>;
      case "training":
        return <div key="training" className="animate-fade-in"><Training /></div>;
      case "health":
        return <div key="health" className="animate-fade-in"><Health /></div>;
      case "schedule":
        return <div key="schedule" className="animate-fade-in"><Schedule /></div>;
      case "your-plan":
        return <div key="your-plan" className="animate-fade-in"><YourPlan /></div>;
      case "settings":
        return <div key="settings" className="animate-fade-in"><Settings /></div>;
      default:
        return <div key="dashboard" className="animate-fade-in"><Dashboard /></div>;
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="fitness-app-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className="relative overflow-hidden">
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="p-2 rounded-lg bg-glass backdrop-blur-xl border border-glass-border hover:bg-glass-highlight transition-all duration-200 hover:scale-110 shadow-glass"
                  >
                    <SettingsIcon size={20} className="text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <ThemeToggle />
            </div>
            <div className="transition-all duration-500 ease-out">
              {renderContent()}
            </div>
            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
