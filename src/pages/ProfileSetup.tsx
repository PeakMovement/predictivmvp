import { useState, useEffect, useRef } from "react";
import {
  User, Camera, Calendar, Trophy, Target, Dumbbell,
  Clock, ChevronDown, Check, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, getProfileCompletion } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

// ── Option sets ────────────────────────────────────────────────────────────

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"];
const PRIMARY_GOALS = ["Performance", "Health", "Recovery", "Weight"];

// ── Completion bar ─────────────────────────────────────────────────────────

function CompletionBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-primary";

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">
          Profile {pct}% complete
        </span>
        {pct >= 80 && (
          <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
            <Check className="w-3.5 h-3.5" />
            Better Yves recommendations
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct < 80 && (
        <p className="text-xs text-muted-foreground mt-2">
          Complete more fields for personalised Yves recommendations.
        </p>
      )}
    </div>
  );
}

// ── Avatar uploader ────────────────────────────────────────────────────────

function AvatarUploader({
  url,
  onUpload,
  uploading,
}: {
  url: string | null;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-24 h-24 rounded-full border-2 border-dashed border-border hover:border-primary/60 transition-colors overflow-hidden bg-muted/30 flex items-center justify-center group"
      >
        {url ? (
          <img src={url} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </button>
      <p className="text-xs text-muted-foreground">Tap to upload photo</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
}

// ── Chip selector ──────────────────────────────────────────────────────────

function ChipSelector({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt === value ? "" : opt)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
            opt === value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export const ProfileSetup = () => {
  const { profile, isLoading, isSaving, updateProfile, uploadAvatar } = useProfile();
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Local form state
  const [form, setForm] = useState({
    full_name: "",
    sport: "",
    position: "",
    date_of_birth: "",
    experience_level: "",
    weekly_training_hours: "",
    primary_goal: "",
  });

  // Sync profile → form when loaded
  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      sport: profile.sport ?? "",
      position: profile.position ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      experience_level: profile.experience_level ?? "",
      weekly_training_hours: profile.weekly_training_hours?.toString() ?? "",
      primary_goal: profile.primary_goal ?? "",
    });
  }, [profile]);

  // Derive live completion by merging saved profile with current form edits
  const liveProfile = profile
    ? {
        ...profile,
        full_name: form.full_name || null,
        sport: form.sport || null,
        position: form.position || null,
        date_of_birth: form.date_of_birth || null,
        experience_level: form.experience_level || null,
        weekly_training_hours: form.weekly_training_hours ? Number(form.weekly_training_hours) : null,
        primary_goal: form.primary_goal || null,
      }
    : null;

  const pct = getProfileCompletion(liveProfile);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await updateProfile({
      full_name: form.full_name || null,
      sport: form.sport || null,
      position: form.position || null,
      date_of_birth: form.date_of_birth || null,
      experience_level: form.experience_level || null,
      weekly_training_hours: form.weekly_training_hours ? Number(form.weekly_training_hours) : null,
      primary_goal: form.primary_goal || null,
    });
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    await uploadAvatar(file);
    setAvatarUploading(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-nav-safe max-w-lg space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          A complete profile gives Yves the context for better advice.
        </p>
      </div>

      {/* Completion bar */}
      <CompletionBar pct={pct} />

      {/* Avatar */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-5 flex flex-col items-center">
        <AvatarUploader
          url={profile?.avatar_url ?? null}
          onUpload={handleAvatarUpload}
          uploading={avatarUploading}
        />
      </div>

      {/* Identity */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-5 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          <User className="w-4 h-4" /> Identity
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dob">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date of Birth
            </span>
          </Label>
          <Input
            id="dob"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => set("date_of_birth", e.target.value)}
          />
        </div>
      </div>

      {/* Sport */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-5 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          <Dumbbell className="w-4 h-4" /> Sport
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="sport">Sport / Discipline</Label>
          <Input
            id="sport"
            value={form.sport}
            onChange={(e) => set("sport", e.target.value)}
            placeholder="e.g. Running, Cycling, Rugby, CrossFit…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="position">Position / Role</Label>
          <Input
            id="position"
            value={form.position}
            onChange={(e) => set("position", e.target.value)}
            placeholder="e.g. Flyhalf, Midfielder, Sprinter…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Experience Level</Label>
          <ChipSelector
            options={EXPERIENCE_LEVELS}
            value={form.experience_level}
            onChange={(v) => set("experience_level", v)}
          />
        </div>
      </div>

      {/* Training */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-5 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          <Clock className="w-4 h-4" /> Training
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="weekly_hours">Weekly Training Hours</Label>
          <div className="relative">
            <Input
              id="weekly_hours"
              type="number"
              min={0}
              max={40}
              step={0.5}
              value={form.weekly_training_hours}
              onChange={(e) => set("weekly_training_hours", e.target.value)}
              placeholder="e.g. 8"
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              hrs/wk
            </span>
          </div>
        </div>
      </div>

      {/* Goal */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-5 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          <Target className="w-4 h-4" /> Primary Goal
        </h2>

        <ChipSelector
          options={PRIMARY_GOALS}
          value={form.primary_goal}
          onChange={(v) => set("primary_goal", v)}
        />
      </div>

      {/* Save */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSave}
        disabled={isSaving || avatarUploading}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </div>
  );
};
