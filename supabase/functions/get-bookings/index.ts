import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get auth header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching bookings for user: ${user.id}`);

    // Parse query params
    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // optional filter
    const upcoming = url.searchParams.get('upcoming') === 'true';

    // Build query
    let query = supabase
      .from('Bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (upcoming) {
      query = query.gte('session_date', new Date().toISOString());
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      console.error("Bookings fetch error:", bookingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get physician details for each booking
    const physicianIds = [...new Set(bookings?.map(b => b.clinician_id).filter(Boolean))];
    
    let physicians: Record<string, any> = {};
    if (physicianIds.length > 0) {
      const { data: physicianData } = await supabase
        .from('physicians')
        .select('id, name, specialty, phone, email, location, telehealth_available')
        .in('id', physicianIds);
      
      physicians = (physicianData || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
    }

    // Enrich bookings with physician info
    const enrichedBookings = (bookings || []).map(booking => ({
      id: booking.id,
      sessionDate: booking.session_date,
      sessionType: booking.session_type,
      status: booking.status,
      physician: booking.clinician_id ? physicians[booking.clinician_id] || null : null
    }));

    console.log(`Found ${enrichedBookings.length} bookings`);

    return new Response(
      JSON.stringify({
        success: true,
        bookings: enrichedBookings,
        count: enrichedBookings.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Get bookings error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
