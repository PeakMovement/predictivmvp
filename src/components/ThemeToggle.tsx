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
        "w-10 h-10",
        "bg-surface border border-line",
        "flex items-center justify-center",
        "hover:border-marble1/30 active:scale-[0.97] active:opacity-85",
        "transition-all duration-100"
      )}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Moon size={16} className="text-coldBlue/60" />
      ) : (
        <Sun size={16} className="text-amber" />
      )}
    </button>
  );
};
