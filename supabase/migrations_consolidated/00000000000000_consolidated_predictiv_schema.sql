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
SET check_function_bodies = false;
CREATE POLICY "Users can insert own insights" ON public.insight_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own pattern views" ON public.user_shown_patterns FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own polar logs" ON public.polar_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own polar tokens" ON public.polar_tokens FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own readiness data" ON public.oura_readiness FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own record" ON public.users FOR INSERT WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can insert own resilience data" ON public.oura_resilience FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own rest mode data" ON public.oura_rest_mode FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own ring config" ON public.oura_ring_config FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own sleep data" ON public.oura_sleep FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own spo2 data" ON public.oura_spo2 FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own stress data" ON public.oura_stress FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own sync logs" ON public.google_calendar_sync_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own vo2max data" ON public.oura_vo2max FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert own workout data" ON public.oura_workout FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can insert their own Fitbit tokens" ON public.fitbit_tokens FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own Fitbit tokens" ON public.wearable_tokens FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own alert history" ON public.alert_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own alert settings" ON public.alert_settings FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own baselines" ON public.user_baselines FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own context" ON public.user_context_enhanced FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own dismissals" ON public.risk_alert_dismissals FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own documents" ON public.user_documents FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own injury history" ON public.user_injuries FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own insight actions" ON public.user_insight_actions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own insight feedback" ON public.insight_feedback FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own insight history" ON public.insight_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own interests" ON public.user_interests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own lifestyle" ON public.user_lifestyle FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own medical background" ON public.user_medical FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own memory entries" ON public.yves_memory_bank FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own mindset data" ON public.user_mindset FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own nutrition" ON public.user_nutrition FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can insert their own profile" ON public.user_profile FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own recovery data" ON public.user_recovery FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own sessions" ON public.medical_finder_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own signals" ON public.onboarding_signals FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own terra connections" ON public.terra_connections FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own training preferences" ON public.user_training FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own triage results" ON public.triage_results FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own uploads" ON public.csv_uploads FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own wearable sessions" ON public.wearable_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own wearable summary" ON public.wearable_summary FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own wellness goals" ON public.user_wellness_goals FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own focus preferences" ON public.user_focus_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own polar logs" ON public.polar_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own polar tokens" ON public.polar_tokens FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own record" ON public.users FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can read their own baselines" ON public.user_baselines FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can read their own layout preferences" ON public.profiles FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "Users can remove helpful votes" ON public.review_helpful_votes FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update active field only" ON public.user_model FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update outcome on their own predictions" ON public.prediction_log FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own activity data" ON public.oura_activity FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own calendar events" ON public.google_calendar_events FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own calendar tokens" ON public.google_calendar_tokens FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own cardiovascular age data" ON public.oura_cardiovascular_age FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own challenges" ON public.accountability_challenges FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own challenges" ON public.user_challenges FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own context" ON public.user_context FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own focus preferences" ON public.user_focus_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own injury profiles" ON public.user_injury_profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own polar tokens" ON public.polar_tokens FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own readiness data" ON public.oura_readiness FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can update own reflections" ON public.weekly_reflections FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own resilience data" ON public.oura_resilience FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own rest mode data" ON public.oura_rest_mode FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own ring config" ON public.oura_ring_config FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own sleep data" ON public.oura_sleep FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own spo2 data" ON public.oura_spo2 FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own stress data" ON public.oura_stress FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own treatment plans" ON public.treatment_plans FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own treatment preferences" ON public.user_treatment_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own vo2max data" ON public.oura_vo2max FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own workout data" ON public.oura_workout FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update their own Fitbit tokens" ON public.fitbit_tokens FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own Fitbit tokens" ON public.wearable_tokens FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own alert history" ON public.alert_history FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own alert settings" ON public.alert_settings FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own anomalies" ON public.health_anomalies FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own baselines" ON public.user_baselines FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own context" ON public.user_context_enhanced FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own dismissals" ON public.risk_alert_dismissals FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own injury history" ON public.user_injuries FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own interests" ON public.user_interests FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own layout preferences" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update their own lifestyle" ON public.user_lifestyle FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own medical background" ON public.user_medical FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own memory entries" ON public.yves_memory_bank FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own mindset data" ON public.user_mindset FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own nutrition" ON public.user_nutrition FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can update their own profile" ON public.user_profile FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own recommendation feedback" ON public.yves_recommendations FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own recovery data" ON public.user_recovery FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own reviews" ON public.provider_reviews FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own sessions" ON public.medical_finder_sessions FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own signals" ON public.onboarding_signals FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own training preferences" ON public.user_training FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own triage results" ON public.triage_results FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own wearable sessions" ON public.wearable_sessions FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own wearable summary" ON public.wearable_summary FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own wellness goals" ON public.user_wellness_goals FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view feedback for their treatment plans" ON public.treatment_plan_feedback FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view function logs" ON public.function_execution_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view helpful votes" ON public.review_helpful_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view notifications" ON public.notification_log FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can view own activity data" ON public.oura_activity FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own calendar events" ON public.google_calendar_events FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own calendar tokens" ON public.google_calendar_tokens FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own cardiovascular age data" ON public.oura_cardiovascular_age FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own challenges" ON public.accountability_challenges FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own challenges" ON public.user_challenges FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own context" ON public.user_context FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own injury profiles" ON public.user_injury_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own insights" ON public.insight_history FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own readiness data" ON public.oura_readiness FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own reflections" ON public.weekly_reflections FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own resilience data" ON public.oura_resilience FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own rest mode data" ON public.oura_rest_mode FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own ring config" ON public.oura_ring_config FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own shown patterns" ON public.user_shown_patterns FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own sleep data" ON public.oura_sleep FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own spo2 data" ON public.oura_spo2 FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own stress data" ON public.oura_stress FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own sync logs" ON public.google_calendar_sync_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own treatment plans" ON public.treatment_plans FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own treatment preferences" ON public.user_treatment_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own vo2max data" ON public.oura_vo2max FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own workout data" ON public.oura_workout FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view services for their treatment plans" ON public.treatment_plan_services FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.treatment_plans
  WHERE ((treatment_plans.id = treatment_plan_services.treatment_plan_id) AND (treatment_plans.user_id = auth.uid())))));
