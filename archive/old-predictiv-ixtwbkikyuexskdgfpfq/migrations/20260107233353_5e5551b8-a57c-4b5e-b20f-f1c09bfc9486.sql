-- ═══════════════════════════════════════════════════════════════════════════════
-- PREDICTIV MVP: LAYERED REASONING AI SYSTEM - DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══ PHASE 1: DATA MATURITY TRACKING ═══
CREATE TABLE IF NOT EXISTS public.user_data_maturity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  maturity_level TEXT NOT NULL DEFAULT 'insufficient' CHECK (maturity_level IN ('insufficient', 'emerging', 'established', 'mature')),
  maturity_score INTEGER NOT NULL DEFAULT 0 CHECK (maturity_score >= 0 AND maturity_score <= 100),
  data_days INTEGER NOT NULL DEFAULT 0,
  profile_completeness INTEGER NOT NULL DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  wearable_connected BOOLEAN NOT NULL DEFAULT false,
  documents_count INTEGER NOT NULL DEFAULT 0,
  symptom_checkins_count INTEGER NOT NULL DEFAULT 0,
  last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_data_maturity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data maturity" 
ON public.user_data_maturity FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage data maturity" 
ON public.user_data_maturity FOR ALL USING (true);

-- ═══ PHASE 1: RISK TRAJECTORIES ═══
CREATE TABLE IF NOT EXISTS public.risk_trajectories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric TEXT NOT NULL,
  current_value NUMERIC,
  baseline_value NUMERIC,
  predicted_3day NUMERIC,
  predicted_7day NUMERIC,
  trajectory_direction TEXT CHECK (trajectory_direction IN ('improving', 'stable', 'worsening')),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 100),
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, metric, calculation_date)
);

ALTER TABLE public.risk_trajectories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own risk trajectories" 
ON public.risk_trajectories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage risk trajectories" 
ON public.risk_trajectories FOR ALL USING (true);

-- ═══ PHASE 4: ESCALATION RULES (CONFIGURABLE) ═══
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]',
  require_all BOOLEAN NOT NULL DEFAULT true,
  escalation_type TEXT NOT NULL CHECK (escalation_type IN ('in_app_alert', 'sms', 'email', 'provider_referral')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message_template TEXT NOT NULL,
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read escalation rules" 
ON public.escalation_rules FOR SELECT USING (true);

CREATE POLICY "Service role can manage escalation rules" 
ON public.escalation_rules FOR ALL USING (true);

-- ═══ PHASE 4: ESCALATION LOG ═══
CREATE TABLE IF NOT EXISTS public.escalation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rule_id UUID REFERENCES public.escalation_rules(id),
  rule_name TEXT NOT NULL,
  triggered_conditions JSONB,
  escalation_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  action_taken TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own escalation logs" 
ON public.escalation_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage escalation logs" 
ON public.escalation_log FOR ALL USING (true);

-- ═══ PHASE 5: ENGAGEMENT EVENTS ═══
CREATE TABLE IF NOT EXISTS public.engagement_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('recommendation_viewed', 'recommendation_followed', 'recommendation_dismissed', 'recommendation_helpful', 'recommendation_not_helpful', 'symptom_logged', 'chat_initiated', 'briefing_viewed', 'app_opened')),
  target_id UUID,
  target_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own engagement events" 
ON public.engagement_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own engagement events" 
ON public.engagement_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage engagement events" 
ON public.engagement_events FOR ALL USING (true);

-- ═══ PHASE 5: RECOMMENDATION OUTCOMES ═══
CREATE TABLE IF NOT EXISTS public.recommendation_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_id UUID NOT NULL,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('followed', 'ignored', 'partially_followed', 'not_applicable')),
  user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'neutral')),
  metrics_before JSONB,
  metrics_after JSONB,
  outcome_delta JSONB,
  notes TEXT,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendation outcomes" 
ON public.recommendation_outcomes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendation outcomes" 
ON public.recommendation_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage recommendation outcomes" 
ON public.recommendation_outcomes FOR ALL USING (true);

-- ═══ PHASE 5: USER ADAPTATION PROFILE ═══
CREATE TABLE IF NOT EXISTS public.user_adaptation_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_categories JSONB DEFAULT '{}',
  optimal_timing JSONB DEFAULT '{}',
  effective_tone TEXT DEFAULT 'balanced' CHECK (effective_tone IN ('supportive', 'coach', 'clinical', 'balanced')),
  follow_through_rate NUMERIC DEFAULT 0 CHECK (follow_through_rate >= 0 AND follow_through_rate <= 100),
  avg_response_time_hours NUMERIC,
  threshold_adjustments JSONB DEFAULT '{}',
  last_adapted TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_adaptation_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own adaptation profile" 
