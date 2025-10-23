import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FitbitTokens {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  fitbit_user_id?: string;
  token_type: string;
  scope: string;
  updated_at: string;
  created_at: string;
}

interface FitbitActivityData {
  summary?: {
    steps?: number;
    caloriesOut?: number;
    distance?: number;
    activeMinutes?: number;
  };
  activities?: any[];
}

interface FitbitSleepData {
  sleep?: any[];
  summary?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 [fetch-fitbit-auto] Starting Fitbit data fetch...');

    // Parse and validate user_id from request body
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;

    if (!userId) {
      console.error('❌ Missing user_id in request body');
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📍 [fetch-fitbit-auto] User ID: ${userId}`);

    // Step 1: Load tokens from fitbit_tokens table
    console.log('🔑 [fetch-fitbit-auto] Loading tokens from fitbit_tokens table...');
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('fitbit_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      console.error('❌ [fetch-fitbit-auto] No tokens found in fitbit_tokens table');
      return new Response(
        JSON.stringify({ 
          error: 'No Fitbit tokens found',
          reconnect: true,
          message: 'Please reconnect your Fitbit account in Settings'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [fetch-fitbit-auto] Tokens loaded successfully');

    // Step 2: Get valid access token (refresh if needed)
    const accessToken = await getValidToken(supabase, tokenRecord);

    // Step 3: Fetch activity data from Fitbit API
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 [fetch-fitbit-auto] Fetching activity data for ${today}...`);

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
      console.error(`❌ [fetch-fitbit-auto] Fitbit activity API error: ${activityResponse.status} - ${errorText}`);

