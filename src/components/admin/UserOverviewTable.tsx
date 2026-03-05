import { format } from "date-fns";
import { Smartphone, Watch, Activity, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminUserRow } from "@/hooks/useAdminUserOverview";

interface UserOverviewTableProps {
  users: AdminUserRow[];
  isLoading: boolean;
}

const deviceLabel: Record<string, string> = {
  oura: "Oura",
  garmin: "Garmin",
  polar: "Polar",
};

export function UserOverviewTable({ users, isLoading }: UserOverviewTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          User Overview
          <Badge variant="secondary" className="ml-auto font-mono text-xs">
            {users.length} users
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>ACWR</TableHead>
                  <TableHead>Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {u.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.full_name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {u.device_connected ? (
                          <Badge variant="outline" className="gap-1 capitalize">
                            <Watch size={12} />
                            {deviceLabel[u.device_connected] ?? u.device_connected}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_activity_date
                          ? format(new Date(u.last_activity_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {u.readiness_score != null ? (
                          <span
                            className={cn(
                              "font-mono text-sm font-medium",
                              u.readiness_score >= 70
                                ? "text-green-500"
                                : u.readiness_score >= 50
                                ? "text-yellow-500"
                                : "text-destructive"
                            )}
                          >
                            {u.readiness_score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.risk_score_acwr != null ? (
                          <span
                            className={cn(
                              "font-mono text-sm font-medium",
                              u.risk_score_acwr <= 1.3
                                ? "text-green-500"
                                : u.risk_score_acwr <= 1.5
                                ? "text-yellow-500"
                                : "text-destructive"
                            )}
                          >
                            {u.risk_score_acwr.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_sync_time ? (
                          <span className="flex items-center gap-1">
                            <Wifi size={12} className="text-green-500" />
                            {format(new Date(u.last_sync_time), "MMM d, HH:mm")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <WifiOff size={12} />
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
