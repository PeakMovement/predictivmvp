import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Save, RotateCcw, Sparkles, CheckCircle2, Dumbbell, Trophy, HeartPulse, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────

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
  active_profile: string;
  health_context: string;
}

// ── Preset profiles ────────────────────────────────────────────────────────

interface PresetProfile {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  thresholds: Pick<
    AlertSettings,
    | 'hrv_drop_threshold'
    | 'rhr_spike_threshold'
    | 'sleep_score_threshold'
    | 'readiness_score_threshold'
    | 'acwr_critical_threshold'
    | 'strain_critical_threshold'
    | 'monotony_critical_threshold'
  >;
}

const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'recreational',
    name: 'Recreational / Fitness',
    description: 'Casual athletes focused on enjoyment and general fitness',
    icon: Dumbbell,
    thresholds: {
      hrv_drop_threshold: 25,
      rhr_spike_threshold: 15,
      sleep_score_threshold: 55,
      readiness_score_threshold: 45,
      acwr_critical_threshold: 1.5,
      strain_critical_threshold: 1800,
      monotony_critical_threshold: 2.0,
    },
  },
  {
    id: 'elite',
    name: 'Elite / High Performance',
    description: 'Competitive athletes training at high intensities regularly',
    icon: Trophy,
    thresholds: {
      hrv_drop_threshold: 15,
      rhr_spike_threshold: 8,
      sleep_score_threshold: 70,
      readiness_score_threshold: 60,
      acwr_critical_threshold: 1.3,
      strain_critical_threshold: 2500,
      monotony_critical_threshold: 3.0,
    },
  },
  {
    id: 'recovery',
    name: 'Recovery / Returning from Injury',
    description: 'Conservative thresholds for rehab and injury prevention',
    icon: HeartPulse,
    thresholds: {
      hrv_drop_threshold: 20,
      rhr_spike_threshold: 10,
      sleep_score_threshold: 65,
      readiness_score_threshold: 55,
      acwr_critical_threshold: 1.2,
      strain_critical_threshold: 1200,
      monotony_critical_threshold: 1.5,
    },
  },
  {
    id: 'high_stress',
    name: 'High Stress / Overreaching Risk',
    description: 'Sensitive alerts for athletes managing high life or training stress',
    icon: Brain,
    thresholds: {
      hrv_drop_threshold: 15,
      rhr_spike_threshold: 8,
      sleep_score_threshold: 60,
      readiness_score_threshold: 50,
      acwr_critical_threshold: 1.2,
      strain_critical_threshold: 1400,
      monotony_critical_threshold: 1.8,
    },
  },
];

// ── Defaults ───────────────────────────────────────────────────────────────

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
  active_profile: '',
  health_context: '',
};

// ── Component ──────────────────────────────────────────────────────────────

