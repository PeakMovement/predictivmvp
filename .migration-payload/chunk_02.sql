SET check_function_bodies = false;
CREATE TABLE public.user_adaptation_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preferred_categories jsonb DEFAULT '{}'::jsonb,
    optimal_timing jsonb DEFAULT '{}'::jsonb,
    effective_tone text DEFAULT 'balanced'::text,
    follow_through_rate numeric DEFAULT 0,
    avg_response_time_hours numeric,
    threshold_adjustments jsonb DEFAULT '{}'::jsonb,
    last_adapted timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_adaptation_profile_effective_tone_check CHECK ((effective_tone = ANY (ARRAY['supportive'::text, 'coach'::text, 'clinical'::text, 'balanced'::text]))),
    CONSTRAINT user_adaptation_profile_follow_through_rate_check CHECK (((follow_through_rate >= (0)::numeric) AND (follow_through_rate <= (100)::numeric)))
);
CREATE TABLE public.user_baselines (
    data_window numeric NOT NULL,
    deviation_threshold numeric,
    metric text NOT NULL,
    rolling_avg numeric NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL
);
CREATE TABLE public.user_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    challenge_title text NOT NULL,
    challenge_description text,
    challenge_type text NOT NULL,
    target_value numeric,
    current_progress numeric DEFAULT 0,
    accepted_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    week_start_date date NOT NULL,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_challenges_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text])))
);
CREATE TABLE public.user_context (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile jsonb DEFAULT '{}'::jsonb,
    preferences jsonb DEFAULT '{}'::jsonb,
    injuries jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_context_enhanced (
    user_id uuid NOT NULL,
    nutrition_profile jsonb DEFAULT '{}'::jsonb,
    medical_profile jsonb DEFAULT '{}'::jsonb,
    training_profile jsonb DEFAULT '{}'::jsonb,
    last_updated timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_data_maturity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    maturity_level text DEFAULT 'insufficient'::text NOT NULL,
    maturity_score integer DEFAULT 0 NOT NULL,
    data_days integer DEFAULT 0 NOT NULL,
    profile_completeness integer DEFAULT 0 NOT NULL,
    wearable_connected boolean DEFAULT false NOT NULL,
    documents_count integer DEFAULT 0 NOT NULL,
    symptom_checkins_count integer DEFAULT 0 NOT NULL,
    last_calculated timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_data_maturity_maturity_level_check CHECK ((maturity_level = ANY (ARRAY['insufficient'::text, 'emerging'::text, 'established'::text, 'mature'::text]))),
    CONSTRAINT user_data_maturity_maturity_score_check CHECK (((maturity_score >= 0) AND (maturity_score <= 100))),
    CONSTRAINT user_data_maturity_profile_completeness_check CHECK (((profile_completeness >= 0) AND (profile_completeness <= 100)))
);
CREATE TABLE public.user_deviations (
    baseline_value numeric,
    created_at timestamp with time zone DEFAULT now(),
    current_value numeric,
    date date,
    deviation numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric text NOT NULL,
    risk_zone text,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid
);
CREATE TABLE public.user_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    document_type text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now(),
    parsed_content jsonb,
    ai_summary text,
    tags text[],
    processing_status text DEFAULT 'pending'::text,
    version integer DEFAULT 1 NOT NULL,
    is_latest boolean DEFAULT true NOT NULL,
    parent_document_id uuid,
    version_notes text,
    CONSTRAINT user_documents_document_type_check CHECK ((document_type = ANY (ARRAY['nutrition'::text, 'medical'::text, 'training'::text]))),
    CONSTRAINT user_documents_processing_status_check CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);
