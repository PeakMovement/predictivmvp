import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  const logId = crypto.randomUUID();

  try {
    console.log('Starting deviation calculation...');

    // Log function start
    await supabase.from('function_execution_log').insert({
      id: logId,
      function_name: 'calculate-deviation',
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Get latest Fitbit data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentData, error: recentError } = await supabase
      .from('fitbit_trends')
      .select('user_id, hrv, acwr, ewma, strain, monotony, training_load, acute_load, chronic_load, date')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (recentError) throw recentError;

    console.log(`Fetched ${recentData?.length || 0} recent records`);

    // Get baselines
    const { data: baselines, error: baselineError } = await supabase
      .from('user_baselines')
      .select('user_id, metric, rolling_avg');

    if (baselineError) throw baselineError;

    // Create baseline lookup map
    const baselineMap = new Map();
    baselines?.forEach((b: any) => {
      const key = `${b.user_id}_${b.metric}`;
      baselineMap.set(key, b.rolling_avg);
    });

    // Calculate deviations
    const deviationRecords: any[] = [];
    const processedUsers = new Set();
    const metrics = ['hrv', 'acwr', 'ewma', 'strain', 'monotony', 'training_load', 'acute_load', 'chronic_load'];

    recentData?.forEach((record: any) => {
      // Only process most recent record per user
      if (processedUsers.has(record.user_id)) return;
      processedUsers.add(record.user_id);

      for (const metric of metrics) {
        const baseline = baselineMap.get(`${record.user_id}_${metric}`);
        const currentValue = record[metric];
        
        if (baseline && currentValue != null) {
          const deviation = ((currentValue - baseline) / baseline) * 100;
          const riskStatus = Math.abs(deviation) < 10 ? 'low' : Math.abs(deviation) < 25 ? 'moderate' : 'high';
          
          deviationRecords.push({
            user_id: record.user_id,
            metric: metric,
            baseline_value: baseline,
            current_value: currentValue,
            deviation_pct: deviation,
            risk_status: riskStatus,
          });
        }
      }
    });

    if (deviationRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('yves_profiles')
        .upsert(deviationRecords, { onConflict: 'user_id,metric' });

      if (upsertError) throw upsertError;
    }

    const duration = Date.now() - startTime;

    // Update log with success
    await supabase
      .from('function_execution_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        metadata: { records_processed: recentData?.length || 0, deviations_calculated: deviationRecords.length },
      })
      .eq('id', logId);

    console.log(`Deviation calculation completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        records_processed: recentData?.length || 0,
        deviations_calculated: deviationRecords.length,
        duration_ms: duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating deviation:', error);

    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update log with failure
    await supabase
      .from('function_execution_log')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: errorMessage,
      })
      .eq('id', logId);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
