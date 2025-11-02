import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BriefingRequest {
  user_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const aiProvider = getAIProvider();

    // Parse request - support both manual invocation and cron
    let userId: string | null = null;
    try {
      const body = await req.json() as BriefingRequest;
      userId = body.user_id || null;
    } catch {
      // No body provided - cron job will generate for all users
    }

    // If no specific user, generate for all users with wearable data
    let userIds: string[] = [];
    if (userId) {
      userIds = [userId];
    } else {
      // Get all users with recent wearable data
      const { data: recentUsers } = await supabase
        .from("wearable_sessions")
        .select("user_id")
        .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .limit(100);
      
      if (recentUsers) {
        userIds = [...new Set(recentUsers.map(u => u.user_id))];
      }
    }

    console.log(`[generate-daily-briefing] Processing ${userIds.length} users`);

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (const uid of userIds) {
      try {
        // Check if briefing already exists for today
        const { data: existingBriefing } = await supabase
          .from("daily_briefings")
          .select("id")
          .eq("user_id", uid)
          .eq("date", today)
          .maybeSingle();

        if (existingBriefing) {
          console.log(`[generate-daily-briefing] Briefing already exists for user ${uid}`);
          continue;
        }

        // ─── LOAD WEARABLE SUMMARY (last 7 days) ────────────────────────────
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        const { data: wearableSummary } = await supabase
          .from("wearable_summary")
          .select("*")
          .eq("user_id", uid)
          .gte("date", sevenDaysAgoStr)
          .order("date", { ascending: false });

        // ─── LOAD WEARABLE SESSIONS (last 3) ────────────────────────────────
        const { data: wearableSessions } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", uid)
          .order("date", { ascending: false })
          .limit(3);

        // ─── LOAD USER MEMORY ────────────────────────────────────────────────
        const { data: memoryBank } = await supabase
          .from("yves_memory_bank")
          .select("memory_key, memory_value")
          .eq("user_id", uid);

        // ─── LOAD USER PROFILE DATA ──────────────────────────────────────────
        const { data: userProfile } = await supabase
          .from("user_profile")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: userContext } = await supabase
          .from("user_context_enhanced")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        // ─── BUILD CONTEXT DATA ──────────────────────────────────────────────
        const contextData: any = {
          wearable_summary: wearableSummary || [],
          wearable_sessions: wearableSessions || [],
          memory_bank: memoryBank || [],
          user_profile: userProfile || null,
          user_context: userContext || null,
        };

        const hasWearableData = (wearableSummary && wearableSummary.length > 0) || 
                                (wearableSessions && wearableSessions.length > 0);

        // ─── BUILD PROMPT ────────────────────────────────────────────────────
        let promptContext = "";

        if (hasWearableData) {
          if (wearableSummary && wearableSummary.length > 0) {
            const avgStrain = wearableSummary.reduce((sum, s) => sum + (s.strain || 0), 0) / wearableSummary.length;
            const avgAcwr = wearableSummary.reduce((sum, s) => sum + (s.acwr || 0), 0) / wearableSummary.length;
            const latestDate = wearableSummary[0]?.date;
            
            promptContext += `Training Load (7 days):
- Avg Strain: ${avgStrain.toFixed(1)}
- Avg ACWR: ${avgAcwr.toFixed(2)}
- Latest: ${latestDate}\n\n`;
          }

          if (wearableSessions && wearableSessions.length > 0) {
            const avgReadiness = wearableSessions
              .filter(s => s.readiness_score !== null)
              .reduce((sum, s) => sum + (s.readiness_score || 0), 0) / 
              wearableSessions.filter(s => s.readiness_score !== null).length;

            const avgSleep = wearableSessions
              .filter(s => s.sleep_score !== null)
              .reduce((sum, s) => sum + (s.sleep_score || 0), 0) / 
              wearableSessions.filter(s => s.sleep_score !== null).length;

            promptContext += `Recent Recovery (3 days):
- Avg Readiness: ${avgReadiness.toFixed(0)}
- Avg Sleep Score: ${avgSleep.toFixed(0)}
- Latest Steps: ${wearableSessions[0]?.total_steps || 0}
- Latest HR: ${wearableSessions[0]?.resting_hr || "N/A"}\n\n`;
          }
        }

        if (memoryBank && memoryBank.length > 0) {
          promptContext += `User Context:\n`;
          memoryBank.slice(0, 5).forEach(m => {
            promptContext += `- ${m.memory_key}: ${JSON.stringify(m.memory_value).slice(0, 100)}\n`;
          });
        }

        // Add user profile info if available
        if (!hasWearableData && userProfile) {
          promptContext += `\nUser Profile:\n`;
          if (userProfile.name) promptContext += `- Name: ${userProfile.name}\n`;
          if (userProfile.goals?.length > 0) promptContext += `- Goals: ${userProfile.goals.join(", ")}\n`;
          if (userProfile.activity_level) promptContext += `- Activity Level: ${userProfile.activity_level}\n`;
        }

        // ─── CALL AI PROVIDER ────────────────────────────────────────────────
        const systemPrompt = `You are Yves, an AI health intelligence coach. Generate a concise daily briefing (~150 words) with 4 sections:

1️⃣ Recovery: Readiness score trend and assessment
2️⃣ Sleep: Sleep quality and recommendations
3️⃣ Activity: Training strain and load balance
4️⃣ Tip: One actionable health tip for today

Use emoji bullets, be warm and encouraging, keep it brief and actionable.`;

        let userPrompt = "";
        if (hasWearableData) {
          userPrompt = `Generate today's briefing based on:\n\n${promptContext}`;
        } else if (userProfile) {
          userPrompt = `Generate a welcoming briefing for a new user. ${promptContext}\n\nProvide encouragement to connect a wearable device and start tracking their health journey.`;
        } else {
          userPrompt = `Generate a brief welcome message encouraging the user to complete their profile and connect a wearable device to unlock personalized health insights.`;
        }

        const aiResponse = await aiProvider.chat({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          maxTokens: 300,
        });

        if (!aiResponse.content) {
          console.error(`[generate-daily-briefing] AI returned no content for user ${uid}`);
          results.push({ user_id: uid, success: false, error: "AI returned no content" });
          continue;
        }

        const briefingContent = aiResponse.content;

        // ─── SAVE TO DATABASE ────────────────────────────────────────────────
        const { error: insertError } = await supabase
          .from("daily_briefings")
          .insert({
            user_id: uid,
            date: today,
            content: briefingContent,
            context_used: contextData,
          });

        if (insertError) {
          console.error(`[generate-daily-briefing] DB error for user ${uid}:`, insertError);
          continue;
        }

        console.log(`[generate-daily-briefing] Briefing generated for user ${uid}`);
        results.push({ user_id: uid, success: true });

      } catch (userError) {
        console.error(`[generate-daily-briefing] Error for user ${uid}:`, userError);
        results.push({ user_id: uid, success: false, error: userError instanceof Error ? userError.message : "Unknown error" });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const allFailed = successCount === 0 && results.length > 0;

    return new Response(
      JSON.stringify({
        success: !allFailed,
        message: allFailed 
          ? `Failed to generate briefings: ${results[0]?.error || "Unknown error"}`
          : `Generated ${successCount} briefing${successCount !== 1 ? 's' : ''}`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: allFailed ? 500 : 200,
      }
    );
  } catch (error) {
    console.error("[generate-daily-briefing] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
