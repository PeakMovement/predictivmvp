import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
  // Extended profile fields
  sport: string | null;
  position: string | null;
  date_of_birth: string | null;
  experience_level: string | null;
  weekly_training_hours: number | null;
  primary_goal: string | null;
  email?: string;
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Fields counted toward profile completion — only those the ProfileSettings
// form can fill, so the completion % accurately reflects what users can do.
const COMPLETION_FIELDS: (keyof UserProfile)[] = [
  "full_name",
  "sport",
  "position",
  "date_of_birth",
  "experience_level",
  "primary_goal",
];

/** Returns 0–100 completion percentage */
export function getProfileCompletion(profile: UserProfile | null): number {
  if (!profile) return 0;
  const filled = COMPLETION_FIELDS.filter((f) => {
    const v = profile[f];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        let fullName = data.full_name;

        // Fallback: onboarding stores name in user_profile.name (no 's')
        if (!fullName) {
          const { data: legacyProfile } = await supabase
            .from("user_profile")
            .select("name")
            .eq("user_id", user.id)
            .maybeSingle();
          fullName =
            legacyProfile?.name ||
            (user.user_metadata?.full_name as string | undefined) ||
            (user.user_metadata?.name as string | undefined) ||
            null;

          // Back-fill user_profiles.full_name so future loads are instant
          if (fullName) {
            await supabase
              .from("user_profiles")
              .update({ full_name: fullName })
              .eq("user_id", user.id);
          }
        }

        setProfile({
          ...data,
          full_name: fullName,
          email: user.email,
        });
      } else {
        const { data: newProfile, error: createError } = await supabase
          .from("user_profiles")
          .insert({
            user_id: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        setProfile({
          ...newProfile,
          email: user.email,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No user found");
      }

      const { email, ...profileUpdates } = updates;

      if (Object.keys(profileUpdates).length > 0) {
        // Use upsert so a row is created if one doesn't exist yet
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert(
            {
              user_id: user.id,
              ...profileUpdates,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (profileError) throw profileError;

        // Mirror full_name to user_profile.name so AI functions (yves-chat,
        // generate-daily-briefing) which read user_profile.name stay in sync
        if (profileUpdates.full_name !== undefined) {
          await supabase
            .from("user_profile")
            .upsert(
              { user_id: user.id, name: profileUpdates.full_name },
              { onConflict: "user_id" }
            );
        }
      }

      if (email && email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });

        if (emailError) throw emailError;

        toast({
          title: "Email Update",
          description: "Please check your new email to confirm the change",
        });
      }

      await fetchProfile();

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: publicUrl });

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteAvatar = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (profile?.avatar_url) {
        const fileName = `${user.id}/avatar`;

        await supabase.storage
          .from('avatars')
          .remove([fileName]);
      }

      await updateProfile({ avatar_url: null });

      toast({
        title: "Success",
        description: "Avatar removed successfully",
      });

      return true;
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast({
        title: "Error",
        description: "Failed to delete avatar",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    profile,
    isLoading,
    isSaving,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refetch: fetchProfile,
  };
};
