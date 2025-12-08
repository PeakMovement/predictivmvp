import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SyncLogEntry } from "@/hooks/useSystemHealth";

interface SyncLogsTableProps {
  logs: SyncLogEntry[];
  isLoading: boolean;
}

export function SyncLogsTable({ logs, isLoading }: SyncLogsTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle size={14} className="text-green-500" />;
      case "error":
        return <XCircle size={14} className="text-destructive" />;
      case "pending":
        return <Clock size={14} className="text-yellow-500" />;
      default:
        return <AlertCircle size={14} className="text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      success: "bg-green-500/20 text-green-500 border-green-500/30",
      error: "bg-destructive/20 text-destructive border-destructive/30",
      pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    };
    return variants[status] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <Card className="bg-glass border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg">Sync Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass border-glass-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          Sync Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="border-glass-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Latency</TableHead>
                <TableHead className="text-muted-foreground">Entries</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No sync logs available
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-glass-border hover:bg-glass-highlight">
                    <TableCell>
                      <Badge className={cn("gap-1", getStatusBadge(log.status))}>
                        {getStatusIcon(log.status)}
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.sync_type}</TableCell>
                    <TableCell>
                      {log.latency_ms ? (
                        <span className={cn(
                          "font-mono text-sm",
                          log.latency_ms <= 500 ? "text-green-500" : log.latency_ms <= 1000 ? "text-yellow-500" : "text-destructive"
                        )}>
                          {log.latency_ms}ms
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{log.entries_processed ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-destructive text-sm">
                      {log.error_message || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
