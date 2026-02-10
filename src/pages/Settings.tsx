import { useState, useEffect, useCallback } from "react";
import {
  User,
  Smartphone,
  Bell,
  Palette,
  Info,
  ChevronRight,
  Database,
  Mail,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Shield,
  Zap,
  Send,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/components/ThemeProvider";
import { useHighContrast } from "@/hooks/useHighContrast";
import { getAlertSettings, saveAlertSettings } from "@/lib/alertConditions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWearableSync } from "@/hooks/useWearableSync";
import { getUserContext, updateUserContext } from "@/api/yves";
import { ConnectPolarButton } from "@/components/ConnectPolarButton";
import { ConnectGarminButton } from "@/components/ConnectGarminButton";
import { PolarSyncButton } from "@/components/PolarSyncButton";
import { SymptomCheckInForm } from "@/components/symptoms/SymptomCheckInForm";
import { TonePreferenceSettings } from "@/components/settings/TonePreferenceSettings";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { OnboardingSimulator } from "@/components/onboarding/OnboardingSimulator";
import { GoogleCalendarConnection } from "@/components/GoogleCalendarConnection";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { DataPrivacySettings } from "@/components/settings/DataPrivacySettings";
import { AlertCustomizationSettings } from "@/components/settings/AlertCustomizationSettings";

export const Settings = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
  const [notifications, setNotifications] = useState(true);
  const [primaryHue, setPrimaryHue] = useState(263);
  const [isDragging, setIsDragging] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Yves preferences
  const [yvesPreferences, setYvesPreferences] = useState({
    sleepGoalHours: 8,
    trainingFocus: "",
    recoveryPriority: false,
  });

  // Ōura sync state
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isCalculatingTrends, setIsCalculatingTrends] = useState(false);

  // Polar connection state
  const [isPolarConnected, setIsPolarConnected] = useState(false);

  // Garmin connection state
  const [isGarminConnected, setIsGarminConnected] = useState(false);

  // SMS Alert settings
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Email notification settings
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [emailPreferences, setEmailPreferences] = useState({
    dailySummary: true,
    riskAlerts: true,
    aiCoachRecommendations: true,
  });
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [showOnboardingSimulator, setShowOnboardingSimulator] = useState(false);

  const { theme, setTheme } = useTheme();
  const { isHighContrast, toggleHighContrast } = useHighContrast();
  const { toast } = useToast();
  const { isConnected } = useWearableSync();

  // Load saved primary hue from localStorage and email preferences from Supabase
  useEffect(() => {
    const savedHue = localStorage.getItem("primary-hue");
    if (savedHue) {
      setPrimaryHue(parseInt(savedHue));
      updatePrimaryColor(parseInt(savedHue));
    }

    // Load debug mode from localStorage
    const savedDebugMode = localStorage.getItem("debugMode");
    setDebugMode(savedDebugMode === "true");

    // Load SMS alert settings
    const alertSettings = getAlertSettings();
    setSmsEnabled(alertSettings.enableSMS);
    setPhoneNumber(alertSettings.phoneNumber);

    // Load last wearable sync time from wearable_auto_data
    const fetchLastSync = async () => {
      const { data } = await supabase
        .from("wearable_auto_data")
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
    window.addEventListener("wearable_trends_refresh", handleRefresh);
    window.addEventListener("oura_trends_refresh", handleRefresh);

    // Load email preferences from Supabase
    loadEmailPreferences();

    // Load Yves preferences
    loadYvesPreferences();

    // Check Polar connection status
    checkPolarConnection();

    // Check Garmin connection status
    checkGarminConnection();

    // Handle garmin_connected query param
    const params = new URLSearchParams(window.location.search);
    if (params.get("garmin_connected") === "true") {
      setIsGarminConnected(true);
      toast({
        title: "Garmin Connected",
        description: "Your Garmin device has been successfully connected.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("garmin_error")) {
      toast({
        title: "Garmin Connection Failed",
        description: `Error: ${params.get("garmin_error")}. Please try again.`,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      window.removeEventListener("wearable_trends_refresh", handleRefresh);
      window.removeEventListener("oura_trends_refresh", handleRefresh);
    };
  }, []);

  const checkPolarConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use wearable_tokens table with source filter for Polar
      const { data } = await supabase
        .from("wearable_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check if there's any token (can be extended to check for specific polar scope)
      setIsPolarConnected(!!data);
    } catch (error) {
      console.error("Error checking Polar connection:", error);
    }
  };

  const checkGarminConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("wearable_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("scope", "garmin")
        .maybeSingle();

      setIsGarminConnected(!!data);
    } catch (error) {
      console.error("Error checking Garmin connection:", error);
    }
  };

  const loadYvesPreferences = async () => {
    try {
      const context = await getUserContext();
      if (context?.training_profile) {
        const prefs = context.training_profile as any;
        setYvesPreferences({
          sleepGoalHours: prefs.sleepGoalHours || 8,
          trainingFocus: prefs.trainingFocus || "",
          recoveryPriority: prefs.recoveryPriority || false,
        });
      }
    } catch (error) {
      console.error("Error loading Yves preferences:", error);
    }
  };

  const saveYvesPreferences = async (prefs: typeof yvesPreferences) => {
    try {
      await updateUserContext({ training_profile: prefs });
      toast({
        title: "Saved",
        description: "Yves preferences updated successfully",
      });
    } catch (error) {
      console.error("Error saving Yves preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save Yves preferences",
        variant: "destructive",
      });
    }
  };

  const loadEmailPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("users").select("email_preferences").eq("id", user.id).maybeSingle();

      if (error) {
        console.error("Error loading email preferences:", error);
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
          dailySummary: prefs?.dailySummary ?? prefs?.weeklySummary ?? true,
          riskAlerts: prefs?.riskAlerts ?? true,
          aiCoachRecommendations: prefs?.aiCoachRecommendations ?? true,
        });
        // If all preferences are false, consider master toggle as disabled
        const allDisabled = !prefs?.dailySummary && !prefs?.weeklySummary && !prefs?.riskAlerts && !prefs?.aiCoachRecommendations;
        if (allDisabled) {
          setEmailNotificationsEnabled(false);
        }
      }
    } catch (error) {
      console.error("Error loading email preferences:", error);
    }
  };

  const saveEmailPreferences = async (prefs: typeof emailPreferences) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("users").update({ email_preferences: prefs }).eq("id", user.id);

      if (error) {
        console.error("Error saving email preferences:", error);
        toast({
          title: "Error",
          description: "Failed to save email preferences",
          variant: "destructive",
        });
        return;
      }

      // Also call mock API endpoint
      try {
        await supabase.functions.invoke("email-preferences", {
          body: prefs,
        });
      } catch (apiError) {
        console.log("Mock API call (will be connected later):", prefs);
      }

      toast({
        title: "Saved",
        description: "Email preferences updated successfully",
      });
    } catch (error) {
      console.error("Error saving email preferences:", error);
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
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
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
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
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
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const connectOura = async () => {
    try {
      // Get the authenticated user's ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to connect your Ōura Ring");
      }

      // Ask the backend to build the correct authorize URL (keeps client_id out of the browser)
      const { data, error } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });

      if (error || !data?.auth_url) throw new Error(data?.error || "Failed to build Oura auth URL");

      window.location.href = data.auth_url;
    } catch (err) {
      console.error("[connectOura] Error:", err);
      alert(err instanceof Error ? err.message : "Failed to start Oura connection");
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
        dailySummary: false,
        riskAlerts: false,
        aiCoachRecommendations: false,
      };
      setEmailPreferences(newPrefs);
      saveEmailPreferences(newPrefs);
    } else {
      // Enable all sub-toggles
      const newPrefs = {
        dailySummary: true,
        riskAlerts: true,
        aiCoachRecommendations: true,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to calculate trends",
          variant: "destructive",
        });
        setIsCalculatingTrends(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("calc-trends", {
        body: { user_id: user.id },
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || "Unknown error");
      }

      toast({
        title: "Success",
        description: `Calculated trends for ${data.count} days`,
      });

      // Dispatch custom event to refresh trends in other components
      window.dispatchEvent(new CustomEvent("wearable_trends_refresh"));
    } catch (error) {
      console.error("Failed to calculate trends:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to calculate trends",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingTrends(false);
    }
  };

  const handleTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to send a test email",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sending test email...",
        description: "This may take a few seconds",
      });

      const { data, error } = await supabase.functions.invoke("send-daily-summary-email", {
        body: { testMode: true, testUserId: user.id },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.sent > 0) {
        toast({
          title: "Test email sent!",
          description: "Check your inbox for the daily summary email",
        });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        toast({
          title: "No email sent",
          description: data?.details?.[0] || "Check that daily summary is enabled",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      toast({
        title: "Failed to send test email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleDebugModeToggle = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem("debugMode", enabled.toString());

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('debugModeChanged'));

    toast({
      title: enabled ? "Debug Mode Enabled" : "Debug Mode Disabled",
      description: enabled
        ? "Diagnostic panels will now be visible on the Dashboard"
        : "Diagnostic panels are now hidden",
    });
  };

  // Layout customization
  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    previewMode,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    toggleCollapseByDefault,
    togglePreviewMode,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization('profile');

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-3xl scrollable-content">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
          <div className="flex justify-end mb-2">
            <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
          </div>
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Settings</h1>
          </div>
          <div className="animate-slide-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
            <p className="text-muted-foreground text-base md:text-lg">Customize your experience</p>
          </div>
        </div>

        {/* Layout Editor */}
        {isLayoutEditing && (
          <div className="mb-8 animate-fade-in">
            <LayoutEditor
              sections={editingSections}
              previewMode={previewMode}
              onSave={saveLayout}
              onCancel={closeLayoutEditor}
              onReset={resetToDefault}
              onToggleVisibility={toggleSectionVisibility}
              onToggleCollapseByDefault={toggleCollapseByDefault}
              onTogglePreviewMode={togglePreviewMode}
              onMoveUp={moveSectionUp}
              onMoveDown={moveSectionDown}
              onReorder={reorderSections}
            />
          </div>
        )}

        <div className="space-y-4 md:space-y-6">
          {/* Profile Section */}
          <LayoutBlock
            blockId="account"
            displayName="Account"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('account')}
          >
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 md:p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <User size={16} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Profile</h3>
              </div>
              <ProfileSettings />
            </div>
          </LayoutBlock>

          {/* Yves AI Preferences Section */}
          <LayoutBlock
            blockId="appearance"
            displayName="Appearance"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('appearance')}
          >
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

                {/* Tone Preference Section */}
                <div className="pt-4 border-t border-border/50">
                  <TonePreferenceSettings />
                </div>
              </div>
            </div>
          </LayoutBlock>

          {/* Connected Devices Section */}
          <LayoutBlock
            blockId="wearables"
            displayName="Wearables"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('wearables')}
          >
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Smartphone size={16} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Connected Devices</h3>
              </div>
              <div className="space-y-3">
                <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-foreground flex items-center gap-2">
                        Ōura Ring
                        {isConnected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            ✓ Connected
                          </span>
                        )}
                      </p>
                      {isConnected ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap size={12} className="text-green-500" />
                            Auto-sync enabled • Data updates automatically
                          </p>
                          {lastSyncTime && (
                            <p className="text-xs text-muted-foreground">
                              Last synced: {new Date(lastSyncTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Connect and sync your Ōura Ring data
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isConnected && (
                      <Button
                        onClick={connectOura}
                        size="sm"
                        className="bg-primary/80 hover:bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-200"
                      >
                        Connect Ōura Ring
                      </Button>
                    )}
                  </div>
                </div>

                <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-white"
                      >
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                        <path
                          d="M12 6v6l4 2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-foreground flex items-center gap-2">
                        Polar
                        {isPolarConnected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            ✓ Connected
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPolarConnected
                          ? "Connect your Polar fitness device"
                          : "Track training, sleep, and recovery data"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isPolarConnected && (
                      <PolarSyncButton
                        isConnected={isPolarConnected}
                        onSyncComplete={checkPolarConnection}
                      />
                    )}
                    <ConnectPolarButton
                      isConnected={isPolarConnected}
                      onConnectionChange={checkPolarConnection}
                    />
                  </div>
                </div>

                {/* Garmin Card */}
                <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-white"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-foreground flex items-center gap-2">
                        Garmin
                        {isGarminConnected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            ✓ Connected
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isGarminConnected
                          ? "Syncing your Garmin health data"
                          : "Connect and sync your Garmin health data"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ConnectGarminButton
                      isConnected={isGarminConnected}
                      onConnectionChange={checkGarminConnection}
                    />
                  </div>
                </div>
              </div>
            </div>
          </LayoutBlock>

          {/* Notifications Section */}
          <LayoutBlock
            blockId="notifications"
            displayName="Notifications"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('notifications')}
          >
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
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>

                <div className="pt-4 border-t border-glass-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-foreground">SMS Alerts</p>
                      <p className="text-sm text-muted-foreground">Get real-time alerts for training risks</p>
                    </div>
                    <Switch checked={smsEnabled} onCheckedChange={handleSmsToggle} />
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
                        Alert conditions: High training load (ACWR &gt; 1.5), Low recovery (HRV &lt; 65), Poor sleep (&lt;
                        70)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </LayoutBlock>

          {/* Email Notifications Section */}
          <LayoutBlock
            blockId="emailPrefs"
            displayName="Email Preferences"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('emailPrefs')}
          >
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
                    <Switch checked={emailNotificationsEnabled} onCheckedChange={handleEmailMasterToggle} />
                  </div>

                  {/* Individual Preferences */}
                  <div className="space-y-4">
                    {/* Daily Summary */}
                    <div
                      className={cn(
                        "flex items-center justify-between transition-opacity duration-200",
                        !emailNotificationsEnabled && "opacity-50",
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div>
                          <p className="font-medium text-foreground">Daily Summary Email</p>
                          <p className="text-sm text-muted-foreground">
                            Receive a morning health summary at 7:30am SA time
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                              <HelpCircle size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">
                              Get a comprehensive weekly report with insights on your performance, recovery, and progress
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={emailPreferences.dailySummary}
                        onCheckedChange={(checked) => handleEmailPreferenceChange("dailySummary", checked)}
                        disabled={!emailNotificationsEnabled}
                      />
                    </div>

                    {/* Test Email Button */}
                    <div className={cn(
                      "pt-2 transition-opacity duration-200",
                      (!emailNotificationsEnabled || !emailPreferences.dailySummary) && "opacity-50"
                    )}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestEmail}
                        disabled={!emailNotificationsEnabled || !emailPreferences.dailySummary || isSendingTestEmail}
                        className="w-full sm:w-auto"
                      >
                        <Send size={14} className="mr-2" />
                        {isSendingTestEmail ? "Sending..." : "Send Test Email"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Send a test daily summary email to verify it's working
                      </p>
                    </div>

                    {/* Risk Alerts */}
                    <div
                      className={cn(
                        "flex items-center justify-between transition-opacity duration-200",
                        !emailNotificationsEnabled && "opacity-50",
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div>
                          <p className="font-medium text-foreground">Risk Alerts</p>
                          <p className="text-sm text-muted-foreground">
                            Get notified when risk scores reach unsafe levels
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                              <HelpCircle size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">
                              Receive alerts when ACWR, strain, or recovery indicators suggest increased injury risk
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={emailPreferences.riskAlerts}
                        onCheckedChange={(checked) => handleEmailPreferenceChange("riskAlerts", checked)}
                        disabled={!emailNotificationsEnabled}
                      />
                    </div>

                    {/* AI Coach Recommendations */}
                    <div
                      className={cn(
                        "flex items-center justify-between transition-opacity duration-200",
                        !emailNotificationsEnabled && "opacity-50",
                      )}
                    >
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
                            <p className="max-w-xs text-xs">
                              Get personalized training and recovery recommendations based on your data
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={emailPreferences.aiCoachRecommendations}
                        onCheckedChange={(checked) => handleEmailPreferenceChange("aiCoachRecommendations", checked)}
                        disabled={!emailNotificationsEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </LayoutBlock>

          {/* Alert Customization Section */}
          <LayoutBlock
            blockId="alertCustomization"
            displayName="Alert Settings"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('alertCustomization')}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/alert-history"}
                  className="gap-2"
                >
                  <Bell size={16} />
                  View Alert History
                </Button>
              </div>
              <AlertCustomizationSettings />
            </div>
          </LayoutBlock>

          {/* Google Calendar Integration Section */}
          <LayoutBlock
            blockId="googleCalendar"
            displayName="Google Calendar"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('googleCalendar')}
          >
            <GoogleCalendarConnection />
          </LayoutBlock>

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

              {/* High Contrast Mode */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-foreground">High Contrast Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Enhance color contrast for better readability (WCAG AAA)
                    </p>
                  </div>
                  <Switch
                    checked={isHighContrast}
                    onCheckedChange={toggleHighContrast}
                    aria-label="Toggle high contrast mode"
                  />
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
                        boxShadow:
                          theme === "dark"
                            ? `0 0 60px hsl(${primaryHue}, 70%, 50%, 0.4), 0 0 100px hsl(${primaryHue}, 70%, 50%, 0.2)`
                            : undefined,
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
                        boxShadow:
                          theme === "dark"
                            ? "inset 0 0 0 1px rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.3)"
                            : "inset 0 0 0 1px rgba(0,0,0,0.05), 0 2px 16px rgba(0,0,0,0.08)",
                      }}
                    />

                    {/* Selected color indicator */}
                    <div
                      className={cn(
                        "absolute w-10 h-10 rounded-full border-[3px] transition-all duration-150 pointer-events-none z-20",
                        "light:border-white light:shadow-[0_4px_16px_rgba(0,0,0,0.15)]",
                        "dark:border-background dark:shadow-lg",
                        isDragging && "scale-125",
                      )}
                      style={{
                        backgroundColor: `hsl(${primaryHue}, 70%, 50%)`,
                        top: `${50 + 44 * Math.sin(((primaryHue - 90) * Math.PI) / 180)}%`,
                        left: `${50 + 44 * Math.cos(((primaryHue - 90) * Math.PI) / 180)}%`,
                        transform: "translate(-50%, -50%)",
                        boxShadow:
                          theme === "dark"
                            ? `0 0 24px hsl(${primaryHue}, 70%, 50%, 0.8), 0 0 48px hsl(${primaryHue}, 70%, 50%, 0.4), 0 4px 12px rgba(0,0,0,0.3)`
                            : `0 0 16px hsl(${primaryHue}, 70%, 50%, 0.5), 0 4px 16px rgba(0,0,0,0.15)`,
                      }}
                    />

                    {/* Center preview circle */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-[3px] transition-all duration-150 light:border-white dark:border-background"
                      style={{
                        backgroundColor: `hsl(${primaryHue}, 70%, 50%)`,
                        boxShadow:
                          theme === "dark"
                            ? `0 0 40px hsl(${primaryHue}, 70%, 50%, 0.6), inset 0 2px 16px rgba(255,255,255,0.2), 0 8px 24px rgba(0,0,0,0.4)`
                            : `0 0 24px hsl(${primaryHue}, 70%, 50%, 0.3), inset 0 2px 8px rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.12)`,
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

          {/* Data & Privacy Section */}
          <LayoutBlock
            blockId="dataPrivacy"
            displayName="Data & Privacy"
            pageId="profile"
            size="standard"
            visible={isSectionVisible('dataPrivacy')}
          >
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Database size={16} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Data & Privacy</h3>
              </div>
              <DataPrivacySettings />
            </div>
          </LayoutBlock>

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
                onClick={() => onNavigate?.("admin-dashboard")}
                className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Shield size={16} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Admin Dashboard</p>
                    <p className="text-xs text-muted-foreground">System health, sync status & anomaly alerts</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>

              <button
                onClick={() => onNavigate?.("test-supabase")}
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

              <button
                onClick={() => onNavigate?.("oura-diagnostics")}
                className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-purple-400"></div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Ōura Ring Diagnostics</p>
                    <p className="text-xs text-muted-foreground">Test Ōura connection and view token status</p>
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

              <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Info size={16} className="text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Debug Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Show diagnostic panels and troubleshooting tools
                    </p>
                  </div>
                </div>
                <Switch
                  checked={debugMode}
                  onCheckedChange={handleDebugModeToggle}
                />
              </div>

              <button
                onClick={() => setShowSymptomChecker(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Stethoscope size={16} className="text-orange-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Test Symptom Checker</p>
                    <p className="text-xs text-muted-foreground">Verify symptom flow, red flags & Help redirect</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>

              <button
                onClick={() => setShowOnboardingSimulator(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Simulate Onboarding</p>
                    <p className="text-xs text-muted-foreground">Preview the new user onboarding experience</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Symptom Checker Test Dialog */}
        <Dialog open={showSymptomChecker} onOpenChange={setShowSymptomChecker}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-orange-500" />
                Test Symptom Checker
              </DialogTitle>
            </DialogHeader>
            <SymptomCheckInForm 
              onSuccess={() => {
                // Keep dialog open to show the red-flag flow or find help prompt
              }} 
            />
          </DialogContent>
        </Dialog>

        {/* Onboarding Simulator */}
        <OnboardingSimulator
          open={showOnboardingSimulator}
          onOpenChange={setShowOnboardingSimulator}
        />
      </div>
    </div>
  );
};
