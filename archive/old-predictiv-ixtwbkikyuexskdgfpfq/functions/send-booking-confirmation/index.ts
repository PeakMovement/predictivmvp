import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookingConfirmationRequest {
  booking_id: string;
  user_email?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BookingConfirmationRequest = await req.json();

    if (!body.booking_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: booking_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("Bookings")
      .select(`
        *,
        physician:physicians (
          name,
          specialty,
          sub_specialty,
          location,
          address,
          city,
          state,
          phone,
          email,
          telehealth_available
        )
      `)
      .eq("id", body.booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("[send-booking-confirmation] Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userEmail = body.user_email || booking.patient_email;

    if (!userEmail && booking.user_id) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(booking.user_id);
      if (!userError && userData?.user?.email) {
        userEmail = userData.user.email;
      }
    }

    if (!userEmail) {
      console.error("[send-booking-confirmation] No email found for user");
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const physician = booking.physician;
    const appointmentDate = new Date(booking.appointment_start || booking.session_date);
    const formattedDate = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const sessionType = booking.session_type || "In-Person";
    const isVirtual = sessionType.toLowerCase().includes("telehealth") || sessionType.toLowerCase().includes("virtual");
    const location = isVirtual
      ? "Virtual Appointment (Link will be sent separately)"
      : `${physician.address || physician.location || ''}, ${physician.city || ''}, ${physician.state || ''}`.trim();

    const calendarStartTime = appointmentDate.toISOString().replace(/-|:|\.\d+/g, '');
    const endDate = new Date(appointmentDate);
    endDate.setHours(endDate.getHours() + 1);
    const calendarEndTime = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Appointment+with+${encodeURIComponent(physician.name)}&dates=${calendarStartTime}/${calendarEndTime}&details=${encodeURIComponent(`Appointment with ${physician.name}, ${physician.specialty}`)}&location=${encodeURIComponent(location)}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #111118; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a35;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
              <div style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px;">
                ✓
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                Appointment Confirmed!
              </h1>
            </div>

            <div style="padding: 32px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #e4e4e7;">
                Your appointment has been successfully booked. We look forward to seeing you!
              </p>

              <div style="background-color: #1a1a24; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px; font-size: 18px; color: #10b981; border-bottom: 1px solid #2a2a35; padding-bottom: 12px;">
                  Appointment Details
                </h2>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; vertical-align: top;">
                      <strong>Confirmation #</strong>
                    </td>
                    <td style="padding: 12px 0; color: #ffffff; font-size: 14px; text-align: right; font-family: monospace;">
                      ${booking.id.substring(0, 8).toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; vertical-align: top;">
                      <strong>Provider</strong>
                    </td>
                    <td style="padding: 12px 0; color: #ffffff; font-size: 14px; text-align: right;">
                      ${physician.name}<br/>
                      <span style="color: #a1a1aa; font-size: 13px;">${physician.specialty}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; vertical-align: top;">
                      <strong>Date & Time</strong>
                    </td>
                    <td style="padding: 12px 0; color: #ffffff; font-size: 14px; text-align: right;">
                      ${formattedDate}<br/>
                      <span style="color: #10b981; font-weight: 600;">${formattedTime}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; vertical-align: top;">
                      <strong>Type</strong>
                    </td>
                    <td style="padding: 12px 0; color: #ffffff; font-size: 14px; text-align: right;">
                      ${sessionType}
                      ${isVirtual ? '<span style="color: #10b981;">📹</span>' : '<span style="color: #10b981;">🏥</span>'}
                    </td>
                  </tr>
                  ${!isVirtual ? `
                  <tr>
                    <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; vertical-align: top;">
                      <strong>Location</strong>
                    </td>
                    <td style="padding: 12px 0; color: #ffffff; font-size: 13px; text-align: right;">
                      ${location}
                    </td>
                  </tr>
                  ` : ''}
                  ${physician.phone ? `
                  <tr>
                    <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; vertical-align: top;">
                      <strong>Contact</strong>
                    </td>
                    <td style="padding: 12px 0; color: #ffffff; font-size: 14px; text-align: right;">
                      ${physician.phone}
                    </td>
                  </tr>
                  ` : ''}
                </table>

                ${booking.notes ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #2a2a35;">
                  <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p>
                  <p style="margin: 8px 0 0; color: #e4e4e7; font-size: 14px;">${booking.notes}</p>
                </div>
                ` : ''}
              </div>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${googleCalendarUrl}" style="display: inline-block; background-color: #1a1a24; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid #2a2a35; margin-right: 8px;">
                  📅 Add to Calendar
                </a>
              </div>

              <div style="background-color: #1a1a24; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #e4e4e7;">
                  <strong style="color: #f59e0b;">Please arrive 10 minutes early</strong> to complete any necessary paperwork.
                  ${isVirtual ? ' You will receive a virtual meeting link 24 hours before your appointment.' : ''}
                </p>
              </div>

              <p style="margin: 0 0 16px; font-size: 13px; color: #a1a1aa; text-align: center;">
                Need to reschedule or cancel? Contact ${physician.name}'s office at ${physician.phone || physician.email || 'the number provided'}.
              </p>

              <div style="text-align: center;">
                <a href="https://predictiv.netlify.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View in Predictiv App
                </a>
              </div>
            </div>

            <div style="padding: 24px 32px; background-color: #0a0a0f; text-align: center; border-top: 1px solid #2a2a35;">
              <p style="margin: 0; font-size: 12px; color: #71717a;">
                This confirmation was sent from Predictiv. If you did not book this appointment, please contact us immediately.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;


    const emailResponse = await resend.emails.send({
      from: "Predictiv <bookings@resend.dev>",
      to: [userEmail],
      subject: `Appointment Confirmed with ${physician.name}`,
      html: emailHtml,
    });


    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResponse.data?.id,
        sent_to: userEmail
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-booking-confirmation] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
