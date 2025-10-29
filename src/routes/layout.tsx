import { BottomNavigation } from "@/components/BottomNavigation";
import { SimulationControl } from "@/components/SimulationControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import { ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children?: ReactNode;
}

export const Layout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="relative overflow-hidden min-h-screen">
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/settings")}
              className={cn(
                "fixed top-[80px] right-6 z-50",
                "w-12 h-12 rounded-xl bg-glass backdrop-blur-xl border-glass-border",
                "flex items-center justify-center",
                "hover:bg-glass-highlight hover:scale-110 active:scale-95",
                "transition-all duration-300 ease-out transform-gpu animate-fade-in"
              )}
              aria-label="Settings"
            >
              <Settings
                size={20}
                className="text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>

        <div className="transition-all duration-500 ease-out animate-fade-in pb-20">
          {/* Use children if provided, otherwise use Outlet for nested routes */}
          {children || <Outlet />}
        </div>

        <BottomNavigation />
        <SimulationControl />
      </div>
    </TooltipProvider>
  );
};