CREATE TABLE public.user_focus_preferences (
    user_id uuid NOT NULL,
    focus_mode text DEFAULT 'balance'::text NOT NULL,
    custom_emphasis jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_focus_mode CHECK ((focus_mode = ANY (ARRAY['recovery'::text, 'performance'::text, 'pain_management'::text, 'balance'::text, 'custom'::text])))
);
CREATE TABLE public.user_health_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    ai_synthesis text,
    generated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1
);
CREATE TABLE public.user_injuries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    injuries text[] DEFAULT '{}'::text[],
    injury_details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_injury_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    injury_type public.injury_type_enum NOT NULL,
    body_location text NOT NULL,
    injury_date date NOT NULL,
    surgery_date date,
    treating_practitioner_name text,
    treating_practitioner_type public.practitioner_type_enum,
    load_restrictions text,
    clearance_milestones jsonb DEFAULT '[]'::jsonb NOT NULL,
    target_return_date date,
    current_phase public.injury_phase_enum DEFAULT 'acute'::public.injury_phase_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    severity smallint,
    notes text,
    CONSTRAINT user_injury_profiles_severity_check CHECK (((severity >= 1) AND (severity <= 5)))
);
CREATE TABLE public.user_insight_actions (
    acknowledged_at timestamp with time zone,
    action_taken text,
    feedback_score numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insight text,
    metric text NOT NULL,
    suggestion text,
    user_id uuid
);
CREATE VIEW public.user_insights_view WITH (security_invoker='true') AS
 SELECT metric,
    deviation_pct,
    risk_status,
    recommendation AS insight,
    adaptive_suggestion AS suggestion,
    updated_at
   FROM public.adaptive_recommendations ar
  WHERE (user_id = auth.uid());
