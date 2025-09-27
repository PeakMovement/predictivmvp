import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dashboard } from "@/pages/Dashboard";
import { Training } from "@/pages/Training";
import { Health } from "@/pages/Health";

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
      default:
        return <div key="dashboard" className="animate-fade-in"><Dashboard /></div>;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="relative overflow-hidden">
          <div className="transition-all duration-500 ease-out">
            {renderContent()}
          </div>
          <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
