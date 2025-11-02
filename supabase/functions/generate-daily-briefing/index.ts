import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BriefingRequest {
  user_id?: string;
  category?: 'full' | 'recovery' | 'sleep' | 'activity' | 'goals' | 'tip';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request - support both manual invocation and cron
    let userId: string | null = null;
    let category: 'full' | 'recovery' | 'sleep' | 'activity' | 'goals' | 'tip' = 'full';
    try {
      const body = await req.json() as BriefingRequest;
      userId = body.user_id || null;
      category = body.category || 'full';
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
          .eq("category", category)
          .maybeSingle();

        if (existingBriefing) {
          console.log(`[generate-daily-briefing] Briefing already exists for user ${uid}, category ${category}`);
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

        // ─── CALL LOVABLE AI ────────────────────────────────────────────────
        let systemPrompt: string;
        let userPrompt: string;
        let maxTokens = 300;

        if (category === 'full') {
          systemPrompt = `You are Yves, an AI health intelligence coach. Generate a concise daily briefing (about 150 words) with 4 sections:

1. Recovery: Readiness score trend and assessment
2. Training Load: ACWR and strain balance status  
3. Recommendations: 1-2 specific adjustments based on recent wearable data
4. Motivation: Brief encouragement aligned with their activity level

Use emoji section markers (like 🏃, 💪, 💡, 🎯). Be specific with numbers when available. Keep it actionable and motivational.

CRITICAL FORMATTING RULES:
- Use plain text only with emoji bullets
- DO NOT use markdown syntax (no asterisks, no bold, no underscores)
- Separate sections with a single blank line
- Use proper grammar and punctuation`;

          if (hasWearableData) {
            userPrompt = `Generate today's briefing based on:\n\n${promptContext}`;
          } else if (userProfile) {
            userPrompt = `Generate a welcoming briefing for a new user. ${promptContext}\n\nProvide encouragement to connect a wearable device and start tracking their health journey.`;
          } else {
            userPrompt = `Generate a brief welcome message encouraging the user to complete their profile and connect a wearable device to unlock personalized health insights.`;
          }
        } else {
          // Category-specific mini-briefings
          maxTokens = 150;
          const categoryPrompts = {
            recovery: {
              system: `You are Yves, a health coach. Create a focused 60-word briefing about recovery status. Include readiness scores, HRV trends, and recovery advice. Use emoji 🏃 at the start. Plain text only, no markdown.`,
              user: `${promptContext}\n\nFocus only on recovery metrics and advice.`
            },
            sleep: {
              system: `You are Yves, a health coach. Create a focused 60-word briefing about sleep quality. Include deep sleep percentage, sleep efficiency, and sleep recommendations. Use emoji 😴 at the start. Plain text only, no markdown.`,
              user: `${promptContext}\n\nFocus only on sleep metrics and advice.`
            },
            activity: {
              system: `You are Yves, a health coach. Create a focused 60-word briefing about training load. Include training load, ACWR, and strain balance. Use emoji 💪 at the start. Plain text only, no markdown.`,
              user: `${promptContext}\n\nFocus only on activity metrics and training advice.`
            },
            goals: {
              system: `You are Yves, a health coach. Create a focused 60-word briefing about goal progress. Mention progress toward stated goals and provide encouragement. Use emoji 🎯 at the start. Plain text only, no markdown.`,
              user: `${promptContext}\n\nFocus on progress and goals.`
            },
            tip: {
              system: `You are Yves, a health coach. Create a focused 40-word actionable health tip based on recent data. Use emoji 💡 at the start. Plain text only, no markdown.`,
              user: `${promptContext}\n\nGive one specific, personalized tip.`
            }
          };

          const prompt = categoryPrompts[category];
          systemPrompt = prompt.system;
          userPrompt = (hasWearableData || userProfile) ? prompt.user : `Generate a brief message encouraging the user to connect wearable data for personalized ${category} insights.`;
        }

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            max_tokens: maxTokens,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`[generate-daily-briefing] AI error for user ${uid}:`, errorText);
          results.push({ user_id: uid, success: false, error: `AI error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        let briefingContent = aiData.choices[0]?.message?.content;

        if (!briefingContent) {
          console.error(`[generate-daily-briefing] AI returned no content for user ${uid}`);
          results.push({ user_id: uid, success: false, error: "AI returned no content" });
          continue;
        }

        // Clean up formatting - remove all markdown syntax
        briefingContent = briefingContent
          .replace(/\*\*/g, '')     // Remove bold markdown
          .replace(/\*/g, '')       // Remove asterisks
          .replace(/_/g, '')        // Remove underscores
          .replace(/#{1,6}\s/g, '') // Remove markdown headers
          .trim();

        // ─── SAVE TO DATABASE ────────────────────────────────────────────────
        const { error: insertError } = await supabase
          .from("daily_briefings")
          .upsert({
            user_id: uid,
            date: today,
            content: briefingContent,
            context_used: contextData,
            category: category,
          });

        if (insertError) {
          console.error(`[generate-daily-briefing] DB error for user ${uid}:`, insertError);
          results.push({ user_id: uid, success: false, error: insertError.message });
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
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
