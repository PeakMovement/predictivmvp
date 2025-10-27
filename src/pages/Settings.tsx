import { useState, useEffect, useCallback } from "react";
import { User, Smartphone, Bell, Palette, Info, ChevronRight, PlayCircle, PauseCircle, SkipForward, RotateCcw, Database, Mail, HelpCircle, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { useLiveData } from "@/contexts/LiveDataContext";
import { getAlertSettings, saveAlertSettings } from "@/lib/alertConditions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFitbitSync } from "@/hooks/useFitbitSync";
import { getUserContext, updateUserContext } from "@/api/yves";

export const Settings = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
  const [notifications, setNotifications] = useState(true);
  const [primaryHue, setPrimaryHue] = useState(263);
  const [isDragging, setIsDragging] = useState(false);

  // Yves preferences
  const [yvesPreferences, setYvesPreferences] = useState({
    sleepGoalHours: 8,
    trainingFocus: '',
    recoveryPriority: false
  });
  
  // Fitbit sync state
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isCalculatingTrends, setIsCalculatingTrends] = useState(false);
  
  // SMS Alert settings
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Email notification settings
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [emailPreferences, setEmailPreferences] = useState({
    weeklySummary: true,
    riskAlerts: true,
    aiCoachRecommendations: true
  });
  
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { isConnected, isSyncing, syncNow } = useFitbitSync();
  const {
    currentDayIndex, 
    totalDays, 
    isSimulating, 
    startSimulation, 
    pauseSimulation, 
    resetSimulation,
    setDayIndex,
    refreshData
  } = useLiveData();

  const handleNextDay = () => {
    const nextIndex = currentDayIndex + 1;
    if (nextIndex >= totalDays) {
      setDayIndex(0); // Wrap to beginning
    } else {
      setDayIndex(nextIndex);
    }
  };

  // Load saved primary hue from localStorage and email preferences from Supabase
  useEffect(() => {
    const savedHue = localStorage.getItem("primary-hue");
    if (savedHue) {
      setPrimaryHue(parseInt(savedHue));
      updatePrimaryColor(parseInt(savedHue));
    }
    
    // Load SMS alert settings
    const alertSettings = getAlertSettings();
    setSmsEnabled(alertSettings.enableSMS);
    setPhoneNumber(alertSettings.phoneNumber);
    
    // Load last Fitbit sync time from fitbit_auto_data
    const fetchLastSync = async () => {
      const { data } = await supabase
        .from("fitbit_auto_data")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data?.fetched_at) {
        setLastSyncTime(new Date(data.fetched_at));
      }
    };
    fetchLastSync();
    
    // Listen for refresh events to update last sync time
    const handleRefresh = () => fetchLastSync();
    window.addEventListener("fitbit_trends_refresh", handleRefresh);
    
    // Load email preferences from Supabase
    loadEmailPreferences();

    // Load Yves preferences
    loadYvesPreferences();

    return () => window.removeEventListener("fitbit_trends_refresh", handleRefresh);
  }, []);

  const loadYvesPreferences = async () => {
    try {
      const context = await getUserContext();
      if (context?.training_profile) {
        const prefs = context.training_profile as any;
        setYvesPreferences({
          sleepGoalHours: prefs.sleepGoalHours || 8,
          trainingFocus: prefs.trainingFocus || '',
          recoveryPriority: prefs.recoveryPriority || false
        });
      }
    } catch (error) {
      console.error('Error loading Yves preferences:', error);
    }
  };

  const saveYvesPreferences = async (prefs: typeof yvesPreferences) => {
    try {
      await updateUserContext({ training_profile: prefs });
      toast({
        title: "Saved",
        description: "Yves preferences updated successfully"
      });
    } catch (error) {
      console.error('Error saving Yves preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save Yves preferences",
        variant: "destructive"
      });
    }
  };
  
  const loadEmailPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('email_preferences')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading email preferences:', error);
        toast({
          title: "Error",
          description: "Could not load email preferences",
          variant: "destructive",
        });
        return;
      }
      
      if (data?.email_preferences) {
        const prefs = data.email_preferences as any;
        setEmailPreferences({
          weeklySummary: prefs?.weeklySummary ?? true,
          riskAlerts: prefs?.riskAlerts ?? true,
          aiCoachRecommendations: prefs?.aiCoachRecommendations ?? true
        });
        // If all preferences are false, consider master toggle as disabled
        const allDisabled = !prefs?.weeklySummary && !prefs?.riskAlerts && !prefs?.aiCoachRecommendations;
        if (allDisabled) {
          setEmailNotificationsEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
  };
  
  const saveEmailPreferences = async (prefs: typeof emailPreferences) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('users')
        .update({ email_preferences: prefs })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error saving email preferences:', error);
        toast({
          title: "Error",
          description: "Failed to save email preferences",
          variant: "destructive"
        });
        return;
      }
      
      // Also call mock API endpoint
      try {
        await supabase.functions.invoke('email-preferences', {
          body: prefs
        });
      } catch (apiError) {
        console.log('Mock API call (will be connected later):', prefs);
      }
      
      toast({
        title: "Saved",
        description: "Email preferences updated successfully"
      });
    } catch (error) {
      console.error('Error saving email preferences:', error);
    }
  };

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

  const handleFitbitSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to connect Fitbit",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("fitbit-auth-initiate", {
        body: { user_id: user.id }
      });

      if (error || !data?.auth_url || !data?.code_verifier) {
        throw new Error(data?.error || error?.message || "Failed to initiate Fitbit connection");
      }

      sessionStorage.setItem("fitbit_code_verifier", data.code_verifier);
      sessionStorage.setItem("fitbit_user_id", user.id);

      window.location.href = data.auth_url;
    } catch (error) {
      console.error("Fitbit auth error:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Fitbit",
        variant: "destructive"
      });
    }
  };

  const handleSmsToggle = (enabled: boolean) => {
    setSmsEnabled(enabled);
    saveAlertSettings({ enableSMS: enabled, phoneNumber });
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value;
    setPhoneNumber(number);
    saveAlertSettings({ enableSMS: smsEnabled, phoneNumber: number });
  };
  
  const handleEmailMasterToggle = (enabled: boolean) => {
    setEmailNotificationsEnabled(enabled);
    if (!enabled) {
      // Disable all sub-toggles
      const newPrefs = {
        weeklySummary: false,
        riskAlerts: false,
        aiCoachRecommendations: false
      };
      setEmailPreferences(newPrefs);
      saveEmailPreferences(newPrefs);
    } else {
      // Enable all sub-toggles
      const newPrefs = {
        weeklySummary: true,
        riskAlerts: true,
        aiCoachRecommendations: true
      };
      setEmailPreferences(newPrefs);
      saveEmailPreferences(newPrefs);
    }
  };
  
  const handleEmailPreferenceChange = (key: keyof typeof emailPreferences, value: boolean) => {
    const newPrefs = { ...emailPreferences, [key]: value };
    setEmailPreferences(newPrefs);
    saveEmailPreferences(newPrefs);
  };

  const handleCalculateTrends = async () => {
    setIsCalculatingTrends(true);
    try {
      const response = await fetch('/.netlify/functions/calc-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'CTBNRR' })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        toast({
          title: "Success",
          description: `Calculated trends for ${result.count} days`,
        });
        
        // Dispatch custom event to refresh trends in other components
        window.dispatchEvent(new CustomEvent('fitbit_trends_refresh'));
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to calculate trends:', error);
      toast({
        title: "Error",
        description: "Failed to calculate trends. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsCalculatingTrends(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-3xl scrollable-content">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Settings</h1>
          </div>
          <div className="animate-slide-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <p className="text-muted-foreground text-base md:text-lg">Customize your experience</p>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Profile Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 md:p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
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

          {/* Yves AI Preferences Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Sparkles size={16} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Yves AI Preferences</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sleepGoal" className="text-sm text-muted-foreground">
                  Sleep Goal (hours per night)
                </Label>
                <Input
                  id="sleepGoal"
                  type="number"
                  min="6"
                  max="12"
                  value={yvesPreferences.sleepGoalHours}
                  onChange={(e) => {
                    const newPrefs = { ...yvesPreferences, sleepGoalHours: parseInt(e.target.value) };
                    setYvesPreferences(newPrefs);
                  }}
                  onBlur={() => saveYvesPreferences(yvesPreferences)}
                  className="mt-1 bg-glass/30 border-glass-border"
                />
              </div>

              <div>
                <Label htmlFor="trainingFocus" className="text-sm text-muted-foreground">
                  Training Focus
                </Label>
                <Input
                  id="trainingFocus"
                  placeholder="e.g., Marathon preparation, Weight loss, General fitness"
                  value={yvesPreferences.trainingFocus}
                  onChange={(e) => {
                    const newPrefs = { ...yvesPreferences, trainingFocus: e.target.value };
                    setYvesPreferences(newPrefs);
                  }}
                  onBlur={() => saveYvesPreferences(yvesPreferences)}
                  className="mt-1 bg-glass/30 border-glass-border"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-medium text-foreground">Prioritize Recovery</p>
                  <p className="text-sm text-muted-foreground">Yves will emphasize rest and recovery recommendations</p>
                </div>
                <Switch
                  checked={yvesPreferences.recoveryPriority}
                  onCheckedChange={(checked) => {
                    const newPrefs = { ...yvesPreferences, recoveryPriority: checked };
                    setYvesPreferences(newPrefs);
                    saveYvesPreferences(newPrefs);
                  }}
                />
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
              <div
                className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      Fitbit
                      {isConnected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          ✓ Connected
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isConnected 
                        ? "Auto-syncing every hour • Click Update for latest data"
                        : "Connect and sync your Fitbit data"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isConnected ? (
                    <Button
                      onClick={syncNow}
                      disabled={isSyncing}
                      size="sm"
                      variant="outline"
                      className="bg-glass/30 border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      <RefreshCw size={14} className={cn("mr-2", isSyncing && "animate-spin")} />
                      {isSyncing ? "Updating..." : "Update Now"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleFitbitSync}
                      size="sm"
                      className="bg-primary/80 hover:bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      Connect Fitbit
                    </Button>
                  )}
                </div>
              </div>
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
            <div className="space-y-4">
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
              
              <div className="pt-4 border-t border-glass-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-foreground">SMS Alerts</p>
                    <p className="text-sm text-muted-foreground">Get real-time alerts for training risks</p>
                  </div>
                  <Switch
                    checked={smsEnabled}
                    onCheckedChange={handleSmsToggle}
                  />
                </div>
                
                {smsEnabled && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="phone" className="text-sm text-muted-foreground">
                      Phone Number (South Africa)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+27827251107"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      className="bg-glass/30 border-glass-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert conditions: High training load (ACWR &gt; 1.5), Low recovery (HRV &lt; 65), Poor sleep (&lt; 70)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Notifications Section */}
          <TooltipProvider>
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Mail size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Email Notifications</h3>
                  <p className="text-sm text-muted-foreground">Choose what updates you'd like to receive by email</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Master Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-glass-border">
                  <div>
                    <p className="font-medium text-foreground">Enable Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Turn on to receive email updates</p>
                  </div>
                  <Switch
                    checked={emailNotificationsEnabled}
                    onCheckedChange={handleEmailMasterToggle}
                  />
                </div>
                
                {/* Individual Preferences */}
                <div className="space-y-4">
                  {/* Weekly Summary */}
                  <div className={cn(
                    "flex items-center justify-between transition-opacity duration-200",
                    !emailNotificationsEnabled && "opacity-50"
                  )}>
                    <div className="flex items-center gap-2 flex-1">
                      <div>
                        <p className="font-medium text-foreground">Weekly Summary Report</p>
                        <p className="text-sm text-muted-foreground">Receive a PDF overview of your health and training metrics</p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle size={16} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">Get a comprehensive weekly report with insights on your performance, recovery, and progress</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={emailPreferences.weeklySummary}
                      onCheckedChange={(checked) => handleEmailPreferenceChange('weeklySummary', checked)}
                      disabled={!emailNotificationsEnabled}
                    />
                  </div>
                  
                  {/* Risk Alerts */}
                  <div className={cn(
                    "flex items-center justify-between transition-opacity duration-200",
                    !emailNotificationsEnabled && "opacity-50"
                  )}>
                    <div className="flex items-center gap-2 flex-1">
                      <div>
                        <p className="font-medium text-foreground">Risk Alerts</p>
                        <p className="text-sm text-muted-foreground">Get notified when risk scores reach unsafe levels</p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle size={16} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">Receive alerts when ACWR, strain, or recovery indicators suggest increased injury risk</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={emailPreferences.riskAlerts}
                      onCheckedChange={(checked) => handleEmailPreferenceChange('riskAlerts', checked)}
                      disabled={!emailNotificationsEnabled}
                    />
                  </div>
                  
                  {/* AI Coach Recommendations */}
                  <div className={cn(
                    "flex items-center justify-between transition-opacity duration-200",
                    !emailNotificationsEnabled && "opacity-50"
                  )}>
                    <div className="flex items-center gap-2 flex-1">
                      <div>
                        <p className="font-medium text-foreground">AI Coach Recommendations</p>
                        <p className="text-sm text-muted-foreground">Receive daily performance and recovery advice</p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle size={16} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">Get personalized training and recovery recommendations based on your data</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={emailPreferences.aiCoachRecommendations}
                      onCheckedChange={(checked) => handleEmailPreferenceChange('aiCoachRecommendations', checked)}
                      disabled={!emailNotificationsEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TooltipProvider>

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

          {/* Live Feed Simulation Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                isSimulating ? "bg-green-500/20" : "bg-muted/50"
              )}>
                {isSimulating ? (
                  <PlayCircle size={16} className="text-green-400" />
                ) : (
                  <PauseCircle size={16} className="text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground">Live Feed Simulation</h3>
            </div>
            
            <div className="space-y-6">
              {/* Simulation Toggle */}
            <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Simulate Live Feed</p>
                  <p className="text-sm text-muted-foreground">Show floating 'Next Day' button for manual progression</p>
                </div>
                <Switch
                  checked={isSimulating}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      startSimulation();
                    } else {
                      pauseSimulation();
                    }
                  }}
                />
              </div>

              {/* Status Display */}
              <div className="bg-glass/30 border border-glass-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Current Status</span>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all",
                    isSimulating 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                      : "bg-muted/50 text-muted-foreground border border-border"
                  )}>
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      isSimulating ? "bg-green-400" : "bg-muted-foreground"
                    )} />
                    {isSimulating ? "Active" : "Inactive"}
                  </div>
                </div>
                <div className="text-center py-2">
                  <p className="text-2xl font-bold text-foreground mb-1">
                    Day {currentDayIndex + 1}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    of {totalDays} total days
                  </p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleNextDay}
                  className="w-full"
                  disabled={totalDays === 0}
                >
                  <SkipForward size={16} />
                  Next Day
                </Button>
                <Button
                  variant="outline"
                  onClick={resetSimulation}
                  className="w-full"
                  disabled={totalDays === 0}
                >
                  <RotateCcw size={16} />
                  Reset
                </Button>
              </div>

              {totalDays === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Upload data first to enable simulation controls
                </p>
              )}
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

          {/* Account Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Account</h3>
            </div>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                toast({
                  title: "Signed out",
                  description: "You have been successfully signed out",
                });
              }}
              className="w-full flex items-center justify-center p-4 rounded-xl border bg-destructive/10 border-destructive/20 hover:bg-destructive/20 transition-all duration-200"
              variant="ghost"
            >
              <span className="font-medium text-destructive">Sign Out</span>
            </Button>
          </div>

          {/* Developer Tools Section */}
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Database size={16} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Developer Tools</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate?.('test-supabase')}
                className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Database size={16} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Test Supabase Connection</p>
                    <p className="text-xs text-muted-foreground">Verify database connectivity</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>

              <Button
                onClick={handleCalculateTrends}
                disabled={isCalculatingTrends}
                className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200 h-auto"
                variant="ghost"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Database size={16} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Calculate Trends</p>
                    <p className="text-xs text-muted-foreground">
                      {isCalculatingTrends ? "Processing Fitbit data..." : "Generate training metrics from Fitbit data"}
                    </p>
                  </div>
                </div>
                {isCalculatingTrends ? (
                  <RefreshCw size={16} className="text-muted-foreground animate-spin" />
                ) : (
                  <ChevronRight size={16} className="text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};