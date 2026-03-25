import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingProfileProps {
  onNext: () => void;
  onBack: () => void;
}

export interface OnboardingProfileHandle {
  save: () => Promise<void>;
  validate: () => boolean;
}

// Goal values aligned with Settings (ProfileSettings.tsx) so they stay in sync.
// These are the canonical values stored in user_profiles.primary_goal.
const GOAL_OPTIONS = [
  { value: "performance", label: "Improve Athletic Performance" },
  { value: "health_fitness", label: "General Health & Fitness" },
  { value: "injury_recovery", label: "Injury Recovery" },
  { value: "weight_management", label: "Weight Management" },
  { value: "general_wellness", label: "General Wellness & Sleep" },
] as const;

export const OnboardingProfile = forwardRef<OnboardingProfileHandle, OnboardingProfileProps>(
  function OnboardingProfile({ onNext: _onNext }, ref) {
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [goal, setGoal] = useState("");
    const [notes, setNotes] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [goalError, setGoalError] = useState(false);
    const [ageError, setAgeError] = useState("");
    const { toast } = useToast();

    // Load existing profile data on mount (supports resume after browser close)
    useEffect(() => {
      async function loadProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Load from both tables — prefer user_profiles (Settings canonical source),
        // fall back to user_profile (AI table) for older data
        const [{ data: settingsProfile }, { data: aiProfile }, { data: medical }] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("full_name, date_of_birth, primary_goal")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_profile")
            .select("name, dob, goals")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_medical")
            .select("medical_notes")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        // Name: prefer user_profiles (Settings), fallback to user_profile (AI)
        const loadedName = settingsProfile?.full_name || aiProfile?.name || "";
        if (loadedName) setName(loadedName);

        // DOB/Age: prefer user_profiles.date_of_birth, fallback to user_profile.dob
        const dob = settingsProfile?.date_of_birth || aiProfile?.dob;
        if (dob) {
          const birthYear = new Date(dob).getFullYear();
          const currentYear = new Date().getFullYear();
          const calculatedAge = currentYear - birthYear;
          if (calculatedAge > 0 && calculatedAge < 150) setAge(String(calculatedAge));
        }

        // Goal: prefer user_profiles.primary_goal, fallback to user_profile.goals[0]
        const loadedGoal = settingsProfile?.primary_goal || aiProfile?.goals?.[0] || "";
        if (loadedGoal) setGoal(loadedGoal);

        // Medical notes
        if (medical?.medical_notes) setNotes(medical.medical_notes);
      }

      loadProfile();
    }, []);

    const validate = (): boolean => {
      let valid = true;

      if (!goal) {
        setGoalError(true);
        valid = false;
      } else {
        setGoalError(false);
      }

      if (age) {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
          setAgeError("Age must be between 13 and 120");
          valid = false;
        } else {
          setAgeError("");
        }
      } else {
        setAgeError("");
      }

      return valid;
    };

    const save = async () => {
      if (!userId) return;

      try {
        const now = new Date().toISOString();

        // Calculate DOB from age
        let dobString: string | null = null;
        if (age) {
          const ageNum = parseInt(age);
          if (!isNaN(ageNum) && ageNum >= 13 && ageNum <= 120) {
            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - ageNum);
            dobString = dob.toISOString().split("T")[0];
          }
        }

        // ── 1. user_profile (AI edge functions read from here) ───────────
        const aiProfileUpdate: Record<string, any> = { updated_at: now };
        if (name) aiProfileUpdate.name = name;
        if (dobString) aiProfileUpdate.dob = dobString;
        if (goal) aiProfileUpdate.goals = [goal];

        const { data: existingAI } = await supabase
          .from("user_profile")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingAI) {
          const { error } = await supabase.from("user_profile").update(aiProfileUpdate).eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("user_profile").insert({ user_id: userId, ...aiProfileUpdate } as any);
          if (error) throw error;
        }

        // ── 2. user_profiles (Settings/Dashboard read from here) ─────────
        // This is the canonical profile table — sync ALL fields so Settings
        // shows what the user entered during onboarding.
        const settingsUpdate: Record<string, any> = { updated_at: now };
        if (name) settingsUpdate.full_name = name;
        if (dobString) settingsUpdate.date_of_birth = dobString;
        if (goal) settingsUpdate.primary_goal = goal;

        const { error: settingsErr } = await supabase
          .from("user_profiles")
          .upsert({ user_id: userId, ...settingsUpdate }, { onConflict: "user_id" });
        if (settingsErr) throw settingsErr;

        // ── 3. profiles (Supabase auth table — mirror name) ──────────────
        if (name) {
          await supabase
            .from("profiles")
            .upsert({ id: userId, full_name: name, updated_at: now }, { onConflict: "id" });
        }

        // ── 4. user_medical (optional notes, max 1000 chars) ─────────────
        if (notes) {
          const trimmedNotes = notes.slice(0, 1000);
          const { data: existingMed } = await supabase
            .from("user_medical")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingMed) {
            await supabase
              .from("user_medical")
              .update({ medical_notes: trimmedNotes, updated_at: now })
              .eq("user_id", userId);
          } else {
            await supabase
              .from("user_medical")
              .insert({ user_id: userId, medical_notes: trimmedNotes, updated_at: now } as any);
          }
        }

        // ── 5. yves_memory_bank (AI long-term memory) ────────────────────
        const memoryEntries: Array<{
          user_id: string;
          memory_key: string;
          memory_value: string;
          last_updated: string;
        }> = [];

        if (name) {
          memoryEntries.push({
            user_id: userId,
            memory_key: "preferred_name",
            memory_value: name,
            last_updated: now,
          });
        }
        if (goal) {
          memoryEntries.push({
            user_id: userId,
            memory_key: "user_goals",
            memory_value: JSON.stringify({ goals: [goal] }),
            last_updated: now,
          });
        }
        if (notes) {
          memoryEntries.push({
            user_id: userId,
            memory_key: "medical_context",
            memory_value: JSON.stringify({ medical_notes: notes.slice(0, 1000) }),
            last_updated: now,
          });
        }

        for (const entry of memoryEntries) {
          await supabase
            .from("yves_memory_bank")
            .upsert(entry, { onConflict: "user_id,memory_key" });
        }
      } catch (error) {
        console.error("Error saving onboarding profile:", error);
        toast({
          title: "Failed to save profile",
          description: "Please try again. Your data may not have been saved.",
          variant: "destructive",
        });
      }
    };

    useImperativeHandle(ref, () => ({ save, validate }));

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Tell us about yourself</h2>
          <p className="text-muted-foreground">This helps us personalize your experience</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age (Optional)</Label>
            <Input
              id="age"
              type="number"
              min={13}
              max={120}
              placeholder="Your age"
              value={age}
              onChange={(e) => { setAge(e.target.value); setAgeError(""); }}
            />
            {ageError && (
              <p className="text-xs text-destructive">{ageError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">
              Primary Goal <span className="text-destructive">*</span>
            </Label>
            <Select value={goal} onValueChange={(v) => { setGoal(v); setGoalError(false); }}>
              <SelectTrigger id="goal" className={goalError ? "border-destructive" : ""}>
                <SelectValue placeholder="Select your primary goal" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {goalError && (
              <p className="text-xs text-destructive">Please select a primary goal</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific health concerns, training goals, or other information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              rows={4}
              maxLength={1000}
            />
            <p className="text-[11px] text-muted-foreground text-right">{notes.length}/1000</p>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Your information is private and secure. You can update these details anytime in Settings.
          </p>
        </div>
      </div>
    );
  }
);