CREATE POLICY "Users can view their bookings" ON public."Bookings" FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own Fitbit data" ON public.fitbit_auto_data FOR SELECT TO authenticated USING ((user_id = (auth.uid())::text));
CREATE POLICY "Users can view their own Fitbit data" ON public.wearable_auto_data FOR SELECT TO authenticated USING ((user_id = (auth.uid())::text));
CREATE POLICY "Users can view their own Fitbit tokens" ON public.fitbit_tokens FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own Fitbit tokens" ON public.wearable_tokens FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own Fitbit trends" ON public.fitbit_trends FOR SELECT TO authenticated USING ((user_id = (auth.uid())::text));
CREATE POLICY "Users can view their own activity trends" ON public.activity_trends FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own adaptation profile" ON public.user_adaptation_profile FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own alert history" ON public.alert_history FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own alert settings" ON public.alert_settings FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own anomalies" ON public.health_anomalies FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own baselines" ON public.baseline_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own briefings" ON public.daily_briefings FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own context" ON public.user_context_enhanced FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own daily trends" ON public.health_trends_daily FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own data maturity" ON public.user_data_maturity FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own deviations" ON public.user_deviations FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own dismissals" ON public.risk_alert_dismissals FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own document versions" ON public.document_versions FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own documents" ON public.user_documents FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own engagement events" ON public.engagement_events FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own escalation logs" ON public.escalation_log FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own feedback" ON public.feedback FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own health profiles" ON public.user_health_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own injury history" ON public.user_injuries FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own insight actions" ON public.user_insight_actions FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own insight feedback" ON public.insight_feedback FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own insight history" ON public.insight_history FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own insights" ON public.document_insights FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own interests" ON public.user_interests FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own life formulas" ON public.user_life_formula FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own lifestyle" ON public.user_lifestyle FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own medical background" ON public.user_medical FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own memory" ON public.yves_memory_bank FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own memory entries" ON public.yves_memory_bank FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own mindset data" ON public.user_mindset FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own model" ON public.user_model FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own nutrition" ON public.user_nutrition FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own oura logs" ON public.oura_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own oura sync logs" ON public.oura_sync_log FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own plan adherence" ON public.plan_adherence FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own predictions" ON public.prediction_log FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own processing logs" ON public.document_processing_log FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can view their own profile" ON public.user_profile FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own prompt history" ON public.prompt_history FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own recommendation outcomes" ON public.recommendation_outcomes FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own recommendations" ON public.adaptive_recommendations FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own recovery data" ON public.user_recovery FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own recovery trends" ON public.recovery_trends FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own risk trajectories" ON public.risk_trajectories FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own sessions" ON public.medical_finder_sessions FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own signals" ON public.onboarding_signals FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own sync health" ON public.sync_health_log FOR SELECT TO authenticated USING ((auth.uid() = user_id));
SET check_function_bodies = false;
CREATE POLICY "Users can view their own terra connections" ON public.terra_connections FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own training preferences" ON public.user_training FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own triage results" ON public.triage_results FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own uploads" ON public.csv_uploads FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own wearable sessions" ON public.wearable_sessions FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own wearable summary" ON public.wearable_summary FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own weekly trends" ON public.health_trends_weekly FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own wellness goals" ON public.user_wellness_goals FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own yves profile" ON public.yves_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own yves recommendations" ON public.yves_recommendations FOR SELECT TO authenticated USING ((auth.uid() = user_id));
ALTER TABLE public.accountability_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitbit_auto_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitbit_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitbit_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garmin_oauth_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_trends_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_trends_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healthcare_practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_finder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_cardiovascular_age ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_resilience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_rest_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_ring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_sleep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_spo2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_stress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_vo2max ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_workout ENABLE ROW LEVEL SECURITY;
CREATE POLICY patients_insert_grants ON public.practitioner_access FOR INSERT WITH CHECK ((patient_id = auth.uid()));
CREATE POLICY patients_read_own_grants ON public.practitioner_access FOR SELECT USING ((patient_id = auth.uid()));
CREATE POLICY patients_update_own_grants ON public.practitioner_access FOR UPDATE USING ((patient_id = auth.uid()));
ALTER TABLE public.physicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polar_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY practitioner_read_patient_injury_profiles ON public.user_injury_profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.practitioner_access pa
  WHERE ((pa.practitioner_id = auth.uid()) AND (pa.patient_id = user_injury_profiles.user_id) AND (pa.is_active = true)))));
