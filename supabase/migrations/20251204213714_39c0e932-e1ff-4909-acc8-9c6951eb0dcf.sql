-- Enable RLS on all trend tables
ALTER TABLE public.health_trends_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_trends_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_trends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own daily trends" ON public.health_trends_daily;
DROP POLICY IF EXISTS "Users can view their own weekly trends" ON public.health_trends_weekly;
DROP POLICY IF EXISTS "Users can view their own recovery trends" ON public.recovery_trends;
DROP POLICY IF EXISTS "Users can view their own activity trends" ON public.activity_trends;

-- Create RLS policies for health_trends_daily
CREATE POLICY "Users can view their own daily trends" 
ON public.health_trends_daily 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create RLS policies for health_trends_weekly
CREATE POLICY "Users can view their own weekly trends" 
ON public.health_trends_weekly 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create RLS policies for recovery_trends
CREATE POLICY "Users can view their own recovery trends" 
ON public.recovery_trends 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create RLS policies for activity_trends
CREATE POLICY "Users can view their own activity trends" 
ON public.activity_trends 
FOR SELECT 
USING (auth.uid() = user_id);