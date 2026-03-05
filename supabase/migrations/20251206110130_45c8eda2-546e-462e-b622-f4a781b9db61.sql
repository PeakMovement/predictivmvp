-- =====================================================
-- RESTRICT ALL REMAINING POLICIES TO AUTHENTICATED ROLE
-- =====================================================

-- csv_uploads
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.csv_uploads;
DROP POLICY IF EXISTS "Users can insert their own uploads" ON public.csv_uploads;
CREATE POLICY "Users can view their own uploads" ON public.csv_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own uploads" ON public.csv_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- daily_briefings
DROP POLICY IF EXISTS "Users can view their own briefings" ON public.daily_briefings;
DROP POLICY IF EXISTS "Service role full access to briefings" ON public.daily_briefings;
CREATE POLICY "Users can view their own briefings" ON public.daily_briefings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to briefings" ON public.daily_briefings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- document_insights
DROP POLICY IF EXISTS "Users can view their own insights" ON public.document_insights;
DROP POLICY IF EXISTS "Service role full access to document_insights" ON public.document_insights;
CREATE POLICY "Users can view their own insights" ON public.document_insights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to document_insights" ON public.document_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

-- document_processing_log
DROP POLICY IF EXISTS "Users can view their own processing logs" ON public.document_processing_log;
DROP POLICY IF EXISTS "Service role full access to processing logs" ON public.document_processing_log;
CREATE POLICY "Users can view their own processing logs" ON public.document_processing_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to processing logs" ON public.document_processing_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- feedback
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- function_execution_log
DROP POLICY IF EXISTS "Users can view logs" ON public.function_execution_log;
DROP POLICY IF EXISTS "Service role can manage logs" ON public.function_execution_log;
CREATE POLICY "Authenticated users can view logs" ON public.function_execution_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage logs" ON public.function_execution_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- health_trends_daily
DROP POLICY IF EXISTS "Users can view their own daily trends" ON public.health_trends_daily;
DROP POLICY IF EXISTS "Service role full access to daily trends" ON public.health_trends_daily;
CREATE POLICY "Users can view their own daily trends" ON public.health_trends_daily FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to daily trends" ON public.health_trends_daily FOR ALL TO service_role USING (true) WITH CHECK (true);

-- health_trends_weekly
DROP POLICY IF EXISTS "Users can view their own weekly trends" ON public.health_trends_weekly;
DROP POLICY IF EXISTS "Service role full access to weekly trends" ON public.health_trends_weekly;
CREATE POLICY "Users can view their own weekly trends" ON public.health_trends_weekly FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to weekly trends" ON public.health_trends_weekly FOR ALL TO service_role USING (true) WITH CHECK (true);

-- insight_feedback
DROP POLICY IF EXISTS "Users can view their own insight feedback" ON public.insight_feedback;
DROP POLICY IF EXISTS "Users can insert their own insight feedback" ON public.insight_feedback;
CREATE POLICY "Users can view their own insight feedback" ON public.insight_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own insight feedback" ON public.insight_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- insight_history
DROP POLICY IF EXISTS "Users can view their own insight history" ON public.insight_history;
DROP POLICY IF EXISTS "Users can insert their own insight history" ON public.insight_history;
DROP POLICY IF EXISTS "Service role full access to insight_history" ON public.insight_history;
CREATE POLICY "Users can view their own insight history" ON public.insight_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own insight history" ON public.insight_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access to insight_history" ON public.insight_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- notification_log
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification_log;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_log;
CREATE POLICY "Authenticated users can view notifications" ON public.notification_log FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can insert notifications" ON public.notification_log FOR INSERT TO service_role WITH CHECK (true);

-- oura_logs
DROP POLICY IF EXISTS "Users can view their own oura logs" ON public.oura_logs;
DROP POLICY IF EXISTS "Service role full access to oura logs" ON public.oura_logs;
CREATE POLICY "Users can view their own oura logs" ON public.oura_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to oura logs" ON public.oura_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- oura_sync_log
DROP POLICY IF EXISTS "user can see own oura logs" ON public.oura_sync_log;
DROP POLICY IF EXISTS "system insert logs" ON public.oura_sync_log;
CREATE POLICY "Users can view their own oura sync logs" ON public.oura_sync_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to oura sync logs" ON public.oura_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- plan_adherence
DROP POLICY IF EXISTS "Users can view their own plan adherence" ON public.plan_adherence;
DROP POLICY IF EXISTS "Service role full access to plan adherence" ON public.plan_adherence;
CREATE POLICY "Users can view their own plan adherence" ON public.plan_adherence FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to plan adherence" ON public.plan_adherence FOR ALL TO service_role USING (true) WITH CHECK (true);

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- recovery_trends
DROP POLICY IF EXISTS "Users can view their own recovery trends" ON public.recovery_trends;
DROP POLICY IF EXISTS "Service role full access to recovery trends" ON public.recovery_trends;
CREATE POLICY "Users can view their own recovery trends" ON public.recovery_trends FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to recovery trends" ON public.recovery_trends FOR ALL TO service_role USING (true) WITH CHECK (true);

-- terra_connections
DROP POLICY IF EXISTS "Users can view their own terra connections" ON public.terra_connections;
DROP POLICY IF EXISTS "Users can insert their own terra connections" ON public.terra_connections;
DROP POLICY IF EXISTS "Users can delete their own terra connections" ON public.terra_connections;
CREATE POLICY "Users can view their own terra connections" ON public.terra_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own terra connections" ON public.terra_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own terra connections" ON public.terra_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);