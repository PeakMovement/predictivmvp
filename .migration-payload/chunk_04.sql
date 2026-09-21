SET check_function_bodies = false;
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.user_documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.escalation_log
    ADD CONSTRAINT escalation_log_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.escalation_rules(id);
ALTER TABLE ONLY public.wearable_tokens
    ADD CONSTRAINT fitbit_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.fitbit_tokens
    ADD CONSTRAINT fitbit_tokens_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.document_processing_log
    ADD CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES public.user_documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.google_calendar_events
    ADD CONSTRAINT google_calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.google_calendar_sync_logs
    ADD CONSTRAINT google_calendar_sync_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.insight_history
    ADD CONSTRAINT insight_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.onboarding_signals
    ADD CONSTRAINT onboarding_signals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_activity
    ADD CONSTRAINT oura_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_cardiovascular_age
    ADD CONSTRAINT oura_cardiovascular_age_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_logs
    ADD CONSTRAINT oura_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_readiness
    ADD CONSTRAINT oura_readiness_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_resilience
    ADD CONSTRAINT oura_resilience_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_rest_mode
    ADD CONSTRAINT oura_rest_mode_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_ring_config
    ADD CONSTRAINT oura_ring_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_sleep
    ADD CONSTRAINT oura_sleep_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_spo2
    ADD CONSTRAINT oura_spo2_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_stress
    ADD CONSTRAINT oura_stress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_vo2max
    ADD CONSTRAINT oura_vo2max_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.oura_workout
    ADD CONSTRAINT oura_workout_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.polar_logs
    ADD CONSTRAINT polar_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.polar_tokens
    ADD CONSTRAINT polar_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.practitioner_access
    ADD CONSTRAINT practitioner_access_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.practitioner_access
    ADD CONSTRAINT practitioner_access_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.practitioner_bookings
    ADD CONSTRAINT practitioner_bookings_patient_user_id_fkey FOREIGN KEY (patient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.practitioner_bookings
    ADD CONSTRAINT practitioner_bookings_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.practitioner_specialties
    ADD CONSTRAINT practitioner_specialties_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.healthcare_practitioners(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.practitioner_specialties
    ADD CONSTRAINT practitioner_specialties_service_category_id_fkey FOREIGN KEY (service_category_id) REFERENCES public.service_categories(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.practitioners
    ADD CONSTRAINT practitioners_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.prediction_log
    ADD CONSTRAINT prediction_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.provider_reviews
    ADD CONSTRAINT provider_reviews_physician_id_fkey FOREIGN KEY (physician_id) REFERENCES public.physicians(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.provider_reviews
    ADD CONSTRAINT provider_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.provider_reviews(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.risk_alert_dismissals
    ADD CONSTRAINT risk_alert_dismissals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.risk_score_history
    ADD CONSTRAINT risk_score_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.treatment_plan_feedback
    ADD CONSTRAINT treatment_plan_feedback_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.treatment_plan_feedback
    ADD CONSTRAINT treatment_plan_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.treatment_plan_services
    ADD CONSTRAINT treatment_plan_services_service_category_id_fkey FOREIGN KEY (service_category_id) REFERENCES public.service_categories(id);
ALTER TABLE ONLY public.treatment_plan_services
    ADD CONSTRAINT treatment_plan_services_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_challenges
    ADD CONSTRAINT user_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_context
    ADD CONSTRAINT user_context_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_parent_document_id_fkey FOREIGN KEY (parent_document_id) REFERENCES public.user_documents(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.user_focus_preferences
    ADD CONSTRAINT user_focus_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_health_profiles
    ADD CONSTRAINT user_health_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_injury_profiles
    ADD CONSTRAINT user_injury_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_life_formula
    ADD CONSTRAINT user_life_formula_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_model
    ADD CONSTRAINT user_model_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_shown_patterns
    ADD CONSTRAINT user_shown_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_treatment_preferences
    ADD CONSTRAINT user_treatment_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wearable_sessions
    ADD CONSTRAINT wearable_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wearable_summary
    ADD CONSTRAINT wearable_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.weekly_reflections
    ADD CONSTRAINT weekly_reflections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE POLICY "Admins can manage bookings" ON public.practitioner_bookings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));
CREATE POLICY "Admins can manage practitioners" ON public.practitioners TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));
CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Allow public read access to fitbit_trends" ON public.fitbit_trends FOR SELECT USING (true);
CREATE POLICY "Allow public read for yves_profiles" ON public.yves_profiles FOR SELECT USING (true);
CREATE POLICY "Allow service role to insert/update fitbit_trends" ON public.fitbit_trends USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read escalation rules" ON public.escalation_rules FOR SELECT USING (true);
CREATE POLICY "Anyone can view provider reviews" ON public.provider_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can delete their own symptom check-ins" ON public.symptom_check_ins FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can insert their own symptom check-ins" ON public.symptom_check_ins FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can update their own symptom check-ins" ON public.symptom_check_ins FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can view logs" ON public.function_execution_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view notifications" ON public.notification_log FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view physicians" ON public.physicians FOR SELECT USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Authenticated users can view their own symptom check-ins" ON public.symptom_check_ins FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Healthcare practitioners are viewable by everyone" ON public.healthcare_practitioners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Patients can create bookings" ON public.practitioner_bookings FOR INSERT TO authenticated WITH CHECK ((auth.uid() = patient_user_id));
CREATE POLICY "Patients can read own bookings" ON public.practitioner_bookings FOR SELECT TO authenticated USING ((auth.uid() = patient_user_id));
CREATE POLICY "Practitioner specialties are viewable by everyone" ON public.practitioner_specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Practitioners can insert own profile" ON public.practitioners FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Practitioners can read own bookings" ON public.practitioner_bookings FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.practitioners
  WHERE ((practitioners.id = practitioner_bookings.practitioner_id) AND (practitioners.user_id = auth.uid())))));
