import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[send-daily-summary-email] Starting daily summary email job");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in SA timezone (UTC+2)
    const now = new Date();
    const saTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    const todayDate = saTime.toISOString().split('T')[0];
    
    console.log(`[send-daily-summary-email] Processing for date: ${todayDate}`);

    // Get all users who have daily summary emails enabled
    const { data: usersWithPrefs, error: usersError } = await supabase
      .from("users")
      .select("id, email, email_preferences")
      .not("email", "is", null);

    if (usersError) {
      console.error("[send-daily-summary-email] Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`[send-daily-summary-email] Found ${usersWithPrefs?.length || 0} users with emails`);

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as string[],
    };

    for (const user of usersWithPrefs || []) {
      try {
        // Check if user has daily summary enabled (check both weeklySummary and dailySummary for backwards compat)
        const prefs = user.email_preferences as any;
        const dailySummaryEnabled = prefs?.dailySummary ?? prefs?.weeklySummary ?? true;

        if (!dailySummaryEnabled) {
          console.log(`[send-daily-summary-email] User ${user.id} has daily summary disabled, skipping`);
          results.skipped++;
          continue;
        }

        // Check if we already sent a daily summary today
        const { data: recentEmails } = await supabase
          .from("notification_log")
          .select("created_at")
          .eq("recipient", user.id)
          .ilike("message", "%daily_summary%")
          .gte("created_at", `${todayDate}T00:00:00Z`)
          .limit(1);

        if (recentEmails && recentEmails.length > 0) {
          console.log(`[send-daily-summary-email] Already sent daily summary to user ${user.id} today, skipping`);
          results.skipped++;
          continue;
        }

        // Get user's name from profile
        const { data: profileData } = await supabase
          .from("user_profile")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();

        const userName = profileData?.name || user.email?.split('@')[0] || "there";

        // Get user's latest wearable data
        const { data: wearableData } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get user's latest daily briefing
        const { data: briefingData } = await supabase
          .from("daily_briefings")
          .select("content, category")
          .eq("user_id", user.id)
          .eq("category", "full")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get latest Yves recommendations
        const { data: recommendations } = await supabase
          .from("yves_recommendations")
          .select("recommendation_text, category, priority")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        // Get any active health anomalies
        const { data: anomalies } = await supabase
          .from("health_anomalies")
          .select("metric_name, severity, anomaly_type")
          .eq("user_id", user.id)
          .is("acknowledged_at", null)
          .order("detected_at", { ascending: false })
          .limit(2);

        // Build email content
        const sleepScore = wearableData?.sleep_score;
        const readinessScore = wearableData?.readiness_score;
        const activityScore = wearableData?.activity_score;
        const hrvAvg = wearableData?.hrv_avg;
        const restingHR = wearableData?.resting_hr;

        // Build metrics section
        const metricsHtml = buildMetricsSection(sleepScore, readinessScore, activityScore, hrvAvg, restingHR);
        
        // Build recommendations section
        const recsHtml = buildRecommendationsSection(recommendations || []);
        
        // Build alerts section
        const alertsHtml = buildAlertsSection(anomalies || []);

        // Get greeting based on SA time
        const saHour = saTime.getHours();
        const greeting = saHour < 12 ? "Good morning" : saHour < 17 ? "Good afternoon" : "Good evening";

        const formattedDate = saTime.toLocaleDateString("en-ZA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Build the email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #111118; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a35;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
          ☀️ Your Daily Health Summary
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
          ${formattedDate}
        </p>
      </div>
      
      <!-- Greeting -->
      <div style="padding: 24px 32px 0;">
        <p style="margin: 0; font-size: 18px; color: #e4e4e7;">
          ${greeting}, <strong>${userName}</strong>! 👋
        </p>
        <p style="margin: 12px 0 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
          Here's your personalized health snapshot for today.
        </p>
      </div>
      
      <!-- Metrics Section -->
      ${metricsHtml}
      
      <!-- AI Briefing -->
      ${briefingData?.content ? `
      <div style="padding: 0 32px 24px;">
        <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #ffffff; display: flex; align-items: center;">
          <span style="margin-right: 8px;">🤖</span> Yves AI Insights
        </h2>
        <div style="background-color: #1a1a24; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1;">
          <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #e4e4e7;">
            ${briefingData.content.substring(0, 500)}${briefingData.content.length > 500 ? '...' : ''}
          </p>
        </div>
      </div>
      ` : ''}
      
      <!-- Recommendations -->
      ${recsHtml}
      
      <!-- Alerts -->
      ${alertsHtml}
      
      <!-- CTA -->
      <div style="padding: 0 32px 32px; text-align: center;">
        <a href="https://predictiv.app" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Open Predictiv Dashboard →
        </a>
      </div>
      
      <!-- Footer -->
      <div style="padding: 24px 32px; background-color: #0a0a0f; text-align: center; border-top: 1px solid #2a2a35;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
          You received this because you have daily summary emails enabled in Predictiv.
        </p>
        <p style="margin: 0; font-size: 12px; color: #52525b;">
          To unsubscribe, update your email preferences in Settings.
        </p>
      </div>
    </div>
  </body>
</html>
        `;

        console.log(`[send-daily-summary-email] Sending email to ${user.email}`);

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: "Predictiv <alerts@resend.dev>",
          to: [user.email!],
          subject: `☀️ Your Daily Health Summary - ${formattedDate}`,
          html: emailHtml,
        });

        console.log(`[send-daily-summary-email] Email sent to ${user.email}:`, emailResponse);

        // Log the notification
        await supabase.from("notification_log").insert({
          recipient: user.id,
          message: `[daily_summary] Daily health summary for ${todayDate}`,
          status: emailResponse.data?.id ? "sent" : "failed",
        });

        results.sent++;
        results.details.push(`Sent to ${user.email}`);

      } catch (userError) {
        console.error(`[send-daily-summary-email] Error processing user ${user.id}:`, userError);
        results.failed++;
        results.details.push(`Failed for ${user.email}: ${userError}`);
      }
    }

    console.log("[send-daily-summary-email] Job completed:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...results,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-daily-summary-email] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to build metrics section
function buildMetricsSection(
  sleepScore: number | null | undefined,
  readinessScore: number | null | undefined,
  activityScore: number | null | undefined,
  hrvAvg: number | null | undefined,
  restingHR: number | null | undefined
): string {
  const hasMetrics = sleepScore || readinessScore || activityScore || hrvAvg || restingHR;
  
  if (!hasMetrics) {
    return `
      <div style="padding: 24px 32px;">
        <div style="background-color: #1a1a24; border-radius: 12px; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #a1a1aa;">
            No wearable data available yet. Connect your device to see your health metrics.
          </p>
        </div>
      </div>
    `;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    return "#ef4444";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return "🟢";
    if (score >= 60) return "🟡";
    return "🔴";
  };

  return `
    <div style="padding: 24px 32px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #ffffff;">
        📊 Today's Metrics
      </h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        ${sleepScore ? `
        <div style="background-color: #1a1a24; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">Sleep</p>
          <p style="margin: 8px 0 0; font-size: 24px; font-weight: 700; color: ${getScoreColor(sleepScore)};">
            ${getScoreEmoji(sleepScore)} ${sleepScore}
          </p>
        </div>
        ` : ''}
        ${readinessScore ? `
        <div style="background-color: #1a1a24; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">Readiness</p>
          <p style="margin: 8px 0 0; font-size: 24px; font-weight: 700; color: ${getScoreColor(readinessScore)};">
            ${getScoreEmoji(readinessScore)} ${readinessScore}
          </p>
        </div>
        ` : ''}
        ${activityScore ? `
        <div style="background-color: #1a1a24; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">Activity</p>
          <p style="margin: 8px 0 0; font-size: 24px; font-weight: 700; color: ${getScoreColor(activityScore)};">
            ${getScoreEmoji(activityScore)} ${activityScore}
          </p>
        </div>
        ` : ''}
      </div>
      ${hrvAvg || restingHR ? `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;">
        ${hrvAvg ? `
        <div style="background-color: #1a1a24; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">HRV</p>
          <p style="margin: 8px 0 0; font-size: 20px; font-weight: 600; color: #8b5cf6;">${hrvAvg} ms</p>
        </div>
        ` : ''}
        ${restingHR ? `
        <div style="background-color: #1a1a24; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">Resting HR</p>
          <p style="margin: 8px 0 0; font-size: 20px; font-weight: 600; color: #ec4899;">${restingHR} bpm</p>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
  `;
}

// Helper function to build recommendations section
function buildRecommendationsSection(recommendations: any[]): string {
  if (!recommendations || recommendations.length === 0) {
    return '';
  }

  const priorityEmoji: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };

  const recItems = recommendations.map(rec => `
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <span style="font-size: 14px; color: #e4e4e7;">
        ${priorityEmoji[rec.priority] || "💡"} ${rec.recommendation_text}
      </span>
      <span style="display: block; font-size: 12px; color: #71717a; margin-top: 4px;">
        ${rec.category}
      </span>
    </li>
  `).join('');

  return `
    <div style="padding: 0 32px 24px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #ffffff; display: flex; align-items: center;">
        <span style="margin-right: 8px;">💡</span> Today's Recommendations
      </h2>
      <div style="background-color: #1a1a24; border-radius: 12px; padding: 20px;">
        <ul style="margin: 0; padding-left: 16px; list-style-type: none;">
          ${recItems}
        </ul>
      </div>
    </div>
  `;
}

// Helper function to build alerts section
function buildAlertsSection(anomalies: any[]): string {
  if (!anomalies || anomalies.length === 0) {
    return '';
  }

  const severityColors: Record<string, string> = {
    high: "#ef4444",
    medium: "#eab308",
    low: "#6366f1",
  };

  const alertItems = anomalies.map(anomaly => `
    <div style="background-color: #1a1a24; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; border-left: 3px solid ${severityColors[anomaly.severity] || '#6366f1'};">
      <p style="margin: 0; font-size: 14px; color: #e4e4e7; font-weight: 500;">
        ⚠️ ${anomaly.metric_name}
      </p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #a1a1aa;">
        ${anomaly.anomaly_type} • ${anomaly.severity} priority
      </p>
    </div>
  `).join('');

  return `
    <div style="padding: 0 32px 24px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #ffffff; display: flex; align-items: center;">
        <span style="margin-right: 8px;">⚠️</span> Active Alerts
      </h2>
      ${alertItems}
    </div>
  `;
}
