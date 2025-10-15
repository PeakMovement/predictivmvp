import { Heart, Activity } from "lucide-react";
import { useFitbitMetrics } from "@/hooks/useFitbitMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const HeartRateMetricsCard = () => {
  const { metrics, isLoading } = useFitbitMetrics();

  if (isLoading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!metrics || metrics.restingHeartRate === 0) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Heart Rate</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No heart rate data available</p>
          <p className="text-sm text-muted-foreground mt-2">Wear your device to track heart rate</p>
        </div>
      </div>
    );
  }

  const getZoneColor = (zoneName: string) => {
    switch (zoneName) {
      case "Out of Range":
        return "text-gray-400";
      case "Fat Burn":
        return "text-orange-400";
      case "Cardio":
        return "text-yellow-400";
      case "Peak":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getZoneBgColor = (zoneName: string) => {
    switch (zoneName) {
      case "Out of Range":
        return "bg-gray-500/20";
      case "Fat Burn":
        return "bg-orange-500/20";
      case "Cardio":
        return "bg-yellow-500/20";
      case "Peak":
        return "bg-red-500/20";
      default:
        return "bg-gray-500/20";
    }
  };

  const totalZoneMinutes = metrics.heartRateZones.reduce((sum, zone) => sum + zone.minutes, 0);

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover-glow animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Heart Rate</h2>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-6 text-center">
          <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground mb-1">{metrics.restingHeartRate}</p>
          <p className="text-sm text-muted-foreground">Resting Heart Rate</p>
          <p className="text-xs text-muted-foreground mt-1">bpm</p>
        </div>

        <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-6 text-center">
          <Activity className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground mb-1">
            {metrics.averageHeartRate > 0 ? metrics.averageHeartRate : "–"}
          </p>
          <p className="text-sm text-muted-foreground">Average Heart Rate</p>
          <p className="text-xs text-muted-foreground mt-1">bpm</p>
        </div>
      </div>

      {/* Heart Rate Zones */}
      <div className="pt-6 border-t border-glass-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Heart Rate Zones</h3>
        <div className="space-y-3">
          {metrics.heartRateZones.map((zone) => {
            const percentage = totalZoneMinutes > 0 ? (zone.minutes / totalZoneMinutes) * 100 : 0;
            
            return (
              <div key={zone.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${getZoneColor(zone.name)}`}>
                    {zone.name}
                  </span>
                  <span className="text-muted-foreground">
                    {zone.minutes} min • {zone.caloriesOut} cal
                  </span>
                </div>
                <div className="w-full bg-background/50 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getZoneBgColor(zone.name)} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
