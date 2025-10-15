import { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Check all required environment variables (without exposing sensitive values)
    const envCheck = {
      FITBIT_CLIENT_ID: {
        exists: !!process.env.FITBIT_CLIENT_ID,
        length: process.env.FITBIT_CLIENT_ID?.length || 0,
      },
      FITBIT_CLIENT_SECRET: {
        exists: !!process.env.FITBIT_CLIENT_SECRET,
        length: process.env.FITBIT_CLIENT_SECRET?.length || 0,
      },
      FITBIT_ACCESS_TOKEN: {
        exists: !!process.env.FITBIT_ACCESS_TOKEN,
        length: process.env.FITBIT_ACCESS_TOKEN?.length || 0,
      },
      FITBIT_REFRESH_TOKEN: {
        exists: !!process.env.FITBIT_REFRESH_TOKEN,
        length: process.env.FITBIT_REFRESH_TOKEN?.length || 0,
      },
      OAUTH_REDIRECT_URI: {
        exists: !!process.env.OAUTH_REDIRECT_URI,
        value: process.env.OAUTH_REDIRECT_URI || "NOT SET",
      },
      SUPABASE_URL: {
        exists: !!process.env.SUPABASE_URL,
        value: process.env.SUPABASE_URL || "NOT SET",
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      },
      URL: {
        exists: !!process.env.URL,
        value: process.env.URL || "NOT SET",
      },
    };

    // Calculate overall health
    const allRequired = [
      'FITBIT_CLIENT_ID',
      'FITBIT_CLIENT_SECRET',
      'OAUTH_REDIRECT_URI',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    const missingRequired = allRequired.filter(key => !envCheck[key].exists);
    const hasTokens = envCheck.FITBIT_ACCESS_TOKEN.exists && envCheck.FITBIT_REFRESH_TOKEN.exists;
    
    const status = {
      overall: missingRequired.length === 0 ? "READY" : "MISSING_REQUIRED",
      requiredVarsPresent: missingRequired.length === 0,
      tokensPresent: hasTokens,
      missingRequired,
      warnings: [] as string[],
    };

    if (!hasTokens) {
      status.warnings.push("No Fitbit tokens found. Complete OAuth flow first.");
    }

    if (!envCheck.URL.exists) {
      status.warnings.push("URL env var not set. Scheduled functions may fail.");
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: true,
        status,
        environment: envCheck,
        timestamp: new Date().toISOString(),
        endpoints: {
          oauth_start: "/auth/fitbit",
          oauth_callback: "/fitbit/callback",
          token_exchange: "/.netlify/functions/fitbit-token-exchange",
          refresh_tokens: "/.netlify/functions/refresh-fitbit-token",
          sync_auto: "/.netlify/functions/sync-auto",
          get_data: "/.netlify/functions/get-fitbit-data",
          manual_sync: "/fitbit-sync-now",
        }
      }, null, 2),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        error: e.message,
      }),
    };
  }
};

export { handler };
