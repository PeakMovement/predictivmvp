import { useState, useEffect } from "react";
import { Home, Dumbbell, Heart, FileText, User, ClipboardList, TrendingUp, Stethoscope, Menu, X, Calendar, LayoutGrid, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { name: "dashboard", icon: Home, label: "Dashboard" },
  { name: "personal-canvas", icon: LayoutGrid, label: "Canvas" },
  { name: "planner", icon: Calendar, label: "Planner" },
  { name: "training", icon: Dumbbell, label: "Training" },
  { name: "health", icon: Heart, label: "Health" },
  { name: "find-help", icon: Stethoscope, label: "Find Help" },
  { name: "alert-history", icon: Bell, label: "Alerts" },
  { name: "my-documents", icon: FileText, label: "Docs" },
  { name: "profile-setup", icon: User, label: "Profile" },
  { name: "your-plan", icon: ClipboardList, label: "Plan" },
  { name: "mybaselines", icon: TrendingUp, label: "Baselines" },
];

interface BottomNavigationProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onNavigate }: BottomNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { count } = await supabase
        .from("alert_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      if (!cancelled) setActiveAlertCount(count ?? 0);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleNavigate = (tab: string) => {
    onNavigate(tab);
    setIsOpen(false);
  };

  // Mobile: Expandable FAB menu
  if (isMobile) {
    return (
      <>
        {/* Backdrop overlay when menu is open */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Expandable menu panel */}
        {isOpen && (
          <div
            className={cn(
              "fixed bottom-24 left-4 right-4 z-50",
              "bg-card/95 backdrop-blur-lg border border-border/30 rounded-2xl",
              "p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]",
              "animate-scale-in"
            )}
          >
            {/* Grid of navigation items */}
            <div className="grid grid-cols-3 gap-3">
              {navItems.map(({ name, icon: Icon, label }) => {
                const isActive = activeTab === name;
                const showBadge = name === "alert-history" && activeAlertCount > 0;
                return (
                  <button
                    key={name}
                    onClick={() => handleNavigate(name)}
                    aria-label={`Navigate to ${label}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl transition-all",
                      "min-h-[72px] touch-manipulation",
                      "hover:bg-accent/50 active:scale-95",
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-muted/30 text-muted-foreground border border-transparent"
                    )}
                  >
                    <div className="relative mb-1.5">
                      <Icon
                        className={cn(
                          "h-6 w-6 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center leading-tight",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Close button row */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close navigation menu"
              className={cn(
                "w-full mt-3 py-3 rounded-xl",
                "bg-muted/50 text-muted-foreground",
                "flex items-center justify-center gap-2",
                "hover:bg-muted active:scale-98 transition-all"
              )}
            >
              <X className="h-5 w-5" />
              <span className="text-sm font-medium">Close</span>
            </button>
          </div>
        )}

        {/* Floating Action Button */}
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "flex justify-center items-center",
            "h-20 pb-[env(safe-area-inset-bottom)]",
            "pointer-events-none"
          )}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            className={cn(
              "pointer-events-auto",
              "flex items-center justify-center gap-2",
              "h-14 px-6 rounded-full",
              "bg-primary text-primary-foreground",
              "shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
              "hover:bg-primary/90 active:scale-95 transition-all",
              "touch-manipulation"
            )}
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="text-sm font-semibold">
              {isOpen ? "Close" : "Menu"}
            </span>
          </button>
        </div>
      </>
    );
  }

  // Desktop/Tablet: Original horizontal navigation
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center",
        "h-[72px] sm:h-[80px] bg-background/90 backdrop-blur-lg border-t border-border/40",
        "px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+4px)]",
        "shadow-[0_-2px_10px_rgba(0,0,0,0.08)]",
        "dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      )}
    >
      {navItems.map(({ name, icon: Icon, label }) => {
        const isActive = activeTab === name;
        const showBadge = name === "alert-history" && activeAlertCount > 0;
        return (
          <button
            key={name}
            onClick={() => onNavigate(name)}
            aria-label={`Navigate to ${label}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center transition-all",
              "text-xs sm:text-sm font-medium",
              "text-muted-foreground hover:text-primary focus:text-primary",
              isActive && "text-primary scale-105"
            )}
          >
            <div className="relative mb-1">
              <Icon
                className={cn(
                  "h-5 w-5 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              {showBadge && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
              )}
            </div>
            {label}
          </button>
        );
      })}
    </nav>
  );
};
