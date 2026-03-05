import { Activity, Heart, Droplets } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OuraHRVCardProps {
  hrv: number | null;
  restingHR: number | null;
  spo2: number | null;
  isLoading?: boolean;
}

export const OuraHRVCard = ({
  hrv,
  restingHR,
  spo2,
  isLoading = false,
}: OuraHRVCardProps) => {
  if (isLoading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  const hasAnyData = hrv !== null || restingHR !== null || spo2 !== null;

  if (!hasAnyData) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Heart & Body Signals</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No data available</p>
          <p className="text-sm text-muted-foreground">Sync your Ōura Ring to see your metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover-glow animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Heart & Body Signals</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`bg-background/50 backdrop-blur border border-glass-border rounded-xl p-5 text-center ${hrv === null ? 'opacity-50' : ''}`}>
          <Activity className="w-7 h-7 text-blue-400 mx-auto mb-3" />
          <p className="text-3xl font-bold text-foreground mb-1">{hrv ?? '—'}</p>
          <p className="text-sm text-muted-foreground">HRV</p>
          <p className="text-xs text-muted-foreground mt-1">ms</p>
        </div>

        <div className={`bg-background/50 backdrop-blur border border-glass-border rounded-xl p-5 text-center ${restingHR === null ? 'opacity-50' : ''}`}>
          <Heart className="w-7 h-7 text-red-400 mx-auto mb-3" />
          <p className="text-3xl font-bold text-foreground mb-1">{restingHR ?? '—'}</p>
          <p className="text-sm text-muted-foreground">Resting HR</p>
          <p className="text-xs text-muted-foreground mt-1">bpm</p>
        </div>

        <div className={`bg-background/50 backdrop-blur border border-glass-border rounded-xl p-5 text-center ${spo2 === null ? 'opacity-50' : ''}`}>
          <Droplets className="w-7 h-7 text-cyan-400 mx-auto mb-3" />
          <p className="text-3xl font-bold text-foreground mb-1">{spo2 !== null ? spo2.toFixed(1) : '—'}</p>
          <p className="text-sm text-muted-foreground">Blood Oxygen</p>
          <p className="text-xs text-muted-foreground mt-1">SpO₂ %</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-glass-border">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">HRV</h4>
            <p className="text-sm text-foreground">
              Heart rate variability measures the variation in time between heartbeats. Higher HRV typically indicates better recovery and fitness.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Blood Oxygen</h4>
            <p className="text-sm text-foreground">
              SpO₂ measures blood oxygen saturation. Normal levels are 95-100%. Lower levels may indicate breathing or circulation issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