      if (activityResponse.status === 401) {
        // Token might be invalid even after refresh
        return new Response(
          JSON.stringify({
            error: 'Fitbit authentication failed',
            reconnect: true,
            message: 'Please reconnect your Fitbit account in Settings'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Fitbit API error: ${activityResponse.status}`);
    }

    const activityData: FitbitActivityData = await activityResponse.json();
    const activityCount = activityData.activities?.length || 0;
    console.log(`✅ [fetch-fitbit-auto] Activity data fetched - Steps: ${activityData.summary?.steps}, Calories: ${activityData.summary?.caloriesOut}, Activities: ${activityCount}`);

    // Step 4: Fetch sleep data from Fitbit API
    console.log(`😴 [fetch-fitbit-auto] Fetching sleep data for ${today}...`);
    const sleepResponse = await fetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let sleepData: FitbitSleepData | null = null;
    let sleepCount = 0;
    if (sleepResponse.ok) {
      sleepData = await sleepResponse.json();
      sleepCount = sleepData?.sleep?.length || 0;
      console.log(`✅ [fetch-fitbit-auto] Sleep data fetched - Records: ${sleepCount}`);
    } else {
      console.log(`⚠️ [fetch-fitbit-auto] Sleep data unavailable (${sleepResponse.status})`);
    }

    // Step 5: Upsert data into fitbit_auto_data
    console.log('💾 [fetch-fitbit-auto] Upserting data into fitbit_auto_data...');

    const mergedActivity = {
      data: activityData,
      synced_at: new Date().toISOString(),
    };

    const mergedSleep = sleepData ? {
      data: sleepData,
      synced_at: new Date().toISOString(),
    } : null;

    // Check if today's data already exists
    const { data: existingData } = await supabase
      .from('fitbit_auto_data')
      .select('id')
      .eq('user_id', userId)
      .gte('fetched_at', `${today}T00:00:00`)
      .lte('fetched_at', `${today}T23:59:59`)
      .maybeSingle();

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
      console.log('📝 [fetch-fitbit-auto] Updated existing record');
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
      console.log('✨ [fetch-fitbit-auto] Inserted new record');
    }

    if (dbError) {
      console.error(`❌ [fetch-fitbit-auto] Database error: ${dbError.message}`);
      throw new Error(`Database error: ${dbError.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ [fetch-fitbit-auto] Data sync completed in ${duration}ms`);

    // Step 6: Trigger calc-trends function
    console.log('📊 [fetch-fitbit-auto] Triggering calc-trends...');
    fetch(`https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/calc-trends`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ user_id: userId })
    }).then(async (trendResponse) => {
      if (trendResponse.ok) {
        console.log('✅ [fetch-fitbit-auto] calc-trends triggered successfully');
      } else {
        const errorText = await trendResponse.text();
        console.log(`⚠️ [fetch-fitbit-auto] calc-trends failed: ${trendResponse.status} - ${errorText}`);
      }
    }).catch((trendError: any) => {
      console.error(`❌ [fetch-fitbit-auto] calc-trends trigger error: ${trendError instanceof Error ? trendError.message : String(trendError)}`);
    });

    console.log(`✅ [fetch-fitbit-auto] Fetch complete - Duration: ${duration}ms`);

    // Return structured response
    return new Response(
      JSON.stringify({
        user_id: userId,
        activities: activityCount,
        sleep_records: sleepCount,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        summary: {
          steps: activityData.summary?.steps || 0,
          calories: activityData.summary?.caloriesOut || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [fetch-fitbit-auto] Error after ${duration}ms:`, errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        status: 'failed',
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Get valid access token, refresh if needed
 */
async function getValidToken(supabase: any, tokenRecord: FitbitTokens): Promise<string> {
  console.log('🔍 [getValidToken] Checking token expiration...');

  const now = Date.now();
  const tokenAge = now - new Date(tokenRecord.updated_at).getTime();
  const expiresInMs = tokenRecord.expires_in * 1000;
  const timeUntilExpiry = expiresInMs - tokenAge;
  const needsRefresh = timeUntilExpiry < 360000; // Refresh if less than 360 seconds (6 minutes)

  console.log(`⏰ [getValidToken] Token age: ${Math.round(tokenAge / 1000)}s, Expires in: ${tokenRecord.expires_in}s, Time until expiry: ${Math.round(timeUntilExpiry / 1000)}s`);

  if (!needsRefresh) {
    console.log('✅ [getValidToken] Token is valid, using existing access token');
    return tokenRecord.access_token;
  }

  // Token needs refresh
  console.log('🔄 [getValidToken] Token expired or expiring soon, refreshing...');

  const clientId = Deno.env.get('FITBIT_CLIENT_ID');
  const clientSecret = Deno.env.get('FITBIT_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing FITBIT_CLIENT_ID or FITBIT_CLIENT_SECRET environment variables');
  }

  const refreshResponse = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRecord.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text();
    console.error(`❌ [getValidToken] Token refresh failed: ${refreshResponse.status} - ${errorText}`);

    // Check for invalid_grant error
    if (errorText.includes('invalid_grant') || errorText.includes('refresh_token') && refreshResponse.status === 400) {
      throw new Error('refresh_token_invalid');
    }

    throw new Error(`Token refresh failed (${refreshResponse.status}). Please reconnect Fitbit in Settings.`);
  }

  const newTokens = await refreshResponse.json();
  console.log(`✅ [getValidToken] Token refreshed successfully, expires in ${newTokens.expires_in}s`);

  // Update tokens in fitbit_tokens table
  const { error: updateError } = await supabase
    .from('fitbit_tokens')
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokenRecord.refresh_token,
      expires_in: newTokens.expires_in,
      token_type: newTokens.token_type || tokenRecord.token_type,
      scope: newTokens.scope || tokenRecord.scope,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', tokenRecord.user_id);

  if (updateError) {
    console.error(`⚠️ [getValidToken] Failed to update tokens in database: ${updateError.message}`);
    // Don't throw - we have the new token, just couldn't save it
  } else {
    console.log('✅ [getValidToken] Tokens updated in database');
  }

  return newTokens.access_token;
}
