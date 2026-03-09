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

    // Log function start
    await supabase.from('function_execution_log').insert({
      id: logId,
      function_name: 'calculate-baseline',
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Get last 30 days of Fitbit data with user UUID mapping
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch fitbit_trends data (user_id is now UUID)
    const { data: fitbitData, error: fetchError } = await supabase
      .from('fitbit_trends')
      .select('user_id, hrv, acwr, ewma, strain, monotony, training_load, acute_load, chronic_load, date')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (fetchError) throw fetchError;


    // Group by user_id and calculate averages
    const userBaselines = new Map();
    
    fitbitData?.forEach((record: any) => {
      const userId = record.user_id;

      if (!userBaselines.has(userId)) {
        userBaselines.set(userId, {
          hrv: [],
          acwr: [],
          ewma: [],
          strain: [],
          monotony: [],
          training_load: [],
          acute_load: [],
          chronic_load: [],
        });
      }
      
      const user = userBaselines.get(userId);
      if (record.hrv) user.hrv.push(record.hrv);
      if (record.acwr) user.acwr.push(record.acwr);
      if (record.ewma) user.ewma.push(record.ewma);
      if (record.strain) user.strain.push(record.strain);
      if (record.monotony) user.monotony.push(record.monotony);
      if (record.training_load) user.training_load.push(record.training_load);
      if (record.acute_load) user.acute_load.push(record.acute_load);
      if (record.chronic_load) user.chronic_load.push(record.chronic_load);
    });

    // Calculate and upsert baselines
    const baselineRecords = [];
    const metrics = ['hrv', 'acwr', 'ewma', 'strain', 'monotony', 'training_load', 'acute_load', 'chronic_load'];
    
    for (const [userId, userMetrics] of userBaselines.entries()) {
      for (const metric of metrics) {
        const values = userMetrics[metric as keyof typeof userMetrics];
        if (values.length > 0) {
          baselineRecords.push({
            user_id: userId,
            metric: metric,
            rolling_avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
            data_window: 30,
          });
        }
      }
    }

    if (baselineRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('user_baselines')
        .upsert(baselineRecords, { onConflict: 'user_id,metric,data_window' });

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