CREATE TABLE public.user_interests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    hobbies text[] DEFAULT '{}'::text[],
    interests text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    preferred_activities text[] DEFAULT '{}'::text[],
    excluded_activities text[] DEFAULT '{}'::text[],
    equipment_access text[] DEFAULT '{}'::text[],
    available_minutes integer,
    collected_at timestamp with time zone,
    collection_method text,
    CONSTRAINT user_interests_collection_method_check CHECK ((collection_method = ANY (ARRAY['onboarding'::text, 'briefing_question'::text, 'chat_inferred'::text])))
);
CREATE TABLE public.user_life_formula (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    formula_id text NOT NULL,
    formula_name text NOT NULL,
    score numeric,
    rank integer,
    status text NOT NULL,
    device_source text,
    assigned_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_life_formula_status_check CHECK ((status = ANY (ARRAY['active'::text, 'unavailable'::text])))
);
CREATE TABLE public.user_lifestyle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    daily_routine text,
    work_schedule text,
    stress_level text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_medical (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    conditions text[] DEFAULT '{}'::text[],
    medications text[] DEFAULT '{}'::text[],
    medical_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_mindset (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    motivation_factors text[] DEFAULT '{}'::text[],
    mental_health_focus text,
    stress_management text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_model (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    confidence numeric DEFAULT 1.0,
    source text NOT NULL,
    device_source text,
    first_detected timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_model_category_check CHECK ((category = ANY (ARRAY['pattern'::text, 'preference'::text, 'event'::text, 'injury'::text, 'prediction'::text, 'goal'::text]))),
    CONSTRAINT user_model_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT user_model_device_source_check CHECK ((device_source = ANY (ARRAY['oura'::text, 'garmin'::text, 'polar'::text, 'yves'::text, NULL::text]))),
    CONSTRAINT user_model_source_check CHECK ((source = ANY (ARRAY['weekly_analysis'::text, 'user_reported'::text, 'briefing_feedback'::text, 'onboarding'::text])))
);
CREATE TABLE public.user_nutrition (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    diet_type text,
    allergies text[] DEFAULT '{}'::text[],
    eating_pattern text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_profile (
    activity_level text,
    conditions text[],
    created_at timestamp with time zone DEFAULT now(),
    dob text,
    gender text,
    goals text[],
    injuries text[],
    name text,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL
);
CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    onboarding_completed boolean DEFAULT false,
    onboarding_skipped boolean DEFAULT false,
    onboarding_step integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    full_name text,
    avatar_url text,
    phone_number text,
    bio text,
    sport text,
    "position" text,
    date_of_birth date,
    experience_level text,
    weekly_training_hours numeric,
    primary_goal text,
    briefing_enabled boolean DEFAULT true NOT NULL,
    briefing_time text DEFAULT '07:00'::text NOT NULL,
    alert_notifications_enabled boolean DEFAULT true NOT NULL,
    weekly_summary_enabled boolean DEFAULT true NOT NULL,
    gender text
);
CREATE TABLE public.user_recovery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sleep_hours numeric,
    sleep_quality text,
    recovery_methods text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);
CREATE TABLE public.user_shown_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pattern_id text NOT NULL,
    pattern_text text NOT NULL,
    shown_at timestamp with time zone DEFAULT now() NOT NULL,
    category text NOT NULL,
    tone text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_shown_patterns_category_check CHECK ((category = ANY (ARRAY['training'::text, 'recovery'::text, 'sleep'::text, 'stress'::text, 'symptoms'::text]))),
    CONSTRAINT user_shown_patterns_tone_check CHECK ((tone = ANY (ARRAY['coach'::text, 'warm'::text])))
);
CREATE TABLE public.user_training (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preferred_activities text[] DEFAULT '{}'::text[],
    training_frequency text,
    intensity_preference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    equipment_access text[]
);
CREATE TABLE public.user_treatment_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preferred_location text,
    max_budget_monthly integer,
    prefer_online boolean DEFAULT false,
    preferred_gender text,
    medical_aid_provider text,
    chronic_conditions text[] DEFAULT '{}'::text[],
    allergies text[] DEFAULT '{}'::text[],
    current_medications text[] DEFAULT '{}'::text[],
    preferred_languages text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_treatment_preferences_preferred_gender_check CHECK ((preferred_gender = ANY (ARRAY['male'::text, 'female'::text, 'no-preference'::text])))
);
CREATE TABLE public.user_wellness_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goals text[] DEFAULT '{}'::text[],
    target_date date,
    priority text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.users (
    connected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    email text,
    email_preferences jsonb DEFAULT '{"riskAlerts": true, "dailySummary": true, "weeklySummary": true, "aiCoachRecommendations": true}'::jsonb,
    fitbit_connected boolean,
    fitbit_user_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refresh_token text
);
CREATE TABLE public.wearable_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source text NOT NULL,
    date date NOT NULL,
    sleep_score numeric,
    readiness_score numeric,
    activity_score numeric,
    total_steps integer,
    total_calories integer,
    resting_hr numeric,
    hrv_avg numeric,
    spo2_avg numeric,
    fetched_at timestamp with time zone DEFAULT now(),
    training_load numeric,
    sport_type text,
    device_model text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    duration_seconds integer,
    sleep_continuity_score numeric,
    sleep_stages jsonb,
    avg_hr_bpm integer,
    max_hr_bpm integer,
    distance_meters numeric,
    calories integer,
    updated_at timestamp with time zone DEFAULT now(),
    active_calories integer,
    total_sleep_duration numeric,
    deep_sleep_duration numeric,
    rem_sleep_duration numeric,
    light_sleep_duration numeric,
    sleep_efficiency numeric,
    total_distance_km numeric,
    running_distance_km numeric,
    body_battery_start smallint,
    body_battery_end smallint,
    body_battery_min smallint,
    body_battery_max smallint,
    stress_avg numeric(5,1),
    stress_max numeric(5,1),
    vo2_max numeric(5,1),
    training_status text,
    respiration_rate_avg numeric(5,2),
    intensity_minutes_moderate smallint,
    intensity_minutes_vigorous smallint,
    session_type text,
    avg_heart_rate numeric(6,1),
    max_heart_rate numeric(6,1),
    duration_minutes integer,
    temperature_deviation numeric(5,2),
    temperature_trend_deviation numeric(5,2),
    CONSTRAINT wearable_sessions_source_check CHECK ((source = ANY (ARRAY['oura'::text, 'fitbit'::text, 'manual'::text, 'polar'::text])))
);
CREATE TABLE public.wearable_summary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    strain numeric,
    monotony numeric,
    acwr numeric,
    readiness_index numeric,
    source text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    avg_sleep_score numeric
);
CREATE TABLE public.weekly_reflections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start_date date NOT NULL,
    week_end_date date NOT NULL,
    rating integer NOT NULL,
    notes text,
    highlights text,
    challenges text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT weekly_reflections_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);
