import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { WeeklyTrendChart } from "@/components/dashboard/WeeklyTrendChart";
import { Activity } from "lucide-react";

export default function MyBaselines() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 pb-32 md:pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Activity & Trends</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Track your activity patterns and weekly performance trends.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityPanel />
          <WeeklyTrendChart />
        </div>
      </div>
    </div>
  );
}
