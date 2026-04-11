import { useState } from 'react';
import { Lightbulb, ChevronDown, Eye, EyeOff, Trash2, Download, Activity, Moon, Heart, Brain, Target, AlertCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUserModel, UserModelEntry } from '@/hooks/useUserModel';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface LearnedPatternsProps {
  className?: string;
}

const categoryConfig: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  pattern:    { label: 'Patterns',    icon: Activity, color: 'text-primary' },
  preference: { label: 'Preferences', icon: Target,   color: 'text-[#D4956A]' },
  event:      { label: 'Events',      icon: AlertCircle, color: 'text-primary' },
  injury:     { label: 'Injuries',    icon: Heart,    color: 'text-[#C46B6B]' },
  prediction: { label: 'Predictions', icon: Brain,    color: 'text-[#C9A96E]' },
  goal:       { label: 'Goals',       icon: Target,   color: 'text-bioGreen' },
};

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(entry: UserModelEntry): string {
  const v = entry.value as Record<string, unknown>;
  switch (entry.key) {
    case 'sleep_pattern_weekday':
      return `Avg score ${v.avg_score} · ${v.trend} · ${v.sample_days} days`;
    case 'sleep_pattern_weekend':
      return `Avg score ${v.avg_score} · ${v.sample_days} days`;
    case 'hrv_trend_14d':
      return `${v.trend} — recent ${v.recent_avg}ms vs ${v.older_avg}ms`;
    case 'rhr_trend_14d':
      return `${v.trend} — recent avg ${v.recent_avg}bpm`;
    case 'training_consistency':
      return `${v.days_active_per_week} days/week${v.week_over_week_change_pct != null ? `, ${(v.week_over_week_change_pct as number) > 0 ? '+' : ''}${v.week_over_week_change_pct}% vs last week` : ''}`;
    case 'training_monotony':
      return `Monotony index ${v.monotony_index} — ${v.description}`;
    case 'hrv_suppression_streak':
      return `${v.consecutive_days} consecutive days below baseline (${v.severity})`;
    default:
      return Object.entries(v).map(([k, val]) => `${k.replace(/_/g, ' ')}: ${val}`).join(' · ').slice(0, 100);
  }
}

function PatternItem({
  entry,
  onToggle,
  onDelete,
}: {
  entry: UserModelEntry;
  onToggle: (id: string, active: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const conf = categoryConfig[entry.category] || categoryConfig.pattern;
  const Icon = conf.icon;

  const handleToggle = async () => {
    setBusy(true);
    await onToggle(entry.id, !entry.active);
    setBusy(false);
  };

  const handleDelete = async () => {
    setBusy(true);
    const ok = await onDelete(entry.id);
    if (ok) toast({ title: 'Entry removed', description: 'Yves will no longer use this pattern.' });
    setBusy(false);
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-opacity',
      entry.active
        ? 'bg-muted/30 border-border/50'
        : 'bg-muted/10 border-border/30 opacity-50',
    )}>
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', entry.active ? conf.color : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{formatKey(entry.key)}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{formatValue(entry)}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
            {entry.device_source ?? entry.source} · {Math.round(entry.confidence * 100)}% confidence
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          disabled={busy}
          onClick={handleToggle}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title={entry.active ? 'Disable this pattern' : 'Enable this pattern'}
        >
          {entry.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          disabled={busy}
          onClick={handleDelete}
          className="p-1 rounded text-muted-foreground hover:text-rose-500 transition-colors"
          title="Delete this entry"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function LearnedPatternsSection({ className }: LearnedPatternsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { entries, grouped, isLoading, toggle, remove, exportData } = useUserModel();
  const { toast } = useToast();

  if (isLoading) return null;

  const activeCount = entries.filter(e => e.active).length;
  const totalCount = entries.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className=" border border-border bg-card/50">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors ">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Lightbulb className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">What Yves knows about you</div>
                {!isOpen && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {totalCount > 0
                      ? `${activeCount} active pattern${activeCount !== 1 ? 's' : ''} · ${totalCount} total`
                      : 'Building your personal patterns...'}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180',
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                These observations personalise your daily briefing. Toggle off to pause use. Delete to remove permanently (POPIA right to erasure).
              </p>
              {totalCount > 0 && (
                <button
                  onClick={() => { exportData(); toast({ title: 'Exported', description: 'Your patterns downloaded as JSON.' }); }}
                  className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-3"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              )}
            </div>

            {totalCount === 0 ? (
              <div className="py-4 text-center space-y-1">
                <p className="text-sm text-muted-foreground">Yves is still learning your patterns</p>
                <p className="text-xs text-muted-foreground/70">Keep syncing data — patterns appear within a few days.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, categoryEntries]) => {
                const conf = categoryConfig[category] || categoryConfig.pattern;
                return (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {conf.label}
                    </p>
                    {categoryEntries.map(entry => (
                      <PatternItem
                        key={entry.id}
                        entry={entry}
                        onToggle={toggle}
                        onDelete={remove}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
