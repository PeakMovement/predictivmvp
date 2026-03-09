import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkline } from "@/components/charts/Sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stethoscope, AlertTriangle, CheckCircle, Clock, ArrowLeft,
  Activity, Heart, Brain, Zap, User, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PatientSummary {
  accessId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  lastSyncDate: string | null;
  readinessScore: number | null;
  hrvTrend: { value: number }[];
  latestHrv: number | null;
  activeInjury: {
    type: string;
    bodyLocation: string;
    phase: string;
    loadRestrictions: string | null;
  } | null;
  unacknowledgedAnomalies: {
    id: string;
    metric: string;
    severity: string;
    deviationPct: number | null;
  }[];
  lastRecommendation: string | null;
  lastRecommendationCategory: string | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  acute: "Acute",
  sub_acute: "Sub-Acute",
  rehabilitation: "Rehabilitation",
  return_to_sport: "Return to Sport",
  full_clearance: "Full Clearance",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

const READINESS_COLOR = (score: number | null) => {
  if (!score) return "text-slate-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
};

// ─── DATA FETCHING ────────────────────────────────────────────────────────────

async function loadPatientsForPractitioner(practitionerId: string): Promise<PatientSummary[]> {
  // Get all active access grants for this practitioner
  const { data: grants, error: grantsError } = await supabase
    .from("practitioner_access")
    .select("id, patient_id, practitioner_email")
    .eq("practitioner_id", practitionerId)
    .eq("is_active", true);

  if (grantsError || !grants || grants.length === 0) return [];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const summaries = await Promise.all(
    grants.map(async (grant) => {
      const patientId = grant.patient_id;

      // Fetch all patient data in parallel
      const [
        { data: profile },
        { data: sessions },
        { data: trainingTrends },
        { data: injury },
        { data: anomalies },
        { data: recommendations },
      ] = await Promise.all([
        supabase.from("user_profiles" as any).select("full_name, email").eq("user_id", patientId).maybeSingle(),
        supabase.from("wearable_sessions").select("date, readiness_score, hrv_avg").eq("user_id", patientId).order("date", { ascending: false }).limit(7),
        supabase.from("training_trends").select("date, hrv").eq("user_id", patientId).gte("date", sevenDaysAgoStr).order("date", { ascending: true }).limit(7),
        (supabase.from as any)("user_injury_profiles").select("injury_type, body_location, current_phase, load_restrictions").eq("user_id", patientId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("health_anomalies").select("id, metric_name, severity, deviation_percent").eq("user_id", patientId).is("acknowledged_at", null).order("detected_at", { ascending: false }).limit(5),
        supabase.from("yves_recommendations").select("recommendation_text, category, priority, created_at").eq("user_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const latestSession = sessions?.[0] ?? null;

      // Build HRV sparkline from training_trends (prefer) or wearable sessions
      const hrvTrend = (trainingTrends && trainingTrends.length > 0
        ? trainingTrends.map((t: any) => ({ value: Math.round(t.hrv ?? 0) }))
        : sessions?.slice().reverse().map((s: any) => ({ value: Math.round(s.hrv_avg ?? 0) })) ?? []
      ).filter((p: { value: number }) => p.value > 0);

      return {
        accessId: grant.id,
        patientId,
        patientName: profile?.full_name || "Unknown Patient",
        patientEmail: profile?.email || "",
        lastSyncDate: latestSession?.date ?? null,
        readinessScore: latestSession?.readiness_score ?? null,
        latestHrv: latestSession?.hrv_avg ? Math.round(latestSession.hrv_avg) : null,
        hrvTrend,
        activeInjury: injury
          ? {
              type: injury.injury_type?.replace(/_/g, " ") ?? "Unknown",
              bodyLocation: injury.body_location,
              phase: PHASE_LABELS[injury.current_phase] ?? injury.current_phase,
              loadRestrictions: injury.load_restrictions ?? null,
            }
          : null,
        unacknowledgedAnomalies: (anomalies ?? []).map((a: any) => ({
          id: a.id,
          metric: a.metric_name,
          severity: a.severity,
          deviationPct: a.deviation_percent ?? null,
        })),
        lastRecommendation: recommendations?.recommendation_text ?? null,
        lastRecommendationCategory: recommendations?.category ?? null,
      } as PatientSummary;
    })
  );

  return summaries;
}

// ─── PATIENT CARD ─────────────────────────────────────────────────────────────

const PatientCard = ({ patient }: { patient: PatientSummary }) => {
  const hasAlerts = patient.unacknowledgedAnomalies.length > 0;
  const highSeverityAlerts = patient.unacknowledgedAnomalies.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  );

  return (
    <div
      className={cn(
        "bg-white border rounded-2xl shadow-sm overflow-hidden",
        hasAlerts && highSeverityAlerts.length > 0
          ? "border-red-200"
          : "border-slate-200"
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{patient.patientName}</p>
            {patient.patientEmail && (
              <p className="text-xs text-slate-400">{patient.patientEmail}</p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-400">
                {patient.lastSyncDate
                  ? `Last sync: ${patient.lastSyncDate}`
                  : "No data synced"}
              </span>
            </div>
          </div>
        </div>

        {/* Alert badge */}
        {hasAlerts && (
          <Badge
            variant="outline"
            className={cn(
              "flex-shrink-0 text-xs font-semibold",
              highSeverityAlerts.length > 0
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-yellow-200 bg-yellow-50 text-yellow-600"
            )}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {patient.unacknowledgedAnomalies.length} alert{patient.unacknowledgedAnomalies.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Readiness */}
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <Activity className="h-4 w-4 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500 mb-0.5">Readiness</p>
            <p className={cn("text-xl font-bold", READINESS_COLOR(patient.readinessScore))}>
              {patient.readinessScore ?? "—"}
            </p>
          </div>

          {/* HRV */}
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <Heart className="h-4 w-4 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500 mb-0.5">HRV</p>
            <p className="text-xl font-bold text-slate-700">
              {patient.latestHrv ? `${patient.latestHrv}ms` : "—"}
            </p>
          </div>

          {/* HRV Sparkline */}
          <div className="p-2 bg-slate-50 rounded-xl flex flex-col justify-between">
            <p className="text-xs text-slate-500 text-center mb-1">7d HRV</p>
            {patient.hrvTrend.length >= 2 ? (
              <Sparkline
                data={patient.hrvTrend}
                color={
                  patient.hrvTrend[patient.hrvTrend.length - 1]?.value >=
                  patient.hrvTrend[0]?.value
                    ? "#10b981"
                    : "#ef4444"
                }
                height={32}
                strokeWidth={1.5}
              />
            ) : (
              <p className="text-xs text-slate-400 text-center">No trend</p>
            )}
          </div>
        </div>

        {/* Active injury */}
        {patient.activeInjury && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Active Injury
              </span>
            </div>
            <p className="text-sm font-medium text-amber-800 capitalize">
              {patient.activeInjury.type} — {patient.activeInjury.bodyLocation}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Phase: {patient.activeInjury.phase}
            </p>
            {patient.activeInjury.loadRestrictions && (
              <p className="text-xs text-amber-700 mt-1.5 leading-relaxed border-t border-amber-200 pt-1.5">
                <span className="font-semibold">Load restrictions: </span>
                {patient.activeInjury.loadRestrictions}
              </p>
            )}
          </div>
        )}

        {/* Anomalies */}
        {patient.unacknowledgedAnomalies.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Unacknowledged Alerts
            </p>
            {patient.unacknowledgedAnomalies.slice(0, 3).map((anomaly) => (
              <div
                key={anomaly.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border text-xs",
                  SEVERITY_COLORS[anomaly.severity] || SEVERITY_COLORS.low
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-medium capitalize">
                    {anomaly.metric.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {anomaly.deviationPct !== null && (
                    <span>
                      {anomaly.deviationPct > 0 ? "+" : ""}
                      {anomaly.deviationPct.toFixed(1)}% from baseline
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize border-current">
                    {anomaly.severity}
                  </Badge>
                </div>
              </div>
            ))}
            {patient.unacknowledgedAnomalies.length > 3 && (
              <p className="text-xs text-slate-400">
                +{patient.unacknowledgedAnomalies.length - 3} more alerts
              </p>
            )}
          </div>
        )}

        {/* No alerts */}
        {!hasAlerts && (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">No active alerts</span>
          </div>
        )}

        {/* Last Yves recommendation */}
        {patient.lastRecommendation && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Brain className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Yves Recommendation
                {patient.lastRecommendationCategory && (
                  <span className="ml-1.5 normal-case font-normal text-blue-400">
                    · {patient.lastRecommendationCategory}
                  </span>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {patient.lastRecommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export const PractitionerDashboard = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [practitionerName, setPractitionerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const load = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      // Check if user is a practitioner (has any practitioner_access rows as practitioner)
      const { data: grants } = await supabase
        .from("practitioner_access")
        .select("id")
        .eq("practitioner_id", user.id)
        .eq("is_active", true)
        .limit(1);

      // Get name from user metadata or profile
      const meta = user.user_metadata;
      setPractitionerName(
        meta?.practitioner_name || meta?.full_name || meta?.username || user.email || "Practitioner"
      );

      const summaries = await loadPatientsForPractitioner(user.id);
      setPatients(summaries);
    } catch (err: any) {
      setError(err.message || "Failed to load patient data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">Loading patient dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-800 text-sm leading-tight">Practitioner View</h1>
                <p className="text-xs text-slate-400">{practitionerName}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            aria-label="Refresh patient data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{patients.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Patients</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-500">
              {patients.reduce((n, p) => n + p.unacknowledgedAnomalies.filter(a => a.severity === "critical" || a.severity === "high").length, 0)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">High Alerts</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">
              {patients.filter(p => p.activeInjury).length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Active Injuries</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Patient cards */}
        {patients.length === 0 && !error && (
          <div className="text-center py-16">
            <Stethoscope className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-slate-600 font-medium mb-2">No linked patients yet</h2>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Ask your patients to share their data with you from the Predictiv Settings → "Share with Practitioner" section using your email address.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sort: high-alert patients first, then injured, then rest */}
          {[...patients]
            .sort((a, b) => {
              const aHighAlerts = a.unacknowledgedAnomalies.filter(x => x.severity === "critical" || x.severity === "high").length;
              const bHighAlerts = b.unacknowledgedAnomalies.filter(x => x.severity === "critical" || x.severity === "high").length;
              if (aHighAlerts !== bHighAlerts) return bHighAlerts - aHighAlerts;
              if (!!a.activeInjury !== !!b.activeInjury) return a.activeInjury ? -1 : 1;
              return 0;
            })
            .map((patient) => (
              <PatientCard key={patient.accessId} patient={patient} />
            ))}
        </div>

        <p className="text-xs text-center text-slate-400 pb-6">
          Read-only view · Patient data is confidential · Predictiv
        </p>
      </main>
    </div>
  );
};

export default PractitionerDashboard;
