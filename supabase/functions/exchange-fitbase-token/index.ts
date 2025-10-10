import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('FITBASE_CLIENT_ID');
    const clientSecret = Deno.env.get('FITBASE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Missing Fitbase credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create base64 encoded credentials for Basic Auth
    const credentials = btoa(`${clientId}:${clientSecret}`);

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        redirect_uri: 'https://predictiv.netlify.com/auth/fitbase',
        code: code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Fitbase token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to exchange authorization code for tokens' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Extract the important data
    const { access_token, refresh_token, user_id } = tokenData;

    // Return the token data (the client will store it in the Users table)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token exchange successful',
        data: {
          access_token,
          refresh_token,
          user_id,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in exchange-fitbase-token function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
