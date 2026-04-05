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

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-void/80 animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
        )}

        {isOpen && (
          <div className="fixed bottom-24 left-4 right-4 z-50 bg-panel border border-line p-4 animate-fade-in">
            <div className="grid grid-cols-3 gap-px bg-line">
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
                      "flex flex-col items-center justify-center p-3 transition-all",
                      "min-h-[72px] touch-manipulation",
                      isActive
                        ? "bg-surface text-coldBlue"
                        : "bg-deep text-[rgba(200,194,190,0.35)] hover:text-marble1/60"
                    )}
                  >
                    <div className="relative mb-1.5">
                      <Icon className={cn("h-5 w-5", isActive ? "text-coldBlue" : "text-[rgba(200,194,190,0.25)]")} />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 bg-critical" />
                      )}
                    </div>
                    <span className="nav-label">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-3 py-3 bg-surface border border-line text-marble1/50 flex items-center justify-center gap-2 hover:text-marble2 transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase">Close</span>
            </button>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-center h-20 pb-[env(safe-area-inset-bottom)] pointer-events-none">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isOpen}
            className="pointer-events-auto flex items-center justify-center gap-2 h-12 px-6 bg-marble3 text-void active:scale-[0.97] active:opacity-85 transition-all duration-100 touch-manipulation"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">
              {isOpen ? "Close" : "Menu"}
            </span>
          </button>
        </div>
      </>
    );
  }

  // Desktop/Tablet
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-[64px] bg-deep border-t border-line px-3 pb-[calc(env(safe-area-inset-bottom)+4px)]"
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
              "flex flex-col items-center justify-center transition-colors",
              isActive ? "text-coldBlue" : "text-[rgba(200,194,190,0.35)] hover:text-marble1/60"
            )}
          >
            <div className="relative mb-1">
              <Icon className={cn("h-5 w-5", isActive ? "text-coldBlue" : "text-[rgba(200,194,190,0.25)]")} />
              {showBadge && (
                <span className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-critical" />
              )}
            </div>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
