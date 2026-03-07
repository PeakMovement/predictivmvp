// @ts-nocheck — user_injury_profiles not yet in generated Supabase types
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type InjuryType =
  | 'muscle_strain'
  | 'ligament_tear'
  | 'fracture'
  | 'surgery'
  | 'spinal'
  | 'tendinopathy'
  | 'other';

export type PractitionerType = 'physio' | 'surgeon' | 'sports_doctor' | 'biokineticist' | 'other';

export type InjuryPhase =
  | 'acute'
  | 'sub_acute'
  | 'rehabilitation'
  | 'return_to_sport'
  | 'full_clearance';

export interface ClearanceMilestone {
  milestone: string;
  achieved: boolean;
}

export interface InjuryProfile {
  id: string;
  user_id: string;
  injury_type: InjuryType;
  body_location: string;
  injury_date: string;
  surgery_date: string | null;
  treating_practitioner_name: string | null;
  treating_practitioner_type: PractitionerType | null;
  load_restrictions: string | null;
  clearance_milestones: ClearanceMilestone[];
  target_return_date: string | null;
  current_phase: InjuryPhase;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InjuryProfileInput = Omit<InjuryProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export function useInjuryProfile() {
  const [profile, setProfile] = useState<InjuryProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_injury_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[useInjuryProfile] fetch error:', error);
    } else {
      setProfile(data ?? null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (input: InjuryProfileInput): Promise<boolean> => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSaving(false);
      return false;
    }

    try {
      if (profile?.id) {
        const { data, error } = await supabase
          .from('user_injury_profiles')
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .select()
          .single();
        if (error) throw error;
        setProfile(data);
      } else {
        const { data, error } = await supabase
          .from('user_injury_profiles')
          .insert({ ...input, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        setProfile(data);
      }
      toast({ title: 'Injury profile saved' });
      return true;
    } catch (err) {
      console.error('[useInjuryProfile] save error:', err);
      toast({
        title: 'Save failed',
        description: 'Could not save injury profile. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateProfile = async (): Promise<boolean> => {
    if (!profile?.id) return false;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_injury_profiles')
        .update({ is_active: false })
        .eq('id', profile.id);
      if (error) throw error;
      setProfile(null);
      toast({ title: 'Injury profile cleared' });
      return true;
    } catch (err) {
      console.error('[useInjuryProfile] deactivate error:', err);
      toast({ title: 'Failed to clear profile', variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { profile, isLoading, isSaving, saveProfile, deactivateProfile, refetch: fetchProfile };
}
