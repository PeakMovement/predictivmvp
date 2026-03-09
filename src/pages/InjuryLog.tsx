import { useState, useEffect, useCallback } from "react";
import {
  Plus, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Calendar, ShieldAlert, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const BODY_PARTS = [
  "Knee", "Ankle", "Hip", "Shoulder", "Back",
  "Hamstring", "Quad", "Calf", "Foot", "Other",
];

const SEVERITY_META: Record<number, { label: string; bg: string; text: string; border: string }> = {
  1: { label: "1 – Minimal",  bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20" },
  2: { label: "2 – Mild",     bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  3: { label: "3 – Moderate", bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  4: { label: "4 – Severe",   bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20" },
  5: { label: "5 – Critical", bg: "bg-red-600/15",    text: "text-red-500",    border: "border-red-500/30" },
};

// ── Types ──────────────────────────────────────────────────────────────────

interface Injury {
  id: string;
  body_location: string;
  load_restrictions: string | null; // repurposed: stores free-text injury type
  notes: string | null;
  severity: number | null;
  injury_date: string;
  is_active: boolean;
  created_at: string;
}

interface LogForm {
  body_part: string;
  injury_type: string;
  severity: number;
  injury_date: string;
  notes: string;
}

const BLANK_FORM: LogForm = {
  body_part: "",
  injury_type: "",
  severity: 2,
  injury_date: new Date().toISOString().split("T")[0],
  notes: "",
};

// ── Severity Badge ─────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: number | null }) {
  const s = Math.max(1, Math.min(5, severity ?? 1));
  const meta = SEVERITY_META[s];
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border",
      meta.bg, meta.text, meta.border
    )}>
      {meta.label}
    </span>
  );
}

// ── Injury Card ────────────────────────────────────────────────────────────

function InjuryCard({
  injury,
  onMarkResolved,
}: {
  injury: Injury;
  onMarkResolved: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{injury.body_location}</span>
            <SeverityBadge severity={injury.severity} />
          </div>
          <p className="text-sm text-muted-foreground">
            {injury.load_restrictions
              ? injury.load_restrictions
              : "Injury logged"}{" "}
            · {format(parseISO(injury.injury_date), "d MMM yyyy")}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>Logged {format(parseISO(injury.injury_date), "d MMMM yyyy")}</span>
          </div>

          {injury.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Notes</p>
              <p className="text-sm">{injury.notes}</p>
            </div>
          )}

          {injury.is_active && (
            <Button
              size="sm"
              variant="outline"
              disabled={resolving}
              className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={async (e) => {
                e.stopPropagation();
                setResolving(true);
                await onMarkResolved(injury.id);
                setResolving(false);
              }}
            >
              {resolving
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <CheckCircle2 className="w-4 h-4 mr-2" />
              }
              Mark as Resolved
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Log Form Sheet ─────────────────────────────────────────────────────────

function LogInjurySheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<LogForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof LogForm, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.body_part) {
      toast({ title: "Select a body part", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await (supabase.from as any)("user_injury_profiles").insert({
      user_id: user.id,
      body_location: form.body_part,
      injury_type: "other",                          // enum requirement
      load_restrictions: form.injury_type || null,   // free-text type stored here
      notes: form.notes || null,
      severity: form.severity,
      injury_date: form.injury_date,
      current_phase: form.severity >= 4 ? "acute"
        : form.severity === 3 ? "sub_acute"
        : form.severity === 2 ? "rehabilitation"
        : "return_to_sport",
      is_active: true,
    });

    setSaving(false);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Injury logged" });
      setForm(BLANK_FORM);
      onSaved();
      onClose();
    }
  };

  const sev = form.severity;
  const sevMeta = SEVERITY_META[sev];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left mb-5">
          <SheetTitle>Log New Injury</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Body Part */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Body Part</label>
            <select
              value={form.body_part}
              onChange={(e) => set("body_part", e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Select body part…</option>
              {BODY_PARTS.map((bp) => (
                <option key={bp} value={bp}>{bp}</option>
              ))}
            </select>
          </div>

          {/* Injury Type */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Injury Type</label>
            <input
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Grade 2 sprain, Tendinopathy, Stress fracture…"
              value={form.injury_type}
              onChange={(e) => set("injury_type", e.target.value)}
            />
          </div>

          {/* Severity */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Severity —{" "}
              <span className={sevMeta.text}>{sevMeta.label}</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={sev}
              onChange={(e) => set("severity", Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "hsl(var(--primary))" }}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Minimal</span>
              <span>Critical</span>
            </div>
            {/* Visual pip row */}
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={cn(
                    "flex-1 h-1.5 rounded-full transition-all",
                    n <= sev ? SEVERITY_META[n].bg.replace("/10", "/60").replace("/15", "/60") : "bg-muted/30"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Date of Injury</label>
            <input
              type="date"
              value={form.injury_date}
              onChange={(e) => set("injury_date", e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Happened during sprint session, physio booked…"
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              : "Save Injury"
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function InjuryLog() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchInjuries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_injury_profiles")
      .select("id,body_location,load_restrictions,notes,severity,injury_date,is_active,created_at")
      .eq("user_id", userId)
      .order("injury_date", { ascending: false });
    if (!error && data) setInjuries(data as unknown as Injury[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchInjuries(); }, [fetchInjuries]);

  const handleMarkResolved = async (id: string) => {
    const { error } = await supabase
      .from("user_injury_profiles")
      .update({ is_active: false, current_phase: "full_clearance" })
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Marked as resolved" });
      fetchInjuries();
    }
  };

  const active = injuries.filter((i) => i.is_active);
  const history = injuries.filter((i) => !i.is_active);

  return (
    <div className="container mx-auto px-4 py-6 pb-nav-safe max-w-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Injury Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage your injuries</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setSheetOpen(true)}>
          <Plus className="w-4 h-4" />
          Log Injury
        </Button>
      </div>

      {/* Active Injuries */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-orange-400" />
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Active Injuries
          </h2>
          {active.length > 0 && (
            <Badge className="text-xs bg-orange-400/10 text-orange-400 border border-orange-400/20">
              {active.length}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[72px] rounded-2xl" />
            <Skeleton className="h-[72px] rounded-2xl" />
          </div>
        ) : active.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center">
            <p className="text-3xl mb-2">🙌</p>
            <p className="font-semibold text-foreground">No injuries logged — stay healthy!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap "Log Injury" if something comes up.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((inj) => (
              <InjuryCard key={inj.id} injury={inj} onMarkResolved={handleMarkResolved} />
            ))}
          </div>
        )}
      </section>

      {/* Injury History */}
      {(history.length > 0 || !loading) && (
        <section>
          <button
            className="flex items-center gap-2 mb-3 w-full text-left group"
            onClick={() => setHistoryExpanded((v) => !v)}
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors flex-1">
              Injury History
              {history.length > 0 && (
                <span className="ml-2 text-muted-foreground font-normal normal-case tracking-normal">
                  ({history.length})
                </span>
              )}
            </h2>
            {historyExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {historyExpanded && (
            history.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No resolved injuries yet.</p>
            ) : (
              <div className="space-y-3 opacity-70">
                {history.map((inj) => (
                  <InjuryCard key={inj.id} injury={inj} onMarkResolved={handleMarkResolved} />
                ))}
              </div>
            )
          )}
        </section>
      )}

      {/* Log sheet */}
      <LogInjurySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={fetchInjuries}
      />
    </div>
  );
}
