import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DataMaturityTier = 'none' | 'early' | 'learning' | 'building' | 'ready';

export interface DataMaturity {
  days_with_data: number;
  data_sources: string[];
  baseline_percent: number;
  tier: DataMaturityTier;
  days_remaining: number;
  estimated_ready_date: Date | null;
  isLoading: boolean;
}

const FULL_BASELINE_DAYS = 28;

function classifyTier(days: number): DataMaturityTier {
  if (days === 0) return 'none';
  if (days <= 6) return 'early';
  if (days <= 13) return 'learning';
  if (days <= 27) return 'building';
  return 'ready';
}

export function useDataMaturity(): DataMaturity & { refetch: () => void } {
  const [state, setState] = useState<DataMaturity>({
    days_with_data: 0,
    data_sources: [],
    baseline_percent: 0,
    tier: 'none',
    days_remaining: FULL_BASELINE_DAYS,
    estimated_ready_date: null,
    isLoading: true,
  });

  const fetchMaturity = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const { data, error } = await supabase
      .from('wearable_sessions')
      .select('date, source')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error || !data) {
      console.error('[useDataMaturity] fetch error:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Distinct dates
    const distinctDates = new Set(data.map((r) => r.date));
    const days_with_data = distinctDates.size;

    // Distinct sources (only known devices)
    const KNOWN_SOURCES = ['oura', 'garmin', 'polar'];
    const data_sources = [...new Set(data.map((r) => r.source))]
      .filter((s) => KNOWN_SOURCES.includes(s))
      .sort();

    const baseline_percent = Math.min((days_with_data / FULL_BASELINE_DAYS) * 100, 100);
    const tier = classifyTier(days_with_data);
    const days_remaining = Math.max(0, FULL_BASELINE_DAYS - days_with_data);

    // Estimated date: today + days_remaining (assumes 1 sync/day going forward)
    const estimated_ready_date =
      days_remaining > 0
        ? new Date(Date.now() + days_remaining * 24 * 60 * 60 * 1000)
        : null;

    setState({
      days_with_data,
      data_sources,
      baseline_percent,
      tier,
      days_remaining,
      estimated_ready_date,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    fetchMaturity();
  }, [fetchMaturity]);

  return { ...state, refetch: fetchMaturity };
}
