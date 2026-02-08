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
  email?: string;
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  created_at?: string;
  updated_at?: string;
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
        setProfile({
          ...data,
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
        const { error: profileError } = await supabase
          .from("user_profiles")
          .update({
            ...profileUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (profileError) throw profileError;
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
