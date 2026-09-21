import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticResult {
  status: 'pass' | 'fail';
  last_sync?: string;
  steps_today?: number;
  calories_today?: number;
  token_expires_in?: number;
  cron_last_run?: string;
  fixSuggestion?: string;
  checks: {
    token: { pass: boolean; message: string };
    data: { pass: boolean; message: string };
    trends: { pass: boolean; message: string };
    cron: { pass: boolean; message: string };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    const result: DiagnosticResult = {
      status: 'pass',
      checks: {
        token: { pass: false, message: '' },
        data: { pass: false, message: '' },
        trends: { pass: false, message: '' },
        cron: { pass: false, message: '' },
      },
    };

    // ✅ CHECK 1: Wearable Token Validity
    const { data: tokenData, error: tokenError } = await supabase
      .from('wearable_tokens')
      .select('access_token, expires_in, updated_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (tokenError) {
      result.checks.token.message = `Token query error: ${tokenError.message}`;
      result.status = 'fail';
    } else if (!tokenData) {
      result.checks.token.message = 'No wearable token found for this user';
      result.status = 'fail';
      result.fixSuggestion = 'User needs to connect wearable device in Settings';
    } else if (!tokenData.expires_in || tokenData.expires_in <= 0) {
      result.checks.token.message = `Token expired (expires_in: ${tokenData.expires_in})`;
      result.status = 'fail';
      result.fixSuggestion = 'Token expired — trigger refresh via wearable-fetch-data';
    } else {
      result.checks.token.pass = true;
      result.checks.token.message = `Token valid (expires in ${tokenData.expires_in}s)`;
      result.token_expires_in = tokenData.expires_in;
    }

    // ✅ CHECK 2: Today's Wearable Data
    const today = new Date().toISOString().split('T')[0];
    
    const { data: autoData, error: dataError } = await supabase
      .from('wearable_auto_data')
      .select('activity, sleep, fetched_at')
      .eq('user_id', user_id)
      .gte('fetched_at', `${today}T00:00:00Z`)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dataError) {
      result.checks.data.message = `Data query error: ${dataError.message}`;
      result.status = 'fail';
    } else if (!autoData) {
      result.checks.data.message = 'No wearable data found for today';
      result.status = 'fail';
      result.fixSuggestion = 'No wearable data today — trigger manual sync or check cron job';
    } else {
      result.checks.data.pass = true;
      result.checks.data.message = `Data synced at ${autoData.fetched_at}`;
      result.last_sync = autoData.fetched_at;

      // Extract steps and calories from activity data
      if (autoData.activity && typeof autoData.activity === 'object') {
        const activity = autoData.activity as any;
        result.steps_today = activity.summary?.steps || 0;
        result.calories_today = activity.summary?.caloriesOut || 0;
      }
    }

    // ✅ CHECK 3: Recent Trends Update
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: trendsData, error: trendsError } = await supabase
      .from('training_trends')
      .select('created_at, date')
      .eq('user_id', user_id)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (trendsError) {
      result.checks.trends.message = `Trends query error: ${trendsError.message}`;
      result.status = 'fail';
    } else if (!trendsData) {
      result.checks.trends.message = 'No trend updates in the past 24 hours';
      result.status = 'fail';
      result.fixSuggestion = 'Trends pipeline stalled — check calc-trends function';
    } else {
      result.checks.trends.pass = true;
      result.checks.trends.message = `Trends updated at ${trendsData.created_at} for date ${trendsData.date}`;
    }

    // ✅ CHECK 4: Cron Job Execution
    const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    
    const { data: cronData, error: cronError } = await supabase
      .from('function_execution_log')
      .select('started_at, status, completed_at')
      .eq('function_name', 'wearable-fetch-data')
      .gte('started_at', ninetyMinutesAgo)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cronError) {
      result.checks.cron.message = `Cron log query error: ${cronError.message}`;
      result.status = 'fail';
    } else if (!cronData) {
      result.checks.cron.message = 'No cron execution found in the past 90 minutes';
      result.status = 'fail';
      result.fixSuggestion = 'Cron job not running — verify wearable-fetch-data schedule';
    } else {
      result.checks.cron.pass = true;
      result.checks.cron.message = `Cron ran at ${cronData.started_at} (status: ${cronData.status})`;
      result.cron_last_run = cronData.started_at;
    }

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Log to function_execution_log
    await supabase.from('function_execution_log').insert({
      function_name: 'wearable-diagnostics',
      user_id,
      status: result.status === 'pass' ? 'success' : 'failed',
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: executionTime,
      metadata: {
        checks: result.checks,
        diagnostics: {
          last_sync: result.last_sync,
          steps_today: result.steps_today,
          calories_today: result.calories_today,
          token_expires_in: result.token_expires_in,
          cron_last_run: result.cron_last_run,
        },
      },
    });


    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const executionTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    console.error('❌ [wearable-diagnostics] Error:', errorMessage);

    // Log error to function_execution_log
    try {
      await supabase.from('function_execution_log').insert({
        function_name: 'wearable-diagnostics',
        status: 'failed',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: executionTime,
        error_message: errorMessage,
      });
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
