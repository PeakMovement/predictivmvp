import { Home, Dumbbell, Heart, FileText, User, ClipboardList, TrendingUp, Users, Sparkles, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "dashboard", icon: Home, label: "Dashboard" },
  { name: "yves-insights", icon: Sparkles, label: "Yves AI" },
  { name: "training", icon: Dumbbell, label: "Training" },
  { name: "health", icon: Heart, label: "Health" },
  { name: "symptom-checkin", icon: Stethoscope, label: "Check-In" },
  { name: "my-documents", icon: FileText, label: "Docs" },
  { name: "profile-setup", icon: User, label: "Profile" },
  { name: "your-plan", icon: ClipboardList, label: "Plan" },
  { name: "mybaselines", icon: TrendingUp, label: "Baselines" },
  { name: "find-help", icon: Users, label: "Help" },
];

interface BottomNavigationProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onNavigate }: BottomNavigationProps) => {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center",
        "h-[72px] sm:h-[80px] bg-[#0A0A0A]/90 backdrop-blur-lg border-t border-border/20",
        "px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+4px)]",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      )}
    >
      {navItems.map(({ name, icon: Icon, label }) => {
        const isActive = activeTab === name;
        return (
          <button
            key={name}
            onClick={() => onNavigate(name)}
            className={cn(
              "flex flex-col items-center justify-center transition-all",
              "text-xs sm:text-sm font-medium",
              "text-muted-foreground hover:text-primary focus:text-primary",
              isActive && "text-primary scale-105"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 mb-1 transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            {label}
          </button>
        );
      })}
    </nav>
  );
};
