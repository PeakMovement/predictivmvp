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

        // Load existing data from user_profile
        const { data: profile } = await supabase
          .from("user_profile")
          .select("name, dob, goals")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          if (profile.name) setName(profile.name);
          if (profile.dob) {
            const birthYear = new Date(profile.dob).getFullYear();
            const currentYear = new Date().getFullYear();
            const calculatedAge = currentYear - birthYear;
            if (calculatedAge > 0 && calculatedAge < 150) setAge(String(calculatedAge));
          }
          if (profile.goals?.length) setGoal(profile.goals[0]);
        }

        // Load medical notes
        const { data: medical } = await supabase
          .from("user_medical")
          .select("medical_notes")
          .eq("user_id", user.id)
          .maybeSingle();

        if (medical?.medical_notes) setNotes(medical.medical_notes);
      }

      loadProfile();
    }, []);

    const validate = (): boolean => {
      let valid = true;

      // Goal is required
      if (!goal) {
        setGoalError(true);
        valid = false;
      } else {
        setGoalError(false);
      }

      // Age validation (if provided)
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

        // ── user_profile (always create/update — AI reads from here) ─────
        const profileUpdate: Record<string, any> = { updated_at: now };
        if (name) profileUpdate.name = name;
        if (age) {
          const ageNum = parseInt(age);
          if (!isNaN(ageNum) && ageNum >= 13 && ageNum <= 120) {
            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - ageNum);
            profileUpdate.dob = dob.toISOString().split("T")[0];
          }
        }
        if (goal) profileUpdate.goals = [goal];

        const { data: existing } = await supabase
          .from("user_profile")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase.from("user_profile").update(profileUpdate).eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("user_profile").insert({ user_id: userId, ...profileUpdate } as any);
          if (error) throw error;
        }

        // ── user_profiles.full_name (Dashboard greeting reads from here) ─
        if (name) {
          await supabase
            .from("user_profiles")
            .upsert({ user_id: userId, full_name: name }, { onConflict: "user_id" });
        }

        // ── user_medical (optional notes, max 1000 chars) ────────────────
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

        // ── yves_memory_bank ─────────────────────────────────────────────
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
                <SelectItem value="performance">Improve Athletic Performance</SelectItem>
                <SelectItem value="recovery">Optimize Recovery</SelectItem>
                <SelectItem value="health">General Health &amp; Wellness</SelectItem>
                <SelectItem value="weight">Weight Management</SelectItem>
                <SelectItem value="sleep">Better Sleep Quality</SelectItem>
                <SelectItem value="stress">Reduce Stress</SelectItem>
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