CREATE POLICY "Practitioners can read own row" ON public.practitioners FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Practitioners can update own profile" ON public.practitioners FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Public can view approved practitioners" ON public.practitioners FOR SELECT USING ((profile_status = 'approved'::text));
CREATE POLICY "Service categories are viewable by everyone" ON public.service_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can do anything" ON public.user_baselines TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert bookings" ON public."Bookings" FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can manage adaptation profiles" ON public.user_adaptation_profile USING (true);
CREATE POLICY "Service role can manage all Fitbit data" ON public.fitbit_auto_data TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all Fitbit data" ON public.wearable_auto_data TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all Fitbit tokens" ON public.fitbit_tokens TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all Fitbit tokens" ON public.wearable_tokens TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all Fitbit trends" ON public.fitbit_trends TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all tokens" ON public.google_calendar_tokens TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage data maturity" ON public.user_data_maturity USING (true);
CREATE POLICY "Service role can manage engagement events" ON public.engagement_events USING (true);
CREATE POLICY "Service role can manage escalation logs" ON public.escalation_log USING (true);
CREATE POLICY "Service role can manage escalation rules" ON public.escalation_rules USING (true);
CREATE POLICY "Service role can manage function logs" ON public.function_execution_log TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage logs" ON public.function_execution_log TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage notifications" ON public.notification_log TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage prompt history" ON public.prompt_history USING (true);
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage recommendation outcomes" ON public.recommendation_outcomes USING (true);
CREATE POLICY "Service role can manage risk trajectories" ON public.risk_trajectories USING (true);
CREATE POLICY "Service role full access" ON public.baseline_profiles TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.onboarding_signals TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.user_model TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to activity trends" ON public.activity_trends USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to alert history" ON public.alert_history TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to alert settings" ON public.alert_settings TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to anomalies" ON public.health_anomalies TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to bookings" ON public."Bookings" USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to briefings" ON public.daily_briefings TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to daily trends" ON public.health_trends_daily TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to deviations" ON public.user_deviations TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to document_insights" ON public.document_insights TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to document_versions" ON public.document_versions TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to health profiles" ON public.user_health_profiles TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to injury profiles" ON public.user_injury_profiles TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to insight actions" ON public.user_insight_actions TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to insight_history" ON public.insight_history TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to memory" ON public.yves_memory_bank TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to oura logs" ON public.oura_logs TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to oura sync logs" ON public.oura_sync_log TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to physicians" ON public.physicians USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to plan adherence" ON public.plan_adherence TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to prediction_log" ON public.prediction_log TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to processing logs" ON public.document_processing_log TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to rate limits" ON public.rate_limit_state TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to recommendations" ON public.adaptive_recommendations USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to recovery trends" ON public.recovery_trends TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to retry queue" ON public.sync_retry_queue TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to sessions" ON public.medical_finder_sessions USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to sync health" ON public.sync_health_log TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to triage results" ON public.triage_results USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to user_context" ON public.user_context_enhanced TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to user_documents" ON public.user_documents TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to user_life_formula" ON public.user_life_formula TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to users" ON public.users TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to wearable sessions" ON public.wearable_sessions TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to wearable summary" ON public.wearable_summary TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to wearable_sessions" ON public.wearable_sessions USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to wearable_summary" ON public.wearable_summary USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to weekly trends" ON public.health_trends_weekly TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to yves profiles" ON public.yves_profiles TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to yves recommendations" ON public.yves_recommendations TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to yves_memory_bank" ON public.yves_memory_bank USING (true) WITH CHECK (true);
CREATE POLICY "System can insert notifications" ON public.notification_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Users can add helpful votes" ON public.review_helpful_votes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create feedback for their treatment plans" ON public.treatment_plan_feedback FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create own challenges" ON public.accountability_challenges FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create own challenges" ON public.user_challenges FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create own reflections" ON public.weekly_reflections FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create own treatment plans" ON public.treatment_plans FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create own treatment preferences" ON public.user_treatment_preferences FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create services for their treatment plans" ON public.treatment_plan_services FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.treatment_plans
  WHERE ((treatment_plans.id = treatment_plan_services.treatment_plan_id) AND (treatment_plans.user_id = auth.uid())))));
