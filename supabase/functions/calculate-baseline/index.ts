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
    console.log('Starting baseline calculation...');

    // Log function start
    await supabase.from('function_execution_log').insert({
      id: logId,
      function_name: 'calculate-baseline',
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Get last 30 days of Fitbit data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: fitbitData, error: fetchError } = await supabase
      .from('fitbit_trends')
      .select('user_id, hrv, acwr, date')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (fetchError) throw fetchError;

    console.log(`Fetched ${fitbitData?.length || 0} records for baseline calculation`);

    // Group by user_id and calculate averages
    const userBaselines = new Map();
    
    fitbitData?.forEach((record: any) => {
      if (!userBaselines.has(record.user_id)) {
        userBaselines.set(record.user_id, {
          hrv: [],
          acwr: [],
        });
      }
      
      const user = userBaselines.get(record.user_id);
      if (record.hrv) user.hrv.push(record.hrv);
      if (record.acwr) user.acwr.push(record.acwr);
    });

    // Calculate and upsert baselines
    const baselineRecords = [];
    for (const [userId, metrics] of userBaselines.entries()) {
      if (metrics.hrv.length > 0) {
        baselineRecords.push({
          user_id: userId,
          metric: 'hrv',
          rolling_avg: metrics.hrv.reduce((a: number, b: number) => a + b, 0) / metrics.hrv.length,
          data_window: 30,
        });
      }
      if (metrics.acwr.length > 0) {
        baselineRecords.push({
          user_id: userId,
          metric: 'acwr',
          rolling_avg: metrics.acwr.reduce((a: number, b: number) => a + b, 0) / metrics.acwr.length,
          data_window: 30,
        });
      }
    }

    if (baselineRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('user_baselines')
        .upsert(baselineRecords, { onConflict: 'user_id,metric' });

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
        metadata: { records_processed: fitbitData?.length || 0, baselines_created: baselineRecords.length },
      })
      .eq('id', logId);

    console.log(`Baseline calculation completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        records_processed: fitbitData?.length || 0,
        baselines_created: baselineRecords.length,
        duration_ms: duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating baseline:', error);

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
