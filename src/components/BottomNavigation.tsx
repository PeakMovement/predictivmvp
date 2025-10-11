import { Home, Dumbbell, Heart, ClipboardList, Upload, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "health", label: "Health", icon: Heart },
  { id: "your-plan", label: "Your Plan", icon: ClipboardList },
  { id: "data-upload", label: "Data Upload", icon: Upload },
  { id: "find-help", label: "Find Help", icon: Users },
  { id: "fitbit-sync-now", label: "Fitbit Sync", icon: RefreshCw },
];

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className={cn(
      "fixed left-0 right-0 z-50",
      "bottom-0 pb-[env(safe-area-inset-bottom)]",
      "md:bottom-6 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 md:pb-0",
      "md:w-auto md:animate-float"
    )}>
      <nav className={cn(
        "bg-glass backdrop-blur-xl border-t border-glass-border shadow-glass",
        "md:border md:rounded-2xl md:border-t-glass-border",
        "px-2 py-2 md:px-4 md:py-3",
        "hover-glow"
      )}>
        <div className="flex items-center justify-evenly md:justify-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 md:gap-1",
                  "px-2 py-2 md:px-3 md:py-2 rounded-xl transition-all duration-500 ease-out",
                  "flex-1 md:flex-initial min-w-0",
                  "min-h-[44px]", // iOS touch target minimum
                  "hover:bg-glass-highlight hover:scale-105 active:scale-95",
                  "transform-gpu will-change-transform",
                  isActive && "bg-primary/20 scale-105"
                )}
                style={{ minWidth: '48px', maxWidth: '80px' }}
                aria-label={tab.label}
              >
                {isActive && (
                  <>
                    <div className="absolute inset-0 bg-primary/10 rounded-xl shadow-glow animate-glow-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl animate-shimmer" 
                         style={{
                           background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)',
                           backgroundSize: '200% 100%'
                         }} />
                  </>
                )}
                <Icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-300 transform-gpu flex-shrink-0",
                    isActive 
                      ? "text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)] scale-110" 
                      : "text-muted-foreground hover:text-foreground hover:scale-110"
                  )} 
                />
                <span 
                  className={cn(
                    "text-[10px] md:text-xs font-medium transition-all duration-300 truncate w-full text-center",
                    "max-w-[60px] md:max-w-none",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};