ON public.user_adaptation_profile FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage adaptation profiles" 
ON public.user_adaptation_profile FOR ALL USING (true);

-- ═══ PHASE 6: PROMPT HISTORY ═══
CREATE TABLE IF NOT EXISTS public.prompt_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('daily_briefing', 'recommendation', 'alert', 'escalation')),
  prompt_content TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  was_acted_upon BOOLEAN,
  was_helpful BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompt history" 
ON public.prompt_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage prompt history" 
ON public.prompt_history FOR ALL USING (true);

-- ═══ ADD COLUMNS TO EXISTING YVES_RECOMMENDATIONS TABLE ═══
ALTER TABLE public.yves_recommendations 
ADD COLUMN IF NOT EXISTS confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 100),
ADD COLUMN IF NOT EXISTS internal_reasoning TEXT,
ADD COLUMN IF NOT EXISTS data_sources TEXT[],
ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB;

-- ═══ SEED INITIAL ESCALATION RULES ═══
INSERT INTO public.escalation_rules (rule_name, description, conditions, require_all, escalation_type, severity, message_template, cooldown_hours)
VALUES 
  (
    'Critical Overtraining Alert',
    'ACWR exceeds safe threshold with high strain indicating overtraining risk',
    '[{"metric": "acwr", "operator": ">", "value": 1.8}, {"metric": "strain", "operator": ">", "value": 3000}]'::jsonb,
    true,
    'in_app_alert',
    'critical',
    'Your training load is dangerously high. ACWR: {{acwr}}, Strain: {{strain}}. Immediate rest recommended to prevent injury.',
    12
  ),
  (
    'Sustained Low Readiness',
    'Readiness score below threshold for multiple consecutive days',
    '[{"metric": "readiness_score", "operator": "<", "value": 40}, {"metric": "consecutive_days", "operator": ">=", "value": 3}]'::jsonb,
    true,
    'email',
    'warning',
    'Your readiness has been low ({{readiness_score}}) for {{consecutive_days}} days. Consider consulting a healthcare provider if symptoms persist.',
    48
  ),
  (
    'Severe HRV Drop',
    'HRV dropped significantly from baseline indicating potential illness or overtraining',
    '[{"metric": "hrv_deviation_pct", "operator": "<", "value": -40}]'::jsonb,
    true,
    'in_app_alert',
    'warning',
    'Your HRV dropped {{hrv_deviation_pct}}% from baseline. This may indicate illness, stress, or overtraining. Listen to your body today.',
    24
  ),
  (
    'High Risk Training Load',
    'ACWR in dangerous zone requiring immediate attention',
    '[{"metric": "acwr", "operator": ">", "value": 1.5}]'::jsonb,
    true,
    'in_app_alert',
    'info',
    'Your ACWR ({{acwr}}) is elevated. Consider reducing training intensity to prevent injury.',
    24
  ),
  (
    'Sleep Deficit Alert',
    'Chronic sleep deprivation detected',
    '[{"metric": "sleep_score", "operator": "<", "value": 60}, {"metric": "consecutive_days", "operator": ">=", "value": 3}]'::jsonb,
    true,
    'in_app_alert',
    'warning',
    'You''ve had poor sleep (score: {{sleep_score}}) for {{consecutive_days}} consecutive days. Prioritize rest tonight.',
    24
  )
ON CONFLICT DO NOTHING;

-- ═══ CREATE INDEXES FOR PERFORMANCE ═══
CREATE INDEX IF NOT EXISTS idx_user_data_maturity_user ON public.user_data_maturity(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_trajectories_user_date ON public.risk_trajectories(user_id, calculation_date);
CREATE INDEX IF NOT EXISTS idx_escalation_log_user ON public.escalation_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_user ON public.engagement_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON public.engagement_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_user ON public.recommendation_outcomes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user ON public.prompt_history(user_id, created_at DESC);

-- ═══ UPDATE TRIGGER FUNCTION ═══
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ═══ ADD TRIGGERS ═══
DROP TRIGGER IF EXISTS update_user_data_maturity_updated_at ON public.user_data_maturity;
CREATE TRIGGER update_user_data_maturity_updated_at
  BEFORE UPDATE ON public.user_data_maturity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_risk_trajectories_updated_at ON public.risk_trajectories;
CREATE TRIGGER update_risk_trajectories_updated_at
  BEFORE UPDATE ON public.risk_trajectories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_adaptation_profile_updated_at ON public.user_adaptation_profile;
CREATE TRIGGER update_user_adaptation_profile_updated_at
  BEFORE UPDATE ON public.user_adaptation_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_escalation_rules_updated_at ON public.escalation_rules;
CREATE TRIGGER update_escalation_rules_updated_at
  BEFORE UPDATE ON public.escalation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();