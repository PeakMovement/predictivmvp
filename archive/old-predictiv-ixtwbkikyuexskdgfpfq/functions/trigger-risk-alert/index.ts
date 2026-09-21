import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Risk thresholds
const THRESHOLDS = {
  acwr_critical: 1.8,
  strain_critical: 3500,
  readiness_critical: 40,
  sleep_critical: 45
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── INPUT VALIDATION ─────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return new Response(
        JSON.stringify({ error: 'Request body must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, check_type } = body as { user_id?: unknown; check_type?: unknown };

    // Validate user_id is present and is a valid UUID
    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'user_id is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'user_id must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate check_type if provided
    const validCheckTypes = ['recovery', 'wearable', 'anomaly', 'all'];
    if (check_type !== undefined && check_type !== null) {
      if (typeof check_type !== 'string' || !validCheckTypes.includes(check_type)) {
        return new Response(
          JSON.stringify({ error: `check_type must be one of: ${validCheckTypes.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }


    // Get user profile for phone number
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('name')
      .eq('user_id', user_id)
      .maybeSingle();

    // Get user's phone from Users table (if stored there)
    // Note: You may need to add phone_number field to store user phones
    
    let alertMessage: string | null = null;
    let alertType: string | null = null;

    // Check recovery trends
    if (!check_type || check_type === 'recovery') {
      const { data: recovery } = await supabase
        .from('recovery_trends')
        .select('acwr, strain, period_date')
        .eq('user_id', user_id)
        .order('period_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recovery) {
        if (recovery.acwr && recovery.acwr >= THRESHOLDS.acwr_critical) {
          alertMessage = `Your ACWR is at ${recovery.acwr.toFixed(2)}, indicating very high injury risk. Please consider rest.`;
          alertType = 'acwr_critical';
        } else if (recovery.strain && recovery.strain >= THRESHOLDS.strain_critical) {
          alertMessage = `Your training strain (${Math.round(recovery.strain)}) is critically high. Recovery recommended.`;
          alertType = 'strain_critical';
        }
      }
    }

    // Check wearable data
    if (!alertMessage && (!check_type || check_type === 'wearable')) {
      const { data: session } = await supabase
        .from('wearable_sessions')
        .select('readiness_score, sleep_score, date')
        .eq('user_id', user_id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        if (session.readiness_score && session.readiness_score < THRESHOLDS.readiness_critical) {
          alertMessage = `Your readiness score is ${session.readiness_score}, unusually low. How are you feeling?`;
          alertType = 'readiness_critical';
        } else if (session.sleep_score && session.sleep_score < THRESHOLDS.sleep_critical) {
          alertMessage = `Your sleep score was ${session.sleep_score}, very poor. Consider logging symptoms.`;
          alertType = 'sleep_critical';
        }
      }
    }

    // Check health anomalies
    if (!alertMessage && (!check_type || check_type === 'anomaly')) {
      const { data: anomaly } = await supabase
        .from('health_anomalies')
        .select('*')
        .eq('user_id', user_id)
        .eq('severity', 'high')
        .is('acknowledged_at', null)
        .order('detected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anomaly) {
        alertMessage = `Unusual ${anomaly.metric_name} detected (${anomaly.deviation_percent?.toFixed(0)}% deviation). Please check in.`;
        alertType = 'anomaly';
      }
    }

    if (!alertMessage) {
      return new Response(
        JSON.stringify({ triggered: false, message: 'No critical alerts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Log the alert
    await supabase.from('notification_log').insert({
      recipient: user_id,
      message: alertMessage,
      status: 'queued'
    });

    // Note: SMS sending would require user's phone number stored in profile
    // For now, we just return the alert for the app to display
    
    return new Response(
      JSON.stringify({ 
        triggered: true, 
        alert_type: alertType,
        message: alertMessage,
        user_name: userProfile?.name || 'User'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[trigger-risk-alert] [ERROR]', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
