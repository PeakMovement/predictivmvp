import { RefreshCw, Shield, Activity, Users, ShieldAlert, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SystemHealthOverview } from "@/components/admin/SystemHealthOverview";
import { SyncLogsTable } from "@/components/admin/SyncLogsTable";
import { AnomalyAlertsList } from "@/components/admin/AnomalyAlertsList";
import { UserOverviewTable } from "@/components/admin/UserOverviewTable";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { useAdminUserOverview } from "@/hooks/useAdminUserOverview";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { LoadingFallback } from "@/components/LoadingFallback";
import { PractitionerApprovals } from "@/components/admin/PractitionerApprovals";
import { format } from "date-fns";

export function AdminDashboard() {
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { healthData, syncLogs, anomalies, isLoading, error, refresh, acknowledgeAnomaly } = useSystemHealth();
  const { users, isLoading: usersLoading, error: usersError, refresh: refreshUsers } = useAdminUserOverview();

  if (adminLoading) {
    return <LoadingFallback message="Checking access…" />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm">
            You do not have admin privileges. Contact the system owner to request access.
          </p>
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "dashboard" }))}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleRefreshAll = () => {
    refresh();
    refreshUsers();
  };

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
                  System health monitoring & user overview
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
              onClick={handleRefreshAll}
              disabled={isLoading || usersLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw size={14} className={isLoading || usersLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>

        {(error || usersError) && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm opacity-80">{error || usersError}</p>
          </div>
        )}

        {/* User Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={18} className="text-primary" />
            All Users
          </h2>
          <UserOverviewTable users={users} isLoading={usersLoading} />
        </div>

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

        {/* Practitioner Approvals */}
        <div className="mt-8 mb-8">
          <PractitionerApprovals />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
