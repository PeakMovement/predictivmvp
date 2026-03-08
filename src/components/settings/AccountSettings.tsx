import { Info, User, Database, Shield, ChevronRight, RefreshCw, Stethoscope, Sparkles, Download, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DataPrivacySettings } from "@/components/settings/DataPrivacySettings";
import { SymptomCheckInForm } from "@/components/symptoms/SymptomCheckInForm";
import { OnboardingSimulator } from "@/components/onboarding/OnboardingSimulator";
import { LayoutBlock } from "@/components/layout/LayoutBlock";

interface AccountSettingsProps {
  isSectionVisible: (id: string) => boolean;
  onNavigate?: (tab: string) => void;
}

export const AccountSettings = ({ isSectionVisible, onNavigate }: AccountSettingsProps) => {
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem("debugMode") === "true");
  const [isCalculatingTrends, setIsCalculatingTrends] = useState(false);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [showOnboardingSimulator, setShowOnboardingSimulator] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const { toast } = useToast();

  const handleDebugModeToggle = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem("debugMode", enabled.toString());
    window.dispatchEvent(new CustomEvent("debug-mode-changed", { detail: enabled }));
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("export-user-data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;

      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `predictiv-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: "Data exported", description: "Your data has been downloaded as JSON." });
    } catch {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("delete-user-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({ title: "Account deleted", description: "All your data has been permanently removed." });
      await supabase.auth.signOut();
      window.location.href = "/register";
    } catch {
      toast({ title: "Delete failed", description: "Please contact support if this persists.", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  const handleCalculateTrends = async () => {
    setIsCalculatingTrends(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.functions.invoke("calculate-oura-trends", { body: { user_id: user.id } });
      toast({ title: "Trends calculated", description: "Training metrics updated successfully." });
    } catch (error) {
      toast({ title: "Failed to calculate trends", variant: "destructive" });
    } finally {
      setIsCalculatingTrends(false);
    }
  };

  return (
    <>
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
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="flex justify-between items-center py-2 hover:text-foreground transition-colors">
            <span>Terms of Service</span>
            <ChevronRight size={16} />
          </a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="flex justify-between items-center py-2 hover:text-foreground transition-colors">
            <span>Privacy Policy</span>
            <ChevronRight size={16} />
          </a>
          <a href="mailto:justin15muller@gmail.com?subject=Support%20Request" className="flex justify-between items-center py-2 hover:text-foreground transition-colors">
            <span>Contact Support</span>
            <ChevronRight size={16} />
          </a>
        </div>
      </div>

      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <User size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Account</h3>
        </div>
        <div className="space-y-3">
          {/* Export data */}
          <Button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200 h-auto"
            variant="ghost"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                {isExporting ? <RefreshCw size={16} className="text-blue-400 animate-spin" /> : <Download size={16} className="text-blue-400" />}
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Export My Data</p>
                <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Button>

          {/* Delete account */}
          <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmText(""); }}>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 rounded-xl border bg-destructive/5 border-destructive/20 hover:bg-destructive/10 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-destructive/20 rounded-lg flex items-center justify-center">
                    <Trash2 size={16} className="text-destructive" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-destructive">Delete My Account</p>
                    <p className="text-xs text-muted-foreground">Permanently erase all data — cannot be undone</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete your account?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <span className="block">
                    This will permanently delete your account and all associated data — wearable sessions, health profiles,
                    Yves memory, recommendations, documents, and more. This cannot be undone.
                  </span>
                  <span className="block font-medium text-foreground">
                    Type <span className="font-mono text-destructive">DELETE</span> to confirm:
                  </span>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="font-mono"
                    autoComplete="off"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  className="bg-destructive hover:bg-destructive/90 disabled:opacity-40"
                >
                  {isDeleting ? "Deleting…" : "Delete account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Sign out */}
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              toast({ title: "Signed out", description: "You have been successfully signed out." });
            }}
            className="w-full flex items-center justify-center p-4 rounded-xl border bg-destructive/10 border-destructive/20 hover:bg-destructive/20 transition-all duration-200"
            variant="ghost"
          >
            <span className="font-medium text-destructive">Sign Out</span>
          </Button>
        </div>
      </div>

      <LayoutBlock blockId="dataPrivacy" displayName="Data & Privacy" pageId="profile" size="standard" visible={isSectionVisible("dataPrivacy")}>
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
                  {isCalculatingTrends ? "Processing data..." : "Generate training metrics from wearable data"}
                </p>
              </div>
            </div>
            {isCalculatingTrends
              ? <RefreshCw size={16} className="text-muted-foreground animate-spin" />
              : <ChevronRight size={16} className="text-muted-foreground" />
            }
          </Button>

          <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Info size={16} className="text-amber-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Debug Mode</p>
                <p className="text-xs text-muted-foreground">Show diagnostic panels and troubleshooting tools</p>
              </div>
            </div>
            <Switch checked={debugMode} onCheckedChange={handleDebugModeToggle} />
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

      <Dialog open={showSymptomChecker} onOpenChange={setShowSymptomChecker}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-orange-500" />
              Test Symptom Checker
            </DialogTitle>
          </DialogHeader>
          <SymptomCheckInForm onSuccess={() => {}} />
        </DialogContent>
      </Dialog>

      <OnboardingSimulator open={showOnboardingSimulator} onOpenChange={setShowOnboardingSimulator} />

      {/* Legal links */}
      <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1">
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Terms of Service
        </a>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Privacy Policy
        </a>
      </div>
    </>
  );
};
