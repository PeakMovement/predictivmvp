import { useState, useEffect } from "react";
import { ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { OnboardingAboutYou } from "./OnboardingAboutYou";
import { OnboardingWearableQ } from "./OnboardingWearableQ";
import { OnboardingTrainingType } from "./OnboardingTrainingType";
import { OnboardingGoalsQ } from "./OnboardingGoalsQ";
import { OnboardingInjuryQ } from "./OnboardingInjuryQ";
import { OnboardingLifestyle } from "./OnboardingLifestyle";
import { OnboardingComplete } from "./OnboardingComplete";

// ── Types ────────────────────────────────────────────────────────────
export interface OnboardingData {
  // Screen 2 — About You
  firstName: string;
  dateOfBirth: string;
  gender: string;
  // Screen 3 — Wearable (Q1) — multi-select
  wearables: string[];
  // Screen 4 — Sports (Q2) — multi-select individual sports
  sports: string[];
  // Screen 5 — Goals (Q6)
  healthGoals: string[];
  // Screen 6 — Injury (Q7)
  injuryHistory: string;
  injuryDescription: string;
  // Screen 7 — Lifestyle (Q3+Q4+Q5)
  stressLevel: number;
  sleepQuality: string;
  compliance: string;
}

const INITIAL_DATA: OnboardingData = {
  firstName: "",
  dateOfBirth: "",
  gender: "",
  wearables: [],
  sports: [],
  healthGoals: [],
  injuryHistory: "",
  injuryDescription: "",
  stressLevel: 5,
  sleepQuality: "",
  compliance: "medium",
};

const STEP_TITLES = [
  "Welcome",
  "About You",
  "Wearable",
  "Training",
  "Goals",
  "Injury History",
  "Daily Life",
  "All Set",
];

const TOTAL_STEPS = STEP_TITLES.length;

// ── Props ────────────────────────────────────────────────────────────
interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const OnboardingFlow = ({ onComplete, onSkip }: OnboardingFlowProps) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [userId, setUserId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadProgress();
  }, []);

  // ── Load saved progress ────────────────────────────────────────────
  const loadProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: row } = await supabase
      .from("user_profiles")
      .select("onboarding_step")
      .eq("user_id", user.id)
      .maybeSingle();

    if (row?.onboarding_step) {
      setStep(row.onboarding_step);
    }

    // Hydrate form from existing DB data
    const [{ data: profile }, { data: aiProfile }, { data: medical }, { data: training }, { data: injuries }, { data: lifestyle }, { data: recovery }, { data: goals }] = await Promise.all([
      supabase.from("user_profiles").select("full_name, date_of_birth, primary_goal").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_profile").select("name, dob, goals, gender, activity_level").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_medical").select("medical_notes, conditions").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_training").select("preferred_activities, training_frequency, intensity_preference").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_injuries").select("injuries, injury_details").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_lifestyle").select("stress_level").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_recovery").select("sleep_quality, sleep_hours").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_wellness_goals").select("goals").eq("user_id", user.id).maybeSingle(),
    ]);

    // Recover wearable selections from memory bank
    const { data: wearableMem } = await supabase
      .from("yves_memory_bank")
      .select("memory_value")
      .eq("user_id", user.id)
      .eq("memory_key", "wearable_device")
      .maybeSingle();

    let savedWearables: string[] = [];
    if (wearableMem?.memory_value) {
      try { savedWearables = JSON.parse(wearableMem.memory_value); } catch { /* ignore */ }
    }

    setData((prev) => ({
      ...prev,
      firstName: profile?.full_name || aiProfile?.name || prev.firstName,
      dateOfBirth: profile?.date_of_birth || aiProfile?.dob || prev.dateOfBirth,
      gender: aiProfile?.gender || prev.gender,
      wearables: savedWearables.length ? savedWearables : prev.wearables,
      sports: training?.preferred_activities?.map((s: string) => s.toLowerCase()) || prev.sports,
      healthGoals: goals?.goals || aiProfile?.goals || prev.healthGoals,
      injuryHistory: (injuries?.injury_details as any)?.type || prev.injuryHistory,
      injuryDescription: (injuries?.injury_details as any)?.description || prev.injuryDescription,
      stressLevel: lifestyle?.stress_level === "low" ? 2 : lifestyle?.stress_level === "medium" ? 5 : lifestyle?.stress_level === "high" ? 8 : prev.stressLevel,
      sleepQuality: recovery?.sleep_quality || prev.sleepQuality,
    }));
  };

  // ── Update data ────────────────────────────────────────────────────
  const update = (patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setValidationError("");
  };

  // ── Validation ─────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (step === 1 && !data.firstName.trim()) {
      setValidationError("Please enter your name");
      return false;
    }
    if (step === 2 && data.wearables.length === 0) {
      setValidationError("Please select your wearable (or 'No Wearable')");
      return false;
    }
    if (step === 3 && data.sports.length === 0) {
      setValidationError("Please select at least one sport");
      return false;
    }
    if (step === 4 && data.healthGoals.length === 0) {
      setValidationError("Please select at least one health goal");
      return false;
    }
    if (step === 5 && !data.injuryHistory) {
      setValidationError("Please select your injury history");
      return false;
    }
    if (step === 6 && !data.sleepQuality) {
      setValidationError("Please select your sleep quality");
      return false;
    }
    if (step === 6 && !data.compliance) {
      setValidationError("Please select your engagement preference");
      return false;
    }
    return true;
  };

  // ── Save progress per step (returns true on success) ────────────────
  const saveStep = async (stepIndex: number): Promise<boolean> => {
    if (!userId) return false;
    const now = new Date().toISOString();

    try {
      // Always save onboarding_step
      await supabase.from("user_profiles").upsert({
        user_id: userId,
        onboarding_step: stepIndex + 1,
        updated_at: now,
      }, { onConflict: "user_id" });

      // Step-specific saves
      switch (stepIndex) {
        case 1: await saveAboutYou(userId, data, now); break;
        case 2: await saveWearable(userId, data, now); break;
        case 3: await saveTraining(userId, data, now); break;
        case 4: await saveGoals(userId, data, now); break;
        case 5: await saveInjury(userId, data, now); break;
        case 6: await saveLifestyle(userId, data, now); break;
      }
      return true;
    } catch (err) {
      console.error("Error saving onboarding step:", err);
      toast({
        title: "Failed to save",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!validate()) return;

    const saved = await saveStep(step);
    if (!saved) return; // Don't advance if save failed

    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setValidationError("");
    }
  };

  const handleSkip = async () => {
    if (!userId) return;
    await ensureUserProfileExists(userId);
    await supabase.from("user_profiles").upsert({
      user_id: userId,
      onboarding_skipped: true,
      onboarding_step: step,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Onboarding Skipped", description: "You can resume anytime from Settings" });
    onSkip?.();
  };

  const completeOnboarding = async () => {
    if (!userId) return;
    const now = new Date().toISOString();

    try {
    await ensureUserProfileExists(userId);

    // Store raw questionnaire signals in memory bank (for AI prompts)
    await supabase.from("yves_memory_bank").upsert({
      user_id: userId,
      memory_key: "onboarding_signals",
      memory_value: JSON.stringify({
        wearables: data.wearables,
        sports: data.sports,
        healthGoals: data.healthGoals,
        injuryHistory: data.injuryHistory,
        injuryDescription: data.injuryDescription,
        stressLevel: data.stressLevel,
        sleepQuality: data.sleepQuality,
        compliance: data.compliance,
      }),
      last_updated: now,
    }, { onConflict: "user_id,memory_key" });

    // Store in structured onboarding_signals table (for Life Formula engine)
    // Use first wearable for the single-value column; store all in health_goals overload
    const primaryWearable = data.wearables.includes("none") ? "none" : data.wearables[0] || null;
    // Derive training_type from sport selections
    const trainingType = deriveSportCategory(data.sports);
    await supabase.from("onboarding_signals" as any).upsert({
      user_id: userId,
      wearable: primaryWearable,
      training_type: trainingType,
      stress_level: data.stressLevel,
      sleep_quality: data.sleepQuality || null,
      compliance: data.compliance || null,
      health_goals: data.healthGoals,
      injury_history: data.injuryHistory || null,
      updated_at: now,
    }, { onConflict: "user_id" });

    // Set coaching intensity defaults based on compliance answer
    const complianceDefaults = {
      high: { briefing_enabled: true, alert_notifications_enabled: true, weekly_summary_enabled: true },
      medium: { briefing_enabled: true, alert_notifications_enabled: true, weekly_summary_enabled: false },
      low: { briefing_enabled: false, alert_notifications_enabled: false, weekly_summary_enabled: true },
    }[data.compliance] || { briefing_enabled: true, alert_notifications_enabled: true, weekly_summary_enabled: false };

    await supabase.from("user_profiles").upsert({
      user_id: userId,
      onboarding_completed: true,
      onboarding_step: TOTAL_STEPS,
      ...complianceDefaults,
      updated_at: now,
    }, { onConflict: "user_id" });

    // Mirror to alert_settings
    await supabase.from("alert_settings").upsert({
      user_id: userId,
      ...complianceDefaults,
      updated_at: now,
    }, { onConflict: "user_id" });

    toast({ title: "Welcome to Predictiv!", description: "Your profile is configured" });
    onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Failed to complete setup",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Progress bar ───────────────────────────────────────────────────
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-2xl relative bg-surface border border-line">
        {/* Close / skip */}
        <button onClick={handleSkip} className="absolute top-5 right-5 z-10 text-marble1/30 hover:text-marble2 transition-colors">
          <X className="h-4 w-4" />
        </button>

        <div className="pt-8 pb-8 px-6 sm:px-10">
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-marble1/40">
                  {step + 1} of {TOTAL_STEPS} — {STEP_TITLES[step]}
                </span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-coldBlue/50">{Math.round(progress)}%</span>
              </div>
              {/* Hairline progress bar */}
              <div className="h-px bg-line w-full">
                <div className="h-px bg-coldBlue/60 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {/* Dot indicators */}
              <div className="flex justify-center gap-1.5 pt-1">
                {STEP_TITLES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-px transition-all duration-300 ${
                      i < step ? "w-3 bg-coldBlue/60" :
                      i === step ? "w-6 bg-coldBlue" :
                      "w-1.5 bg-marble1/15"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Screen content */}
            <div className="min-h-[420px] animate-fade-in" key={step}>
              {step === 0 && <OnboardingWelcome onNext={handleNext} onBack={handleBack} />}
              {step === 1 && <OnboardingAboutYou data={data} onUpdate={update} />}
              {step === 2 && <OnboardingWearableQ data={data} onUpdate={update} />}
              {step === 3 && <OnboardingTrainingType data={data} onUpdate={update} />}
              {step === 4 && <OnboardingGoalsQ data={data} onUpdate={update} />}
              {step === 5 && <OnboardingInjuryQ data={data} onUpdate={update} />}
              {step === 6 && <OnboardingLifestyle data={data} onUpdate={update} />}
              {step === 7 && <OnboardingComplete data={data} />}
            </div>

            {/* Validation error */}
            {validationError && (
              <p className="font-mono text-[10px] tracking-wider text-critical text-center">{validationError}</p>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-5 border-t border-line">
              <button onClick={handleSkip} className="font-mono text-[9px] tracking-[0.2em] uppercase text-marble1/30 hover:text-marble1/60 transition-colors">
                Skip
              </button>
              <div className="flex gap-3">
                {step > 0 && (
                  <button
                    onClick={handleBack}
                    className="border border-marble1/15 text-marble1/60 font-sans font-semibold text-xs tracking-[0.2em] uppercase px-6 py-3 hover:border-marble1/30 active:scale-[0.97] transition-all duration-100"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="bg-marble3 text-void font-sans font-semibold text-xs tracking-[0.25em] uppercase px-8 py-3 hover:opacity-90 active:scale-[0.97] active:opacity-85 transition-all duration-100 flex items-center gap-2"
                >
                  {step === TOTAL_STEPS - 1 ? "Go to Dashboard" : step === 0 ? "Begin" : "Next"}
                  {step < TOTAL_STEPS - 1 && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Per-step save functions ──────────────────────────────────────────

async function saveAboutYou(userId: string, data: OnboardingData, now: string) {
  const { firstName, dateOfBirth, gender } = data;

  // user_profiles (Settings canonical)
  const settingsUpdate: Record<string, any> = { updated_at: now };
  if (firstName) settingsUpdate.full_name = firstName;
  if (dateOfBirth) settingsUpdate.date_of_birth = dateOfBirth;
  await supabase.from("user_profiles").upsert({ user_id: userId, ...settingsUpdate }, { onConflict: "user_id" });

  // user_profile (AI reads)
  const aiUpdate: Record<string, any> = { updated_at: now };
  if (firstName) aiUpdate.name = firstName;
  if (dateOfBirth) aiUpdate.dob = dateOfBirth;
  if (gender) aiUpdate.gender = gender;
  await upsertUserProfile(userId, aiUpdate);

  // profiles (Supabase auth)
  if (firstName) {
    await supabase.from("profiles").upsert({ id: userId, full_name: firstName, updated_at: now }, { onConflict: "id" });
  }

  // memory bank
  if (firstName) {
    await supabase.from("yves_memory_bank").upsert({
      user_id: userId, memory_key: "preferred_name", memory_value: firstName, last_updated: now,
    }, { onConflict: "user_id,memory_key" });
  }
}

async function saveWearable(userId: string, data: OnboardingData, now: string) {
  await supabase.from("yves_memory_bank").upsert({
    user_id: userId,
    memory_key: "wearable_device",
    memory_value: JSON.stringify(data.wearables),
    last_updated: now,
  }, { onConflict: "user_id,memory_key" });
}

async function saveTraining(userId: string, data: OnboardingData, now: string) {
  const { sports } = data;

  // Capitalize sport names for display
  const activities = sports.map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  // user_training
  const { data: existing } = await supabase.from("user_training").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) {
    await supabase.from("user_training").update({ preferred_activities: activities, updated_at: now }).eq("user_id", userId);
  } else {
    await supabase.from("user_training").insert({ user_id: userId, preferred_activities: activities, updated_at: now } as any);
  }

  // user_profiles.sport (first sport)
  await supabase.from("user_profiles").upsert({
    user_id: userId, sport: activities[0] || "", updated_at: now,
  }, { onConflict: "user_id" });

  // memory bank
  await supabase.from("yves_memory_bank").upsert({
    user_id: userId,
    memory_key: "preferred_training",
    memory_value: JSON.stringify({ sports, activities }),
    last_updated: now,
  }, { onConflict: "user_id,memory_key" });
}

/** Derive the primary training category from individual sport selections */
function deriveSportCategory(sports: string[]): string | null {
  if (!sports.length) return null;
  const endurance = ["running", "cycling", "swimming", "triathlon", "walking"];
  const strength = ["gym", "crossfit", "boxing"];
  const team = ["football", "rugby", "basketball", "tennis", "hockey", "cricket"];
  const mindbody = ["yoga", "golf", "surfing", "dance"];
  const rehab = ["physiotherapy"];

  const counts: Record<string, number> = { endurance: 0, strength: 0, team: 0, mindbody: 0, rehab: 0 };
  for (const s of sports) {
    if (endurance.includes(s)) counts.endurance++;
    else if (strength.includes(s)) counts.strength++;
    else if (team.includes(s)) counts.team++;
    else if (mindbody.includes(s)) counts.mindbody++;
    else if (rehab.includes(s)) counts.rehab++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

async function saveGoals(userId: string, data: OnboardingData, now: string) {
  const { healthGoals } = data;

  // Map to primary_goal (first selection)
  const goalMap: Record<string, string> = {
    injury_prevention: "injury_recovery",
    performance: "performance",
    recovery: "health_fitness",
    stress: "general_wellness",
    longevity: "general_wellness",
    rehab: "injury_recovery",
  };

  const primaryGoal = goalMap[healthGoals[0]] || healthGoals[0] || "";

  // user_profiles.primary_goal
  await supabase.from("user_profiles").upsert({
    user_id: userId, primary_goal: primaryGoal, updated_at: now,
  }, { onConflict: "user_id" });

  // user_profile.goals
  await upsertUserProfile(userId, { goals: healthGoals, updated_at: now });

  // user_wellness_goals
  const { data: existingGoals } = await supabase.from("user_wellness_goals").select("user_id").eq("user_id", userId).maybeSingle();
  if (existingGoals) {
    await supabase.from("user_wellness_goals").update({ goals: healthGoals, updated_at: now }).eq("user_id", userId);
  } else {
    await supabase.from("user_wellness_goals").insert({ user_id: userId, goals: healthGoals, updated_at: now } as any);
  }

  // memory bank
  await supabase.from("yves_memory_bank").upsert({
    user_id: userId,
    memory_key: "user_goals",
    memory_value: JSON.stringify({ goals: healthGoals }),
    last_updated: now,
  }, { onConflict: "user_id,memory_key" });
}

async function saveInjury(userId: string, data: OnboardingData, now: string) {
  const { injuryHistory, injuryDescription } = data;
  if (!injuryHistory || injuryHistory === "none") return;

  const injuryLabels: Record<string, string> = {
    overuse: "Overuse / repetitive strain history",
    acute: "Previous acute injury (tear, fracture, surgery)",
    current: "Currently managing an active injury",
    multiple: "Multiple / recurring injuries",
  };

  const label = injuryLabels[injuryHistory] || injuryHistory;
  const fullDescription = injuryDescription
    ? `${label}: ${injuryDescription}`
    : label;

  // user_injuries
  const { data: existing } = await supabase.from("user_injuries").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) {
    await supabase.from("user_injuries").update({ injuries: [fullDescription], injury_details: { type: injuryHistory, description: injuryDescription }, updated_at: now }).eq("user_id", userId);
  } else {
    await supabase.from("user_injuries").insert({ user_id: userId, injuries: [fullDescription], injury_details: { type: injuryHistory, description: injuryDescription }, updated_at: now } as any);
  }

  // user_profile.injuries
  await upsertUserProfile(userId, { injuries: [fullDescription], updated_at: now });

  // memory bank
  await supabase.from("yves_memory_bank").upsert({
    user_id: userId,
    memory_key: "injury_context",
    memory_value: JSON.stringify({ type: injuryHistory, label, description: injuryDescription }),
    last_updated: now,
  }, { onConflict: "user_id,memory_key" });
}

async function saveLifestyle(userId: string, data: OnboardingData, now: string) {
  const { stressLevel, sleepQuality, compliance } = data;

  const stressCategory = stressLevel <= 3 ? "low" : stressLevel <= 6 ? "medium" : "high";

  // user_lifestyle
  const { data: existing } = await supabase.from("user_lifestyle").select("user_id").eq("user_id", userId).maybeSingle();
  const lifestyleData = { stress_level: stressCategory, updated_at: now };
  if (existing) {
    await supabase.from("user_lifestyle").update(lifestyleData).eq("user_id", userId);
  } else {
    await supabase.from("user_lifestyle").insert({ user_id: userId, ...lifestyleData } as any);
  }

  // user_recovery
  const sleepHoursMap: Record<string, number> = { solid: 8, variable: 7, short: 5.5, disrupted: 6 };
  const { data: existingRec } = await supabase.from("user_recovery").select("user_id").eq("user_id", userId).maybeSingle();
  const recoveryData = { sleep_quality: sleepQuality, sleep_hours: sleepHoursMap[sleepQuality] || 7, updated_at: now };
  if (existingRec) {
    await supabase.from("user_recovery").update(recoveryData).eq("user_id", userId);
  } else {
    await supabase.from("user_recovery").insert({ user_id: userId, ...recoveryData } as any);
  }

  // memory bank — lifestyle signals
  await supabase.from("yves_memory_bank").upsert({
    user_id: userId,
    memory_key: "lifestyle_signals",
    memory_value: JSON.stringify({ stressLevel, stressCategory, sleepQuality, compliance }),
    last_updated: now,
  }, { onConflict: "user_id,memory_key" });
}

// ── Helpers ──────────────────────────────────────────────────────────

async function ensureUserProfileExists(userId: string) {
  const { data } = await supabase.from("user_profile").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) {
    await supabase.from("user_profile").insert({ user_id: userId, updated_at: new Date().toISOString() } as any);
  }
}

async function upsertUserProfile(userId: string, fields: Record<string, any>) {
  const { data: existing } = await supabase.from("user_profile").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) {
    await supabase.from("user_profile").update(fields).eq("user_id", userId);
  } else {
    await supabase.from("user_profile").insert({ user_id: userId, ...fields } as any);
  }
}
