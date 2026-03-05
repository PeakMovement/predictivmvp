import { useState, useEffect } from "react";
import { Bell, Mail, CircleHelp as HelpCircle, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAlertSettings, saveAlertSettings } from "@/lib/alertConditions";
import { AlertCustomizationSettings } from "@/components/settings/AlertCustomizationSettings";
import { GoogleCalendarConnection } from "@/components/GoogleCalendarConnection";
import { LayoutBlock } from "@/components/layout/LayoutBlock";

interface NotificationsSettingsProps {
  isSectionVisible: (id: string) => boolean;
  onNavigate?: (tab: string) => void;
}

export const NotificationsSettings = ({ isSectionVisible, onNavigate }: NotificationsSettingsProps) => {
  const [notifications, setNotifications] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [emailPreferences, setEmailPreferences] = useState({
    dailySummary: true,
    riskAlerts: true,
    aiCoachRecommendations: true,
  });
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const alertSettings = getAlertSettings();
    setSmsEnabled(alertSettings.enableSMS || false);
    setPhoneNumber(alertSettings.phoneNumber || "");
    loadEmailPreferences();
  }, []);

  const loadEmailPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("email_preferences").eq("id", user.id).maybeSingle();
      if (data?.email_preferences) {
        const prefs = data.email_preferences as any;
        setEmailNotificationsEnabled(!(!prefs?.dailySummary && !prefs?.riskAlerts && !prefs?.aiCoachRecommendations));
        setEmailPreferences({
          dailySummary: prefs?.dailySummary ?? true,
          riskAlerts: prefs?.riskAlerts ?? true,
          aiCoachRecommendations: prefs?.aiCoachRecommendations ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading email preferences:", error);
    }
  };

  const saveEmailPreferences = async (prefs: typeof emailPreferences) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("users").update({ email_preferences: prefs }).eq("id", user.id);
      await supabase.functions.invoke("email-preferences", { body: { userId: user.id, preferences: prefs } });
    } catch (error) {
      console.error("Error saving email preferences:", error);
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
      const newPrefs = { dailySummary: false, riskAlerts: false, aiCoachRecommendations: false };
      setEmailPreferences(newPrefs);
      saveEmailPreferences(newPrefs);
    }
  };

  const handleEmailPreferenceChange = (key: keyof typeof emailPreferences, value: boolean) => {
    const newPrefs = { ...emailPreferences, [key]: value };
    setEmailPreferences(newPrefs);
    saveEmailPreferences(newPrefs);
  };

  const handleTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.functions.invoke("send-daily-summary-email", { body: { userId: user.id, isTest: true } });
      toast({ title: "Test email sent!", description: "Check your inbox shortly." });
    } catch {
      toast({ title: "Failed to send test email", variant: "destructive" });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  return (
    <>
      <LayoutBlock blockId="notifications" displayName="Notifications" pageId="profile" size="standard" visible={isSectionVisible("notifications")}>
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
                  <Label htmlFor="phone" className="text-sm text-muted-foreground">Phone Number (South Africa)</Label>
                  <Input id="phone" type="tel" placeholder="+27827251107" value={phoneNumber} onChange={handlePhoneNumberChange} className="bg-glass/30 border-glass-border" />
                  <p className="text-xs text-muted-foreground">Alert conditions: High training load (ACWR &gt; 1.5), Low recovery (HRV &lt; 65), Poor sleep (&lt; 70)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </LayoutBlock>

      <LayoutBlock blockId="emailPrefs" displayName="Email Preferences" pageId="profile" size="standard" visible={isSectionVisible("emailPrefs")}>
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
              <div className="flex items-center justify-between pb-4 border-b border-glass-border">
                <div>
                  <p className="font-medium text-foreground">Enable Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Turn on to receive email updates</p>
                </div>
                <Switch checked={emailNotificationsEnabled} onCheckedChange={handleEmailMasterToggle} />
              </div>
              <div className="space-y-4">
                {[
                  { key: "dailySummary" as const, label: "Daily Summary Email", desc: "Receive a morning health summary at 7:30am SA time", tip: "Get a comprehensive weekly report with insights on your performance" },
                  { key: "riskAlerts" as const, label: "Risk Alerts", desc: "Get notified when risk scores reach unsafe levels", tip: "Receive alerts when ACWR, strain, or recovery indicators suggest increased injury risk" },
                  { key: "aiCoachRecommendations" as const, label: "AI Coach Recommendations", desc: "Receive daily performance and recovery advice", tip: "Get personalized training and recovery recommendations based on your data" },
                ].map(({ key, label, desc, tip }) => (
                  <div key={key} className={cn("flex items-center justify-between transition-opacity duration-200", !emailNotificationsEnabled && "opacity-50")}>
                    <div className="flex items-center gap-2 flex-1">
                      <div>
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors"><HelpCircle size={16} /></button>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-xs text-xs">{tip}</p></TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch checked={emailPreferences[key]} onCheckedChange={(checked) => handleEmailPreferenceChange(key, checked)} disabled={!emailNotificationsEnabled} />
                  </div>
                ))}
                <div className={cn("pt-2 transition-opacity duration-200", (!emailNotificationsEnabled || !emailPreferences.dailySummary) && "opacity-50")}>
                  <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={!emailNotificationsEnabled || !emailPreferences.dailySummary || isSendingTestEmail} className="w-full sm:w-auto">
                    <Send size={14} className="mr-2" />
                    {isSendingTestEmail ? "Sending..." : "Send Test Email"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </LayoutBlock>

      <LayoutBlock blockId="alertCustomization" displayName="Alert Settings" pageId="profile" size="standard" visible={isSectionVisible("alertCustomization")}>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("alert-history")} className="gap-2">
              <Bell size={16} />
              View Alert History
            </Button>
          </div>
          <AlertCustomizationSettings />
        </div>
      </LayoutBlock>

      <LayoutBlock blockId="googleCalendar" displayName="Google Calendar" pageId="profile" size="standard" visible={isSectionVisible("googleCalendar")}>
        <GoogleCalendarConnection />
      </LayoutBlock>
    </>
  );
};
