SET check_function_bodies = false;
CREATE TABLE public.health_trends_weekly (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    metric_name text NOT NULL,
    value numeric,
    baseline numeric,
    delta numeric,
    week_over_week_pct numeric,
    trend_direction text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT health_trends_weekly_trend_direction_check CHECK ((trend_direction = ANY (ARRAY['increasing'::text, 'stable'::text, 'declining'::text])))
);
CREATE TABLE public.healthcare_practitioners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    title text NOT NULL,
    specialty text NOT NULL,
    location text NOT NULL,
    city text,
    province text,
    online_available boolean DEFAULT false,
    rating numeric(2,1) DEFAULT 4.5,
    years_experience integer,
    qualifications text[] DEFAULT '{}'::text[],
    languages text[] DEFAULT '{}'::text[],
    bio text,
    consultation_fee integer,
    accepts_medical_aid boolean DEFAULT true,
    available_times jsonb,
    contact_email text,
    contact_phone text,
    profile_image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    calendly_url text,
    CONSTRAINT healthcare_practitioners_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);
CREATE TABLE public.insight_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    query text NOT NULL,
    response text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    context_used text,
    provider text DEFAULT 'openai'::text,
    response_quality integer
);
CREATE VIEW public.insight_engagement_summary WITH (security_invoker='true') AS
 SELECT f.metric,
    count(DISTINCT ih.id) AS insight_count,
    count(DISTINCT f.id) AS feedback_count,
        CASE
            WHEN (count(DISTINCT ih.id) > 0) THEN round((((count(DISTINCT f.id))::numeric / (count(DISTINCT ih.id))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS engagement_rate
   FROM (public.insight_history ih
     LEFT JOIN public.feedback f ON ((f.user_id = ih.user_id)))
  GROUP BY f.metric;
CREATE TABLE public.insight_feedback (
    action_taken text,
    created_at timestamp with time zone DEFAULT now(),
    feedback_score numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insight text,
    metric text,
    user_id uuid
);
CREATE TABLE public.medical_finder_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_step text DEFAULT 'symptoms'::text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT medical_finder_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text])))
);
CREATE TABLE public.notification_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient text NOT NULL,
    message text NOT NULL,
    status text NOT NULL,
    CONSTRAINT notification_log_status_check CHECK ((status = ANY (ARRAY['delivered'::text, 'failed'::text, 'queued'::text])))
);
CREATE TABLE public.onboarding_signals (
    user_id uuid NOT NULL,
    wearable text,
    training_type text,
    stress_level integer,
    sleep_quality text,
    compliance text,
    health_goals text[] DEFAULT '{}'::text[],
    injury_history text,
    is_endurance boolean GENERATED ALWAYS AS ((training_type = 'endurance'::text)) STORED,
    is_strength boolean GENERATED ALWAYS AS ((training_type = 'strength'::text)) STORED,
    is_team_sport boolean GENERATED ALWAYS AS ((training_type = 'team'::text)) STORED,
    is_mind_body boolean GENERATED ALWAYS AS ((training_type = 'mindbody'::text)) STORED,
    is_rehab_focus boolean GENERATED ALWAYS AS ((training_type = 'rehab'::text)) STORED,
    stress_low boolean GENERATED ALWAYS AS (((stress_level IS NOT NULL) AND (stress_level <= 3))) STORED,
    stress_med boolean GENERATED ALWAYS AS (((stress_level IS NOT NULL) AND ((stress_level >= 4) AND (stress_level <= 6)))) STORED,
    stress_high boolean GENERATED ALWAYS AS (((stress_level IS NOT NULL) AND (stress_level >= 7))) STORED,
    sleep_ok boolean GENERATED ALWAYS AS ((sleep_quality = 'solid'::text)) STORED,
    sleep_poor boolean GENERATED ALWAYS AS ((sleep_quality = ANY (ARRAY['short'::text, 'disrupted'::text]))) STORED,
    sleep_variable boolean GENERATED ALWAYS AS ((sleep_quality = 'variable'::text)) STORED,
    comp_high boolean GENERATED ALWAYS AS ((compliance = 'high'::text)) STORED,
    comp_med boolean GENERATED ALWAYS AS ((compliance = 'medium'::text)) STORED,
    comp_low boolean GENERATED ALWAYS AS ((compliance = 'low'::text)) STORED,
    inj_none boolean GENERATED ALWAYS AS ((injury_history = 'none'::text)) STORED,
    inj_overuse boolean GENERATED ALWAYS AS ((injury_history = 'overuse'::text)) STORED,
    inj_acute boolean GENERATED ALWAYS AS ((injury_history = 'acute'::text)) STORED,
    inj_current boolean GENERATED ALWAYS AS ((injury_history = 'current'::text)) STORED,
    inj_recurring boolean GENERATED ALWAYS AS ((injury_history = 'multiple'::text)) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT onboarding_signals_compliance_check CHECK ((compliance = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT onboarding_signals_injury_history_check CHECK ((injury_history = ANY (ARRAY['none'::text, 'overuse'::text, 'acute'::text, 'current'::text, 'multiple'::text]))),
    CONSTRAINT onboarding_signals_sleep_quality_check CHECK ((sleep_quality = ANY (ARRAY['solid'::text, 'variable'::text, 'short'::text, 'disrupted'::text]))),
    CONSTRAINT onboarding_signals_stress_level_check CHECK (((stress_level >= 1) AND (stress_level <= 10))),
    CONSTRAINT onboarding_signals_training_type_check CHECK ((training_type = ANY (ARRAY['endurance'::text, 'strength'::text, 'team'::text, 'mindbody'::text, 'rehab'::text]))),
    CONSTRAINT onboarding_signals_wearable_check CHECK ((wearable = ANY (ARRAY['oura'::text, 'garmin'::text, 'polar'::text, 'none'::text])))
);
CREATE TABLE public.oura_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    steps integer,
    total_calories integer,
    active_calories integer,
    inactivity_time integer,
    met_min_low integer,
    met_min_high integer
);
CREATE TABLE public.oura_cardiovascular_age (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    vascular_age numeric
);
CREATE TABLE public.oura_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text NOT NULL,
    entries_synced integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.oura_readiness (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    score integer,
    contributors jsonb,
    temperature_deviation numeric,
    temperature_trend_deviation numeric
);
CREATE TABLE public.oura_resilience (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    sleep_recovery numeric,
    daytime_recovery numeric,
    stress numeric,
    level text
);
CREATE TABLE public.oura_rest_mode (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    start_day date,
    start_time timestamp with time zone,
    end_day date,
    end_time timestamp with time zone,
    episodes jsonb
);
CREATE TABLE public.oura_ring_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    color text,
    design text,
    firmware_version text,
    hardware_type text,
    setup_at timestamp with time zone,
    size integer
);
CREATE TABLE public.oura_sleep (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    total_sleep_duration integer,
    average_hrv numeric,
    average_heart_rate numeric,
    rem_sleep_duration integer,
    deep_sleep_duration integer,
    light_sleep_duration integer,
    bedtime_start timestamp with time zone,
    bedtime_end timestamp with time zone,
    efficiency numeric
);
CREATE TABLE public.oura_spo2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    spo2_percentage_avg numeric
);
CREATE TABLE public.oura_stress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    stress_high integer,
    recovery_high integer,
    day_summary text
);
CREATE TABLE public.oura_sync_log (
    data jsonb,
    date_used text,
    endpoint text,
    fetched_at timestamp with time zone,
    id numeric,
    user_id uuid
);
CREATE TABLE public.wearable_tokens (
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_type text DEFAULT 'Bearer'::text,
    expires_in integer,
    scope text DEFAULT 'oura'::text NOT NULL,
    fitbit_user_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    provider_user_id text,
    status text DEFAULT 'active'::text NOT NULL,
    access_token_encrypted text,
    encryption_version integer,
    expires_at timestamp with time zone,
    refresh_token_encrypted text,
    CONSTRAINT wearable_tokens_status_check CHECK ((status = ANY (ARRAY['active'::text, 'token_expired'::text])))
);
CREATE VIEW public.oura_tokens WITH (security_invoker='true') AS
 SELECT user_id,
    access_token,
    refresh_token,
    expires_at,
    scope,
    created_at
   FROM public.wearable_tokens
  WHERE ((user_id = auth.uid()) AND ((scope ~~* '%extapi%'::text) OR (scope = 'oura'::text)));
