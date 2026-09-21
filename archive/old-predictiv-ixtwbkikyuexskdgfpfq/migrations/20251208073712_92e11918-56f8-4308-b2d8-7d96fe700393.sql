-- Phase 4: Production Hardening Database Optimizations

-- 1. PERFORMANCE: Add missing composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_hrv_hr 
ON wearable_sessions(user_id, date DESC) 
WHERE hrv_avg IS NOT NULL OR resting_hr IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_trends_user_date_metrics 
ON training_trends(user_id, date DESC, acwr, strain, monotony);

CREATE INDEX IF NOT EXISTS idx_wearable_sessions_date_only 
ON wearable_sessions(date DESC);

CREATE INDEX IF NOT EXISTS idx_training_trends_hrv 
ON training_trends(user_id, date DESC) 
WHERE hrv IS NOT NULL;

-- 2. SYSTEM HEALTH MONITORING: Create sync_health_log table
CREATE TABLE IF NOT EXISTS sync_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'oura',
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'retry', 'rate_limited')),
  latency_ms INTEGER,
  entries_processed INTEGER DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for efficient health monitoring queries
CREATE INDEX idx_sync_health_user_created 
ON sync_health_log(user_id, created_at DESC);

CREATE INDEX idx_sync_health_status 
ON sync_health_log(status, created_at DESC);

-- Enable RLS on sync_health_log
ALTER TABLE sync_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to sync health"
ON sync_health_log FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own sync health"
ON sync_health_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. ANOMALY DETECTION: Create health_anomalies table
CREATE TABLE IF NOT EXISTS health_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('spike', 'drop', 'plateau', 'missing')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  current_value NUMERIC,
  baseline_value NUMERIC,
  deviation_percent NUMERIC,
  detected_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_anomalies_user_detected 
ON health_anomalies(user_id, detected_at DESC);

CREATE INDEX idx_anomalies_severity 
ON health_anomalies(severity, detected_at DESC) 
WHERE acknowledged_at IS NULL;

-- Enable RLS on health_anomalies
ALTER TABLE health_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to anomalies"
ON health_anomalies FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own anomalies"
ON health_anomalies FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own anomalies"
ON health_anomalies FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. RATE LIMITING: Create rate_limit_state table
CREATE TABLE IF NOT EXISTS rate_limit_state (
  user_id UUID PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'oura',
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  last_request_at TIMESTAMPTZ DEFAULT now(),
  is_throttled BOOLEAN DEFAULT false,
  throttle_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on rate_limit_state
ALTER TABLE rate_limit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to rate limits"
ON rate_limit_state FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- 5. TOKEN ENCRYPTION: Add encrypted token column (existing tokens remain for backwards compat)
-- Supabase already encrypts at rest, this adds application-level encryption layer
ALTER TABLE wearable_tokens 
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- 6. RETRY QUEUE: Create sync_retry_queue table
CREATE TABLE IF NOT EXISTS sync_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT now(),
  last_error TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_retry_queue_next_retry 
ON sync_retry_queue(next_retry_at, status) 
WHERE status = 'pending';

CREATE INDEX idx_retry_queue_user 
ON sync_retry_queue(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE sync_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to retry queue"
ON sync_retry_queue FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- 7. ANALYZE tables for query optimization
ANALYZE wearable_sessions;
ANALYZE training_trends;
ANALYZE wearable_summary;
ANALYZE oura_logs;