CREATE POLICY practitioner_read_patient_wearable_sessions ON public.wearable_sessions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.practitioner_access pa
  WHERE ((pa.practitioner_id = auth.uid()) AND (pa.patient_id = wearable_sessions.user_id) AND (pa.is_active = true)))));
ALTER TABLE public.practitioner_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
CREATE POLICY practitioners_read_own_access ON public.practitioner_access FOR SELECT USING ((practitioner_id = auth.uid()));
ALTER TABLE public.prediction_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alert_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_health_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terra_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_adaptation_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_maturity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_focus_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_injury_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_insight_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_life_formula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lifestyle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_medical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mindset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shown_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_treatment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wellness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_manage_own_risk_scores ON public.risk_score_history USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
ALTER TABLE public.wearable_auto_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yves_memory_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yves_recommendations ENABLE ROW LEVEL SECURITY;
SET check_function_bodies = false;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Bookings" TO authenticated;
GRANT ALL ON public."Bookings" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Users" TO authenticated;
GRANT ALL ON public."Users" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Wearables" TO authenticated;
GRANT ALL ON public."Wearables" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."accountability_challenges" TO authenticated;
GRANT ALL ON public."accountability_challenges" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."activity_trends" TO authenticated;
GRANT ALL ON public."activity_trends" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."adaptive_recommendations" TO authenticated;
GRANT ALL ON public."adaptive_recommendations" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."alert_history" TO authenticated;
GRANT ALL ON public."alert_history" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."alert_settings" TO authenticated;
GRANT ALL ON public."alert_settings" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."baseline_profiles" TO authenticated;
GRANT ALL ON public."baseline_profiles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."csv_uploads" TO authenticated;
GRANT ALL ON public."csv_uploads" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."daily_briefings" TO authenticated;
GRANT ALL ON public."daily_briefings" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."document_insights" TO authenticated;
GRANT ALL ON public."document_insights" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."document_processing_log" TO authenticated;
GRANT ALL ON public."document_processing_log" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."document_versions" TO authenticated;
GRANT ALL ON public."document_versions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."engagement_events" TO authenticated;
GRANT ALL ON public."engagement_events" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."escalation_log" TO authenticated;
GRANT ALL ON public."escalation_log" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."escalation_rules" TO authenticated;
GRANT ALL ON public."escalation_rules" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."feedback" TO authenticated;
GRANT ALL ON public."feedback" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."feedback_summary" TO authenticated;
GRANT ALL ON public."feedback_summary" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fitbit_auto_data" TO authenticated;
GRANT ALL ON public."fitbit_auto_data" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fitbit_tokens" TO authenticated;
GRANT ALL ON public."fitbit_tokens" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fitbit_trends" TO authenticated;
GRANT ALL ON public."fitbit_trends" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."function_execution_log" TO authenticated;
GRANT ALL ON public."function_execution_log" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."garmin_oauth_state" TO authenticated;
GRANT ALL ON public."garmin_oauth_state" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."google_calendar_events" TO authenticated;
GRANT ALL ON public."google_calendar_events" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."google_calendar_sync_logs" TO authenticated;
GRANT ALL ON public."google_calendar_sync_logs" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."google_calendar_tokens" TO authenticated;
GRANT ALL ON public."google_calendar_tokens" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."health_anomalies" TO authenticated;
GRANT ALL ON public."health_anomalies" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."health_daily" TO authenticated;
GRANT ALL ON public."health_daily" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."health_data" TO authenticated;
GRANT ALL ON public."health_data" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."health_trends_daily" TO authenticated;
GRANT ALL ON public."health_trends_daily" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."health_trends_weekly" TO authenticated;
GRANT ALL ON public."health_trends_weekly" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."healthcare_practitioners" TO authenticated;
GRANT ALL ON public."healthcare_practitioners" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."insight_engagement_summary" TO authenticated;
GRANT ALL ON public."insight_engagement_summary" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."insight_feedback" TO authenticated;
GRANT ALL ON public."insight_feedback" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."insight_history" TO authenticated;
GRANT ALL ON public."insight_history" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."medical_finder_sessions" TO authenticated;
GRANT ALL ON public."medical_finder_sessions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."notification_log" TO authenticated;
GRANT ALL ON public."notification_log" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."onboarding_signals" TO authenticated;
GRANT ALL ON public."onboarding_signals" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_activity" TO authenticated;
GRANT ALL ON public."oura_activity" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_cardiovascular_age" TO authenticated;
GRANT ALL ON public."oura_cardiovascular_age" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_logs" TO authenticated;
GRANT ALL ON public."oura_logs" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_readiness" TO authenticated;
GRANT ALL ON public."oura_readiness" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_resilience" TO authenticated;
GRANT ALL ON public."oura_resilience" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_rest_mode" TO authenticated;
GRANT ALL ON public."oura_rest_mode" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_ring_config" TO authenticated;
GRANT ALL ON public."oura_ring_config" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_sleep" TO authenticated;
GRANT ALL ON public."oura_sleep" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_spo2" TO authenticated;
GRANT ALL ON public."oura_spo2" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_stress" TO authenticated;
GRANT ALL ON public."oura_stress" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_sync_log" TO authenticated;
GRANT ALL ON public."oura_sync_log" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_tokens" TO authenticated;
GRANT ALL ON public."oura_tokens" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_vo2max" TO authenticated;
GRANT ALL ON public."oura_vo2max" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."oura_workout" TO authenticated;
GRANT ALL ON public."oura_workout" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."physicians" TO authenticated;
GRANT ALL ON public."physicians" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."plan_adherence" TO authenticated;
GRANT ALL ON public."plan_adherence" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."polar_logs" TO authenticated;
GRANT ALL ON public."polar_logs" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."polar_tokens" TO authenticated;
GRANT ALL ON public."polar_tokens" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."polar_webhooks" TO authenticated;
GRANT ALL ON public."polar_webhooks" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."practitioner_access" TO authenticated;
GRANT ALL ON public."practitioner_access" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."practitioner_bookings" TO authenticated;
GRANT ALL ON public."practitioner_bookings" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."practitioner_specialties" TO authenticated;
GRANT ALL ON public."practitioner_specialties" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."practitioners" TO authenticated;
GRANT ALL ON public."practitioners" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."prediction_log" TO authenticated;
GRANT ALL ON public."prediction_log" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."profiles" TO authenticated;
GRANT ALL ON public."profiles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."prompt_history" TO authenticated;
GRANT ALL ON public."prompt_history" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."provider_reviews" TO authenticated;
GRANT ALL ON public."provider_reviews" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."rate_limit_state" TO authenticated;
GRANT ALL ON public."rate_limit_state" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."rate_limits" TO authenticated;
GRANT ALL ON public."rate_limits" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."recommendation_outcomes" TO authenticated;
GRANT ALL ON public."recommendation_outcomes" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."recovery_trends" TO authenticated;
GRANT ALL ON public."recovery_trends" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."review_helpful_votes" TO authenticated;
GRANT ALL ON public."review_helpful_votes" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."risk_alert_dismissals" TO authenticated;
GRANT ALL ON public."risk_alert_dismissals" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."risk_score_history" TO authenticated;
GRANT ALL ON public."risk_score_history" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."risk_trajectories" TO authenticated;
GRANT ALL ON public."risk_trajectories" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."service_categories" TO authenticated;
GRANT ALL ON public."service_categories" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."symptom_check_ins" TO authenticated;
GRANT ALL ON public."symptom_check_ins" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sync_health_log" TO authenticated;
GRANT ALL ON public."sync_health_log" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sync_retry_queue" TO authenticated;
GRANT ALL ON public."sync_retry_queue" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."terra_connections" TO authenticated;
GRANT ALL ON public."terra_connections" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."training_trends" TO authenticated;
GRANT ALL ON public."training_trends" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."treatment_plan_feedback" TO authenticated;
GRANT ALL ON public."treatment_plan_feedback" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."treatment_plan_services" TO authenticated;
GRANT ALL ON public."treatment_plan_services" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."treatment_plans" TO authenticated;
GRANT ALL ON public."treatment_plans" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."triage_results" TO authenticated;
GRANT ALL ON public."triage_results" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_adaptation_profile" TO authenticated;
GRANT ALL ON public."user_adaptation_profile" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_baselines" TO authenticated;
GRANT ALL ON public."user_baselines" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_challenges" TO authenticated;
GRANT ALL ON public."user_challenges" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_context" TO authenticated;
GRANT ALL ON public."user_context" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_context_enhanced" TO authenticated;
GRANT ALL ON public."user_context_enhanced" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_data_maturity" TO authenticated;
GRANT ALL ON public."user_data_maturity" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_deviations" TO authenticated;
GRANT ALL ON public."user_deviations" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_documents" TO authenticated;
GRANT ALL ON public."user_documents" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_focus_preferences" TO authenticated;
GRANT ALL ON public."user_focus_preferences" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_health_profiles" TO authenticated;
GRANT ALL ON public."user_health_profiles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_injuries" TO authenticated;
GRANT ALL ON public."user_injuries" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_injury_profiles" TO authenticated;
GRANT ALL ON public."user_injury_profiles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_insight_actions" TO authenticated;
GRANT ALL ON public."user_insight_actions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_insights_view" TO authenticated;
GRANT ALL ON public."user_insights_view" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_interests" TO authenticated;
GRANT ALL ON public."user_interests" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_life_formula" TO authenticated;
GRANT ALL ON public."user_life_formula" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_lifestyle" TO authenticated;
GRANT ALL ON public."user_lifestyle" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_medical" TO authenticated;
GRANT ALL ON public."user_medical" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_mindset" TO authenticated;
GRANT ALL ON public."user_mindset" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_model" TO authenticated;
GRANT ALL ON public."user_model" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_nutrition" TO authenticated;
GRANT ALL ON public."user_nutrition" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_profile" TO authenticated;
GRANT ALL ON public."user_profile" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_profiles" TO authenticated;
GRANT ALL ON public."user_profiles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_recovery" TO authenticated;
GRANT ALL ON public."user_recovery" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_roles" TO authenticated;
GRANT ALL ON public."user_roles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_shown_patterns" TO authenticated;
GRANT ALL ON public."user_shown_patterns" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_training" TO authenticated;
GRANT ALL ON public."user_training" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_treatment_preferences" TO authenticated;
GRANT ALL ON public."user_treatment_preferences" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_wellness_goals" TO authenticated;
GRANT ALL ON public."user_wellness_goals" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."users" TO authenticated;
GRANT ALL ON public."users" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."wearable_auto_data" TO authenticated;
GRANT ALL ON public."wearable_auto_data" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."wearable_sessions" TO authenticated;
GRANT ALL ON public."wearable_sessions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."wearable_summary" TO authenticated;
GRANT ALL ON public."wearable_summary" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."wearable_tokens" TO authenticated;
GRANT ALL ON public."wearable_tokens" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."weekly_reflections" TO authenticated;
GRANT ALL ON public."weekly_reflections" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."yves_feedback" TO authenticated;
GRANT ALL ON public."yves_feedback" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."yves_memory_bank" TO authenticated;
GRANT ALL ON public."yves_memory_bank" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."yves_profiles" TO authenticated;
GRANT ALL ON public."yves_profiles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."yves_recommendations" TO authenticated;
GRANT ALL ON public."yves_recommendations" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."yves_timeline_view" TO authenticated;
GRANT ALL ON public."yves_timeline_view" TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
SET check_function_bodies = false;
ALTER TABLE public."Bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rows_select" ON public."Users" FOR SELECT TO authenticated USING (auth.uid() = "id");
CREATE POLICY "own_rows_insert" ON public."Users" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "id");
CREATE POLICY "own_rows_update" ON public."Users" FOR UPDATE TO authenticated USING (auth.uid() = "id") WITH CHECK (auth.uid() = "id");
CREATE POLICY "own_rows_delete" ON public."Users" FOR DELETE TO authenticated USING (auth.uid() = "id");
ALTER TABLE public."Wearables" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rows_select" ON public."Wearables" FOR SELECT TO authenticated USING (auth.uid() = "user_id");
CREATE POLICY "own_rows_insert" ON public."Wearables" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_update" ON public."Wearables" FOR UPDATE TO authenticated USING (auth.uid() = "user_id") WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_delete" ON public."Wearables" FOR DELETE TO authenticated USING (auth.uid() = "user_id");
CREATE POLICY "own_rows_select" ON public."garmin_oauth_state" FOR SELECT TO authenticated USING (auth.uid() = "user_id");
CREATE POLICY "own_rows_insert" ON public."garmin_oauth_state" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_update" ON public."garmin_oauth_state" FOR UPDATE TO authenticated USING (auth.uid() = "user_id") WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_delete" ON public."garmin_oauth_state" FOR DELETE TO authenticated USING (auth.uid() = "user_id");
ALTER TABLE public."health_daily" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rows_select" ON public."health_daily" FOR SELECT TO authenticated USING (auth.uid() = "user_id");
CREATE POLICY "own_rows_insert" ON public."health_daily" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_update" ON public."health_daily" FOR UPDATE TO authenticated USING (auth.uid() = "user_id") WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_delete" ON public."health_daily" FOR DELETE TO authenticated USING (auth.uid() = "user_id");
ALTER TABLE public."health_data" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rows_select" ON public."health_data" FOR SELECT TO authenticated USING (auth.uid() = "user_id");
CREATE POLICY "own_rows_insert" ON public."health_data" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_update" ON public."health_data" FOR UPDATE TO authenticated USING (auth.uid() = "user_id") WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_delete" ON public."health_data" FOR DELETE TO authenticated USING (auth.uid() = "user_id");
ALTER TABLE public."oura_sync_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."plan_adherence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."polar_webhooks" ENABLE ROW LEVEL SECURITY;
-- polar_webhooks: no user column; service_role only
ALTER TABLE public."training_trends" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rows_select" ON public."training_trends" FOR SELECT TO authenticated USING (auth.uid() = "user_id");
CREATE POLICY "own_rows_insert" ON public."training_trends" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_update" ON public."training_trends" FOR UPDATE TO authenticated USING (auth.uid() = "user_id") WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_delete" ON public."training_trends" FOR DELETE TO authenticated USING (auth.uid() = "user_id");
ALTER TABLE public."user_baselines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."yves_feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rows_select" ON public."yves_feedback" FOR SELECT TO authenticated USING (auth.uid() = "user_id");
CREATE POLICY "own_rows_insert" ON public."yves_feedback" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_update" ON public."yves_feedback" FOR UPDATE TO authenticated USING (auth.uid() = "user_id") WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "own_rows_delete" ON public."yves_feedback" FOR DELETE TO authenticated USING (auth.uid() = "user_id");
ALTER TABLE public."yves_profiles" ENABLE ROW LEVEL SECURITY;
