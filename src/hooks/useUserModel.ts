import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserModelEntry {
  id: string;
  category: 'pattern' | 'preference' | 'event' | 'injury' | 'prediction' | 'goal';
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  source: string;
  device_source: string | null;
  last_updated: string;
  active: boolean;
}

export function useUserModel() {
  const [entries, setEntries] = useState<UserModelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data } = await supabase
      .from('user_model')
      .select('id, category, key, value, confidence, source, device_source, last_updated, active')
      .eq('user_id', user.id)
      .order('last_updated', { ascending: false });

    setEntries((data as UserModelEntry[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('user_model')
      .update({ active })
      .eq('id', id);
    if (!error) setEntries(prev => prev.map(e => e.id === id ? { ...e, active } : e));
    return !error;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('user_model')
      .delete()
      .eq('id', id);
    if (!error) setEntries(prev => prev.filter(e => e.id !== id));
    return !error;
  }, []);

  const exportData = useCallback(() => {
    const json = JSON.stringify(entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yves-learned-patterns-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const grouped = entries.reduce<Record<string, UserModelEntry[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});

  return { entries, grouped, isLoading, toggle, remove, exportData, refresh: load };
}
