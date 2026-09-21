SET check_function_bodies = false;
ALTER TABLE ONLY public.prompt_history
    ADD CONSTRAINT prompt_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.provider_reviews
    ADD CONSTRAINT provider_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.provider_reviews
    ADD CONSTRAINT provider_reviews_user_id_physician_id_key UNIQUE (user_id, physician_id);
ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_key_key UNIQUE (key);
ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.recommendation_outcomes
    ADD CONSTRAINT recommendation_outcomes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.recovery_trends
    ADD CONSTRAINT recovery_trends_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.recovery_trends
    ADD CONSTRAINT recovery_trends_user_id_period_date_key UNIQUE (user_id, period_date);
ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_review_id_user_id_key UNIQUE (review_id, user_id);
ALTER TABLE ONLY public.risk_alert_dismissals
    ADD CONSTRAINT risk_alert_dismissals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.risk_alert_dismissals
    ADD CONSTRAINT risk_alert_dismissals_user_id_alert_key_key UNIQUE (user_id, alert_key);
ALTER TABLE ONLY public.risk_score_history
    ADD CONSTRAINT risk_score_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.risk_score_history
    ADD CONSTRAINT risk_score_history_user_id_calculated_at_key UNIQUE (user_id, calculated_at);
ALTER TABLE ONLY public.risk_trajectories
    ADD CONSTRAINT risk_trajectories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.risk_trajectories
    ADD CONSTRAINT risk_trajectories_user_id_metric_calculation_date_key UNIQUE (user_id, metric, calculation_date);
ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_name_key UNIQUE (name);
ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.symptom_check_ins
    ADD CONSTRAINT symptom_check_ins_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_health_log
    ADD CONSTRAINT sync_health_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_retry_queue
    ADD CONSTRAINT sync_retry_queue_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.terra_connections
    ADD CONSTRAINT terra_connections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.training_trends
    ADD CONSTRAINT training_trends_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.training_trends
    ADD CONSTRAINT training_trends_user_source_date_key UNIQUE (user_id, source, date);
ALTER TABLE ONLY public.treatment_plan_feedback
    ADD CONSTRAINT treatment_plan_feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.treatment_plan_services
    ADD CONSTRAINT treatment_plan_services_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.triage_results
    ADD CONSTRAINT triage_results_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_briefings
    ADD CONSTRAINT uq_daily_briefings_per_day UNIQUE (user_id, date, category, focus_mode);
ALTER TABLE ONLY public.user_adaptation_profile
    ADD CONSTRAINT user_adaptation_profile_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_adaptation_profile
    ADD CONSTRAINT user_adaptation_profile_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_baselines
    ADD CONSTRAINT user_baselines_user_metric_unique UNIQUE (user_id, metric);
ALTER TABLE ONLY public.user_challenges
    ADD CONSTRAINT user_challenges_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_context_enhanced
    ADD CONSTRAINT user_context_enhanced_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.user_context
    ADD CONSTRAINT user_context_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_context
    ADD CONSTRAINT user_context_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_data_maturity
    ADD CONSTRAINT user_data_maturity_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_data_maturity
    ADD CONSTRAINT user_data_maturity_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_deviations
    ADD CONSTRAINT user_deviations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_focus_preferences
    ADD CONSTRAINT user_focus_preferences_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.user_health_profiles
    ADD CONSTRAINT user_health_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_injuries
    ADD CONSTRAINT user_injuries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_injuries
    ADD CONSTRAINT user_injuries_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_injury_profiles
    ADD CONSTRAINT user_injury_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_insight_actions
    ADD CONSTRAINT user_insight_actions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_life_formula
    ADD CONSTRAINT user_life_formula_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_life_formula
    ADD CONSTRAINT user_life_formula_user_id_formula_id_key UNIQUE (user_id, formula_id);
ALTER TABLE ONLY public.user_lifestyle
    ADD CONSTRAINT user_lifestyle_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_lifestyle
    ADD CONSTRAINT user_lifestyle_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_medical
    ADD CONSTRAINT user_medical_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_medical
    ADD CONSTRAINT user_medical_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_mindset
    ADD CONSTRAINT user_mindset_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_mindset
    ADD CONSTRAINT user_mindset_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_model
    ADD CONSTRAINT user_model_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_model
    ADD CONSTRAINT user_model_user_id_category_key_key UNIQUE (user_id, category, key);
