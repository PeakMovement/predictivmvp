import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-webhook-signature',
};

interface CalendlyEvent {
  uri: string;
  uuid: string;
  name: string;
  start_time: string;
  end_time: string;
  event_type: string;
}

interface CalendlyInvitee {
  uri: string;
  uuid: string;
  email: string;
  name: string;
}

interface CalendlyWebhookPayload {
  event: string;
  created_at: string;
  created_by: string;
  payload: {
    event: CalendlyEvent;
    invitee: CalendlyInvitee;
    scheduled_event?: {
      uri: string;
      uuid: string;
      start_time: string;
      end_time: string;
    };
    event_type?: {
      uri: string;
      uuid: string;
      name: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook signature for verification (optional but recommended)
    const signature = req.headers.get('calendly-webhook-signature');
    console.log('Calendly webhook received, signature present:', !!signature);

    // Parse the webhook payload
    const body: CalendlyWebhookPayload = await req.json();
    console.log('Webhook event type:', body.event);
    console.log('Payload:', JSON.stringify(body.payload, null, 2));

    // Only process invitee.created events
    if (body.event !== 'invitee.created') {
      console.log(`Ignoring event type: ${body.event}`);
      return new Response(
        JSON.stringify({ success: true, message: `Event ${body.event} ignored` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from payload - handle both v1 and v2 webhook formats
    const eventData = body.payload.scheduled_event || body.payload.event;
    const inviteeData = body.payload.invitee;

    if (!eventData || !inviteeData) {
      console.error('Missing event or invitee data in payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required payload data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendlyEventId = eventData.uuid;
    const appointmentStart = eventData.start_time;
    const appointmentEnd = eventData.end_time;
    const patientName = inviteeData.name;
    const patientEmail = inviteeData.email;

    console.log('Processing booking:', {
      calendlyEventId,
      appointmentStart,
      appointmentEnd,
      patientName,
      patientEmail
    });

    // Check if this event already exists (idempotency)
    const { data: existingBooking } = await supabase
      .from('Bookings')
      .select('id')
      .eq('calendly_event_id', calendlyEventId)
      .maybeSingle();

    if (existingBooking) {
      console.log('Booking already exists for event:', calendlyEventId);
      return new Response(
        JSON.stringify({ success: true, message: 'Booking already exists', bookingId: existingBooking.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to find the user by email to link the booking
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('email', patientEmail)
      .maybeSingle();

    // Insert the booking record
    const { data: booking, error: bookingError } = await supabase
      .from('Bookings')
      .insert({
        calendly_event_id: calendlyEventId,
        appointment_start: appointmentStart,
        appointment_end: appointmentEnd,
        patient_name: patientName,
        patient_email: patientEmail,
        source: 'calendly',
        status: 'confirmed',
        user_id: userRecord?.id || null,
        session_date: appointmentStart, // Keep compatibility with existing field
        session_type: 'consultation'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create booking record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Booking created successfully:', booking.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bookingId: booking.id,
        message: 'Booking created from Calendly webhook'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Calendly webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
