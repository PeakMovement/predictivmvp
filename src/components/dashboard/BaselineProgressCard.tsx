import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { RefreshCw, Loader2, Watch, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DataMaturity, DataMaturityTier } from '@/hooks/useDataMaturity';

interface BaselineProgressCardProps {
  maturity: DataMaturity;
  onSyncComplete?: () => void;
}

const TIER_COPY: Record<
  Exclude<DataMaturityTier, 'ready'>,
  { headline: string; sub: (days: number) => string }
> = {
  none: {
    headline: 'Connect a wearable to get started',
    sub: () => "Yves can't personalise anything yet — sync your Oura Ring or Garmin to begin.",
  },
  early: {
    headline: 'Yves is watching',
    sub: (days) =>
      `${days} day${days === 1 ? '' : 's'} of data collected. Personalisation begins at 7 days — keep syncing.`,
  },
  learning: {
    headline: 'Yves is learning your patterns',
    sub: (days) =>
      `${days} day${days === 1 ? '' : 's'} in — recommendations are improving every day you sync.`,
  },
  building: {
    headline: 'Your baseline is forming',
    sub: (days) =>
      `${days} day${days === 1 ? '' : 's'} of data. Full personalisation unlocks at 28 days.`,
  },
};

const DEVICE_LABELS: Record<string, string> = {
  oura: 'Oura Ring',
  garmin: 'Garmin',
  polar: 'Polar',
};

export function BaselineProgressCard({ maturity, onSyncComplete }: BaselineProgressCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  if (maturity.tier === 'ready' || maturity.isLoading) return null;

  const tierCopy = TIER_COPY[maturity.tier];
  const { days_with_data, days_remaining, baseline_percent, data_sources, estimated_ready_date } = maturity;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokens } = await supabase
        .from('wearable_tokens')
        .select('scope')
        .eq('user_id', user.id);

      const scopes = tokens?.map((t) => t.scope) ?? [];
      if (scopes.length === 0) {
        toast({
          title: 'No device connected',
          description: 'Go to Settings → Devices to connect your wearable.',
        });
        return;
      }

      const invocations = scopes.flatMap((scope) => {
        if (scope === 'oura') return [supabase.functions.invoke('fetch-oura-data', { body: { user_id: user.id } })];
        if (scope === 'garmin') return [supabase.functions.invoke('fetch-garmin-data', { body: { user_id: user.id } })];
        return [];
      });

      const results = await Promise.allSettled(invocations);
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed === results.length) {
        toast({ title: 'Sync failed', description: 'Could not reach your device. Try again shortly.', variant: 'destructive' });
      } else {
        toast({ title: 'Synced', description: 'Latest data pulled in.' });
        onSyncComplete?.();
      }
    } catch {
      toast({ title: 'Sync failed', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Progress bar: 28 segments, filled = days_with_data
  const TOTAL = 28;
  const filled = Math.min(days_with_data, TOTAL);

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{tierCopy.headline}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tierCopy.sub(days_with_data)}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Sync now
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{days_with_data} day{days_with_data !== 1 ? 's' : ''} of data</span>
          <span>{TOTAL} days for full baseline</span>
        </div>
        <div className="flex gap-px h-2 rounded-full overflow-hidden bg-muted">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-all duration-300 ${
                i < filled
                  ? i < 7
                    ? 'bg-amber-400'
                    : i < 14
                    ? 'bg-primary/70'
                    : 'bg-primary'
                  : 'bg-transparent'
              }`}
            />
          ))}
        </div>
        {/* Milestone ticks */}
        <div className="relative h-3">
          <span
            className="absolute text-[9px] text-muted-foreground"
            style={{ left: `${(7 / TOTAL) * 100}%`, transform: 'translateX(-50%)' }}
          >
            7d
          </span>
          <span
            className="absolute text-[9px] text-muted-foreground"
            style={{ left: `${(14 / TOTAL) * 100}%`, transform: 'translateX(-50%)' }}
          >
            14d
          </span>
          <span
            className="absolute text-[9px] text-muted-foreground"
            style={{ right: 0 }}
          >
            28d
          </span>
        </div>
      </div>

      {/* Footer row: devices + ETA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {data_sources.length === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Watch className="h-3.5 w-3.5" />
              No device synced yet
            </div>
          ) : (
            data_sources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {DEVICE_LABELS[source] ?? source}
              </span>
            ))
          )}
        </div>

        {estimated_ready_date && days_remaining > 0 && (
          <p className="text-xs text-muted-foreground shrink-0">
            Full baseline ~{format(estimated_ready_date, 'd MMM')}
            {days_remaining <= 7 && (
              <span className="ml-1 text-primary font-medium">({days_remaining}d left)</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
