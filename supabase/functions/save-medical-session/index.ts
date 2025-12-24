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

    const { currentStep, data } = await req.json();
    console.log(`Saving session for user ${user.id}, step: ${currentStep}`);

    if (!currentStep) {
      return new Response(
        JSON.stringify({ error: 'currentStep is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for upsert to bypass RLS for the check
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for existing active session
    const { data: existingSession, error: fetchError } = await serviceClient
      .from('medical_finder_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing session:', fetchError);
      throw fetchError;
    }

    let sessionId: string;
    let result;

    if (existingSession) {
      // Update existing active session
      console.log(`Updating existing session ${existingSession.id}`);
      const { data: updated, error: updateError } = await serviceClient
        .from('medical_finder_sessions')
        .update({
          current_step: currentStep,
          data: data || {},
          last_updated_at: new Date().toISOString()
        })
        .eq('id', existingSession.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating session:', updateError);
        throw updateError;
      }
      result = updated;
      sessionId = existingSession.id;
    } else {
      // Create new session
      console.log('Creating new session');
      const { data: created, error: insertError } = await serviceClient
        .from('medical_finder_sessions')
        .insert({
          user_id: user.id,
          current_step: currentStep,
          data: data || {},
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating session:', insertError);
        throw insertError;
      }
      result = created;
      sessionId = created.id;
    }

    console.log(`Session saved successfully: ${sessionId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId,
        session: result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Save session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to save session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