CREATE TABLE public.oura_vo2max (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day date NOT NULL,
    "timestamp" timestamp with time zone,
    vo2_max numeric
);
CREATE TABLE public.oura_workout (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity text,
    start_datetime timestamp with time zone,
    calories integer,
    source text,
    duration integer
);
CREATE TABLE public.physicians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    specialty text NOT NULL,
    sub_specialty text,
    location text,
    address text,
    city text,
    state text,
    zip_code text,
    phone text,
    email text,
    rating numeric(3,2) DEFAULT 0,
    cost_tier text,
    insurance_accepted text[],
    availability text,
    accepting_new_patients boolean DEFAULT true,
    years_experience integer,
    education text,
    hospital_affiliations text[],
    languages text[] DEFAULT ARRAY['English'::text],
    telehealth_available boolean DEFAULT false,
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    calendly_url text,
    review_count integer DEFAULT 0,
    CONSTRAINT physicians_availability_check CHECK ((availability = ANY (ARRAY['immediate'::text, 'same_day'::text, 'next_day'::text, 'within_week'::text, 'within_month'::text]))),
    CONSTRAINT physicians_cost_tier_check CHECK ((cost_tier = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'premium'::text])))
);
CREATE TABLE public.plan_adherence (
    actual_data jsonb,
    adherence_score numeric,
    created_at timestamp with time zone DEFAULT now(),
    date date NOT NULL,
    deviation_reasons text[],
    expected_data jsonb,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_type text,
    user_id uuid NOT NULL
);
CREATE TABLE public.polar_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text NOT NULL,
    data_type text,
    entries_synced integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    event_type text,
    details jsonb,
    CONSTRAINT polar_logs_data_type_check CHECK ((data_type = ANY (ARRAY['exercise'::text, 'sleep'::text, 'activity'::text, 'continuous_hr'::text, 'all'::text]))),
    CONSTRAINT polar_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'partial'::text])))
);
CREATE TABLE public.polar_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    polar_user_id bigint,
    member_id text,
    access_token text NOT NULL,
    scope text DEFAULT 'accesslink.read_all'::text,
    consent_error boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.polar_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id text,
    signature_secret_key text NOT NULL,
    events text[] DEFAULT ARRAY['EXERCISE'::text, 'SLEEP'::text, 'ACTIVITY_SUMMARY'::text, 'CONTINUOUS_HEART_RATE'::text] NOT NULL,
    url text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.practitioner_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    practitioner_id uuid,
    patient_id uuid NOT NULL,
    practitioner_email text NOT NULL,
    practitioner_name text,
    practitioner_type text,
    access_granted_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT practitioner_access_practitioner_type_check CHECK ((practitioner_type = ANY (ARRAY['physio'::text, 'coach'::text, 'doctor'::text, 'trainer'::text, 'other'::text])))
);
CREATE TABLE public.practitioner_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    practitioner_id uuid,
    patient_user_id uuid,
    booked_at timestamp with time zone DEFAULT now(),
    source text DEFAULT 'find_help'::text,
    status text DEFAULT 'pending'::text,
    CONSTRAINT practitioner_bookings_source_check CHECK ((source = ANY (ARRAY['find_help'::text, 'direct'::text]))),
    CONSTRAINT practitioner_bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text])))
);
CREATE TABLE public.practitioner_specialties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    practitioner_id uuid NOT NULL,
    service_category_id uuid NOT NULL,
    proficiency_level text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT practitioner_specialties_proficiency_level_check CHECK ((proficiency_level = ANY (ARRAY['expert'::text, 'experienced'::text, 'competent'::text])))
);
CREATE TABLE public.practitioners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    type text NOT NULL,
    location_city text,
    location_suburb text,
    bio text,
    specialisations text[] DEFAULT '{}'::text[],
    fee_per_session integer,
    accepts_medical_aid boolean DEFAULT false,
    telehealth_available boolean DEFAULT false,
    phone text,
    contact_email text,
    profile_status text DEFAULT 'pending_review'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT practitioners_bio_check CHECK ((char_length(bio) <= 300)),
    CONSTRAINT practitioners_profile_status_check CHECK ((profile_status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'suspended'::text])))
);
CREATE TABLE public.prediction_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    flag_type text NOT NULL,
    flag_key text,
    prediction_text text NOT NULL,
    level integer DEFAULT 2 NOT NULL,
    anomaly_score numeric,
    device_source text,
    actual_outcome text,
    outcome_notes text,
    outcome_recorded_at timestamp with time zone,
    briefing_date date,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prediction_log_actual_outcome_check CHECK ((actual_outcome = ANY (ARRAY['confirmed'::text, 'not_confirmed'::text, 'inconclusive'::text]))),
    CONSTRAINT prediction_log_level_check CHECK ((level = ANY (ARRAY[1, 2, 3])))
);
CREATE TABLE public.profiles (
    accepts_medical_aid boolean,
    address text,
    avatar_url text,
    bio text,
    city text,
    deposit_percent numeric,
    full_name text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    in_person boolean,
    layout_preferences jsonb,
    listing_active boolean,
    memory_cleared_at timestamp with time zone,
    niche_tags text[],
    practice_name text,
    pricing_tier text,
    province text,
    qualifications text[],
    registration_body text,
    registration_number text,
    requires_deposit boolean,
    role text,
    session_fee_max numeric,
    session_fee_min numeric,
    specialty text,
    suburb text,
    telehealth boolean,
    timezone text,
    tone_preference text,
    updated_at timestamp with time zone DEFAULT now(),
    username text,
    years_experience numeric
);
CREATE TABLE public.prompt_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_type text NOT NULL,
    prompt_content text,
    priority text,
    was_acted_upon boolean,
    was_helpful boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prompt_history_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT prompt_history_prompt_type_check CHECK ((prompt_type = ANY (ARRAY['daily_briefing'::text, 'recommendation'::text, 'alert'::text, 'escalation'::text])))
);
CREATE TABLE public.provider_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    physician_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    helpful_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);
CREATE TABLE public.rate_limit_state (
    is_throttled boolean,
    last_request_at timestamp with time zone,
    provider text NOT NULL,
    request_count integer,
    throttle_until text,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    window_start text
);
CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    reset_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.recommendation_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    recommendation_id uuid NOT NULL,
    outcome_type text NOT NULL,
    user_feedback text,
    metrics_before jsonb,
    metrics_after jsonb,
    outcome_delta jsonb,
    notes text,
    measured_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recommendation_outcomes_outcome_type_check CHECK ((outcome_type = ANY (ARRAY['followed'::text, 'ignored'::text, 'partially_followed'::text, 'not_applicable'::text]))),
    CONSTRAINT recommendation_outcomes_user_feedback_check CHECK ((user_feedback = ANY (ARRAY['helpful'::text, 'not_helpful'::text, 'neutral'::text])))
);
CREATE TABLE public.recovery_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    period_date date NOT NULL,
    chronic_load numeric,
    acute_load numeric,
    acwr numeric,
    acwr_trend text,
    monotony numeric,
    strain numeric,
    recovery_score numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    data_gap boolean DEFAULT false NOT NULL,
    CONSTRAINT recovery_trends_acwr_trend_check CHECK ((acwr_trend = ANY (ARRAY['increasing'::text, 'stable'::text, 'declining'::text])))
);
CREATE TABLE public.review_helpful_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.risk_alert_dismissals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    alert_key text NOT NULL,
    dismissed_at timestamp with time zone DEFAULT now() NOT NULL,
    snooze_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.risk_score_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calculated_at date DEFAULT CURRENT_DATE NOT NULL,
    score integer NOT NULL,
    component_scores jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_score_history_score_check CHECK (((score >= 0) AND (score <= 100)))
);
CREATE TABLE public.risk_trajectories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    metric text NOT NULL,
    current_value numeric,
    baseline_value numeric,
    predicted_3day numeric,
    predicted_7day numeric,
    trajectory_direction text,
    confidence numeric,
    calculation_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_trajectories_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (100)::numeric))),
    CONSTRAINT risk_trajectories_trajectory_direction_check CHECK ((trajectory_direction = ANY (ARRAY['improving'::text, 'stable'::text, 'worsening'::text])))
);
CREATE TABLE public.service_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    typical_cost_range_min integer,
    typical_cost_range_max integer,
    icon text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.symptom_check_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    symptom_type text NOT NULL,
    severity text NOT NULL,
    description text,
    body_location text,
    onset_time timestamp with time zone,
    duration_hours numeric,
    related_metrics jsonb DEFAULT '{}'::jsonb,
    triggers text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT symptom_check_ins_severity_check CHECK ((severity = ANY (ARRAY['mild'::text, 'moderate'::text, 'severe'::text])))
);
ALTER TABLE ONLY public.symptom_check_ins FORCE ROW LEVEL SECURITY;
CREATE TABLE public.sync_health_log (
    created_at timestamp with time zone DEFAULT now(),
    entries_processed numeric,
    error_code text,
    error_message text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    latency_ms numeric,
    retry_count integer,
    status text NOT NULL,
    sync_type text NOT NULL,
    user_id uuid NOT NULL
);
CREATE TABLE public.sync_retry_queue (
    created_at timestamp with time zone DEFAULT now(),
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    last_error text,
    max_retries integer,
    next_retry_at timestamp with time zone,
    operation text NOT NULL,
    payload jsonb,
    retry_count integer,
    status text,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL
);
CREATE TABLE public.terra_connections (
    connected_at timestamp with time zone,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text,
    terra_user_id text,
    user_id uuid
);
CREATE TABLE public.training_trends (
    acute_load numeric,
    acwr numeric,
    chronic_load numeric,
    created_at timestamp with time zone DEFAULT now(),
    data_gap boolean NOT NULL,
    date date NOT NULL,
    ewma numeric,
    hrv numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    monotony numeric,
    sleep_score numeric,
    strain numeric,
    training_load numeric,
    user_id uuid NOT NULL,
    source text DEFAULT 'oura'::text NOT NULL
);
CREATE TABLE public.treatment_plan_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    treatment_plan_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer,
    was_helpful boolean,
    feedback_text text,
    improvements_needed text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT treatment_plan_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);
