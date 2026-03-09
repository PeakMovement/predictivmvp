import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, Plus, X, ChevronDown, ChevronUp, Calendar,
  AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

type InjuryPhase = "acute" | "sub_acute" | "rehabilitation" | "return_to_sport" | "full_clearance";
type InjuryType =
  | "muscle_strain" | "ligament_tear" | "fracture" | "surgery"
  | "spinal" | "tendinopathy" | "other";

interface Injury {
  id: string;
  injury_type: InjuryType;
  body_location: string;
  injury_date: string;
  current_phase: InjuryPhase;
  load_restrictions: string | null;
  target_return_date: string | null;
  is_active: boolean;
  created_at: string;
  notes?: string | null;
}

const INJURY_TYPE_LABELS: Record<InjuryType, string> = {
  muscle_strain: "Muscle Strain",
  ligament_tear: "Ligament Tear",
  fracture: "Fracture",
  surgery: "Surgery / Post-op",
  spinal: "Spinal",
  tendinopathy: "Tendinopathy",
  other: "Other",
};

const PHASE_META: Record<InjuryPhase, { label: string; color: string }> = {
  acute: { label: "Acute", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  sub_acute: { label: "Sub-acute", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  rehabilitation: { label: "Rehab", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  return_to_sport: { label: "Return to Sport", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  full_clearance: { label: "Full Clearance", color: "text-green-400 bg-green-400/10 border-green-400/20" },
};

const SEVERITY_LABELS = ["", "1 – Minimal", "2 – Mild", "3 – Moderate", "4 – Severe", "5 – Critical"];

// Severity → phase mapping (simple heuristic for new logs)
function severityToPhase(s: number): InjuryPhase {
  if (s >= 4) return "acute";
  if (s === 3) return "sub_acute";
  if (s === 2) return "rehabilitation";
  return "return_to_sport";
}

// ── Form ───────────────────────────────────────────────────────────────────

interface LogForm {
  body_location: string;
  injury_type: InjuryType;
  severity: number;
  injury_date: string;
  notes: string;
}

const BLANK_FORM: LogForm = {
  body_location: "",
  injury_type: "muscle_strain",
  severity: 2,
  injury_date: new Date().toISOString().split("T")[0],
  notes: "",
};

// ── Injury Card ────────────────────────────────────────────────────────────

function InjuryCard({
  injury,
  onMarkResolved,
}: {
  injury: Injury;
  onMarkResolved: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const phase = PHASE_META[injury.current_phase];

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground capitalize">
              {injury.body_location}
            </span>
            <Badge className={`text-xs border ${phase.color}`}>
              {phase.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {INJURY_TYPE_LABELS[injury.injury_type]} ·{" "}
            {format(parseISO(injury.injury_date), "d MMM yyyy")}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {injury.load_restrictions && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Load Restrictions</p>
              <p className="text-sm">{injury.load_restrictions}</p>
            </div>
          )}
          {injury.target_return_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Target return:</span>
              <span>{format(parseISO(injury.target_return_date), "d MMM yyyy")}</span>
            </div>
          )}
          {injury.is_active && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={(e) => { e.stopPropagation(); onMarkResolved(injury.id); }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark as Resolved
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function InjuryLog() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LogForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const fetchInjuries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_injury_profiles")
      .select("id,injury_type,body_location,injury_date,current_phase,load_restrictions,target_return_date,is_active,created_at")
      .eq("user_id", userId)
      .order("injury_date", { ascending: false });
    if (!error && data) setInjuries(data as unknown as Injury[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchInjuries(); }, [fetchInjuries]);

  const handleSave = async () => {
    if (!userId) return;
    if (!form.body_location.trim()) {
      toast({ title: "Body part is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("user_injury_profiles").insert({
      user_id: userId,
      body_location: form.body_location.trim(),
      injury_type: form.injury_type,
      injury_date: form.injury_date,
      current_phase: severityToPhase(form.severity),
      load_restrictions: form.notes.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save injury", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Injury logged" });
      setShowForm(false);
      setForm(BLANK_FORM);
      fetchInjuries();
    }
  };

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
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "Log Injury"}
        </Button>
      </div>

      {/* Log Form */}
      {showForm && (
        <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur p-4 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">New Injury</h2>

          {/* Body Part */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Body Part / Location</label>
            <input
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Left knee, Lower back…"
              value={form.body_location}
              onChange={(e) => setForm((f) => ({ ...f, body_location: e.target.value }))}
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Injury Type</label>
            <select
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.injury_type}
              onChange={(e) => setForm((f) => ({ ...f, injury_type: e.target.value as InjuryType }))}
            >
              {Object.entries(INJURY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Severity — <span className="text-primary">{SEVERITY_LABELS[form.severity]}</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Minimal</span><span>Critical</span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Date of Injury</label>
            <input
              type="date"
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.injury_date}
              onChange={(e) => setForm((f) => ({ ...f, injury_date: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Notes / Load Restrictions</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="e.g. No running, physio 2×/week…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Injury"}
          </Button>
        </div>
      )}

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
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : active.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center">
            <p className="text-2xl mb-2">🙌</p>
            <p className="font-medium">No injuries logged — stay healthy!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the "Log Injury" button if something comes up.
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

      {/* History */}
      {history.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Past Injuries
            </h2>
          </div>
          <div className="space-y-3 opacity-60">
            {history.map((inj) => (
              <InjuryCard key={inj.id} injury={inj} onMarkResolved={handleMarkResolved} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
