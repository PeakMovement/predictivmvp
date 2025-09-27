import { Home, Dumbbell, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "health", label: "Health", icon: Heart },
];

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-float">
      <nav className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl px-6 py-3 shadow-glass">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-300",
                  "hover:bg-glass-highlight",
                  isActive && "bg-primary/20"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/10 rounded-xl shadow-glow animate-glow-pulse" />
                )}
                <Icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-300",
                    isActive 
                      ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" 
                      : "text-muted-foreground"
                  )} 
                />
                <span 
                  className={cn(
                    "text-xs font-medium transition-all duration-300",
                    isActive ? "text-primary" : "text-muted-foreground"
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