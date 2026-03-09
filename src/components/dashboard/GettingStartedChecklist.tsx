import { useEffect, useState } from "react";
import { CheckCircle2, Circle, User, Watch, FileText, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfileCompletion } from "@/hooks/useProfile";
import type { UserProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  navigateTo?: string;
}

interface GettingStartedChecklistProps {
  onNavigate?: (tab: string) => void;
}

export function GettingStartedChecklist({ onNavigate }: GettingStartedChecklistProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [profileRes, wearableRes, briefingRes, chatRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("wearable_sessions").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("daily_briefings").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("insight_history").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
      ]);

      const profileCompletion = getProfileCompletion(profileRes.data as UserProfile | null);

      setSteps([
        {
          id: "profile",
          label: "Complete your profile",
          description: `${profileCompletion}% done — add sport, goals and experience level`,
          icon: User,
          done: profileCompletion >= 80,
          navigateTo: "profile-setup",
        },
        {
          id: "wearable",
          label: "Connect a wearable",
          description: "Link your Oura Ring or Garmin for live health data",
          icon: Watch,
          done: !!wearableRes.data,
          navigateTo: "settings",
        },
        {
          id: "briefing",
          label: "Generate your first briefing",
          description: "Get Yves' daily summary on your dashboard",
          icon: FileText,
          done: !!briefingRes.data,
          navigateTo: "dashboard",
        },
        {
          id: "chat",
          label: "Chat with Yves",
          description: "Ask your first question to get personalised advice",
          icon: MessageCircle,
          done: !!chatRes.data,
          navigateTo: "yves-insights",
        },
      ]);
    } catch (err) {
      console.error("[GettingStartedChecklist] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // Hide entirely once all steps complete
  if (allDone) return null;

  const overallPct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur overflow-hidden mb-6">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground">Getting Started</span>
            <span className="text-xs text-muted-foreground">{doneCount}/{steps.length} complete</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini progress bar */}
          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="border-t border-border/30 divide-y divide-border/20">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                disabled={step.done}
                onClick={() => step.navigateTo && onNavigate?.(step.navigateTo)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  step.done ? "opacity-60" : "hover:bg-muted/30 active:bg-muted/50"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                )}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                    step.done ? "bg-green-500/10" : "bg-muted/40"
                  )}>
                    <Icon className={cn("w-4 h-4", step.done ? "text-green-400" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", step.done && "line-through text-muted-foreground")}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
