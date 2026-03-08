import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, RotateCcw, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AlertSettings {
  hrv_drop_threshold: number;
  rhr_spike_threshold: number;
  sleep_score_threshold: number;
  readiness_score_threshold: number;
  acwr_critical_threshold: number;
  strain_critical_threshold: number;
  monotony_critical_threshold: number;
  severity_filter: 'all' | 'critical_only';
  enable_popup_alerts: boolean;
  enable_email_alerts: boolean;
  enable_sms_alerts: boolean;
  max_snooze_count: number;
}

const DEFAULT_SETTINGS: AlertSettings = {
  hrv_drop_threshold: 20,
  rhr_spike_threshold: 10,
  sleep_score_threshold: 60,
  readiness_score_threshold: 50,
  acwr_critical_threshold: 1.8,
  strain_critical_threshold: 1500,
  monotony_critical_threshold: 2.5,
  severity_filter: 'all',
  enable_popup_alerts: true,
  enable_email_alerts: true,
  enable_sms_alerts: false,
  max_snooze_count: 3,
};

export function AlertCustomizationSettings() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [trainingContext, setTrainingContext] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          hrv_drop_threshold: data.hrv_drop_threshold ?? DEFAULT_SETTINGS.hrv_drop_threshold,
          rhr_spike_threshold: data.rhr_spike_threshold ?? DEFAULT_SETTINGS.rhr_spike_threshold,
          sleep_score_threshold: data.sleep_score_threshold ?? DEFAULT_SETTINGS.sleep_score_threshold,
          readiness_score_threshold: data.readiness_score_threshold ?? DEFAULT_SETTINGS.readiness_score_threshold,
          acwr_critical_threshold: data.acwr_critical_threshold ?? DEFAULT_SETTINGS.acwr_critical_threshold,
          strain_critical_threshold: data.strain_critical_threshold ?? DEFAULT_SETTINGS.strain_critical_threshold,
          monotony_critical_threshold: data.monotony_critical_threshold ?? DEFAULT_SETTINGS.monotony_critical_threshold,
          severity_filter: (data.severity_filter as 'all' | 'critical_only') ?? DEFAULT_SETTINGS.severity_filter,
          enable_popup_alerts: data.enable_popup_alerts ?? DEFAULT_SETTINGS.enable_popup_alerts,
          enable_email_alerts: data.enable_email_alerts ?? DEFAULT_SETTINGS.enable_email_alerts,
          enable_sms_alerts: data.enable_sms_alerts ?? DEFAULT_SETTINGS.enable_sms_alerts,
          max_snooze_count: data.max_snooze_count ?? DEFAULT_SETTINGS.max_snooze_count,
        });
        setTrainingContext((data as any).training_context ?? '');
      }
    } catch (error) {
      console.error('Error loading alert settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alert settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('alert_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('alert_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('alert_settings')
          .insert({
            user_id: user.id,
            ...settings,
          });

        if (error) throw error;
      }

      toast({
        title: 'Settings saved',
        description: 'Your alert preferences have been updated',
      });
    } catch (error) {
      console.error('Error saving alert settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save alert settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast({
      title: 'Settings reset',
      description: 'Alert settings have been reset to defaults',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Customization</CardTitle>
        <CardDescription>
          Adjust alert thresholds and notification preferences to match your needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Health Metric Thresholds</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>HRV Drop Threshold ({settings.hrv_drop_threshold}%)</Label>
              <Slider
                value={[settings.hrv_drop_threshold]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, hrv_drop_threshold: value })
                }
                min={10}
                max={50}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Alert when HRV drops by this percentage from baseline
              </p>
            </div>

            <div className="space-y-2">
              <Label>Resting Heart Rate Spike ({settings.rhr_spike_threshold}%)</Label>
              <Slider
                value={[settings.rhr_spike_threshold]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, rhr_spike_threshold: value })
                }
                min={5}
                max={30}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Alert when RHR increases by this percentage from baseline
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sleep Score Threshold ({settings.sleep_score_threshold})</Label>
              <Slider
                value={[settings.sleep_score_threshold]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, sleep_score_threshold: value })
                }
                min={40}
                max={80}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Alert when sleep score falls below this value
              </p>
            </div>

            <div className="space-y-2">
              <Label>Readiness Score Threshold ({settings.readiness_score_threshold})</Label>
              <Slider
                value={[settings.readiness_score_threshold]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, readiness_score_threshold: value })
                }
                min={30}
                max={70}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Alert when readiness score falls below this value
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Training Load Thresholds</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ACWR Critical ({settings.acwr_critical_threshold.toFixed(1)})</Label>
              <Slider
                value={[settings.acwr_critical_threshold * 10]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, acwr_critical_threshold: value / 10 })
                }
                min={15}
                max={25}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Alert when acute:chronic workload ratio exceeds this value
              </p>
            </div>

            <div className="space-y-2">
              <Label>Strain Critical ({settings.strain_critical_threshold})</Label>
              <Slider
                value={[settings.strain_critical_threshold]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, strain_critical_threshold: value })
                }
                min={1000}
                max={2000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">
                Alert when accumulated strain exceeds this value
              </p>
            </div>

            <div className="space-y-2">
              <Label>Monotony Critical ({settings.monotony_critical_threshold.toFixed(1)})</Label>
              <Slider
                value={[settings.monotony_critical_threshold * 10]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, monotony_critical_threshold: value / 10 })
                }
                min={15}
                max={35}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Alert when training monotony exceeds this value
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Alert Behavior</h3>

          <div className="space-y-2">
            <Label>Severity Filter</Label>
            <Select
              value={settings.severity_filter}
              onValueChange={(value: 'all' | 'critical_only') =>
                setSettings({ ...settings, severity_filter: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show all alerts</SelectItem>
                <SelectItem value="critical_only">Critical alerts only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose which alerts you want to receive
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Popup Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Show alerts as popups in the app
                </p>
              </div>
              <Switch
                checked={settings.enable_popup_alerts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_popup_alerts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Receive alert notifications via email
                </p>
              </div>
              <Switch
                checked={settings.enable_email_alerts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_email_alerts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Receive critical alerts via SMS (requires phone number)
                </p>
              </div>
              <Switch
                checked={settings.enable_sms_alerts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_sms_alerts: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Maximum Snooze Count ({settings.max_snooze_count})</Label>
            <Slider
              value={[settings.max_snooze_count]}
              onValueChange={([value]) =>
                setSettings({ ...settings, max_snooze_count: value })
              }
              min={1}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Limit how many times you can snooze critical alerts
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
