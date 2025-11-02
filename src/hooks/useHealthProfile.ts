import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HealthProfile {
  id: string;
  user_id: string;
  profile_data: Record<string, unknown>;
  ai_synthesis: string | null;
  generated_at: string;
  version: number;
}

export const useHealthProfile = () => {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_health_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error fetching health profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load health profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const rebuildProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase.functions.invoke('build-health-profile', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Health profile rebuilt successfully'
      });

      // Refresh the profile
      await fetchProfile();
    } catch (error) {
      console.error('Error rebuilding profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to rebuild health profile',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    void fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel('health_profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_health_profiles'
        },
        () => {
          fetchProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { profile, loading, refetch: fetchProfile, rebuildProfile };
};
