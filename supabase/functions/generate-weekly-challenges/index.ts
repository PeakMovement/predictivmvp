import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine target user(s)
    let userIds: string[] = [];
    try {
      const body = await req.json();
      if (body?.user_id) {
        userIds = [body.user_id];
      }
    } catch {
      // No body = cron mode, find all active users
    }

    if (userIds.length === 0) {
      const { data: activeUsers } = await supabase
        .from("wearable_sessions")
        .select("user_id")
        .gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0])
        .order("date", { ascending: false });

      const uniqueIds = [...new Set((activeUsers || []).map((u: any) => u.user_id))];
      userIds = uniqueIds as string[];
    }

    console.log(`[generate-weekly-challenges] Processing ${userIds.length} users`);

    const results: any[] = [];

    for (const userId of userIds) {
      try {
        const result = await generateChallengesForUser(supabase, userId, LOVABLE_API_KEY);
        results.push({ userId, ...result });
      } catch (err) {
        console.error(`[generate-weekly-challenges] Error for user ${userId}:`, err);
        results.push({ userId, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-weekly-challenges] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateChallengesForUser(
  supabase: any,
  userId: string,
  apiKey: string
) {
  // Check if user already has pending/active challenges this week
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("user_challenges")
    .select("id, status")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartStr)
    .in("status", ["pending", "active"]);

  if (existing && existing.length >= 2) {
    console.log(`[generate-weekly-challenges] User ${userId} already has ${existing.length} challenges this week, skipping`);
    return { success: true, skipped: true, reason: "already_has_challenges" };
  }

  // Gather context
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [sessionsRes, baselinesRes, goalsRes, injuriesRes, recentChallengesRes] = await Promise.all([
    supabase
      .from("wearable_sessions")
      .select("date, sleep_score, hrv, readiness, total_distance, active_calories, steps, source")
      .eq("user_id", userId)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: false })
      .limit(7),
    supabase
      .from("user_baselines")
      .select("metric_name, baseline_value, deviation_pct")
      .eq("user_id", userId)
      .limit(10),
    supabase
      .from("user_wellness_goals")
      .select("goal_type, target_value, notes")
      .eq("user_id", userId)
      .limit(5),
    supabase
      .from("user_injuries")
      .select("injury_type, body_part, severity, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(5),
    supabase
      .from("user_challenges")
      .select("challenge_title, challenge_type, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const sessions = sessionsRes.data || [];
  const baselines = baselinesRes.data || [];
  const goals = goalsRes.data || [];
  const injuries = injuriesRes.data || [];
  const recentChallenges = recentChallengesRes.data || [];

  const contextSummary = `
USER CONTEXT:
- Recent sessions (last 7 days): ${sessions.length} sessions
${sessions.map((s: any) => `  ${s.date}: sleep=${s.sleep_score ?? "n/a"}, HRV=${s.hrv ?? "n/a"}, readiness=${s.readiness ?? "n/a"}, distance=${s.total_distance ?? "n/a"}m, steps=${s.steps ?? "n/a"}`).join("\n")}

- Baselines: ${baselines.map((b: any) => `${b.metric_name}=${b.baseline_value} (dev: ${b.deviation_pct}%)`).join(", ") || "none"}

- Active injuries: ${injuries.map((i: any) => `${i.body_part} ${i.injury_type} (${i.severity})`).join(", ") || "none"}

- Wellness goals: ${goals.map((g: any) => `${g.goal_type}: ${g.target_value} ${g.notes || ""}`).join(", ") || "none set"}

- Recent challenge history: ${recentChallenges.map((c: any) => `"${c.challenge_title}" (${c.challenge_type}) → ${c.status}`).join(", ") || "none"}
`.trim();

  // Call AI with tool calling
  const systemPrompt = `You are Yves, an AI health coach. Generate 2-3 personalised weekly challenges for this user based on their recent health data, baselines, injuries, and goals. 
  
Challenges should be:
- Achievable within one week
- Specific with measurable targets
- Varied across different health dimensions (don't repeat the same type)
- Adapted to any active injuries (avoid aggravating them)
- Progressive based on recent performance

Valid challenge_type values: workout_frequency, distance_goal, sleep_target, recovery_focus, hrv_improvement
Valid progress_metric values: session_count, total_distance, avg_sleep_score, avg_readiness, avg_hrv`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextSummary },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_challenges",
            description: "Create personalised weekly challenges for the user",
            parameters: {
              type: "object",
              properties: {
                challenges: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Short challenge title" },
                      description: { type: "string", description: "Detailed description of the challenge" },
                      challenge_type: {
                        type: "string",
                        enum: ["workout_frequency", "distance_goal", "sleep_target", "recovery_focus", "hrv_improvement"],
                      },
                      target_value: { type: "number", description: "Numeric target to achieve" },
                      progress_metric: {
                        type: "string",
                        enum: ["session_count", "total_distance", "avg_sleep_score", "avg_readiness", "avg_hrv"],
                      },
                      reasoning: { type: "string", description: "Why this challenge is relevant for this user right now" },
                    },
                    required: ["title", "description", "challenge_type", "target_value", "progress_metric", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["challenges"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_challenges" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[generate-weekly-challenges] AI error ${response.status}:`, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("No tool call in AI response");
  }

  const { challenges } = JSON.parse(toolCall.function.arguments);

  if (!challenges || !Array.isArray(challenges) || challenges.length === 0) {
    throw new Error("AI returned no challenges");
  }

  // Calculate expires_at (end of this week, Sunday 23:59 UTC)
  const sunday = new Date(weekStart);
  sunday.setUTCDate(weekStart.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const expiresAt = sunday.toISOString();

  // Insert challenges
  const rows = challenges.slice(0, 3).map((c: any) => ({
    user_id: userId,
    challenge_title: c.title,
    challenge_description: c.description,
    challenge_type: c.challenge_type,
    target_value: c.target_value,
    progress_metric: c.progress_metric,
    ai_reasoning: c.reasoning,
    week_start_date: weekStartStr,
    status: "pending",
    expires_at: expiresAt,
    current_progress: 0,
  }));

  const { error: insertError } = await supabase.from("user_challenges").insert(rows);

  if (insertError) {
    console.error("[generate-weekly-challenges] Insert error:", insertError);
    throw insertError;
  }

  console.log(`[generate-weekly-challenges] SUCCESS: Created ${rows.length} challenges for user ${userId}`);
  return { success: true, created: rows.length };
}
