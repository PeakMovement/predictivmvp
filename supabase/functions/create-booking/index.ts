import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  physicianId: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType?: string;
  notes?: string;
}

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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing booking request for user: ${user.id}`);

    // Parse request body
    const body: BookingRequest = await req.json();
    const { physicianId, appointmentDate, appointmentTime, sessionType, notes } = body;

    // Validate required fields
    if (!physicianId || !appointmentDate || !appointmentTime) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: physicianId, appointmentDate, appointmentTime' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentDate)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(appointmentTime)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid time format. Use HH:MM' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if appointment is in the future
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
    if (appointmentDateTime <= new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Appointment must be in the future' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify physician exists and is accepting patients
    const { data: physician, error: physicianError } = await supabase
      .from('physicians')
      .select('*')
      .eq('id', physicianId)
      .maybeSingle();

    if (physicianError) {
      console.error("Physician lookup error:", physicianError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error looking up physician' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!physician) {
      return new Response(
        JSON.stringify({ success: false, error: 'Physician not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!physician.accepting_new_patients) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This physician is not currently accepting new patients' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check availability based on physician's availability field
    const dayOfWeek = appointmentDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const isWeekday = !['saturday', 'sunday'].includes(dayOfWeek);
    
    if (physician.availability === 'weekdays' && !isWeekday) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This physician is only available on weekdays' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing booking at the same time (for same physician)
    const { data: existingBooking } = await supabase
      .from('Bookings')
      .select('id')
      .eq('clinician_id', physicianId)
      .eq('session_date', appointmentDateTime.toISOString())
      .eq('status', 'confirmed')
      .maybeSingle();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This time slot is already booked' 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the booking using service role for insert
    const supabaseService = createClient(
      supabaseUrl, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const endDateTime = new Date(appointmentDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);

    const { data: booking, error: bookingError } = await supabaseService
      .from('Bookings')
      .insert({
        user_id: user.id,
        clinician_id: physicianId,
        session_date: appointmentDateTime.toISOString(),
        appointment_start: appointmentDateTime.toISOString(),
        appointment_end: endDateTime.toISOString(),
        session_type: sessionType || 'In-Person',
        status: 'confirmed',
        source: 'native',
        patient_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        patient_email: user.email,
        notes: notes || null
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Booking created successfully: ${booking.id}`);

    // Send confirmation email asynchronously
    try {
      await supabaseService.functions.invoke('send-booking-confirmation', {
        body: {
          booking_id: booking.id,
          user_email: user.email
        }
      });
      console.log('Confirmation email sent');
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    // Return success with full booking details
    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        physician: {
          id: physician.id,
          name: physician.name,
          specialty: physician.specialty,
          phone: physician.phone,
          email: physician.email,
          location: physician.location
        },
        appointment: {
          date: appointmentDate,
          time: appointmentTime,
          dateTime: appointmentDateTime.toISOString(),
          sessionType: booking.session_type
        },
        status: booking.status,
        source: 'native',
        userId: user.id,
        createdAt: booking.created_at,
        message: `Appointment confirmed with ${physician.name} on ${appointmentDate} at ${appointmentTime}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Booking error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