CREATE TABLE public.yves_feedback (
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    feedback text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recommendation_id uuid,
    user_id uuid
);
CREATE TABLE public.yves_memory_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    memory_key text NOT NULL,
    memory_value jsonb NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.yves_profiles (
    baseline_value numeric NOT NULL,
    current_value numeric NOT NULL,
    deviation_pct numeric NOT NULL,
    metric text NOT NULL,
    reasoning text,
    risk_status text,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL
);
CREATE TABLE public.yves_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    recommendation_text text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'medium'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_at timestamp with time zone,
    feedback_score integer,
    source text DEFAULT 'document_analysis'::text,
    confidence numeric,
    internal_reasoning text,
    data_sources text[],
    confidence_breakdown jsonb,
    CONSTRAINT yves_recommendations_category_check CHECK ((category = ANY (ARRAY['training'::text, 'recovery'::text, 'nutrition'::text, 'medical'::text, 'general'::text]))),
    CONSTRAINT yves_recommendations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (100)::numeric))),
    CONSTRAINT yves_recommendations_feedback_score_check CHECK ((feedback_score = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT yves_recommendations_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);
CREATE VIEW public.yves_timeline_view WITH (security_invoker='true') AS
 SELECT ar.user_id,
    ar.metric,
    ub.rolling_avg AS baseline_value,
    ud.current_value,
    ud.deviation,
    ar.recommendation,
    ar.generated_at
   FROM ((public.adaptive_recommendations ar
     LEFT JOIN public.user_baselines ub ON (((ub.user_id = ar.user_id) AND (ub.metric = ar.metric))))
     LEFT JOIN public.user_deviations ud ON (((ud.user_id = ar.user_id) AND (ud.metric = ar.metric))))
  WHERE (ar.user_id = auth.uid());
ALTER TABLE ONLY public.fitbit_auto_data ALTER COLUMN id SET DEFAULT nextval('public.fitbit_auto_data_id_seq1'::regclass);
ALTER TABLE ONLY public.wearable_auto_data ALTER COLUMN id SET DEFAULT nextval('public.fitbit_auto_data_id_seq'::regclass);
ALTER TABLE ONLY public."Bookings"
    ADD CONSTRAINT "Bookings_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."Wearables"
    ADD CONSTRAINT "Wearables_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.accountability_challenges
    ADD CONSTRAINT accountability_challenges_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.activity_trends
    ADD CONSTRAINT activity_trends_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.activity_trends
    ADD CONSTRAINT activity_trends_user_id_period_date_key UNIQUE (user_id, period_date);
ALTER TABLE ONLY public.adaptive_recommendations
    ADD CONSTRAINT adaptive_recommendations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alert_history
    ADD CONSTRAINT alert_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.baseline_profiles
    ADD CONSTRAINT baseline_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.baseline_profiles
    ADD CONSTRAINT baseline_profiles_user_id_date_device_source_key UNIQUE (user_id, date, device_source);
ALTER TABLE ONLY public.csv_uploads
    ADD CONSTRAINT csv_uploads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_briefings
    ADD CONSTRAINT daily_briefings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_insights
    ADD CONSTRAINT document_insights_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_processing_log
    ADD CONSTRAINT document_processing_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_version_number_key UNIQUE (document_id, version_number);
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.engagement_events
    ADD CONSTRAINT engagement_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.escalation_log
    ADD CONSTRAINT escalation_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wearable_auto_data
    ADD CONSTRAINT fitbit_auto_data_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fitbit_auto_data
    ADD CONSTRAINT fitbit_auto_data_pkey1 PRIMARY KEY (id);
ALTER TABLE ONLY public.fitbit_tokens
    ADD CONSTRAINT fitbit_tokens_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.fitbit_trends
    ADD CONSTRAINT fitbit_trends_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fitbit_trends
    ADD CONSTRAINT fitbit_trends_user_id_date_key UNIQUE (user_id, date);
ALTER TABLE ONLY public.function_execution_log
    ADD CONSTRAINT function_execution_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.garmin_oauth_state
    ADD CONSTRAINT garmin_oauth_state_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.garmin_oauth_state
    ADD CONSTRAINT garmin_oauth_state_state_key UNIQUE (state);
ALTER TABLE ONLY public.google_calendar_events
    ADD CONSTRAINT google_calendar_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.google_calendar_events
    ADD CONSTRAINT google_calendar_events_user_id_google_event_id_key UNIQUE (user_id, google_event_id);
ALTER TABLE ONLY public.google_calendar_sync_logs
    ADD CONSTRAINT google_calendar_sync_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.health_anomalies
    ADD CONSTRAINT health_anomalies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.health_daily
    ADD CONSTRAINT health_daily_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.health_trends_daily
    ADD CONSTRAINT health_trends_daily_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.health_trends_daily
    ADD CONSTRAINT health_trends_daily_user_id_period_date_metric_name_key UNIQUE (user_id, period_date, metric_name);
ALTER TABLE ONLY public.health_trends_weekly
    ADD CONSTRAINT health_trends_weekly_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.health_trends_weekly
    ADD CONSTRAINT health_trends_weekly_user_id_period_start_metric_name_key UNIQUE (user_id, period_start, metric_name);
ALTER TABLE ONLY public.healthcare_practitioners
    ADD CONSTRAINT healthcare_practitioners_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.insight_feedback
    ADD CONSTRAINT insight_feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.insight_history
    ADD CONSTRAINT insight_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medical_finder_sessions
    ADD CONSTRAINT medical_finder_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.onboarding_signals
    ADD CONSTRAINT onboarding_signals_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.oura_activity
    ADD CONSTRAINT oura_activity_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_cardiovascular_age
    ADD CONSTRAINT oura_cardiovascular_age_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_logs
    ADD CONSTRAINT oura_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_readiness
    ADD CONSTRAINT oura_readiness_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_resilience
    ADD CONSTRAINT oura_resilience_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_rest_mode
    ADD CONSTRAINT oura_rest_mode_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_ring_config
    ADD CONSTRAINT oura_ring_config_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_sleep
    ADD CONSTRAINT oura_sleep_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_spo2
    ADD CONSTRAINT oura_spo2_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_stress
    ADD CONSTRAINT oura_stress_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_vo2max
    ADD CONSTRAINT oura_vo2max_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.oura_workout
    ADD CONSTRAINT oura_workout_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.physicians
    ADD CONSTRAINT physicians_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.plan_adherence
    ADD CONSTRAINT plan_adherence_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.polar_logs
    ADD CONSTRAINT polar_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.polar_tokens
    ADD CONSTRAINT polar_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.polar_tokens
    ADD CONSTRAINT polar_tokens_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.polar_webhooks
    ADD CONSTRAINT polar_webhooks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.polar_webhooks
    ADD CONSTRAINT polar_webhooks_webhook_id_key UNIQUE (webhook_id);
ALTER TABLE ONLY public.practitioner_access
    ADD CONSTRAINT practitioner_access_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.practitioner_bookings
    ADD CONSTRAINT practitioner_bookings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.practitioner_specialties
    ADD CONSTRAINT practitioner_specialties_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.practitioner_specialties
    ADD CONSTRAINT practitioner_specialties_practitioner_id_service_category_i_key UNIQUE (practitioner_id, service_category_id);
ALTER TABLE ONLY public.practitioners
    ADD CONSTRAINT practitioners_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.practitioners
    ADD CONSTRAINT practitioners_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.prediction_log
    ADD CONSTRAINT prediction_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.prediction_log
    ADD CONSTRAINT prediction_log_user_id_date_flag_type_key UNIQUE (user_id, date, flag_type);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
