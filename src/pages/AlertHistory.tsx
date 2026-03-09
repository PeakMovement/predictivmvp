import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle, CheckCircle2, Clock, X, FileText,
  Loader2, ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface AlertHistoryItem {
  id: string;
  alert_type: "high_risk" | "anomaly" | "red_flag";
  metric_name: string;
  metric_value: number;
  threshold_value: number;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "dismissed" | "resolved" | "snoozed";
  dismissed_at: string | null;
  resolved_at: string | null;
  snoozed_until: string | null;
  snooze_count: number;
  user_notes: string | null;
  created_at: string;
}

type FilterTab = "all" | "active" | "dismissed";

// ── Helpers ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const SEVERITY_TEXT: Record<string, string> = {
  low: "text-blue-400 bg-blue-500/15 border-blue-500/25",
  medium: "text-yellow-400 bg-yellow-500/15 border-yellow-500/25",
  high: "text-orange-400 bg-orange-500/15 border-orange-500/25",
  critical: "text-red-400 bg-red-500/15 border-red-500/25",
};

const TYPE_LABEL: Record<string, string> = {
  high_risk: "High Risk",
  anomaly: "Anomaly",
  red_flag: "Red Flag",
};

// ── Main page ──────────────────────────────────────────────────────────────

export default function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedAlert, setSelectedAlert] = useState<AlertHistoryItem | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const { toast } = useToast();

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("alert_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts((data as AlertHistoryItem[]) || []);
    } catch {
      toast({ title: "Failed to load alerts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const dismiss = async (id: string) => {
    const { error } = await supabase
      .from("alert_history")
      .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast({ title: "Failed to dismiss", variant: "destructive" }); return; }
    toast({ title: "Alert dismissed" });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "dismissed", dismissed_at: new Date().toISOString() } : a));
  };

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("alert_history")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast({ title: "Failed to resolve", variant: "destructive" }); return; }
    toast({ title: "Alert resolved" });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved", resolved_at: new Date().toISOString() } : a));
  };

  const saveNotes = async () => {
    if (!selectedAlert) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("alert_history")
      .update({ user_notes: notes })
      .eq("id", selectedAlert.id);
    setSavingNotes(false);
    if (error) { toast({ title: "Failed to save notes", variant: "destructive" }); return; }
    toast({ title: "Notes saved" });
    setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, user_notes: notes } : a));
    setShowNotesDialog(false);
  };

  // ── Filter ────────────────────────────────────────────────────────────

  const filtered = alerts.filter(a => {
    if (filter === "active") return a.status === "active" || a.status === "snoozed";
    if (filter === "dismissed") return a.status === "dismissed" || a.status === "resolved";
    return true;
  });

  const countActive = alerts.filter(a => a.status === "active" || a.status === "snoozed").length;

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-nav-safe max-w-lg space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {countActive > 0 ? `${countActive} active alert${countActive !== 1 ? "s" : ""}` : "No active alerts"}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 p-1 bg-muted/30 rounded-xl">
        {(["all", "active", "dismissed"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "flex-1 text-xs font-semibold py-1.5 rounded-lg capitalize transition-all",
              filter === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
            {tab === "active" && countActive > 0 && (
              <span className="ml-1 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">
                {countActive}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="w-12 h-12 text-green-400 mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === "active" ? "No active alerts — you're doing great!" : "No alerts here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={() => dismiss(alert.id)}
              onResolve={() => resolve(alert.id)}
              onNotes={() => {
                setSelectedAlert(alert);
                setNotes(alert.user_notes || "");
                setShowNotesDialog(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Notes dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
            <DialogDescription>Add notes about this alert for your records.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any observations or actions taken..."
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
            <Button onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Alert card ─────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onDismiss,
  onResolve,
  onNotes,
}: {
  alert: AlertHistoryItem;
  onDismiss: () => void;
  onResolve: () => void;
  onNotes: () => void;
}) {
  const isActive = alert.status === "active";
  const isSnoozed = alert.status === "snoozed" && alert.snoozed_until && new Date(alert.snoozed_until) > new Date();
  const isResolved = alert.status === "resolved";

  return (
    <div className={cn(
      "relative rounded-2xl border bg-card/60 overflow-hidden",
      isActive ? "border-border/50" : "border-border/20 opacity-75",
    )}>
      {/* Severity stripe */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", SEVERITY_COLORS[alert.severity] || "bg-muted")} />

      <div className="pl-4 pr-4 pt-4 pb-3 space-y-3">
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5">
            {alert.alert_type === "red_flag"
              ? <AlertTriangle className="w-4 h-4 text-red-400" />
              : alert.alert_type === "high_risk"
                ? <AlertTriangle className="w-4 h-4 text-orange-400" />
                : <AlertTriangle className="w-4 h-4 text-yellow-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {alert.metric_name} · {TYPE_LABEL[alert.alert_type] ?? alert.alert_type}
              </span>
              {/* Status badge */}
              {isActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                  Active
                </span>
              )}
              {isSnoozed && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground border border-border/30">
                  <Clock className="w-3 h-3" />
                  Snoozed
                </span>
              )}
              {isResolved && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                  <CheckCircle2 className="w-3 h-3" />
                  Resolved
                </span>
              )}
              {alert.status === "dismissed" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/20 text-muted-foreground border border-border/20">
                  Dismissed
                </span>
              )}
              {/* Severity pill */}
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize", SEVERITY_TEXT[alert.severity] || "")}>
                {alert.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(alert.created_at), "d MMM yyyy · h:mm a")}
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground/90 leading-relaxed">{alert.message}</p>

        {/* Value vs threshold */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span><span className="font-medium">Value:</span> {alert.metric_value.toFixed(1)}</span>
          <span><span className="font-medium">Threshold:</span> {alert.threshold_value.toFixed(1)}</span>
          {alert.snooze_count > 0 && (
            <span><span className="font-medium">Snoozed:</span> {alert.snooze_count}×</span>
          )}
        </div>

        {/* User notes */}
        {alert.user_notes && (
          <div className="rounded-lg bg-muted/20 border border-border/20 p-2.5">
            <p className="text-xs text-muted-foreground italic">{alert.user_notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {isActive && (
            <>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={onResolve}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onDismiss}>
                <X className="w-3.5 h-3.5" />
                Dismiss
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 ml-auto" onClick={onNotes}>
            <FileText className="w-3.5 h-3.5" />
            {alert.user_notes ? "Edit notes" : "Add notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
