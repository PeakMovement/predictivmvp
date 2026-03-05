import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Clock, Trash2, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AlertHistoryItem {
  id: string;
  alert_type: 'high_risk' | 'anomaly' | 'red_flag';
  metric_name: string;
  metric_value: number;
  threshold_value: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'dismissed' | 'resolved' | 'snoozed';
  dismissed_at: string | null;
  resolved_at: string | null;
  snoozed_until: string | null;
  snooze_count: number;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertHistoryItem | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAlertHistory();
  }, []);

  const loadAlertHistory = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAlerts(data as AlertHistoryItem[]);
    } catch (error) {
      console.error('Error loading alert history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alert history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alert_history')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert dismissed',
        description: 'The alert has been dismissed',
      });

      await loadAlertHistory();
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss alert',
        variant: 'destructive',
      });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alert_history')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert resolved',
        description: 'The alert has been marked as resolved',
      });

      await loadAlertHistory();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        variant: 'destructive',
      });
    }
  };

  const handleOpenNotes = (alert: AlertHistoryItem) => {
    setSelectedAlert(alert);
    setNotes(alert.user_notes || '');
    setShowNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedAlert) return;

    try {
      setSavingNotes(true);
      const { error } = await supabase
        .from('alert_history')
        .update({
          user_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAlert.id);

      if (error) throw error;

      toast({
        title: 'Notes saved',
        description: 'Your notes have been saved',
      });

      setShowNotesDialog(false);
      await loadAlertHistory();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string, snoozed_until: string | null) => {
    if (status === 'snoozed' && snoozed_until) {
      const isSnoozed = new Date(snoozed_until) > new Date();
      if (isSnoozed) {
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Snoozed until {format(new Date(snoozed_until), 'MMM d, h:mm a')}
          </Badge>
        );
      }
    }

    switch (status) {
      case 'active':
        return <Badge variant="destructive">Active</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Dismissed</Badge>;
      case 'resolved':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'red_flag':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high_risk':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Alert History</h1>
        <p className="text-muted-foreground">
          View and manage your health alert history
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-muted-foreground text-center">
              No alerts yet. You're doing great!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="relative">
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${getSeverityColor(alert.severity)}`}
              />
              <CardHeader className="pl-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <CardTitle className="text-lg">{alert.metric_name} Alert</CardTitle>
                      <CardDescription className="mt-1">
                        {format(new Date(alert.created_at), 'MMM d, yyyy • h:mm a')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(alert.status, alert.snoozed_until)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pl-6">
                <p className="text-sm">{alert.message}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Value:</span> {alert.metric_value.toFixed(1)}
                  </div>
                  <div>
                    <span className="font-medium">Threshold:</span> {alert.threshold_value.toFixed(1)}
                  </div>
                  {alert.snooze_count > 0 && (
                    <div>
                      <span className="font-medium">Snoozed:</span> {alert.snooze_count}x
                    </div>
                  )}
                </div>

                {alert.user_notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Your Notes</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.user_notes}</p>
                  </div>
                )}

                {alert.status === 'active' && (
                  <Separator />
                )}

                <div className="flex gap-2 flex-wrap">
                  {alert.status === 'active' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Resolved
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismissAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Dismiss
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenNotes(alert)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {alert.user_notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Notes</DialogTitle>
            <DialogDescription>
              Add notes about this alert for your records
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes, observations, or actions taken..."
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Notes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
