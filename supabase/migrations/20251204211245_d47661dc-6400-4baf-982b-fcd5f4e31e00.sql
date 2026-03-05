-- Create health_trends_daily table for daily trend metrics
CREATE TABLE IF NOT EXISTS public.health_trends_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC,
  baseline NUMERIC,
  delta NUMERIC,
  trend_direction TEXT CHECK (trend_direction IN ('increasing', 'stable', 'declining')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, period_date, metric_name)
);

-- Create health_trends_weekly table for weekly aggregates
CREATE TABLE IF NOT EXISTS public.health_trends_weekly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC,
  baseline NUMERIC,
  delta NUMERIC,
  week_over_week_pct NUMERIC,
  trend_direction TEXT CHECK (trend_direction IN ('increasing', 'stable', 'declining')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, period_start, metric_name)
);

-- Create recovery_trends table for load and recovery metrics
CREATE TABLE IF NOT EXISTS public.recovery_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_date DATE NOT NULL,
  chronic_load NUMERIC,
  acute_load NUMERIC,
  acwr NUMERIC,
  acwr_trend TEXT CHECK (acwr_trend IN ('increasing', 'stable', 'declining')),
  monotony NUMERIC,
  strain NUMERIC,
  recovery_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, period_date)
);

-- Create activity_trends table for activity-specific trends
CREATE TABLE IF NOT EXISTS public.activity_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_date DATE NOT NULL,
  steps_avg_7d NUMERIC,
  steps_baseline NUMERIC,
  steps_delta NUMERIC,
  calories_avg_7d NUMERIC,
  calories_baseline NUMERIC,
  calories_delta NUMERIC,
  activity_score_avg NUMERIC,
  trend_direction TEXT CHECK (trend_direction IN ('increasing', 'stable', 'declining')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, period_date)
);

-- Enable RLS on all new tables
ALTER TABLE public.health_trends_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_trends_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_trends ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_trends_daily
CREATE POLICY "Users can view their own daily trends" ON public.health_trends_daily
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to daily trends" ON public.health_trends_daily
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for health_trends_weekly
CREATE POLICY "Users can view their own weekly trends" ON public.health_trends_weekly
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to weekly trends" ON public.health_trends_weekly
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for recovery_trends
CREATE POLICY "Users can view their own recovery trends" ON public.recovery_trends
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to recovery trends" ON public.recovery_trends
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for activity_trends
CREATE POLICY "Users can view their own activity trends" ON public.activity_trends
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to activity trends" ON public.activity_trends
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_trends_daily_user_date ON public.health_trends_daily(user_id, period_date);
CREATE INDEX IF NOT EXISTS idx_health_trends_weekly_user_period ON public.health_trends_weekly(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_recovery_trends_user_date ON public.recovery_trends(user_id, period_date);
CREATE INDEX IF NOT EXISTS idx_activity_trends_user_date ON public.activity_trends(user_id, period_date);