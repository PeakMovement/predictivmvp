import { useState, useEffect, useCallback } from "react";
import { Bell, Mail, Clock, Send, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface NotifPrefs {
  briefingEnabled: boolean;
  briefingTime: string;
  alertNotificationsEnabled: boolean;
  weeklySummaryEnabled: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  briefingEnabled: true,
  briefingTime: "07:00",
  alertNotificationsEnabled: true,
  weeklySummaryEnabled: true,
};

export const NotificationsSettings = ({ isSectionVisible, onNavigate }: NotificationsSettingsProps) => {
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const { toast } = useToast();

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const legacy = getAlertSettings();
    setSmsEnabled(legacy.enableSMS || false);
    setPhoneNumber(legacy.phoneNumber || "");
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("alert_settings")
        .select("briefing_enabled, briefing_time, alert_notifications_enabled, weekly_summary_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          briefingEnabled: data.briefing_enabled ?? true,
          briefingTime: data.briefing_time ?? "07:00",
          alertNotificationsEnabled: data.alert_notifications_enabled ?? true,
          weeklySummaryEnabled: data.weekly_summary_enabled ?? true,
        });
      }
    } catch {
      // silently fall back to defaults
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const savePrefs = useCallback(async (next: Partial<NotifPrefs>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const merged = { ...prefs, ...next };
      setPrefs(merged);

      // Primary: upsert to alert_settings (notification prefs live here)
      const { error } = await supabase
        .from("alert_settings")
        .upsert(
          {
            user_id: user.id,
            briefing_enabled: merged.briefingEnabled,
            briefing_time: merged.briefingTime,
            alert_notifications_enabled: merged.alertNotificationsEnabled,
            weekly_summary_enabled: merged.weeklySummaryEnabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) throw error;

      // Mirror briefing_enabled + briefing_time to user_profiles so the
      // send-daily-summary-email edge function can still read them.
      await supabase
        .from("user_profiles")
        .update({
          briefing_enabled: merged.briefingEnabled,
          briefing_time: merged.briefingTime,
          alert_notifications_enabled: merged.alertNotificationsEnabled,
          weekly_summary_enabled: merged.weeklySummaryEnabled,
        })
        .eq("user_id", user.id);

      toast({ title: "Preferences saved" });
    } catch (err) {
      toast({
        title: "Failed to save preferences",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [prefs, toast]);

  // ── SMS ───────────────────────────────────────────────────────────────────

  const handleSmsToggle = (enabled: boolean) => {
    setSmsEnabled(enabled);
    saveAlertSettings({ enableSMS: enabled, phoneNumber });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    setPhoneNumber(num);
    saveAlertSettings({ enableSMS: smsEnabled, phoneNumber: num });
  };

  // ── Test email ────────────────────────────────────────────────────────────

  const handleTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.functions.invoke("send-daily-summary-email", {
        body: { userId: user.id, isTest: true },
      });
      toast({ title: "Test email sent!", description: "Check your inbox shortly." });
    } catch {
      toast({ title: "Failed to send test email", variant: "destructive" });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── SMS Alerts ─────────────────────────────────────────────────────── */}
      <LayoutBlock blockId="notifications" displayName="Notifications" pageId="profile" size="standard" visible={isSectionVisible("notifications")}>
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Bell size={16} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">SMS Alerts</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">SMS Alerts</p>
                <p className="text-sm text-muted-foreground">Get real-time alerts for training risks</p>
              </div>
              <Switch checked={smsEnabled} onCheckedChange={handleSmsToggle} />
            </div>
            {smsEnabled && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="phone" className="text-sm text-muted-foreground">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27827251107"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="bg-glass/30 border-glass-border"
                />
                <p className="text-xs text-muted-foreground">
                  Alert conditions: High training load (ACWR &gt; 1.5), Low recovery (HRV &lt; 65), Poor sleep (&lt; 70)
                </p>
              </div>
            )}
          </div>
        </div>
      </LayoutBlock>

      {/* ── Email Notifications ──────────────────────────────────────────────── */}
      <LayoutBlock blockId="emailPrefs" displayName="Email Notifications" pageId="profile" size="standard" visible={isSectionVisible("emailPrefs")}>
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Mail size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Email Notifications</h3>
              <p className="text-sm text-muted-foreground">Choose what updates to receive by email</p>
            </div>
            {saving && <Loader2 size={14} className="ml-auto animate-spin text-muted-foreground" />}
          </div>

          <div className="space-y-5">

            {/* 1 — Daily Briefing */}
            <div className="space-y-3 pb-5 border-b border-glass-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Daily Briefing</p>
                  <p className="text-sm text-muted-foreground">Your personalised morning briefing from Yves</p>
                </div>
                <Switch
                  checked={prefs.briefingEnabled}
                  onCheckedChange={(v) => savePrefs({ briefingEnabled: v })}
                />
              </div>

              {/* Time picker — only shown when enabled */}
              <div className={cn("flex items-center gap-3 transition-opacity", !prefs.briefingEnabled && "opacity-40 pointer-events-none")}>
                <Clock size={15} className="text-muted-foreground shrink-0" />
                <Label htmlFor="briefing-time" className="text-sm text-muted-foreground whitespace-nowrap">
                  Send at
                </Label>
                <Input
                  id="briefing-time"
                  type="time"
                  value={prefs.briefingTime}
                  onChange={(e) => savePrefs({ briefingTime: e.target.value })}
                  className="w-32 bg-glass/30 border-glass-border text-sm"
                  disabled={!prefs.briefingEnabled}
                />
                <span className="text-xs text-muted-foreground">local time</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={!prefs.briefingEnabled || isSendingTestEmail}
                className={cn("w-full sm:w-auto gap-2", (!prefs.briefingEnabled) && "opacity-40")}
              >
                {isSendingTestEmail
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Send size={14} />}
                {isSendingTestEmail ? "Sending…" : "Send Test Email"}
              </Button>
            </div>

            {/* 2 — Alert Notifications */}
            <div className="flex items-center justify-between pb-5 border-b border-glass-border">
              <div>
                <p className="font-medium text-foreground">Alert Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified when a risk alert fires (ACWR, HRV, sleep)</p>
              </div>
              <Switch
                checked={prefs.alertNotificationsEnabled}
                onCheckedChange={(v) => savePrefs({ alertNotificationsEnabled: v })}
              />
            </div>

            {/* 3 — Weekly Summary */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Weekly Summary</p>
                <p className="text-sm text-muted-foreground">Performance overview every Sunday morning</p>
              </div>
              <Switch
                checked={prefs.weeklySummaryEnabled}
                onCheckedChange={(v) => savePrefs({ weeklySummaryEnabled: v })}
              />
            </div>

          </div>
        </div>
      </LayoutBlock>

      {/* ── Alert Customisation ──────────────────────────────────────────────── */}
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

      {/* ── Google Calendar ───────────────────────────────────────────────────── */}
      <LayoutBlock blockId="googleCalendar" displayName="Google Calendar" pageId="profile" size="standard" visible={isSectionVisible("googleCalendar")}>
        <GoogleCalendarConnection />
      </LayoutBlock>
    </>
  );
};
