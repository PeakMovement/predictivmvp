window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }))
```) instead of React Router.

Let’s fix that properly so it matches your existing Predictiv navigation system.

---

### ✅ Full Working Fix for Predictiv Navigation
Here’s your **corrected `BottomNav.tsx`** file — this version restores click navigation using your global `navigate-tab` events and keeps all visual fixes intact.

```tsx
import { Home, Dumbbell, Heart, FileText, User, ClipboardList, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", icon: Home },
  { name: "Training", icon: Dumbbell },
  { name: "Health", icon: Heart },
  { name: "Documents", icon: FileText },
  { name: "Profile", icon: User },
  { name: "Plan", icon: ClipboardList },
  { name: "Baselines", icon: TrendingUp },
  { name: "Help", icon: Users },
];

export const BottomNav = ({ activeTab = "Dashboard" }: { activeTab?: string }) => {
  // ✅ handle navigation using Predictiv’s global system
  const handleNavigate = (tab: string) => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center",
        "h-[72px] sm:h-[80px] bg-[#0A0A0A]/90 backdrop-blur-lg border-t border-border/20",
        "px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+4px)]",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      )}
    >
      {navItems.map(({ name, icon: Icon }) => {
        const isActive = activeTab === name;
        return (
          <button
            key={name}
            onClick={() => handleNavigate(name)}
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
            {name}
          </button>
        );
      })}
    </nav>
  );
};