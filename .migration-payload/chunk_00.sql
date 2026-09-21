SET check_function_bodies = false;
CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);
CREATE TYPE public.injury_phase_enum AS ENUM (
    'acute',
    'sub_acute',
    'rehabilitation',
    'return_to_sport',
    'full_clearance'
);
CREATE TYPE public.injury_type_enum AS ENUM (
    'muscle_strain',
    'ligament_tear',
    'fracture',
    'surgery',
    'spinal',
    'tendinopathy',
    'other'
);
CREATE TYPE public.practitioner_type_enum AS ENUM (
    'physio',
    'surgeon',
    'sports_doctor',
    'biokineticist',
    'other'
);
--
-- Name: cleanup_expired_garmin_oauth_state(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.cleanup_expired_garmin_oauth_state() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.garmin_oauth_state WHERE expires_at < now();
END;
$$;
--
-- Name: cleanup_expired_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.cleanup_expired_rate_limits() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE reset_at < now() - interval '1 hour';
END;
$$;
--
-- Name: cleanup_old_pattern_views(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.cleanup_old_pattern_views() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM user_shown_patterns
  WHERE shown_at < now() - interval '30 days';
END;
$$;
--
-- Name: create_document_version_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.create_document_version_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only create snapshot if the file_url is changing (new file uploaded)
  IF TG_OP = 'UPDATE' AND OLD.file_url IS DISTINCT FROM NEW.file_url THEN
    -- Save the old version to history
    INSERT INTO public.document_versions (
      document_id,
      user_id,
      version_number,
      file_url,
      file_name,
      file_size,
      ai_summary,
      tags,
      parsed_content,
      processing_status,
      created_at
    ) VALUES (
      OLD.id,
      OLD.user_id,
      OLD.version,
      OLD.file_url,
      OLD.file_name,
      OLD.file_size,
      OLD.ai_summary,
      OLD.tags,
      OLD.parsed_content,
      OLD.processing_status,
      OLD.uploaded_at
    );
    -- Increment version for the new version
    NEW.version = OLD.version + 1;
    NEW.uploaded_at = now();
  END IF;
  RETURN NEW;
END;
$$;
--
-- Name: get_latest_insights(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.get_latest_insights() RETURNS TABLE(metric text, deviation_pct numeric, risk_status text, insight text, suggestion text, updated_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT metric, deviation_pct, risk_status, insight, suggestion, updated_at
  FROM user_insights_view
  ORDER BY updated_at DESC
  LIMIT 10;
$$;
--
-- Name: handle_new_user_profile(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.handle_new_user_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
--
-- Name: handle_new_user_registration(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.handle_new_user_registration() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Insert into users table when new auth.users record is created
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  RETURN NEW;
END;
$$;
--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
--
-- Name: restore_document_version(uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.restore_document_version(p_document_id uuid, p_version_number integer, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_version RECORD;
  v_current_doc RECORD;
  v_result JSONB;
BEGIN
  -- Verify user owns the document
  SELECT * INTO v_current_doc
  FROM user_documents
  WHERE id = p_document_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found or access denied');
  END IF;
  -- Get the version to restore
  SELECT * INTO v_version
  FROM document_versions
  WHERE document_id = p_document_id 
    AND version_number = p_version_number
    AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Version not found');
  END IF;
  -- Create a snapshot of current version before restoring
  INSERT INTO document_versions (
    document_id,
    user_id,
    version_number,
    file_url,
    file_name,
    file_size,
    ai_summary,
    tags,
    parsed_content,
    processing_status,
    created_at
  ) VALUES (
    v_current_doc.id,
    v_current_doc.user_id,
    v_current_doc.version,
    v_current_doc.file_url,
    v_current_doc.file_name,
    v_current_doc.file_size,
    v_current_doc.ai_summary,
    v_current_doc.tags,
    v_current_doc.parsed_content,
    v_current_doc.processing_status,
    v_current_doc.uploaded_at
  );
  -- Restore the version
  UPDATE user_documents
  SET 
    file_url = v_version.file_url,
    file_name = v_version.file_name,
    file_size = v_version.file_size,
    ai_summary = v_version.ai_summary,
    tags = v_version.tags,
    parsed_content = v_version.parsed_content,
    processing_status = v_version.processing_status,
    version = v_current_doc.version + 1,
    uploaded_at = now(),
    version_notes = 'Restored from version ' || p_version_number
  WHERE id = p_document_id;
  -- Mark the version record as being the source of a restore
  UPDATE document_versions
  SET restored_from_version = p_version_number
  WHERE document_id = p_document_id 
    AND version_number = v_current_doc.version + 1;
  v_result = jsonb_build_object(
    'success', true,
    'restored_version', p_version_number,
    'new_version', v_current_doc.version + 1
  );
  RETURN v_result;
END;
$$;
--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
--
-- Name: strip_tokens_from_activity(uuid); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.strip_tokens_from_activity(u_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE fitbit_auto_data 
  SET activity = activity - 'tokens'
  WHERE user_id = u_id AND activity ? 'tokens';
END;
$$;
--
-- Name: update_focus_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_focus_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--
-- Name: update_injury_profile_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_injury_profile_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--
-- Name: update_medical_finder_sessions_last_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_medical_finder_sessions_last_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$;
--
-- Name: update_physician_rating(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_physician_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE public.physicians
  SET 
    rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM public.provider_reviews
      WHERE physician_id = COALESCE(NEW.physician_id, OLD.physician_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.provider_reviews
      WHERE physician_id = COALESCE(NEW.physician_id, OLD.physician_id)
    )
  WHERE id = COALESCE(NEW.physician_id, OLD.physician_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
--
-- Name: update_physicians_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_physicians_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--
-- Name: update_provider_reviews_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_provider_reviews_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--
-- Name: update_review_helpful_count(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_review_helpful_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.provider_reviews 
    SET helpful_count = helpful_count + 1 
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.provider_reviews 
    SET helpful_count = helpful_count - 1 
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
--
-- Name: update_treatment_plan_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_treatment_plan_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--
-- Name: update_user_context(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_user_context(p_user_id uuid, p_field text, p_data jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO user_context_enhanced (user_id, nutrition_profile, medical_profile, training_profile)
  VALUES (
    p_user_id,
    CASE WHEN p_field = 'nutrition_profile' THEN p_data ELSE '{}'::jsonb END,
    CASE WHEN p_field = 'medical_profile' THEN p_data ELSE '{}'::jsonb END,
    CASE WHEN p_field = 'training_profile' THEN p_data ELSE '{}'::jsonb END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nutrition_profile = CASE WHEN p_field = 'nutrition_profile' THEN p_data ELSE user_context_enhanced.nutrition_profile END,
    medical_profile = CASE WHEN p_field = 'medical_profile' THEN p_data ELSE user_context_enhanced.medical_profile END,
    training_profile = CASE WHEN p_field = 'training_profile' THEN p_data ELSE user_context_enhanced.training_profile END,
    last_updated = NOW();
END;
$$;
CREATE TABLE public."Bookings" (
    appointment_end text,
    appointment_start text,
    calendly_event_id text,
    clinician_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notes text,
    patient_email text,
    patient_name text,
    session_date date NOT NULL,
    session_type text,
    source text,
    status text,
    user_id uuid
);
CREATE TABLE public."Users" (
    created_at timestamp with time zone DEFAULT now(),
    email text,
    email_preferences jsonb,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    wearables_connected jsonb
);
CREATE TABLE public."Wearables" (
    created_at timestamp with time zone DEFAULT now(),
    date date,
    heart_rate numeric,
    "HRV" numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sleep_hours numeric,
    steps numeric,
    user_id uuid
);
CREATE TABLE public.accountability_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    challenge_type text DEFAULT 'custom'::text NOT NULL,
    target_value numeric DEFAULT 0 NOT NULL,
    current_value numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'sessions'::text NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.activity_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    period_date date NOT NULL,
    steps_avg_7d numeric,
    steps_baseline numeric,
    steps_delta numeric,
    calories_avg_7d numeric,
    calories_baseline numeric,
    calories_delta numeric,
    activity_score_avg numeric,
    trend_direction text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT activity_trends_trend_direction_check CHECK ((trend_direction = ANY (ARRAY['increasing'::text, 'stable'::text, 'declining'::text])))
);
CREATE TABLE public.adaptive_recommendations (
    adaptive_suggestion text,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now(),
    deviation_pct numeric,
    generated_at timestamp with time zone,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric text NOT NULL,
    pattern text,
    recommendation text,
    risk_level text,
    risk_status text,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid
);
CREATE TABLE public.alert_history (
    alert_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    dismissed_at timestamp with time zone,
    health_anomaly_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    resolved_at timestamp with time zone,
    severity text NOT NULL,
    snooze_count integer,
    snoozed_until text,
    status text,
    symptom_checkin_id uuid,
    threshold_value numeric NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    user_notes text
);
CREATE TABLE public.alert_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    briefing_enabled boolean DEFAULT true NOT NULL,
    briefing_time time without time zone DEFAULT '07:00:00'::time without time zone NOT NULL,
    alert_notifications_enabled boolean DEFAULT true NOT NULL,
    weekly_summary_enabled boolean DEFAULT true NOT NULL,
    acwr_critical_threshold numeric,
    enable_email_alerts boolean,
    enable_popup_alerts boolean,
    enable_sms_alerts boolean,
    hrv_drop_threshold numeric,
    max_snooze_count integer,
    monotony_critical_threshold numeric,
    readiness_score_threshold numeric,
    rhr_spike_threshold numeric,
    severity_filter text,
    sleep_score_threshold numeric,
    strain_critical_threshold numeric,
    training_context text
);
CREATE TABLE public.baseline_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    device_source text DEFAULT 'oura'::text NOT NULL,
    hrv_7d_avg numeric,
    rhr_7d_avg numeric,
    sleep_score_7d_avg numeric,
    sleep_efficiency_7d_avg numeric,
    load_7d_avg numeric,
    hrv_30d_avg numeric,
    rhr_30d_avg numeric,
    sleep_score_30d_avg numeric,
    sleep_efficiency_30d_avg numeric,
    load_30d_avg numeric,
    hrv_deviation_pct numeric,
    rhr_deviation_pct numeric,
    sleep_deviation_pct numeric,
    acwr numeric,
    acwr_source text,
    recovery_trend text,
    anomaly_score numeric,
    hrv_streak_below_baseline integer DEFAULT 0,
    weekly_load_progression_pct numeric,
    monotony_index numeric,
    baseline_confidence numeric DEFAULT 1.0,
    data_days_available integer,
    available_formulas text[] DEFAULT '{}'::text[],
    computed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    f06_hrv_suppression_value numeric,
    f06_hrv_suppression_status text,
    f10_sleep_debt_hours numeric,
    f10_sleep_debt_status text,
    f14_allostatic_load_value numeric,
    f14_allostatic_load_status text,
    f19_readiness_value numeric,
    f19_readiness_status text,
    f12_temp_deviation_value numeric,
    f12_temp_deviation_status text,
    CONSTRAINT baseline_profiles_baseline_confidence_check CHECK (((baseline_confidence >= (0)::numeric) AND (baseline_confidence <= (1)::numeric))),
    CONSTRAINT baseline_profiles_device_source_check CHECK ((device_source = ANY (ARRAY['oura'::text, 'garmin'::text, 'polar'::text, 'none'::text]))),
    CONSTRAINT baseline_profiles_f12_temp_deviation_status_check CHECK ((f12_temp_deviation_status = ANY (ARRAY['normal'::text, 'elevated'::text, 'alert'::text, 'unavailable'::text]))),
    CONSTRAINT baseline_profiles_recovery_trend_check CHECK ((recovery_trend = ANY (ARRAY['improving'::text, 'stable'::text, 'declining'::text])))
);
CREATE TABLE public.csv_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    file_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.daily_briefings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    content text NOT NULL,
    context_used jsonb,
    created_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'full'::text,
    focus_mode text DEFAULT ''::text NOT NULL,
    focus_context jsonb DEFAULT '{}'::jsonb,
    generation_id uuid DEFAULT gen_random_uuid(),
    refresh_nonce uuid,
    CONSTRAINT daily_briefings_category_check CHECK ((category = ANY (ARRAY['full'::text, 'recovery'::text, 'sleep'::text, 'activity'::text, 'goals'::text, 'tip'::text, 'unified'::text])))
);
CREATE TABLE public.document_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    insight_type text NOT NULL,
    insight_data jsonb NOT NULL,
    confidence_score numeric(3,2),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_insights_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))
);
CREATE TABLE public.document_processing_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    error_message text,
    processing_steps jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT document_processing_log_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])))
);
CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    version_number integer NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    ai_summary text,
    tags text[],
    parsed_content jsonb,
    processing_status text DEFAULT 'completed'::text,
    restored_from_version integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.engagement_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    target_id uuid,
    target_type text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT engagement_events_event_type_check CHECK ((event_type = ANY (ARRAY['recommendation_viewed'::text, 'recommendation_followed'::text, 'recommendation_dismissed'::text, 'recommendation_helpful'::text, 'recommendation_not_helpful'::text, 'symptom_logged'::text, 'chat_initiated'::text, 'briefing_viewed'::text, 'app_opened'::text])))
);
CREATE TABLE public.escalation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    rule_id uuid,
    rule_name text NOT NULL,
    triggered_conditions jsonb,
    escalation_type text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    action_taken text,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.escalation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    description text,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    require_all boolean DEFAULT true NOT NULL,
    escalation_type text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    message_template text NOT NULL,
    cooldown_hours integer DEFAULT 24 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT escalation_rules_escalation_type_check CHECK ((escalation_type = ANY (ARRAY['in_app_alert'::text, 'sms'::text, 'email'::text, 'provider_referral'::text]))),
    CONSTRAINT escalation_rules_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);
CREATE TABLE public.feedback (
    action_taken text,
    created_at timestamp with time zone DEFAULT now(),
    feedback_score numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insight text,
    metric text NOT NULL,
    user_id uuid
);
CREATE VIEW public.feedback_summary WITH (security_invoker='true') AS
 SELECT metric,
    count(*) AS total_feedback,
    avg(feedback_score) AS avg_score
   FROM public.feedback
  GROUP BY metric;
CREATE TABLE public.fitbit_auto_data (
    id integer NOT NULL,
    user_id text NOT NULL,
    activity jsonb,
    sleep jsonb,
    fetched_at timestamp with time zone DEFAULT now(),
    user_id_uuid uuid
);
CREATE TABLE public.wearable_auto_data (
    id integer NOT NULL,
    user_id text NOT NULL,
    activity jsonb,
    sleep jsonb,
    fetched_at timestamp with time zone DEFAULT now(),
    user_id_uuid uuid,
    date date
);
CREATE SEQUENCE public.fitbit_auto_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.fitbit_auto_data_id_seq OWNED BY public.wearable_auto_data.id;
CREATE SEQUENCE public.fitbit_auto_data_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.fitbit_auto_data_id_seq1 OWNED BY public.fitbit_auto_data.id;
CREATE TABLE public.fitbit_tokens (
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_type text DEFAULT 'Bearer'::text,
    expires_in integer,
    scope text,
    fitbit_user_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.fitbit_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    date date NOT NULL,
    acwr double precision,
    ewma double precision,
    strain double precision,
    monotony double precision,
    hrv double precision,
    training_load double precision,
    acute_load double precision,
    chronic_load double precision,
    created_at timestamp with time zone DEFAULT now(),
    sleep_score numeric
);
ALTER TABLE ONLY public.fitbit_trends REPLICA IDENTITY FULL;
CREATE TABLE public.function_execution_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_name text NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    duration_ms integer,
    error_message text,
    user_id uuid,
    metadata jsonb,
    CONSTRAINT function_execution_log_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text, 'running'::text])))
);
CREATE TABLE public.garmin_oauth_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    state text NOT NULL,
    code_verifier text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL
);
CREATE TABLE public.google_calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    google_event_id text NOT NULL,
    calendar_id text NOT NULL,
    summary text,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    location text,
    status text DEFAULT 'confirmed'::text,
    attendees jsonb DEFAULT '[]'::jsonb,
    raw_data jsonb,
    synced_to_planner boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.google_calendar_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sync_type text DEFAULT 'full'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    events_synced integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.google_calendar_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone NOT NULL,
    scope text DEFAULT 'https://www.googleapis.com/auth/calendar.readonly'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.health_anomalies (
    acknowledged_at timestamp with time zone,
    anomaly_type text NOT NULL,
    baseline_value numeric,
    current_value numeric,
    detected_at timestamp with time zone,
    deviation_percent numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    notes text,
    severity text NOT NULL,
    user_id uuid NOT NULL
);
CREATE TABLE public.health_daily (
    active_energy_kcal numeric,
    date date,
    distance_m numeric,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resting_hr numeric,
    steps numeric,
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid
);
CREATE TABLE public.health_data (
    collected_at timestamp with time zone,
    id numeric,
    samples jsonb,
    user_id uuid NOT NULL
);
CREATE TABLE public.health_trends_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    period_date date NOT NULL,
    metric_name text NOT NULL,
    value numeric,
    baseline numeric,
    delta numeric,
    trend_direction text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT health_trends_daily_trend_direction_check CHECK ((trend_direction = ANY (ARRAY['increasing'::text, 'stable'::text, 'declining'::text])))
);