ALTER TABLE ONLY public.user_nutrition
    ADD CONSTRAINT user_nutrition_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_nutrition
    ADD CONSTRAINT user_nutrition_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_recovery
    ADD CONSTRAINT user_recovery_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_recovery
    ADD CONSTRAINT user_recovery_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE ONLY public.user_shown_patterns
    ADD CONSTRAINT user_shown_patterns_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_training
    ADD CONSTRAINT user_training_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_training
    ADD CONSTRAINT user_training_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_treatment_preferences
    ADD CONSTRAINT user_treatment_preferences_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_treatment_preferences
    ADD CONSTRAINT user_treatment_preferences_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_wellness_goals
    ADD CONSTRAINT user_wellness_goals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_wellness_goals
    ADD CONSTRAINT user_wellness_goals_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wearable_sessions
    ADD CONSTRAINT wearable_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wearable_sessions
    ADD CONSTRAINT wearable_sessions_user_id_source_date_key UNIQUE (user_id, source, date);
ALTER TABLE ONLY public.wearable_summary
    ADD CONSTRAINT wearable_summary_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wearable_summary
    ADD CONSTRAINT wearable_summary_user_id_source_date_key UNIQUE (user_id, source, date);
ALTER TABLE ONLY public.wearable_tokens
    ADD CONSTRAINT wearable_tokens_pkey PRIMARY KEY (user_id, scope);
ALTER TABLE ONLY public.weekly_reflections
    ADD CONSTRAINT weekly_reflections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.weekly_reflections
    ADD CONSTRAINT weekly_reflections_user_id_week_start_date_key UNIQUE (user_id, week_start_date);
ALTER TABLE ONLY public.yves_feedback
    ADD CONSTRAINT yves_feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.yves_memory_bank
    ADD CONSTRAINT yves_memory_bank_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.yves_memory_bank
    ADD CONSTRAINT yves_memory_bank_user_key_unique UNIQUE (user_id, memory_key);
ALTER TABLE ONLY public.yves_recommendations
    ADD CONSTRAINT yves_recommendations_pkey PRIMARY KEY (id);
