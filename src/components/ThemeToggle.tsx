import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "fixed top-4 right-4 sm:top-6 sm:right-6 z-50",
        "w-12 h-12 rounded-xl",
        "bg-glass backdrop-blur-xl border border-glass-border shadow-glass",
        "flex items-center justify-center",
        "hover:bg-glass-highlight hover:scale-110 active:scale-95",
        "transition-all duration-300 ease-out transform-gpu",
        "animate-fade-in"
      )}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <div className="relative w-6 h-6">
        <Sun
          size={20}
          className={cn(
            "absolute inset-0 transition-all duration-300",
            theme === "dark"
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
          )}
        />
        <Moon
          size={20}
          className={cn(
            "absolute inset-0 transition-all duration-300",
            theme === "dark"
              ? "rotate-0 scale-100 opacity-100 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </div>
    </button>
  );
};