CREATE POLICY "Users can create their own engagement events" ON public.engagement_events FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create their own recommendation outcomes" ON public.recommendation_outcomes FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can create their own reviews" ON public.provider_reviews FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own activity data" ON public.oura_activity FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own calendar events" ON public.google_calendar_events FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own calendar tokens" ON public.google_calendar_tokens FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own cardiovascular age data" ON public.oura_cardiovascular_age FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own challenges" ON public.accountability_challenges FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own challenges" ON public.user_challenges FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own injury profiles" ON public.user_injury_profiles FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own polar tokens" ON public.polar_tokens FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own readiness data" ON public.oura_readiness FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own resilience data" ON public.oura_resilience FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own rest mode data" ON public.oura_rest_mode FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own ring config" ON public.oura_ring_config FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own sleep data" ON public.oura_sleep FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own spo2 data" ON public.oura_spo2 FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own stress data" ON public.oura_stress FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own treatment plans" ON public.treatment_plans FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own vo2max data" ON public.oura_vo2max FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own workout data" ON public.oura_workout FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete their own documents" ON public.user_documents FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own insight history" ON public.insight_history FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own memory entries" ON public.yves_memory_bank FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own model entries" ON public.user_model FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own predictions" ON public.prediction_log FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own reviews" ON public.provider_reviews FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own terra connections" ON public.terra_connections FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own yves memory" ON public.yves_memory_bank FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own activity data" ON public.oura_activity FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own calendar events" ON public.google_calendar_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own calendar tokens" ON public.google_calendar_tokens FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own cardiovascular age data" ON public.oura_cardiovascular_age FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own context" ON public.user_context FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own focus preferences" ON public.user_focus_preferences FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own injury profiles" ON public.user_injury_profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
