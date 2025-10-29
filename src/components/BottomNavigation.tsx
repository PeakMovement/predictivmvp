import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Dumbbell,
  FileText,
  Heart,
  Home,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { name: "dashboard", icon: Home, label: "Dashboard", path: "/dashboard" },
  { name: "training", icon: Dumbbell, label: "Training", path: "/training" },
  { name: "health", icon: Heart, label: "Health", path: "/health" },
  {
    name: "my-documents",
    icon: FileText,
    label: "Documents",
    path: "/my-documents",
  },
  {
    name: "profile-setup",
    icon: User,
    label: "Profile",
    path: "/profile-setup",
  },
  { name: "your-plan", icon: ClipboardList, label: "Plan", path: "/your-plan" },
  {
    name: "mybaselines",
    icon: TrendingUp,
    label: "Baselines",
    path: "/mybaselines",
  },
  { name: "find-help", icon: Users, label: "Help", path: "/find-help" },
];

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center",
        "h-[72px] sm:h-[80px]  backdrop-blur-lg border-t border-border/20",
        "px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+4px)]",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      )}
    >
      {navItems.map(({ name, icon: Icon, label, path }) => {
        const active = isActive(path);
        return (
          <button
            key={name}
            onClick={() => navigate(path)}
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-200",
              "text-xs sm:text-sm font-medium min-w-[60px] px-2 py-2 rounded-lg",
              "text-muted-foreground hover:text-primary focus:text-primary",
              "hover:bg-primary/10 focus:bg-primary/10",
              active && "text-primary scale-105 bg-primary/20"
            )}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-5 w-5 mb-1 transition-all",
                active
                  ? "text-primary scale-110"
                  : "text-muted-foreground hover:scale-105"
              )}
            />
            <span className={cn("transition-all", active && "font-semibold")}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
