import { Home, Dumbbell, Heart, Calendar, ClipboardList, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "health", label: "Health", icon: Heart },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "your-plan", label: "Your Plan", icon: ClipboardList },
  { id: "find-help", label: "Find Help", icon: Users },
];

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-float">
      <nav className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl px-4 py-3 shadow-glass">
        <div className="flex items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-500 ease-out flex-1 min-w-0",
                  "hover:bg-glass-highlight hover:scale-105 active:scale-95",
                  "transform-gpu will-change-transform",
                  isActive && "bg-primary/20 scale-105"
                )}
                style={{ minWidth: '64px' }}
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
                    "text-xs font-medium transition-all duration-300 truncate w-full text-center",
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