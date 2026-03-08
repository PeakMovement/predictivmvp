import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RiskEmailRequest {
  user_id: string;
  alert_type: "injury_risk" | "health_anomaly" | "red_flag_symptom" | "risk_threshold";
  alert_message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  triggered_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RiskEmailRequest = await req.json();
    
    // Validate required fields
    if (!body.user_id || !body.alert_type || !body.alert_message) {
      console.error("[send-risk-email] Missing required fields:", { body });
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, alert_type, alert_message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user_id is UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.user_id)) {
      console.error("[send-risk-email] Invalid user_id format");
      return new Response(
        JSON.stringify({ error: "Invalid user_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check spam prevention - don't send same alert type within 6 hours
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const { data: recentAlerts } = await supabase
      .from("notification_log")
      .select("created_at")
      .eq("recipient", body.user_id)
      .ilike("message", `%${body.alert_type}%`)
      .gte("created_at", sixHoursAgo.toISOString())
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      console.log(`[send-risk-email] Skipping - ${body.alert_type} alert sent recently`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true, 
          reason: "Alert sent recently (spam prevention)" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(body.user_id);
    
    if (userError || !userData?.user?.email) {
      console.error("[send-risk-email] Could not find user email:", userError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    const triggeredAt = body.triggered_at || new Date().toISOString();
    const formattedTime = new Date(triggeredAt).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Build email subject based on alert type
    const subjectMap: Record<string, string> = {
      injury_risk: "⚠️ Injury Risk Alert - Action Recommended",
      health_anomaly: "🔴 Health Anomaly Detected",
      red_flag_symptom: "🚨 Critical Symptom Alert",
      risk_threshold: "⚡ Risk Threshold Exceeded",
    };

    const subject = subjectMap[body.alert_type] || "🔔 Predictiv Health Alert";

    // Build email HTML
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
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                Predictiv Health Alert
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <div style="background-color: #1a1a24; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
                <h2 style="margin: 0 0 16px; font-size: 18px; color: #f87171;">
                  ${subject.replace(/^[^\s]+ /, '')}
                </h2>
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #e4e4e7;">
                  ${body.alert_message}
                </p>
              </div>
              
              ${body.metric ? `
              <div style="background-color: #1a1a24; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #a1a1aa;">
                  Alert Details
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Metric</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; font-weight: 600;">${body.metric}</td>
                  </tr>
                  ${body.value !== undefined ? `
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Current Value</td>
                    <td style="padding: 8px 0; color: #f87171; font-size: 14px; text-align: right; font-weight: 600;">${body.value}</td>
                  </tr>
                  ` : ''}
                  ${body.threshold !== undefined ? `
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Threshold</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${body.threshold}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              ` : ''}
              
              <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa;">
                <strong>Detected:</strong> ${formattedTime}
              </p>
              
              <a href="https://predictiv.netlify.app" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                View in Predictiv App
              </a>
            </div>
            
            <!-- Footer -->
            <div style="padding: 24px 32px; background-color: #0a0a0f; text-align: center; border-top: 1px solid #2a2a35;">
              <p style="margin: 0; font-size: 12px; color: #71717a;">
                You received this alert because you have risk notifications enabled in Predictiv.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`[send-risk-email] Sending ${body.alert_type} email to ${userEmail}`);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Predictiv <alerts@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("[send-risk-email] Email sent successfully:", emailResponse);

    // Log the notification
    await supabase.from("notification_log").insert({
      recipient: body.user_id,
      message: `[${body.alert_type}] ${body.alert_message}`,
      status: "sent",
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
    console.error("[send-risk-email] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
