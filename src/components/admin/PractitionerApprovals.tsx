// @ts-nocheck — practitioners table not yet in generated types
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Phone, Mail, CheckCircle2, Ban, Clock, Video,
  Loader2, RefreshCw, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface PractitionerRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  location_city: string | null;
  location_suburb: string | null;
  bio: string | null;
  specialisations: string[];
  fee_per_session: number | null;
  accepts_medical_aid: boolean;
  telehealth_available: boolean;
  phone: string | null;
  contact_email: string | null;
  profile_status: "pending_review" | "approved" | "suspended";
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  physiotherapist:      "Physiotherapist",
  biokineticist:        "Biokineticist",
  sports_doctor:        "Sports Doctor",
  run_coach:            "Run Coach",
  strength_coach:       "Strength & Conditioning",
  general_practitioner: "GP",
  dietician:            "Dietician",
  other:                "Other",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_review: { label: "Pending Review",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:       { label: "Approved",        className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  suspended:      { label: "Suspended",       className: "bg-red-100 text-red-700 border-red-200" },
};

export function PractitionerApprovals() {
  const { toast } = useToast();
  const [rows, setRows]       = useState<PractitionerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"pending_review" | "approved" | "suspended" | "all">("pending_review");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("practitioners")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") q = q.eq("profile_status", filter);

      const { data, error } = await q;
      if (error) throw error;
      setRows(data || []);
    } catch (err: any) {
      toast({ title: "Error loading practitioners", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: "approved" | "suspended" | "pending_review") => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from("practitioners")
        .update({ profile_status: status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setRows(prev => prev.map(r => r.id === id ? { ...r, profile_status: status } : r));
      toast({ title: status === "approved" ? "Practitioner approved ✓" : status === "suspended" ? "Practitioner suspended" : "Status updated" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const counts = {
    pending_review: rows.filter(r => r.profile_status === "pending_review").length,
    approved:       rows.filter(r => r.profile_status === "approved").length,
    suspended:      rows.filter(r => r.profile_status === "suspended").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Practitioner Approvals</h2>
          {counts.pending_review > 0 && (
            <Badge className="bg-amber-500 text-white text-xs px-2 py-0">
              {counts.pending_review} pending
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending_review", "approved", "suspended", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border hover:border-primary/30"
            )}
          >
            {f === "pending_review" ? "Pending" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && counts[f] !== undefined && (
              <span className="ml-1.5 opacity-70">({counts[f]})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filter === "pending_review" ? "No pending applications." : "No records found."}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Card header */}
              <div className="px-5 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <Badge variant="outline" className="text-xs py-0 text-primary border-primary/30">
                      {TYPE_LABELS[p.type] || p.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-xs py-0", STATUS_CONFIG[p.profile_status]?.className)}
                    >
                      {STATUS_CONFIG[p.profile_status]?.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Applied {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  {p.profile_status !== "approved" && (
                    <Button
                      size="sm"
                      disabled={updating === p.id}
                      onClick={() => updateStatus(p.id, "approved")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                    >
                      {updating === p.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve</>}
                    </Button>
                  )}
                  {p.profile_status !== "suspended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating === p.id}
                      onClick={() => updateStatus(p.id, "suspended")}
                      className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-3"
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />Suspend
                    </Button>
                  )}
                  {p.profile_status === "suspended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating === p.id}
                      onClick={() => updateStatus(p.id, "pending_review")}
                      className="h-8 px-3"
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="px-5 pb-4 space-y-3 border-t border-border/50 pt-3">
                {/* Location + contact */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {(p.location_city || p.location_suburb) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[p.location_suburb, p.location_city].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {p.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />{p.phone}
                    </span>
                  )}
                  {p.contact_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />{p.contact_email}
                    </span>
                  )}
                  {p.fee_per_session && (
                    <span className="font-medium text-foreground">R{p.fee_per_session}/session</span>
                  )}
                  {p.accepts_medical_aid && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />Medical aid
                    </span>
                  )}
                  {p.telehealth_available && (
                    <span className="text-blue-500 flex items-center gap-1">
                      <Video className="h-3 w-3" />Telehealth
                    </span>
                  )}
                </div>

                {/* Bio */}
                {p.bio && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.bio}</p>
                )}

                {/* Specialisations */}
                {p.specialisations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.specialisations.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-full text-xs text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
