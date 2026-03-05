import { useState, useEffect, useCallback } from "react";
import { Palette } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useHighContrast } from "@/hooks/useHighContrast";

export const AppearanceSettings = () => {
  const [primaryHue, setPrimaryHue] = useState(263);
  const [isDragging, setIsDragging] = useState(false);
  const { theme, setTheme } = useTheme();
  const { isHighContrast, toggleHighContrast } = useHighContrast();

  useEffect(() => {
    const savedHue = localStorage.getItem("primary-hue");
    if (savedHue) {
      const hue = parseInt(savedHue);
      setPrimaryHue(hue);
      updatePrimaryColor(hue);
    }
  }, []);

  const updatePrimaryColor = (hue: number) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", `${hue} 70% 50%`);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    localStorage.setItem("primary-hue", hue.toString());
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const hexColor = hslToHex(primaryHue, 70, 50);

  const handleCircleInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    angle = (angle + 90 + 360) % 360;
    setPrimaryHue(Math.round(angle));
    updatePrimaryColor(Math.round(angle));
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleCircleInteraction(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) handleCircleInteraction(e);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
          <Palette size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Theme</h3>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">Appearance</Label>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex-1 p-4 rounded-xl border transition-all duration-200",
                theme === "light"
                  ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                  : "bg-glass/30 border-glass-border hover:bg-glass-highlight",
              )}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">☀️</div>
                <p className="font-medium text-foreground">Light</p>
              </div>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex-1 p-4 rounded-xl border transition-all duration-200",
                theme === "dark"
                  ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                  : "bg-glass/30 border-glass-border hover:bg-glass-highlight",
              )}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🌙</div>
                <p className="font-medium text-foreground">Dark</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">High Contrast Mode</Label>
              <p className="text-xs text-muted-foreground">Enhance color contrast for better readability (WCAG AAA)</p>
            </div>
            <Switch checked={isHighContrast} onCheckedChange={toggleHighContrast} aria-label="Toggle high contrast mode" />
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">Primary Color</Label>
          <div className="flex flex-col items-center space-y-6">
            <div
              className="relative w-56 h-56 cursor-pointer select-none group"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              <div
                className="absolute inset-0 rounded-full transition-all duration-300"
                style={{
                  boxShadow: theme === "dark"
                    ? `0 0 60px hsl(${primaryHue}, 70%, 50%, 0.4), 0 0 100px hsl(${primaryHue}, 70%, 50%, 0.2)`
                    : undefined,
                }}
              />
              <div
                className="absolute inset-0 rounded-full transition-transform group-hover:scale-[1.02] duration-300 ease-out"
                style={{
                  background: `conic-gradient(
                    hsl(0,70%,50%), hsl(30,70%,50%), hsl(60,70%,50%),
                    hsl(90,70%,50%), hsl(120,70%,50%), hsl(150,70%,50%),
                    hsl(180,70%,50%), hsl(210,70%,50%), hsl(240,70%,50%),
                    hsl(270,70%,50%), hsl(300,70%,50%), hsl(330,70%,50%),
                    hsl(360,70%,50%)
                  )`,
                  boxShadow: theme === "dark"
                    ? "inset 0 0 0 1px rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.3)"
                    : "inset 0 0 0 1px rgba(0,0,0,0.05), 0 2px 16px rgba(0,0,0,0.08)",
                }}
              />
              <div
                className={cn(
                  "absolute w-10 h-10 rounded-full border-[3px] transition-all duration-150 pointer-events-none z-20",
                  "dark:border-background dark:shadow-lg",
                  isDragging && "scale-125",
                )}
                style={{
                  backgroundColor: `hsl(${primaryHue}, 70%, 50%)`,
                  top: `${50 + 44 * Math.sin(((primaryHue - 90) * Math.PI) / 180)}%`,
                  left: `${50 + 44 * Math.cos(((primaryHue - 90) * Math.PI) / 180)}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: theme === "dark"
                    ? `0 0 24px hsl(${primaryHue}, 70%, 50%, 0.8), 0 4px 12px rgba(0,0,0,0.3)`
                    : `0 0 16px hsl(${primaryHue}, 70%, 50%, 0.5), 0 4px 16px rgba(0,0,0,0.15)`,
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-[3px] transition-all duration-150 dark:border-background"
                style={{
                  backgroundColor: `hsl(${primaryHue}, 70%, 50%)`,
                  boxShadow: theme === "dark"
                    ? `0 0 40px hsl(${primaryHue}, 70%, 50%, 0.6), inset 0 2px 16px rgba(255,255,255,0.2)`
                    : `0 0 24px hsl(${primaryHue}, 70%, 50%, 0.3), inset 0 2px 8px rgba(255,255,255,0.5)`,
                }}
              />
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">HSL</p>
                  <p className="text-sm font-mono font-medium text-foreground bg-glass/50 px-3 py-1.5 rounded-lg border border-glass-border">
                    {primaryHue}°, 70%, 50%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">HEX</p>
                  <p className="text-sm font-mono font-medium text-foreground bg-glass/50 px-3 py-1.5 rounded-lg border border-glass-border">
                    {hexColor}
                  </p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {isDragging ? "✨ Adjusting color..." : "Click and drag around the circle to select"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
