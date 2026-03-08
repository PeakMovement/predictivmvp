import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

// Signature verification using HMAC-SHA256
async function verifyCalendlySignature(
  payload: string, 
  signature: string | null,
  signingKey: string | null
): Promise<{ valid: boolean; reason: string }> {
  // If no signing key configured, log warning but allow (graceful fallback)
  if (!signingKey) {
    console.warn('[calendly-webhook] No CALENDLY_WEBHOOK_SIGNING_KEY configured - skipping signature verification');
    return { valid: true, reason: 'no_key_configured' };
  }

  // If signing key is set but no signature provided, reject
  if (!signature) {
    console.error('[calendly-webhook] Missing signature header but signing key is configured');
    return { valid: false, reason: 'missing_signature' };
  }

  try {
    // Calendly signature format: t=<timestamp>,v1=<signature>
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return { valid: false, reason: 'invalid_signature_format' };
    }

    const timestamp = timestampPart.substring(2);
    const providedSignature = signaturePart.substring(3);

    // Check timestamp is within 5 minutes (300 seconds)
    const requestTime = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    if (Math.abs(now - requestTime) > 300000) {
      console.error('[calendly-webhook] Signature timestamp too old');
      return { valid: false, reason: 'timestamp_expired' };
    }

    // Generate expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== providedSignature) {
      console.error('[calendly-webhook] Signature mismatch');
      return { valid: false, reason: 'signature_mismatch' };
    }

    return { valid: true, reason: 'verified' };
  } catch (err) {
    console.error('[calendly-webhook] Signature verification error:', err);
    return { valid: false, reason: 'verification_error' };
  }
}

// Send booking confirmation email via Resend
async function sendBookingConfirmationEmail(
  resend: Resend,
  patientEmail: string,
  patientName: string,
  appointmentStart: string,
  appointmentEnd: string,
  physicianName?: string
): Promise<{ success: boolean; emailId?: string }> {
  try {
    const startDate = new Date(appointmentStart);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #111118; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a35;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                ✓ Appointment Confirmed
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #e4e4e7;">
                Hi ${patientName},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #e4e4e7;">
                Your medical appointment has been successfully scheduled.
              </p>
              
              <div style="background-color: #1a1a24; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #a1a1aa;">
                  Appointment Details
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Date</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; font-weight: 600;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Time</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; font-weight: 600;">${formattedTime}</td>
                  </tr>
                  ${physicianName ? `
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Provider</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; font-weight: 600;">${physicianName}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa;">
                You will receive a calendar invite with the meeting link and additional details shortly.
              </p>
              
              <a href="https://predictiv.netlify.app" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                View in Predictiv App
              </a>
            </div>
            
            <!-- Footer -->
            <div style="padding: 24px 32px; background-color: #0a0a0f; text-align: center; border-top: 1px solid #2a2a35;">
              <p style="margin: 0; font-size: 12px; color: #71717a;">
                This confirmation was sent by Predictiv after your Calendly booking.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: 'Predictiv <appointments@resend.dev>',
      to: [patientEmail],
      subject: `✓ Appointment Confirmed - ${formattedDate} at ${formattedTime}`,
      html: emailHtml,
    });

    console.log('[calendly-webhook] Confirmation email sent:', response);
    return { success: true, emailId: response.data?.id };
  } catch (err) {
    console.error('[calendly-webhook] Failed to send confirmation email:', err);
    return { success: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const calendlySigningKey = Deno.env.get('CALENDLY_WEBHOOK_SIGNING_KEY') || null;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook signature for verification
    const signature = req.headers.get('calendly-webhook-signature');
    
    // Clone request to read body twice (for verification and parsing)
    const rawBody = await req.text();
    
    // Verify signature
    const { valid, reason } = await verifyCalendlySignature(rawBody, signature, calendlySigningKey);
    
    if (!valid) {
      console.error('[calendly-webhook] Signature verification failed:', reason);
      return new Response(
        JSON.stringify({ success: false, error: `Signature verification failed: ${reason}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[calendly-webhook] Signature verification:', reason);

    // Parse the webhook payload
    const body: CalendlyWebhookPayload = JSON.parse(rawBody);
    console.log('[calendly-webhook] Event type:', body.event);

    // Only process invitee.created events
    if (body.event !== 'invitee.created') {
      console.log(`[calendly-webhook] Ignoring event type: ${body.event}`);
      return new Response(
        JSON.stringify({ success: true, message: `Event ${body.event} ignored` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from payload - handle both v1 and v2 webhook formats
    const eventData = body.payload.scheduled_event || body.payload.event;
    const inviteeData = body.payload.invitee;

    if (!eventData || !inviteeData) {
      console.error('[calendly-webhook] Missing event or invitee data in payload');
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

    console.log('[calendly-webhook] Processing booking:', {
      calendlyEventId,
      appointmentStart,
      appointmentEnd,
      patientName,
      patientEmail
    });

    // IDEMPOTENCY CHECK: Check if this event already exists
    const { data: existingBooking } = await supabase
      .from('Bookings')
      .select('id, status')
      .eq('calendly_event_id', calendlyEventId)
      .maybeSingle();

    if (existingBooking) {
      console.log('[calendly-webhook] Booking already exists for event:', calendlyEventId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Booking already exists (idempotent)', 
          bookingId: existingBooking.id,
          duplicate: true
        }),
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
      console.error('[calendly-webhook] Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create booking record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[calendly-webhook] Booking created successfully:', booking.id);

    // INTERNAL NOTIFICATION: Log to notification_log table (idempotent via booking check above)
    await supabase.from('notification_log').insert({
      recipient: userRecord?.id || patientEmail,
      message: `[booking_confirmed] Calendly appointment scheduled for ${new Date(appointmentStart).toLocaleDateString()}`,
      status: 'logged',
    });
    console.log('[calendly-webhook] Internal notification logged');

    // EMAIL NOTIFICATION: Send confirmation email (only if Resend is configured)
    let emailSent = false;
    let emailId: string | undefined;

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const emailResult = await sendBookingConfirmationEmail(
        resend,
        patientEmail,
        patientName,
        appointmentStart,
        appointmentEnd
      );
      emailSent = emailResult.success;
      emailId = emailResult.emailId;

      // Log email notification
      if (emailSent) {
        await supabase.from('notification_log').insert({
          recipient: patientEmail,
          message: `[email_sent] Booking confirmation email sent for booking ${booking.id}`,
          status: 'sent',
        });
      }
    } else {
      console.warn('[calendly-webhook] RESEND_API_KEY not configured - skipping email notification');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        bookingId: booking.id,
        message: 'Booking created from Calendly webhook',
        notifications: {
          internalLog: true,
          emailSent,
          emailId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calendly-webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