export function AlertCustomizationSettings() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  // ── DB helpers ─────────────────────────────────────────────────────────

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
          hrv_drop_threshold:        data.hrv_drop_threshold         ?? DEFAULT_SETTINGS.hrv_drop_threshold,
          rhr_spike_threshold:       data.rhr_spike_threshold        ?? DEFAULT_SETTINGS.rhr_spike_threshold,
          sleep_score_threshold:     data.sleep_score_threshold      ?? DEFAULT_SETTINGS.sleep_score_threshold,
          readiness_score_threshold: data.readiness_score_threshold  ?? DEFAULT_SETTINGS.readiness_score_threshold,
          acwr_critical_threshold:   data.acwr_critical_threshold    ?? DEFAULT_SETTINGS.acwr_critical_threshold,
          strain_critical_threshold: data.strain_critical_threshold  ?? DEFAULT_SETTINGS.strain_critical_threshold,
          monotony_critical_threshold: data.monotony_critical_threshold ?? DEFAULT_SETTINGS.monotony_critical_threshold,
          severity_filter:           (data.severity_filter as 'all' | 'critical_only') ?? DEFAULT_SETTINGS.severity_filter,
          enable_popup_alerts:       data.enable_popup_alerts        ?? DEFAULT_SETTINGS.enable_popup_alerts,
          enable_email_alerts:       data.enable_email_alerts        ?? DEFAULT_SETTINGS.enable_email_alerts,
          enable_sms_alerts:         data.enable_sms_alerts          ?? DEFAULT_SETTINGS.enable_sms_alerts,
          max_snooze_count:          data.max_snooze_count           ?? DEFAULT_SETTINGS.max_snooze_count,
          active_profile:            (data as any).active_profile    ?? '',
          health_context:            (data as any).health_context    ?? (data as any).training_context ?? '',
        });
      }
    } catch (err) {
      console.error('Error loading alert settings:', err);
      toast({ title: 'Error', description: 'Failed to load alert settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const persistSettings = async (next: AlertSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('alert_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const payload = {
      hrv_drop_threshold:          next.hrv_drop_threshold,
      rhr_spike_threshold:         next.rhr_spike_threshold,
      sleep_score_threshold:       next.sleep_score_threshold,
      readiness_score_threshold:   next.readiness_score_threshold,
      acwr_critical_threshold:     next.acwr_critical_threshold,
      strain_critical_threshold:   next.strain_critical_threshold,
      monotony_critical_threshold: next.monotony_critical_threshold,
      severity_filter:             next.severity_filter,
      enable_popup_alerts:         next.enable_popup_alerts,
      enable_email_alerts:         next.enable_email_alerts,
      enable_sms_alerts:           next.enable_sms_alerts,
      max_snooze_count:            next.max_snooze_count,
      active_profile:              next.active_profile,
      health_context:              next.health_context,
      updated_at:                  new Date().toISOString(),
    } as any;

    if (existing) {
      const { error } = await supabase
        .from('alert_settings')
        .update(payload)
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('alert_settings')
        .insert({ user_id: user.id, ...payload });
      if (error) throw error;
    }
  };

  // ── Preset selection ───────────────────────────────────────────────────

  const applyPreset = async (preset: PresetProfile) => {
    const next: AlertSettings = {
      ...settings,
      ...preset.thresholds,
      active_profile: preset.name,
    };
    setSettings(next);
    try {
      await persistSettings(next);
      toast({ title: `Profile applied`, description: `"${preset.name}" thresholds saved.` });
    } catch (err) {
      console.error('Error saving preset:', err);
      toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
    }
  };

  // ── Manual save ────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      setSaving(true);
      await persistSettings(settings);
      toast({ title: 'Settings saved', description: 'Your alert preferences have been updated' });
    } catch (err) {
      console.error('Error saving alert settings:', err);
      toast({ title: 'Error', description: 'Failed to save alert settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast({ title: 'Settings reset', description: 'Alert settings have been reset to defaults' });
  };

  // ── AI profile generation ──────────────────────────────────────────────

  const handleGenerateProfile = async () => {
    if (!settings.health_context.trim() || settings.health_context.trim().length < 10) {
      toast({
        title: 'Add more context',
        description: 'Describe your training and health situation (at least a sentence) before generating.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('generate-alert-profile', {
        body: { context: settings.health_context },
      });

      if (res.error) throw new Error(res.error.message);

      const { profile } = res.data as { profile: Partial<AlertSettings> };

      const next: AlertSettings = {
        ...settings,
        ...profile,
        active_profile: 'Custom (AI)',
      };
      setSettings(next);
      await persistSettings(next);

      toast({
        title: 'Profile generated',
        description: 'Alert thresholds updated based on your description.',
      });
    } catch (err) {
      console.error('Error generating AI profile:', err);
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Could not generate profile. Try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

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
          Adjust alert thresholds and notification preferences to match your training profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── SECTION 1: Preset Profiles ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Alert Profiles</h3>
            {settings.active_profile && (
              <Badge variant="secondary" className="text-xs">
                Active: {settings.active_profile}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Select a preset that matches your training situation. It will update all thresholds instantly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_PROFILES.map((preset) => {
              const Icon = preset.icon;
              const isSelected = settings.active_profile === preset.name;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`relative text-left rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40'
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug pr-5">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* ── SECTION 2: AI Context Generator ── */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Your Training &amp; Health Context</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Describe your current training phase, injury history, fitness level, or health goals.
            Yves will generate a custom alert profile tailored to your situation.
          </p>
          <Textarea
            placeholder="e.g. I'm a recreational runner doing 30–40 km/week, currently building back after a knee injury. I prioritise recovery and sleep quality over performance right now."
            value={settings.health_context}
            onChange={(e) => setSettings({ ...settings, health_context: e.target.value })}
            className="min-h-[100px] resize-y bg-background text-sm"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {settings.health_context.length}/1000
            </p>
            <Button
              size="sm"
              onClick={handleGenerateProfile}
              disabled={generating || settings.health_context.trim().length < 10}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate My Profile
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* ── Health Metric Thresholds ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Health Metric Thresholds</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>HRV Drop Threshold ({settings.hrv_drop_threshold}%)</Label>
              <Slider
                value={[settings.hrv_drop_threshold]}
                onValueChange={([v]) => setSettings({ ...settings, hrv_drop_threshold: v, active_profile: 'Custom' })}
                min={10} max={50} step={5}
              />
              <p className="text-xs text-muted-foreground">Alert when HRV drops by this percentage from baseline</p>
            </div>

            <div className="space-y-2">
              <Label>Resting Heart Rate Spike ({settings.rhr_spike_threshold}%)</Label>
              <Slider
                value={[settings.rhr_spike_threshold]}
                onValueChange={([v]) => setSettings({ ...settings, rhr_spike_threshold: v, active_profile: 'Custom' })}
                min={5} max={30} step={1}
              />
              <p className="text-xs text-muted-foreground">Alert when RHR increases by this percentage from baseline</p>
            </div>

            <div className="space-y-2">
              <Label>Sleep Score Threshold ({settings.sleep_score_threshold})</Label>
              <Slider
                value={[settings.sleep_score_threshold]}
                onValueChange={([v]) => setSettings({ ...settings, sleep_score_threshold: v, active_profile: 'Custom' })}
                min={40} max={80} step={5}
              />
              <p className="text-xs text-muted-foreground">Alert when sleep score falls below this value</p>
            </div>

            <div className="space-y-2">
              <Label>Readiness Score Threshold ({settings.readiness_score_threshold})</Label>
              <Slider
                value={[settings.readiness_score_threshold]}
                onValueChange={([v]) => setSettings({ ...settings, readiness_score_threshold: v, active_profile: 'Custom' })}
                min={30} max={70} step={5}
              />
              <p className="text-xs text-muted-foreground">Alert when readiness score falls below this value</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Training Load Thresholds ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Training Load Thresholds</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ACWR Critical ({settings.acwr_critical_threshold.toFixed(1)})</Label>
              <Slider
                value={[Math.round(settings.acwr_critical_threshold * 10)]}
                onValueChange={([v]) => setSettings({ ...settings, acwr_critical_threshold: v / 10, active_profile: 'Custom' })}
                min={11} max={25} step={1}
              />
              <p className="text-xs text-muted-foreground">Alert when acute:chronic workload ratio exceeds this value</p>
            </div>

            <div className="space-y-2">
              <Label>Strain Critical ({settings.strain_critical_threshold})</Label>
              <Slider
                value={[settings.strain_critical_threshold]}
                onValueChange={([v]) => setSettings({ ...settings, strain_critical_threshold: v, active_profile: 'Custom' })}
                min={800} max={3000} step={100}
              />
              <p className="text-xs text-muted-foreground">Alert when accumulated strain exceeds this value</p>
            </div>

            <div className="space-y-2">
              <Label>Monotony Critical ({settings.monotony_critical_threshold.toFixed(1)})</Label>
              <Slider
                value={[Math.round(settings.monotony_critical_threshold * 10)]}
                onValueChange={([v]) => setSettings({ ...settings, monotony_critical_threshold: v / 10, active_profile: 'Custom' })}
                min={12} max={35} step={1}
              />
              <p className="text-xs text-muted-foreground">Alert when training monotony exceeds this value</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Alert Behavior ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Alert Behavior</h3>

          <div className="space-y-2">
            <Label>Severity Filter</Label>
            <Select
              value={settings.severity_filter}
              onValueChange={(v: 'all' | 'critical_only') =>
                setSettings({ ...settings, severity_filter: v })
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
          </div>

          <div className="space-y-3">
            {[
              { key: 'enable_popup_alerts' as const, label: 'Popup Alerts', desc: 'Show alerts as popups in the app' },
              { key: 'enable_email_alerts' as const, label: 'Email Alerts', desc: 'Receive alert notifications via email' },
              { key: 'enable_sms_alerts' as const, label: 'SMS Alerts', desc: 'Receive critical alerts via SMS (requires phone number)' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Maximum Snooze Count ({settings.max_snooze_count})</Label>
            <Slider
              value={[settings.max_snooze_count]}
              onValueChange={([v]) => setSettings({ ...settings, max_snooze_count: v })}
              min={1} max={10} step={1}
            />
            <p className="text-xs text-muted-foreground">Limit how many times you can snooze critical alerts</p>
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
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
