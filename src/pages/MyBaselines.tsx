import { Activity, TrendingUp } from "lucide-react";
import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { WeeklyTrendChart } from "@/components/dashboard/WeeklyTrendChart";
import { DailyHealthPanel } from "@/components/dashboard/DailyHealthPanel";
import { RecoveryPanel } from "@/components/dashboard/RecoveryPanel";

export default function MyBaselines() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 pb-32 md:pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Activity & Trends</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Track your activity patterns, recovery trends, and weekly performance.
        </p>

        {/* Activity Trends Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Activity Trends
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityPanel />
            <WeeklyTrendChart />
          </div>
        </div>

        {/* Health & Recovery Trends Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Health & Recovery Trends
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyHealthPanel />
            <RecoveryPanel />
          </div>
        </div>
      </div>
    </div>
  );
}