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
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse optional body for bookingId
    let bookingId: string | null = null;
    try {
      const body = await req.json();
      bookingId = body.bookingId || null;
    } catch {
      // No body provided, that's okay
    }

    console.log(`Completing session for user ${user.id}, bookingId: ${bookingId}`);

    // Use service role for update
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find and complete active session
    const { data: session, error: fetchError } = await serviceClient
      .from('medical_finder_sessions')
      .select('id, data')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching session:', fetchError);
      throw fetchError;
    }

    if (!session) {
      console.log('No active session to complete');
      return new Response(
        JSON.stringify({ success: true, message: 'No active session to complete' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update session data with bookingId if provided
    const updatedData = {
      ...session.data,
      ...(bookingId && { bookingId })
    };

    const { error: updateError } = await serviceClient
      .from('medical_finder_sessions')
      .update({
        status: 'completed',
        data: updatedData,
        current_step: 'booking',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Error completing session:', updateError);
      throw updateError;
    }

    console.log(`Session ${session.id} completed successfully`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        message: 'Session completed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Complete session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to complete session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
