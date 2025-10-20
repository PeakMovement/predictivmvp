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

    // Get user ID mapping first
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, fitbit_user_id');

    if (usersError) throw usersError;

    // Create a map of fitbit_user_id -> UUID
    const userIdMap = new Map();
    usersData?.forEach((user: any) => {
      if (user.fitbit_user_id) {
        userIdMap.set(user.fitbit_user_id, user.id);
      }
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

    // Get health profiles for context-aware risk assessment
    const { data: healthProfiles, error: profileError } = await supabase
      .from('user_health_profiles')
      .select('user_id, profile_data')
      .order('generated_at', { ascending: false });

    if (profileError) console.error('Error fetching health profiles:', profileError);

    // Create profile lookup map (most recent per user)
    const profileMap = new Map();
    healthProfiles?.forEach((p: any) => {
      if (!profileMap.has(p.user_id)) {
        profileMap.set(p.user_id, p.profile_data);
      }
    });

    // Calculate deviations
    const deviationRecords: any[] = [];
    const processedUsers = new Set();
    const metrics = ['hrv', 'acwr', 'ewma', 'strain', 'monotony', 'training_load', 'acute_load', 'chronic_load'];

    recentData?.forEach((record: any) => {
      // Map Fitbit user_id to system UUID
      const systemUserId = userIdMap.get(record.user_id);
      if (!systemUserId) {
        console.log(`Skipping record for unmapped Fitbit user: ${record.user_id}`);
        return;
      }

      // Only process most recent record per user
      if (processedUsers.has(systemUserId)) return;
      processedUsers.add(systemUserId);

      for (const metric of metrics) {
        const baseline = baselineMap.get(`${systemUserId}_${metric}`);
        const currentValue = record[metric];
        const profile = profileMap.get(systemUserId);
        
        if (baseline && currentValue != null) {
          const deviation = ((currentValue - baseline) / baseline) * 100;
          let riskStatus = Math.abs(deviation) < 10 ? 'low' : Math.abs(deviation) < 25 ? 'moderate' : 'high';
          let reasoning = '';

          // Context-aware risk assessment using health profile
          if (profile) {
            const trainingSummary = profile.training_summary;
            const medicalSummary = profile.medical_summary;

            // Training phase awareness for strain/load metrics
            if ((metric === 'strain' || metric === 'training_load') && trainingSummary?.current_phase) {
              const phase = trainingSummary.current_phase.toLowerCase();
              
              if (phase.includes('taper') && deviation > 15) {
                riskStatus = 'high';
                reasoning = `Elevated ${metric} during taper phase - insufficient recovery before race`;
              } else if (phase.includes('build') && deviation > 25 && deviation < 40) {
                riskStatus = 'moderate';
                reasoning = `Build phase allows higher ${metric}, but approaching overtraining threshold`;
              } else if (phase.includes('base') && Math.abs(deviation) < 15) {
                riskStatus = 'low';
                reasoning = `${metric} is stable during base phase - good foundational work`;
              }
            }

            // ACWR-specific training context
            if (metric === 'acwr' && trainingSummary?.weekly_volume) {
              if (currentValue > 1.5) {
                riskStatus = 'high';
                reasoning = `ACWR above 1.5 with ${trainingSummary.weekly_volume} weekly volume - high injury risk`;
              } else if (currentValue < 0.8) {
                riskStatus = 'moderate';
                reasoning = `ACWR below 0.8 - potential detraining or insufficient stimulus`;
              }
            }

            // Medical condition awareness for HRV/recovery metrics
            if ((metric === 'hrv' || metric === 'monotony') && medicalSummary?.active_conditions) {
              const conditions = Array.isArray(medicalSummary.active_conditions) 
                ? medicalSummary.active_conditions 
                : [];
              
              if (metric === 'hrv' && deviation < -20) {
                const respiratoryConditions = conditions.filter((c: string) => 
                  c.toLowerCase().includes('asthma') || 
                  c.toLowerCase().includes('respiratory')
                );
                
                if (respiratoryConditions.length > 0) {
                  riskStatus = 'high';
                  reasoning = `Significant HRV drop with ${respiratoryConditions.join(', ')} history - check respiratory stress and recovery`;
                }
              }

              if (metric === 'monotony' && currentValue > 2.0) {
                const fatigueConditions = conditions.filter((c: string) => 
                  c.toLowerCase().includes('fatigue') || 
                  c.toLowerCase().includes('chronic')
                );
                
                if (fatigueConditions.length > 0) {
                  riskStatus = 'high';
                  reasoning = `High monotony with ${fatigueConditions.join(', ')} - add rest days or cross-training`;
                }
              }
            }

            // Chronic load context for injury-prone users
            if (metric === 'chronic_load' && medicalSummary?.injury_history) {
              const injuries = Array.isArray(medicalSummary.injury_history) 
                ? medicalSummary.injury_history 
                : [];
              
              if (deviation > 30 && injuries.length > 0) {
                riskStatus = 'high';
                reasoning = `Rapid chronic load increase with injury history (${injuries.join(', ')}) - high re-injury risk`;
              }
            }
          }

          // Default reasoning if no context-specific reasoning was set
          if (!reasoning) {
            if (Math.abs(deviation) < 10) {
              reasoning = `${metric} is within normal range - no action needed`;
            } else if (Math.abs(deviation) < 25) {
              reasoning = `${metric} showing moderate deviation - monitor closely`;
            } else {
              reasoning = `${metric} significantly outside baseline - review training/recovery`;
            }
          }
          
          deviationRecords.push({
            user_id: systemUserId,
            metric: metric,
            baseline_value: baseline,
            current_value: currentValue,
            deviation_pct: deviation,
            risk_status: riskStatus,
            reasoning: reasoning,
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
