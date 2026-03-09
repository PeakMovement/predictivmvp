import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserCircle, Upload, X, Loader as Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProfile } from "@/hooks/useProfile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100).optional().or(z.literal("")),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().optional().or(z.literal("")),
  sport: z.string().optional().or(z.literal("")),
  position: z.string().optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  experience_level: z.string().optional().or(z.literal("")),
  primary_goal: z.string().optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
}

export const ProfileSettings = ({ onSaveStart, onSaveComplete }: ProfileSettingsProps) => {
  const { profile, isLoading, isSaving, updateProfile, uploadAvatar, deleteAvatar } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      sport: "",
      position: "",
      date_of_birth: "",
      experience_level: "",
      primary_goal: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || "",
        sport: profile.sport || "",
        position: profile.position || "",
        date_of_birth: profile.date_of_birth || "",
        experience_level: profile.experience_level || "",
        primary_goal: profile.primary_goal || "",
      });
    }
  }, [profile, reset]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const onSubmit = async (data: ProfileFormData) => {
    onSaveStart?.();
    const success = await updateProfile(data);
    if (success) {
      reset(data);
    }
    onSaveComplete?.();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File size must be less than 5MB"); return; }
    if (!file.type.startsWith("image/")) { alert("File must be an image"); return; }
    setIsUploading(true);
    await uploadAvatar(file);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => { await deleteAvatar(); };

  const handleNavigateAway = (callback: () => void) => {
    if (isDirty) {
      setPendingNavigation(() => callback);
      setShowUnsavedWarning(true);
    } else {
      callback();
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation) { pendingNavigation(); setPendingNavigation(null); }
    setShowUnsavedWarning(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const experienceLevel = watch("experience_level");
  const primaryGoal = watch("primary_goal");

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Avatar + basic contact ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {profile?.avatar_url ? (
                <>
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : isUploading ? (
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              ) : (
                <UserCircle className="h-10 w-10 text-muted-foreground/60" />
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2 text-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Upload className="h-3 w-3 mr-1" />Upload
              </Button>
              {profile?.avatar_url && (
                <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2 text-destructive hover:text-destructive" onClick={handleRemoveAvatar}>
                  <X className="h-3 w-3 mr-1" />Remove
                </Button>
              )}
            </div>
          </div>

          <div className="w-full space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-sm text-muted-foreground">Full Name</Label>
              <Input id="full_name" placeholder="Your name" className="mt-1" {...register("full_name")} />
              {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <Input id="email" type="email" placeholder="your.email@example.com" className="mt-1" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">Changing your email will require confirmation</p>
            </div>

            <div>
              <Label htmlFor="phone_number" className="text-sm text-muted-foreground">Phone Number (Optional)</Label>
              <Input id="phone_number" type="tel" placeholder="+1 (555) 000-0000" className="mt-1" {...register("phone_number")} />
            </div>
          </div>
        </div>

        {/* ── Athletic Profile ───────────────────────────────────────────── */}
        <div className="pt-4 border-t border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Athletic Profile</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <Label htmlFor="sport" className="text-sm text-muted-foreground">Sport / Activity</Label>
              <Input id="sport" placeholder="e.g. Running, Cycling, Football" className="mt-1" {...register("sport")} />
            </div>

            <div>
              <Label htmlFor="position" className="text-sm text-muted-foreground">Position / Discipline</Label>
              <Input id="position" placeholder="e.g. Midfielder, Sprinter" className="mt-1" {...register("position")} />
            </div>

            <div>
              <Label htmlFor="date_of_birth" className="text-sm text-muted-foreground">Date of Birth</Label>
              <Input id="date_of_birth" type="date" className="mt-1" {...register("date_of_birth")} />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Experience Level</Label>
              <Select
                value={experienceLevel ?? ""}
                onValueChange={(v) => { setValue("experience_level", v, { shouldDirty: true }); }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="elite">Elite / Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-sm text-muted-foreground">Primary Goal</Label>
              <Select
                value={primaryGoal ?? ""}
                onValueChange={(v) => { setValue("primary_goal", v, { shouldDirty: true }); }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance improvement</SelectItem>
                  <SelectItem value="health_fitness">Health &amp; fitness</SelectItem>
                  <SelectItem value="injury_recovery">Injury recovery</SelectItem>
                  <SelectItem value="weight_management">Weight management</SelectItem>
                  <SelectItem value="general_wellness">General wellness</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>

        {isDirty && (
          <Alert>
            <AlertDescription>
              You have unsaved changes. Don't forget to save your profile!
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 justify-end">
          {isDirty && (
            <Button type="button" variant="outline" onClick={() => reset()} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSaving || !isDirty}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>

      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to your profile. Are you sure you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay Here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>Leave Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