CREATE INDEX idx_accountability_challenges_end_date ON public.accountability_challenges USING btree (end_date);
CREATE INDEX idx_accountability_challenges_status ON public.accountability_challenges USING btree (status);
CREATE INDEX idx_accountability_challenges_user_id ON public.accountability_challenges USING btree (user_id);
CREATE INDEX idx_activity_trends_user_date ON public.activity_trends USING btree (user_id, period_date);
CREATE INDEX idx_alert_history_severity ON public.alert_history USING btree (severity, created_at DESC) WHERE (status = 'active'::text);
CREATE INDEX idx_alert_history_status ON public.alert_history USING btree (user_id, status, created_at DESC);
CREATE INDEX idx_alert_history_user_created ON public.alert_history USING btree (user_id, created_at DESC);
CREATE INDEX idx_alert_settings_user ON public.alert_settings USING btree (user_id);
CREATE INDEX idx_anomalies_severity ON public.health_anomalies USING btree (severity, detected_at DESC) WHERE (acknowledged_at IS NULL);
CREATE INDEX idx_anomalies_user_detected ON public.health_anomalies USING btree (user_id, detected_at DESC);
CREATE INDEX idx_baseline_profiles_user_date ON public.baseline_profiles USING btree (user_id, date DESC);
CREATE INDEX idx_bookings_calendly_event_id ON public."Bookings" USING btree (calendly_event_id) WHERE (calendly_event_id IS NOT NULL);
CREATE INDEX idx_bookings_patient ON public.practitioner_bookings USING btree (patient_user_id);
CREATE INDEX idx_bookings_practitioner ON public.practitioner_bookings USING btree (practitioner_id);
CREATE INDEX idx_bookings_source ON public."Bookings" USING btree (source);
CREATE INDEX idx_daily_briefings_focus_mode ON public.daily_briefings USING btree (user_id, focus_mode, date);
CREATE INDEX idx_daily_briefings_latest ON public.daily_briefings USING btree (user_id, date DESC, focus_mode, created_at DESC);
CREATE INDEX idx_daily_briefings_user_date ON public.daily_briefings USING btree (user_id, date DESC);
CREATE INDEX idx_document_insights_document_id ON public.document_insights USING btree (document_id);
CREATE INDEX idx_document_insights_user_id ON public.document_insights USING btree (user_id);
CREATE INDEX idx_document_processing_log_user_doc ON public.document_processing_log USING btree (user_id, document_id);
CREATE INDEX idx_document_versions_created_at ON public.document_versions USING btree (created_at DESC);
CREATE INDEX idx_document_versions_document_id ON public.document_versions USING btree (document_id);
CREATE INDEX idx_document_versions_user_id ON public.document_versions USING btree (user_id);
CREATE INDEX idx_engagement_events_type ON public.engagement_events USING btree (event_type, created_at DESC);
CREATE INDEX idx_engagement_events_user ON public.engagement_events USING btree (user_id, created_at DESC);
CREATE INDEX idx_escalation_log_user ON public.escalation_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_fitbit_auto_data_fetched_at ON public.wearable_auto_data USING btree (fetched_at DESC);
CREATE INDEX idx_fitbit_auto_data_user_id ON public.wearable_auto_data USING btree (user_id);
CREATE INDEX idx_fitbit_trends_date ON public.fitbit_trends USING btree (date DESC);
CREATE INDEX idx_fitbit_trends_user_date ON public.fitbit_trends USING btree (user_id, date DESC);
CREATE INDEX idx_fitbit_trends_user_id ON public.fitbit_trends USING btree (user_id);
CREATE INDEX idx_garmin_oauth_state_state ON public.garmin_oauth_state USING btree (state);
CREATE INDEX idx_google_calendar_events_google_event_id ON public.google_calendar_events USING btree (google_event_id);
CREATE INDEX idx_google_calendar_events_start_time ON public.google_calendar_events USING btree (start_time);
CREATE INDEX idx_google_calendar_events_user_id ON public.google_calendar_events USING btree (user_id);
CREATE INDEX idx_google_calendar_sync_logs_created_at ON public.google_calendar_sync_logs USING btree (created_at DESC);
CREATE INDEX idx_google_calendar_sync_logs_user_id ON public.google_calendar_sync_logs USING btree (user_id);
CREATE INDEX idx_google_calendar_tokens_user_id ON public.google_calendar_tokens USING btree (user_id);
CREATE INDEX idx_health_trends_daily_user_date ON public.health_trends_daily USING btree (user_id, period_date);
CREATE INDEX idx_health_trends_weekly_user_period ON public.health_trends_weekly USING btree (user_id, period_start);
CREATE INDEX idx_helpful_votes_review_id ON public.review_helpful_votes USING btree (review_id);
CREATE INDEX idx_helpful_votes_user_id ON public.review_helpful_votes USING btree (user_id);
CREATE INDEX idx_insight_history_created_at ON public.insight_history USING btree (created_at DESC);
CREATE INDEX idx_insight_history_user_created ON public.insight_history USING btree (user_id, created_at DESC);
CREATE INDEX idx_insight_history_user_id ON public.insight_history USING btree (user_id);
CREATE INDEX idx_medical_finder_sessions_user_status ON public.medical_finder_sessions USING btree (user_id, status);
CREATE INDEX idx_notification_log_created_at ON public.notification_log USING btree (created_at DESC);
CREATE INDEX idx_notification_log_recipient ON public.notification_log USING btree (recipient);
CREATE UNIQUE INDEX idx_one_active_session_per_user ON public.medical_finder_sessions USING btree (user_id) WHERE (status = 'active'::text);
CREATE INDEX idx_oura_activity_user_day ON public.oura_activity USING btree (user_id, day DESC);
CREATE INDEX idx_oura_cardiovascular_age_user_day ON public.oura_cardiovascular_age USING btree (user_id, day DESC);
CREATE INDEX idx_oura_logs_created_at ON public.oura_logs USING btree (created_at DESC);
CREATE INDEX idx_oura_logs_user_id ON public.oura_logs USING btree (user_id);
CREATE INDEX idx_oura_readiness_user_day ON public.oura_readiness USING btree (user_id, day DESC);
CREATE INDEX idx_oura_resilience_user_day ON public.oura_resilience USING btree (user_id, day DESC);
CREATE INDEX idx_oura_rest_mode_user_start ON public.oura_rest_mode USING btree (user_id, start_day DESC);
CREATE INDEX idx_oura_ring_config_user ON public.oura_ring_config USING btree (user_id);
CREATE INDEX idx_oura_sleep_user_day ON public.oura_sleep USING btree (user_id, day DESC);
CREATE INDEX idx_oura_spo2_user_day ON public.oura_spo2 USING btree (user_id, day DESC);
CREATE INDEX idx_oura_stress_user_day ON public.oura_stress USING btree (user_id, day DESC);
CREATE INDEX idx_oura_vo2max_user_day ON public.oura_vo2max USING btree (user_id, day DESC);
CREATE INDEX idx_oura_workout_user_datetime ON public.oura_workout USING btree (user_id, start_datetime DESC);
CREATE INDEX idx_physicians_availability ON public.physicians USING btree (availability);
CREATE INDEX idx_physicians_location ON public.physicians USING btree (city, state);
CREATE INDEX idx_physicians_specialty ON public.physicians USING btree (specialty);
CREATE INDEX idx_polar_logs_created_at ON public.polar_logs USING btree (created_at DESC);
CREATE INDEX idx_polar_logs_event_type ON public.polar_logs USING btree (event_type);
CREATE INDEX idx_polar_logs_status ON public.polar_logs USING btree (status);
CREATE INDEX idx_polar_logs_user_id ON public.polar_logs USING btree (user_id);
CREATE INDEX idx_polar_tokens_polar_user_id ON public.polar_tokens USING btree (polar_user_id);
CREATE INDEX idx_polar_tokens_user_id ON public.polar_tokens USING btree (user_id);
CREATE INDEX idx_polar_webhooks_webhook_id ON public.polar_webhooks USING btree (webhook_id);
CREATE INDEX idx_practitioner_specialties_category ON public.practitioner_specialties USING btree (service_category_id);
CREATE INDEX idx_practitioners_city ON public.healthcare_practitioners USING btree (city);
CREATE INDEX idx_practitioners_location ON public.healthcare_practitioners USING btree (location);
CREATE INDEX idx_practitioners_specialty ON public.healthcare_practitioners USING btree (specialty);
CREATE INDEX idx_practitioners_status ON public.practitioners USING btree (profile_status);
CREATE INDEX idx_practitioners_user_id ON public.practitioners USING btree (user_id);
CREATE INDEX idx_prediction_log_pending ON public.prediction_log USING btree (user_id, actual_outcome) WHERE (actual_outcome IS NULL);
CREATE INDEX idx_prediction_log_user_date ON public.prediction_log USING btree (user_id, date DESC);
CREATE INDEX idx_profiles_memory_cleared_at ON public.profiles USING btree (memory_cleared_at) WHERE (memory_cleared_at IS NOT NULL);
CREATE INDEX idx_prompt_history_user ON public.prompt_history USING btree (user_id, created_at DESC);
CREATE INDEX idx_provider_reviews_created_at ON public.provider_reviews USING btree (created_at DESC);
CREATE INDEX idx_provider_reviews_physician_id ON public.provider_reviews USING btree (physician_id);
CREATE INDEX idx_provider_reviews_user_id ON public.provider_reviews USING btree (user_id);
CREATE INDEX idx_rate_limits_key ON public.rate_limits USING btree (key);
CREATE INDEX idx_rate_limits_reset_at ON public.rate_limits USING btree (reset_at);
CREATE INDEX idx_recommendation_outcomes_user ON public.recommendation_outcomes USING btree (user_id, created_at DESC);
CREATE INDEX idx_recovery_trends_user_date ON public.recovery_trends USING btree (user_id, period_date);
CREATE INDEX idx_retry_queue_next_retry ON public.sync_retry_queue USING btree (next_retry_at, status) WHERE (status = 'pending'::text);
CREATE INDEX idx_retry_queue_user ON public.sync_retry_queue USING btree (user_id, created_at DESC);
CREATE INDEX idx_risk_trajectories_user_date ON public.risk_trajectories USING btree (user_id, calculation_date);
CREATE INDEX idx_symptom_check_ins_created_at ON public.symptom_check_ins USING btree (created_at DESC);
CREATE INDEX idx_symptom_check_ins_user_id ON public.symptom_check_ins USING btree (user_id);
CREATE INDEX idx_sync_health_status ON public.sync_health_log USING btree (status, created_at DESC);
CREATE INDEX idx_sync_health_user_created ON public.sync_health_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_training_trends_hrv ON public.training_trends USING btree (user_id, date DESC) WHERE (hrv IS NOT NULL);
CREATE INDEX idx_training_trends_user_source_date ON public.training_trends USING btree (user_id, source, date DESC);
CREATE INDEX idx_treatment_plan_services_plan_id ON public.treatment_plan_services USING btree (treatment_plan_id);
CREATE INDEX idx_treatment_plans_created_at ON public.treatment_plans USING btree (created_at DESC);
CREATE INDEX idx_treatment_plans_user_id ON public.treatment_plans USING btree (user_id);
CREATE INDEX idx_triage_results_created_at ON public.triage_results USING btree (created_at DESC);
CREATE INDEX idx_triage_results_provider ON public.triage_results USING btree (recommended_provider);
CREATE INDEX idx_triage_results_user_id ON public.triage_results USING btree (user_id);
CREATE INDEX idx_user_challenges_status ON public.user_challenges USING btree (status);
CREATE INDEX idx_user_challenges_user_id ON public.user_challenges USING btree (user_id);
CREATE INDEX idx_user_challenges_week ON public.user_challenges USING btree (week_start_date);
CREATE INDEX idx_user_context_enhanced_user_id ON public.user_context_enhanced USING btree (user_id);
CREATE INDEX idx_user_data_maturity_user ON public.user_data_maturity USING btree (user_id);
CREATE INDEX idx_user_documents_type ON public.user_documents USING btree (document_type);
CREATE INDEX idx_user_documents_user_id ON public.user_documents USING btree (user_id);
CREATE INDEX idx_user_health_profiles_generated ON public.user_health_profiles USING btree (generated_at DESC);
CREATE INDEX idx_user_health_profiles_user ON public.user_health_profiles USING btree (user_id);
CREATE INDEX idx_user_injury_profiles_active ON public.user_injury_profiles USING btree (user_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_user_injury_profiles_user_id ON public.user_injury_profiles USING btree (user_id);
CREATE INDEX idx_user_life_formula_user ON public.user_life_formula USING btree (user_id, rank);
CREATE INDEX idx_user_model_user_active ON public.user_model USING btree (user_id, active, category);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);
CREATE INDEX idx_user_shown_patterns_user_pattern ON public.user_shown_patterns USING btree (user_id, pattern_id);
CREATE INDEX idx_user_shown_patterns_user_shown ON public.user_shown_patterns USING btree (user_id, shown_at DESC);
CREATE INDEX idx_wearable_sessions_date_only ON public.wearable_sessions USING btree (date DESC);
CREATE INDEX idx_wearable_sessions_hrv_hr ON public.wearable_sessions USING btree (user_id, date DESC) WHERE ((hrv_avg IS NOT NULL) OR (resting_hr IS NOT NULL));
CREATE INDEX idx_wearable_sessions_source ON public.wearable_sessions USING btree (source);
CREATE INDEX idx_wearable_sessions_start_time ON public.wearable_sessions USING btree (user_id, start_time DESC);
CREATE INDEX idx_wearable_sessions_user_date ON public.wearable_sessions USING btree (user_id, date DESC);
CREATE INDEX idx_wearable_summary_source ON public.wearable_summary USING btree (source);
CREATE INDEX idx_wearable_summary_user_date ON public.wearable_summary USING btree (user_id, date DESC);
CREATE INDEX idx_wearable_tokens_provider_user_id ON public.wearable_tokens USING btree (provider_user_id, scope) WHERE (provider_user_id IS NOT NULL);
CREATE INDEX idx_weekly_reflections_user_id ON public.weekly_reflections USING btree (user_id);
CREATE INDEX idx_weekly_reflections_week ON public.weekly_reflections USING btree (week_start_date);
CREATE INDEX idx_yves_memory_bank_user_key ON public.yves_memory_bank USING btree (user_id, memory_key);
CREATE INDEX idx_yves_recommendations_user_created ON public.yves_recommendations USING btree (user_id, created_at DESC);
CREATE INDEX practitioner_access_email_idx ON public.practitioner_access USING btree (practitioner_email);
CREATE INDEX practitioner_access_patient_idx ON public.practitioner_access USING btree (patient_id);
CREATE INDEX practitioner_access_practitioner_idx ON public.practitioner_access USING btree (practitioner_id);
CREATE UNIQUE INDEX practitioner_access_unique_active ON public.practitioner_access USING btree (practitioner_email, patient_id) WHERE (is_active = true);
CREATE INDEX risk_score_history_user_date_idx ON public.risk_score_history USING btree (user_id, calculated_at DESC);
CREATE TRIGGER document_version_trigger BEFORE UPDATE ON public.user_documents FOR EACH ROW EXECUTE FUNCTION public.create_document_version_snapshot();
CREATE TRIGGER injury_profiles_updated_at BEFORE UPDATE ON public.user_injury_profiles FOR EACH ROW EXECUTE FUNCTION public.update_injury_profile_updated_at();
CREATE TRIGGER physicians_updated_at BEFORE UPDATE ON public.physicians FOR EACH ROW EXECUTE FUNCTION public.update_physicians_updated_at();
CREATE TRIGGER practitioners_updated_at BEFORE UPDATE ON public.healthcare_practitioners FOR EACH ROW EXECUTE FUNCTION public.update_treatment_plan_updated_at();
CREATE TRIGGER provider_reviews_updated_at BEFORE UPDATE ON public.provider_reviews FOR EACH ROW EXECUTE FUNCTION public.update_provider_reviews_updated_at();
CREATE TRIGGER set_focus_preferences_updated_at BEFORE UPDATE ON public.user_focus_preferences FOR EACH ROW EXECUTE FUNCTION public.update_focus_preferences_updated_at();
CREATE TRIGGER set_symptom_check_ins_updated_at BEFORE UPDATE ON public.symptom_check_ins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_triage_results_updated_at BEFORE UPDATE ON public.triage_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER treatment_plans_updated_at BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.update_treatment_plan_updated_at();
CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_calendar_events_updated_at BEFORE UPDATE ON public.google_calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_calendar_tokens_updated_at BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_helpful_count_on_vote AFTER INSERT OR DELETE ON public.review_helpful_votes FOR EACH ROW EXECUTE FUNCTION public.update_review_helpful_count();
CREATE TRIGGER update_medical_finder_sessions_last_updated_at BEFORE UPDATE ON public.medical_finder_sessions FOR EACH ROW EXECUTE FUNCTION public.update_medical_finder_sessions_last_updated_at();
CREATE TRIGGER update_physician_rating_on_review AFTER INSERT OR DELETE OR UPDATE ON public.provider_reviews FOR EACH ROW EXECUTE FUNCTION public.update_physician_rating();
CREATE TRIGGER update_practitioners_updated_at BEFORE UPDATE ON public.practitioners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risk_trajectories_updated_at BEFORE UPDATE ON public.risk_trajectories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_adaptation_profile_updated_at BEFORE UPDATE ON public.user_adaptation_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_context_updated_at BEFORE UPDATE ON public.user_context FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_data_maturity_updated_at BEFORE UPDATE ON public.user_data_maturity FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE ONLY public.accountability_challenges
    ADD CONSTRAINT accountability_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.baseline_profiles
    ADD CONSTRAINT baseline_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.daily_briefings
    ADD CONSTRAINT daily_briefings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.document_insights
    ADD CONSTRAINT document_insights_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.user_documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.document_processing_log
    ADD CONSTRAINT document_processing_log_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.user_documents(id) ON DELETE CASCADE;