CREATE TABLE public.treatment_plan_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    treatment_plan_id uuid NOT NULL,
    service_category_id uuid NOT NULL,
    sessions integer DEFAULT 1 NOT NULL,
    price_per_session integer NOT NULL,
    frequency text,
    description text,
    rationale text,
    evidence_level text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT treatment_plan_services_evidence_level_check CHECK ((evidence_level = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);
CREATE TABLE public.treatment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    plan_type text NOT NULL,
    total_cost integer DEFAULT 0 NOT NULL,
    time_frame text,
    complexity_score numeric(3,2) DEFAULT 0.5,
    user_input text,
    analyzed_symptoms text[] DEFAULT '{}'::text[],
    goal text,
    match_score numeric(3,2),
    is_favorite boolean DEFAULT false,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT treatment_plans_plan_type_check CHECK ((plan_type = ANY (ARRAY['best-fit'::text, 'high-impact'::text, 'progressive'::text, 'budget-conscious'::text]))),
    CONSTRAINT treatment_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])))
);
CREATE TABLE public.triage_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    issue_type text NOT NULL,
    severity text NOT NULL,
    recommended_provider text NOT NULL,
    confidence_score numeric NOT NULL,
    reasoning text NOT NULL,
    contextual_factors jsonb DEFAULT '{}'::jsonb,
    data_sources_used text[],
    flags text[],
    action_taken text,
    outcome_feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT triage_results_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (100)::numeric))),
    CONSTRAINT triage_results_severity_check CHECK ((severity = ANY (ARRAY['mild'::text, 'moderate'::text, 'severe'::text, 'critical'::text])))
);
