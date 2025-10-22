import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

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
    console.log('🔄 Starting Fitbit auto-sync...');

    // Log function start
    await supabase.from('function_execution_log').insert({
      id: logId,
      function_name: 'fetch-fitbit-auto',
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Parse request body for manual user_id override
    const body = req.body ? await req.json().catch(() => ({})) : {};
    const requestUserId = body.user_id;

    // Resolve user_id: use request body, then auth, then latest from DB
    let userId: string | null = requestUserId;

    if (!userId) {
      // Try to get from fitbit_auto_data
      const { data: recentData } = await supabase
        .from('fitbit_auto_data')
        .select('user_id')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      userId = recentData?.user_id || null;
    }

    if (!userId) {
      // Fallback to hardcoded user
      userId = '8e3d1538-25f2-4270-9acc-da17b9106aa9';
    }

    console.log(`📍 Resolved user_id: ${userId}`);

    // Get valid access token with refresh if needed
    const accessToken = await getValidToken(supabase, userId);
    
    // Fetch today's activity data from Fitbit
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Fetching Fitbit data for date: ${today}`);
    
    const activityResponse = await fetch(
      `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!activityResponse.ok) {
      const errorText = await activityResponse.text();
      console.error(`❌ Fitbit API error: ${activityResponse.status} - ${errorText}`);
      throw new Error(`Fitbit API error: ${activityResponse.status}`);
    }

    const activityData = await activityResponse.json();
    console.log(`✅ Activity data received - Steps: ${activityData.summary?.steps}, Calories: ${activityData.summary?.caloriesOut}`);

    // Fetch sleep data from Fitbit
    const sleepResponse = await fetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let sleepData = null;
    if (sleepResponse.ok) {
      sleepData = await sleepResponse.json();
      console.log(`✅ Sleep data received - Records: ${sleepData.sleep?.length || 0}`);
    } else {
      console.log(`⚠️ Sleep data unavailable (${sleepResponse.status})`);
    }

    // Check if today's data already exists
    const { data: existingData } = await supabase
      .from('fitbit_auto_data')
      .select('id, activity')
      .eq('user_id', userId)
      .gte('fetched_at', `${today}T00:00:00`)
      .lte('fetched_at', `${today}T23:59:59`)
      .maybeSingle();

    // Prepare merged data with proper structure
    const existingTokens = existingData ? (existingData.activity as any)?.tokens : null;
    const mergedActivity = {
      tokens: existingTokens || {},
      data: activityData,
      synced_at: new Date().toISOString(),
    };

    const mergedSleep = sleepData ? {
      data: sleepData,
      synced_at: new Date().toISOString(),
    } : null;

    let dbError;
    if (existingData) {
      // Update existing record
      const updateData: any = {
        activity: mergedActivity,
        fetched_at: new Date().toISOString(),
      };
      if (mergedSleep) {
        updateData.sleep = mergedSleep;
      }
      const { error } = await supabase
        .from('fitbit_auto_data')
        .update(updateData)
        .eq('id', existingData.id);
      dbError = error;
      console.log('📝 Updated existing record');
    } else {
      // Insert new record
      const insertData: any = {
        user_id: userId,
        activity: mergedActivity,
        fetched_at: new Date().toISOString(),
      };
      if (mergedSleep) {
        insertData.sleep = mergedSleep;
      }
      const { error } = await supabase
        .from('fitbit_auto_data')
        .insert(insertData);
      dbError = error;
      console.log('✨ Inserted new record');
    }

    if (dbError) {
      console.error(`❌ Database error: ${dbError.message}`);
      throw new Error(`Database error: ${dbError.message}`);
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
          user_id: userId,
          steps: activityData.summary?.steps,
          calories: activityData.summary?.caloriesOut,
          has_sleep: !!sleepData,
        },
      })
      .eq('id', logId);

    console.log(`✅ Fitbit sync complete in ${duration}ms`);

    // Trigger trend calculation in background (don't await)
    fetch(`https://predictiv.netlify.app/.netlify/functions/calc-trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    }).then(response => {
      if (response.ok) {
        console.log('✅ Calc-trends triggered successfully');
      } else {
        console.log(`⚠️ Calc-trends failed: ${response.status}`);
      }
    }).catch(error => {
      console.error(`❌ Calc-trends trigger error: ${error.message}`);
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
        data: {
          steps: activityData.summary?.steps,
          calories: activityData.summary?.caloriesOut,
          has_sleep: !!sleepData,
        },
        synced_at: new Date().toISOString(),
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fitbit sync failed:', error);

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

/**
 * Get valid access token, refresh if expired
 */
async function getValidToken(supabase: any, userId: string): Promise<string> {
  // Get tokens from fitbit_auto_data
  const { data: tokenData, error: tokenError } = await supabase
    .from('fitbit_auto_data')
    .select('activity')
    .eq('user_id', userId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tokenError || !tokenData) {
    throw new Error('No Fitbit tokens found. Please reconnect Fitbit.');
  }

  const tokens = (tokenData.activity as any)?.tokens as TokenData;
  if (!tokens?.access_token) {
    throw new Error('Invalid token data. Please reconnect Fitbit.');
  }

  // Check if token is expired
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const isExpired = expiresAt <= now;

  if (!isExpired) {
    console.log('✅ Using existing access token');
    return tokens.access_token;
  }

  // Token expired, refresh it
  console.log('🔄 Refreshing expired access token...');
  const clientId = Deno.env.get('FITBIT_CLIENT_ID');
  const clientSecret = Deno.env.get('FITBIT_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing Fitbit credentials');
  }

  const refreshResponse = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text();
    console.error(`❌ Token refresh failed: ${refreshResponse.status} - ${errorText}`);
    throw new Error(`Token refresh failed: ${refreshResponse.status}`);
  }

  const newTokens = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update tokens in database
  const updatedActivity = {
    ...tokenData.activity,
    tokens: {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      expires_at: newExpiresAt,
      token_type: newTokens.token_type,
      scope: newTokens.scope,
    },
  };

  await supabase
    .from('fitbit_auto_data')
    .update({ activity: updatedActivity })
    .eq('user_id', userId)
    .order('fetched_at', { ascending: false })
    .limit(1);

  console.log('✅ Token refreshed successfully');
  return newTokens.access_token;
}
