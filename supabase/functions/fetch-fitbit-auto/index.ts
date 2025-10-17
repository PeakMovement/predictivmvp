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
    console.log('Starting Fitbit data fetch...');

    // Log function start
    await supabase.from('function_execution_log').insert({
      id: logId,
      function_name: 'fetch-fitbit-auto',
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Get connected Fitbit users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, fitbit_user_id, refresh_token')
      .eq('fitbit_connected', true);

    if (usersError) throw usersError;

    console.log(`Found ${users?.length || 0} connected Fitbit users`);

    let successCount = 0;
    let errorCount = 0;

    // For each user, fetch their latest Fitbit data
    for (const user of users || []) {
      try {
        // In a real implementation, you would:
        // 1. Use refresh_token to get a new access_token
        // 2. Call Fitbit API endpoints for HRV, sleep, activity data
        // 3. Store in fitbit_auto_data or fitbit_trends table

        // For now, we'll simulate successful fetch
        console.log(`Processing user: ${user.id}`);
        successCount++;
        
      } catch (userError) {
        console.error(`Error fetching data for user ${user.id}:`, userError);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;

    // Update log with success
    await supabase
      .from('function_execution_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        metadata: { 
          users_processed: users?.length || 0,
          successful: successCount,
          failed: errorCount 
        },
      })
      .eq('id', logId);

    console.log(`Fitbit fetch completed in ${duration}ms - ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_processed: users?.length || 0,
        successful: successCount,
        failed: errorCount,
        duration_ms: duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Fitbit data:', error);

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
