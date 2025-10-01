import { useState, useEffect, useCallback } from "react";
import { User, Smartphone, Bell, Palette, Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";

export const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [primaryHue, setPrimaryHue] = useState(263);
  const [isDragging, setIsDragging] = useState(false);
  const { theme, setTheme } = useTheme();

  // Load saved primary hue from localStorage
  useEffect(() => {
    const savedHue = localStorage.getItem("primary-hue");
    if (savedHue) {
      setPrimaryHue(parseInt(savedHue));
      updatePrimaryColor(parseInt(savedHue));
    }
  }, []);

  const updatePrimaryColor = (hue: number) => {
    // Update CSS variables for primary color
    const root = document.documentElement;
    root.style.setProperty("--primary", `${hue} 70% 50%`);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    
    // Save to localStorage
    localStorage.setItem("primary-hue", hue.toString());
  };

  // Convert HSL to HEX
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const hexColor = hslToHex(primaryHue, 70, 50);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hue = parseInt(e.target.value);
    setPrimaryHue(hue);
    updatePrimaryColor(hue);
  };

  // Handle mouse interaction for circular picker
  const handleCircleInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    // Calculate angle in degrees (0-360)
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    angle = (angle + 90 + 360) % 360; // Adjust to start from top
    
    setPrimaryHue(Math.round(angle));
    updatePrimaryColor(Math.round(angle));
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleCircleInteraction(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleCircleInteraction(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleAppleHealthConnect = () => {
    setAppleHealthConnected(!appleHealthConnected);
    // Placeholder for actual connection flow
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-6 pt-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Settings</h1>
          </div>
          <div className="animate-slide-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <p className="text-muted-foreground text-lg">Customize your experience</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Profile</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <User size={32} className="text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <Label htmlFor="name" className="text-sm text-muted-foreground">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      className="mt-1 bg-glass/30 border-glass-border"
                      defaultValue="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      className="mt-1 bg-glass/30 border-glass-border"
                      defaultValue="john.doe@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Devices Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Smartphone size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Connected Devices</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleAppleHealthConnect}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                  appleHealthConnected
                    ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                    : "bg-glass/30 border-glass-border hover:bg-glass-highlight"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🍎</div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Apple Health</p>
                    <p className="text-xs text-muted-foreground">
                      {appleHealthConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {appleHealthConnected && (
                    <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-md">
                      Active
                    </span>
                  )}
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Bell size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your progress</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </div>

          {/* Theme Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Palette size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Theme</h3>
            </div>
            <div className="space-y-6">
              {/* Light/Dark Mode */}
              <div>
                <Label className="text-sm text-muted-foreground mb-3 block">Appearance</Label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex-1 p-4 rounded-xl border transition-all duration-200",
                      theme === "light"
                        ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                        : "bg-glass/30 border-glass-border hover:bg-glass-highlight"
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
                        : "bg-glass/30 border-glass-border hover:bg-glass-highlight"
                    )}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🌙</div>
                      <p className="font-medium text-foreground">Dark</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <Label className="text-sm text-muted-foreground mb-3 block">Primary Color</Label>
                <div className="flex flex-col items-center space-y-6">
                  {/* Circular Color Spectrum Picker */}
                  <div 
                    className="relative w-56 h-56 cursor-pointer select-none group"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                  >
                    {/* Outer glow ring for dark mode / shadow for light mode */}
                    <div 
                      className="absolute inset-0 rounded-full light:shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-none transition-all duration-300"
                      style={{
                        boxShadow: theme === 'dark' 
                          ? `0 0 60px hsl(${primaryHue}, 70%, 50%, 0.4), 0 0 100px hsl(${primaryHue}, 70%, 50%, 0.2)` 
                          : undefined
                      }}
                    />
                    
                    {/* Color wheel background */}
                    <div 
                      className="absolute inset-0 rounded-full transition-transform group-hover:scale-[1.02] duration-300 ease-out"
                      style={{
                        background: `conic-gradient(
                          hsl(0, 70%, 50%),
                          hsl(20, 70%, 50%),
                          hsl(40, 70%, 50%),
                          hsl(60, 70%, 50%),
                          hsl(80, 70%, 50%),
                          hsl(100, 70%, 50%),
                          hsl(120, 70%, 50%),
                          hsl(140, 70%, 50%),
                          hsl(160, 70%, 50%),
                          hsl(180, 70%, 50%),
                          hsl(200, 70%, 50%),
                          hsl(220, 70%, 50%),
                          hsl(240, 70%, 50%),
                          hsl(260, 70%, 50%),
                          hsl(280, 70%, 50%),
                          hsl(300, 70%, 50%),
                          hsl(320, 70%, 50%),
                          hsl(340, 70%, 50%),
                          hsl(360, 70%, 50%)
                        )`,
                        boxShadow: theme === 'dark' 
                          ? 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.3)'
                          : 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 2px 16px rgba(0,0,0,0.08)'
                      }}
                    />
                    
                    {/* Selected color indicator */}
                    <div 
                      className={cn(
                        "absolute w-10 h-10 rounded-full border-[3px] transition-all duration-150 pointer-events-none z-20",
                        "light:border-white light:shadow-[0_4px_16px_rgba(0,0,0,0.15)]",
                        "dark:border-background dark:shadow-lg",
                        isDragging && "scale-125"
                      )}
                      style={{
                        backgroundColor: `hsl(${primaryHue}, 70%, 50%)`,
                        top: `${50 + 44 * Math.sin((primaryHue - 90) * Math.PI / 180)}%`,
                        left: `${50 + 44 * Math.cos((primaryHue - 90) * Math.PI / 180)}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: theme === 'dark'
                          ? `0 0 24px hsl(${primaryHue}, 70%, 50%, 0.8), 0 0 48px hsl(${primaryHue}, 70%, 50%, 0.4), 0 4px 12px rgba(0,0,0,0.3)`
                          : `0 0 16px hsl(${primaryHue}, 70%, 50%, 0.5), 0 4px 16px rgba(0,0,0,0.15)`
                      }}
                    />
                    
                    {/* Center preview circle */}
                    <div 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-[3px] transition-all duration-150 light:border-white dark:border-background"
                      style={{ 
                        backgroundColor: `hsl(${primaryHue}, 70%, 50%)`,
                        boxShadow: theme === 'dark'
                          ? `0 0 40px hsl(${primaryHue}, 70%, 50%, 0.6), inset 0 2px 16px rgba(255,255,255,0.2), 0 8px 24px rgba(0,0,0,0.4)`
                          : `0 0 24px hsl(${primaryHue}, 70%, 50%, 0.3), inset 0 2px 8px rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.12)`
                      }}
                    />
                  </div>
                  
                  {/* Color info */}
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

          {/* About & Support Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Info size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">About & Support</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex justify-between items-center py-2">
                <span>Version</span>
                <span className="text-foreground font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Terms of Service</span>
                <ChevronRight size={16} />
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Privacy Policy</span>
                <ChevronRight size={16} />
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Contact Support</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};