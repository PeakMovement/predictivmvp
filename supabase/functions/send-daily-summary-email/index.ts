import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM_ADDRESS = Deno.env.get("RESEND_FROM") || "Predictiv <onboarding@resend.dev>";
// When set, all emails are redirected to this address (for testing with unverified domain)
const TO_OVERRIDE = Deno.env.get("RESEND_TO_OVERRIDE") || null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body — supports single user (from generate-daily-briefing) or all users (cron)
    let targetUserId: string | null = null;
    let testMode = false;
    try {
      const body = await req.json();
      targetUserId = body?.user_id || null;
      testMode = body?.testMode === true || body?.isTest === true;
    } catch {
      // No body — cron mode
    }

    // SA timezone offset (UTC+2)
    const now = new Date();
    const saTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayDate = saTime.toISOString().split("T")[0];


    // Build user list — single user or all auth users
    type UserEntry = { id: string; email: string };
    let usersToProcess: UserEntry[] = [];

    if (targetUserId) {
      const { data: { user } } = await supabase.auth.admin.getUserById(targetUserId);
      if (user?.email) {
        usersToProcess = [{ id: user.id, email: user.email }];
      }
    } else {
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 500 });
      usersToProcess = authUsers
        .filter((u) => u.email)
        .map((u) => ({ id: u.id, email: u.email! }));
    }


    const results = { sent: 0, skipped: 0, failed: 0, details: [] as string[] };

    for (const user of usersToProcess) {
      try {
        // ── PREF CHECK ──────────────────────────────────────────────────────
        // Primary source: user_profiles notification columns (added 2026-03-09)
        // Fallback: users.email_preferences for backwards compat
        const { data: notifPrefs } = await supabase
          .from("user_profiles")
          .select("briefing_enabled, briefing_time, alert_notifications_enabled, weekly_summary_enabled")
          .eq("user_id", user.id)
          .maybeSingle();

        const briefingEnabled = notifPrefs?.briefing_enabled ?? true;

        if (!briefingEnabled && !testMode) {
          results.skipped++;
          continue;
        }

        // ── DEDUP CHECK ─────────────────────────────────────────────────────
        if (!testMode) {
          const { data: alreadySent } = await supabase
            .from("notification_log")
            .select("created_at")
            .eq("recipient", user.id)
            .ilike("message", "%daily_summary%")
            .gte("created_at", `${todayDate}T00:00:00Z`)
            .limit(1);

          if (alreadySent && alreadySent.length > 0) {
            results.skipped++;
            continue;
          }
        }

        // ── DATA FETCH (parallel) ────────────────────────────────────────────
        const [
          profileRes,
          wearableRes,
          baselineHrvRes,
          recsRes,
          injuryRes,
        ] = await Promise.all([
          supabase
            .from("user_profile")
            .select("name")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("wearable_sessions")
            .select("readiness_score, sleep_score, hrv_avg, resting_hr, date, source")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_baselines")
            .select("rolling_avg")
            .eq("user_id", user.id)
            .eq("metric", "hrv_avg")
            .maybeSingle(),
          supabase
            .from("yves_recommendations")
            .select("recommendation_text, category, priority, reasoning")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("user_injury_profiles")
            .select("injury_type, body_location, current_phase, load_restrictions, target_return_date")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle(),
        ]);

        const wearable = wearableRes.data;
        const firstName = profileRes.data?.name?.split(" ")[0] || user.email.split("@")[0];

        // Guard: must have at least one day of wearable data to send
        if (!wearable && !testMode) {
          results.skipped++;
          continue;
        }

        const baselineHrv = baselineHrvRes.data?.rolling_avg ?? null;
        const currentHrv = wearable?.hrv_avg ?? null;
        const readiness = wearable?.readiness_score ?? null;
        const sleep = wearable?.sleep_score ?? null;

        // Pick highest-priority recommendation as "one thing"
        const recs = recsRes.data || [];
        const oneThing =
          recs.find((r) => r.priority === "high") ||
          recs.find((r) => r.priority === "medium") ||
          recs[0] ||
          null;

        const injury = injuryRes.data ?? null;

        // ── PERSONALISED SUBJECT ─────────────────────────────────────────────
        const dayName = saTime.toLocaleDateString("en-ZA", { weekday: "long" });
        let subject = `${firstName}, your Predictiv briefing for ${dayName}`;

        if (readiness !== null) {
          const readinessLabel =
            readiness >= 85 ? "strong day ahead" : readiness >= 70 ? "decent readiness today" : "take it easy today";
          subject = `${firstName}, your readiness is ${readiness} — ${readinessLabel}`;
        } else if (currentHrv !== null && baselineHrv !== null) {
          const pctChange = Math.round(((currentHrv - baselineHrv) / baselineHrv) * 100);
          if (Math.abs(pctChange) >= 5) {
            const direction = pctChange > 0 ? "up" : "down";
            subject = `${firstName}, your HRV is ${direction} ${Math.abs(pctChange)}% today`;
          }
        }

        // ── BUILD EMAIL HTML ─────────────────────────────────────────────────
        const saHour = saTime.getUTCHours();
        const greeting = saHour < 12 ? "Good morning" : saHour < 17 ? "Good afternoon" : "Good evening";
        const formattedDate = saTime.toLocaleDateString("en-ZA", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        const emailHtml = buildEmail({
          firstName,
          greeting,
          formattedDate,
          readiness,
          sleep,
          currentHrv,
          baselineHrv,
          oneThing,
          injury,
        });

        // ── SEND ─────────────────────────────────────────────────────────────
        const deliverTo = TO_OVERRIDE || user.email;

        const emailRes = await resend.emails.send({
          from: FROM_ADDRESS,
          to: [deliverTo],
          subject: TO_OVERRIDE ? `[${user.email}] ${subject}` : subject,
          html: emailHtml,
        });


        // ── LOG ───────────────────────────────────────────────────────────────
        await supabase.from("notification_log").insert({
          recipient: user.id,
          message: `[daily_summary] Daily briefing email for ${todayDate}`,
          status: emailRes.data?.id ? "sent" : "failed",
        });

        results.sent++;
        results.details.push(`Sent to ${user.email}`);
      } catch (err) {
        console.error(`[send-daily-summary-email] Error for ${user.id}:`, err);
        results.failed++;
        results.details.push(`Failed for ${user.email}: ${err}`);
      }
    }


    return new Response(
      JSON.stringify({ success: true, ...results, timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[send-daily-summary-email] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── EMAIL BUILDER ───────────────────────────────────────────────────────────

interface EmailParams {
  firstName: string;
  greeting: string;
  formattedDate: string;
  readiness: number | null;
  sleep: number | null;
  currentHrv: number | null;
  baselineHrv: number | null;
  oneThing: { recommendation_text: string; category: string; priority: string; reasoning?: string | null } | null;
  injury: { injury_type: string; body_location: string; current_phase: string; load_restrictions: string | null; target_return_date: string | null } | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Low";
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    acute: "Acute Phase",
    sub_acute: "Sub-Acute Phase",
    remodeling: "Remodeling Phase",
    functional: "Functional Phase",
    return_to_sport: "Return to Sport",
  };
  return labels[phase] || phase;
}

function buildEmail(p: EmailParams): string {
  const { firstName, greeting, formattedDate, readiness, sleep, currentHrv, baselineHrv, oneThing, injury } = p;

  // HRV vs baseline
  let hrvPctChange: number | null = null;
  if (currentHrv !== null && baselineHrv !== null && baselineHrv > 0) {
    hrvPctChange = Math.round(((currentHrv - baselineHrv) / baselineHrv) * 100);
  }

  const readinessBlock = readiness !== null
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr>
        <td align="center" bgcolor="#111318" style="background-color:#111318;border-radius:12px;padding:24px 16px;">
          <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#71717a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">Readiness Score</p>
          <p style="margin:0;font-size:56px;font-weight:800;line-height:1;color:${scoreColor(readiness)};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${readiness}</p>
          <p style="margin:8px 0 0 0;font-size:14px;font-weight:500;color:${scoreColor(readiness)};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${scoreLabel(readiness)}</p>
        </td>
      </tr>
    </table>`
    : "";

  const metricsRow = (currentHrv !== null || sleep !== null)
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        ${currentHrv !== null ? `
        <td width="${sleep !== null ? "50%" : "100%"}" style="padding-right:${sleep !== null ? "6px" : "0"};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" bgcolor="#111318" style="background-color:#111318;border-radius:10px;padding:16px 12px;">
                <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#71717a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">HRV</p>
                <p style="margin:0;font-size:24px;font-weight:700;color:#8b5cf6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${Math.round(currentHrv)} ms</p>
                ${hrvPctChange !== null && Math.abs(hrvPctChange) >= 3 ? `<p style="margin:4px 0 0 0;font-size:11px;color:${hrvPctChange > 0 ? "#22c55e" : "#ef4444"};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${hrvPctChange > 0 ? "+" : ""}${hrvPctChange}% vs baseline</p>` : `<p style="margin:4px 0 0 0;font-size:11px;color:#52525b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">vs ${baselineHrv ? Math.round(baselineHrv) + " ms baseline" : "no baseline yet"}</p>`}
              </td>
            </tr>
          </table>
        </td>` : ""}
        ${sleep !== null ? `
        <td width="${currentHrv !== null ? "50%" : "100%"}" style="padding-left:${currentHrv !== null ? "6px" : "0"};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" bgcolor="#111318" style="background-color:#111318;border-radius:10px;padding:16px 12px;">
                <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#71717a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">Sleep</p>
                <p style="margin:0;font-size:24px;font-weight:700;color:${scoreColor(sleep)};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${sleep}</p>
                <p style="margin:4px 0 0 0;font-size:11px;color:${scoreColor(sleep)};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${scoreLabel(sleep)}</p>
              </td>
            </tr>
          </table>
        </td>` : ""}
      </tr>
    </table>`
    : "";

  const injuryBlock = injury
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#1c1200" style="background-color:#1c1200;border-radius:10px;padding:16px;border-left:3px solid #f59e0b;">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#f59e0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">Active Injury</p>
          <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${injury.body_location} — ${phaseLabel(injury.current_phase)}</p>
          ${injury.load_restrictions ? `<p style="margin:0;font-size:13px;color:#a1a1aa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.5;">Restriction: ${injury.load_restrictions}</p>` : ""}
        </td>
      </tr>
    </table>`
    : "";

  const oneThingBlock = oneThing
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#0f1623" style="background-color:#0f1623;border-radius:10px;padding:20px;border-left:3px solid #6366f1;">
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6366f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">One Thing From Yves</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${oneThing.recommendation_text}</p>
        </td>
      </tr>
    </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Your Daily Briefing</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0c0f;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0c0f" style="background-color:#0a0c0f;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Card wrapper -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td bgcolor="#111318" style="background-color:#111318;border-radius:16px;overflow:hidden;border:1px solid #1e2128;">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#0a0c0f" style="background-color:#0a0c0f;padding:28px 32px 24px;border-bottom:1px solid #1e2128;">
                    <p style="margin:0 0 4px 0;font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">Predictiv</p>
                    <p style="margin:0;font-size:12px;color:#52525b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${formattedDate}</p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px 28px 0;">

                    <!-- Greeting -->
                    <p style="margin:0 0 24px 0;font-size:17px;color:#a1a1aa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${greeting}, <strong style="color:#f4f4f5;">${firstName}</strong></p>

                    <!-- Readiness hero -->
                    ${readinessBlock}

                    <!-- Metrics row -->
                    ${metricsRow}

                    <!-- Injury block -->
                    ${injuryBlock}

                    <!-- One thing -->
                    ${oneThingBlock}

                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center">
                          <a href="https://predictiv.netlify.app/dashboard"
                             style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                            Open Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#0a0c0f" style="background-color:#0a0c0f;padding:20px 28px;border-top:1px solid #1e2128;">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#3f3f46;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      You're receiving this because daily briefing emails are enabled in your account.
                    </p>
                    <p style="margin:0;font-size:12px;color:#3f3f46;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      To unsubscribe, go to <strong>Settings &rarr; Email Notifications</strong> and turn off Daily Briefing Email.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
