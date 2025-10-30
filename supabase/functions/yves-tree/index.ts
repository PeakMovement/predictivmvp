import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[yves-tree] Fetching tree data for user ${user.id}`);

    const { data: trendData, error: trendError } = await supabase
      .from('fitbit_trends')
      .select('date, strain, hrv_score, sleep_efficiency, resting_heart_rate')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(30);

    if (trendError) {
      console.error('[yves-tree] Error fetching trends:', trendError);
    }

    const { data: profileData } = await supabase
      .from('yves_profiles')
      .select('risk_score, recommended_actions, generated_at')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const chartData = (trendData || []).map((row) => {
      const strain = row.strain || 0;
      const hrv = row.hrv_score || 0;
      const sleep = row.sleep_efficiency || 0;

      const value = strain > 15 ? strain / 100 : (100 - hrv) / 100;

      let label = 'Stable';
      let color = '#22c55e';

      if (strain > 15 || hrv < 50) {
        label = 'Elevated strain';
        color = '#ef4444';
      } else if (sleep < 75) {
        label = 'Poor recovery';
        color = '#f59e0b';
      } else if (hrv > 70 && sleep > 85) {
        label = 'Optimal';
        color = '#3b82f6';
      }

      return {
        date: row.date,
        value: Math.min(value, 1),
        label,
        color,
        strain: row.strain,
        hrv: row.hrv_score,
        sleep: row.sleep_efficiency,
        rhr: row.resting_heart_rate
      };
    });

    console.log(`[yves-tree] Returning ${chartData.length} data points`);

    return new Response(
      JSON.stringify({
        chart: chartData,
        profile: profileData,
        dataPoints: chartData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[yves-tree] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
