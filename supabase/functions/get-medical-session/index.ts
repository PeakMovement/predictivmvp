import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ exists: false, session: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('No authenticated user, returning no session');
      return new Response(
        JSON.stringify({ exists: false, session: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching active session for user ${user.id}`);

    // Fetch active session for user
    const { data: session, error: fetchError } = await supabase
      .from('medical_finder_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching session:', fetchError);
      throw fetchError;
    }

    if (!session) {
      console.log('No active session found');
      return new Response(
        JSON.stringify({ exists: false, session: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform to match expected format
    const formattedSession = {
      id: session.id,
      userId: session.user_id,
      status: session.status,
      currentStep: session.current_step,
      data: session.data,
      createdAt: session.created_at,
      lastUpdatedAt: session.last_updated_at
    };

    console.log(`Found active session: ${session.id}, step: ${session.current_step}`);
    return new Response(
      JSON.stringify({ 
        exists: true, 
        session: formattedSession 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get session error:', error);
    return new Response(
      JSON.stringify({ exists: false, session: null, error: error instanceof Error ? error.message : 'Failed to get session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
