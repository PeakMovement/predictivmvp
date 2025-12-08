import { RefreshCw, Shield, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SystemHealthOverview } from "@/components/admin/SystemHealthOverview";
import { SyncLogsTable } from "@/components/admin/SyncLogsTable";
import { AnomalyAlertsList } from "@/components/admin/AnomalyAlertsList";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { format } from "date-fns";

export function AdminDashboard() {
  const { healthData, syncLogs, anomalies, isLoading, error, refresh, acknowledgeAnomaly } = useSystemHealth();

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-7xl scrollable-content">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground text-sm">
                  System health monitoring & anomaly detection
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {healthData?.lastCheck && (
              <span className="text-sm text-muted-foreground">
                Last updated: {format(new Date(healthData.lastCheck), "HH:mm:ss")}
              </span>
            )}
            <Button
              onClick={refresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="font-medium">Error loading system health</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}

        {/* System Health Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            System Health Overview
          </h2>
          <SystemHealthOverview data={healthData} isLoading={isLoading} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SyncLogsTable logs={syncLogs} isLoading={isLoading} />
          <AnomalyAlertsList 
            anomalies={anomalies} 
            isLoading={isLoading} 
            onAcknowledge={acknowledgeAnomaly}
          />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
