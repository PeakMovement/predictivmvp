/*
  # Alert Settings and History Management

  1. New Tables
    - `alert_settings`
      - Stores user preferences for alert thresholds and behavior
      - Includes HRV, RHR, sleep score thresholds
      - Alert severity filter (all vs critical only)
      - Notification preferences
    - `alert_history`
      - Tracks all alerts shown to users
      - Records dismissed/resolved status
      - Allows user annotations
      - Links to symptom check-ins when applicable

  2. Security
    - Enable RLS on both tables
    - Users can only access their own settings and history
    - Service role has full access for system operations

  3. Indexes
    - Efficient queries by user_id and timestamp
    - Filter by resolved status
*/

-- Create alert_settings table
CREATE TABLE IF NOT EXISTS alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Threshold customization
  hrv_drop_threshold NUMERIC DEFAULT 20 CHECK (hrv_drop_threshold >= 10 AND hrv_drop_threshold <= 50),
  rhr_spike_threshold NUMERIC DEFAULT 10 CHECK (rhr_spike_threshold >= 5 AND rhr_spike_threshold <= 30),
  sleep_score_threshold NUMERIC DEFAULT 60 CHECK (sleep_score_threshold >= 40 AND sleep_score_threshold <= 80),
  readiness_score_threshold NUMERIC DEFAULT 50 CHECK (readiness_score_threshold >= 30 AND readiness_score_threshold <= 70),
  
  -- ACWR, Strain, Monotony thresholds
  acwr_critical_threshold NUMERIC DEFAULT 1.8 CHECK (acwr_critical_threshold >= 1.5 AND acwr_critical_threshold <= 2.5),
  strain_critical_threshold NUMERIC DEFAULT 1500 CHECK (strain_critical_threshold >= 1000 AND strain_critical_threshold <= 2000),
  monotony_critical_threshold NUMERIC DEFAULT 2.5 CHECK (monotony_critical_threshold >= 1.5 AND monotony_critical_threshold <= 3.5),
  
  -- Alert behavior
  severity_filter TEXT DEFAULT 'all' CHECK (severity_filter IN ('all', 'critical_only')),
  enable_popup_alerts BOOLEAN DEFAULT true,
  enable_email_alerts BOOLEAN DEFAULT true,
  enable_sms_alerts BOOLEAN DEFAULT false,
  
  -- Snooze limits
  max_snooze_count INTEGER DEFAULT 3 CHECK (max_snooze_count >= 1 AND max_snooze_count <= 10),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create alert_history table
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high_risk', 'anomaly', 'red_flag')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved', 'snoozed')),
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  snooze_count INTEGER DEFAULT 0,
  
  -- User annotations
  user_notes TEXT,
  
  -- Relations
  symptom_checkin_id UUID REFERENCES symptom_check_ins(id) ON DELETE SET NULL,
  health_anomaly_id UUID REFERENCES health_anomalies(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for alert_settings
CREATE INDEX idx_alert_settings_user ON alert_settings(user_id);

-- Indexes for alert_history
CREATE INDEX idx_alert_history_user_created ON alert_history(user_id, created_at DESC);
CREATE INDEX idx_alert_history_status ON alert_history(user_id, status, created_at DESC);
CREATE INDEX idx_alert_history_severity ON alert_history(severity, created_at DESC) WHERE status = 'active';

-- Enable RLS
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_settings
CREATE POLICY "Users can view their own alert settings"
  ON alert_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert settings"
  ON alert_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings"
  ON alert_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to alert settings"
  ON alert_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for alert_history
CREATE POLICY "Users can view their own alert history"
  ON alert_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert history"
  ON alert_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert history"
  ON alert_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to alert history"
  ON alert_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);