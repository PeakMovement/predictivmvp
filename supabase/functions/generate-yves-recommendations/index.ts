import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-yves-recommendations] Fetching data for user ${userId}`);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    // ─── FETCH ALL DATA IN PARALLEL ──────────────────────────────────────────
    const [
      { data: sessions },
      { data: profile },
      { data: documents },
      { data: recoveryTrend },
      { data: activityTrend },
      { data: trainingTrends },
      { data: baselines },
      { data: trainingProfile },
      { data: lifestyleProfile },
      { data: interestsProfile },
      { data: wellnessGoals },
      { data: healthAnomalies },
      { data: userDeviations },
      { data: symptomCheckIns },
      { data: memoryBank },
      { data: userContext },
    ] = await Promise.all([
      supabase.from("wearable_sessions").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }).limit(7),
      supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_documents").select("document_type, ai_summary, parsed_content").eq("user_id", userId).eq("processing_status", "completed"),
      supabase.from("recovery_trends").select("*").eq("user_id", userId).order("period_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("activity_trends").select("*").eq("user_id", userId).order("period_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("training_trends").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("user_baselines").select("metric, rolling_avg").eq("user_id", userId),
      supabase.from("user_training").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_lifestyle").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_interests").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_wellness_goals").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("health_anomalies").select("*").eq("user_id", userId).is("acknowledged_at", null).order("detected_at", { ascending: false }).limit(5),
      supabase.from("user_deviations").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }),
      supabase.from("symptom_check_ins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("yves_memory_bank").select("memory_key, memory_value").eq("user_id", userId),
      supabase.from("user_context_enhanced").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    // ─── BUILD BASELINE LOOKUP ────────────────────────────────────────────────
    const baselineMap: Record<string, number> = {};
    baselines?.forEach((b: any) => { baselineMap[b.metric] = Number(b.rolling_avg); });

    // Helper: format a metric vs its personal baseline
    const vsBaseline = (current: number, metric: string, unit = ''): string => {
      const bl = baselineMap[metric];
      if (!bl) return `${current}${unit}`;
      const delta = ((current - bl) / bl * 100);
      const dir = delta >= 0 ? 'above' : 'below';
      return `${current}${unit} (${Math.abs(delta).toFixed(1)}% ${dir} your ${Math.round(bl)}${unit} baseline)`;
    };

    // ─── BUILD RICH CONTEXT ───────────────────────────────────────────────────
    let context = "Generate 3 hyper-personalised recommendations for this specific athlete:\n\n";

    // Athlete identity
    context += "## ATHLETE PROFILE\n";
    if (profile?.name) context += `Name: ${profile.name}\n`;
    if (profile?.goals?.length) context += `Goals: ${profile.goals.join(", ")}\n`;
    if (profile?.activity_level) context += `Activity Level: ${profile.activity_level}\n`;
    if (profile?.injuries?.length) context += `Injury History: ${profile.injuries.join(", ")}\n`;
    if (profile?.conditions?.length) context += `Medical Conditions: ${profile.conditions.join(", ")}\n`;
    if (profile?.gender) context += `Gender: ${profile.gender}\n`;
    if (profile?.dob) {
      const age = Math.floor((Date.now() - new Date(profile.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      context += `Age: ${age}\n`;
    }

    if (trainingProfile) {
      if (trainingProfile.preferred_activities?.length) context += `Sport/Activities: ${trainingProfile.preferred_activities.join(", ")}\n`;
      if (trainingProfile.training_frequency) context += `Training Frequency: ${trainingProfile.training_frequency}\n`;
      if (trainingProfile.intensity_preference) context += `Intensity Preference: ${trainingProfile.intensity_preference}\n`;
      if (trainingProfile.current_phase) context += `Current Training Phase: ${trainingProfile.current_phase}\n`;
      if (trainingProfile.equipment_access?.length) context += `Equipment: ${trainingProfile.equipment_access.join(", ")}\n`;
    }

    if (lifestyleProfile) {
      if (lifestyleProfile.stress_level) context += `Current Stress Level: ${lifestyleProfile.stress_level}\n`;
      if (lifestyleProfile.work_schedule) context += `Work Schedule: ${lifestyleProfile.work_schedule}\n`;
      if (lifestyleProfile.daily_routine) context += `Daily Routine: ${lifestyleProfile.daily_routine}\n`;
    }

    if (interestsProfile) {
      const allInterests = [...(interestsProfile.hobbies || []), ...(interestsProfile.interests || [])];
      if (allInterests.length) context += `Hobbies/Interests: ${allInterests.join(", ")}\n`;
    }

    if (wellnessGoals?.target_date) {
      const daysToEvent = Math.floor((new Date(wellnessGoals.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToEvent > 0) context += `Next Event/Goal Date: ${wellnessGoals.target_date} (${daysToEvent} days away)\n`;
    }
    if (wellnessGoals?.goals?.length) context += `Wellness Goals: ${wellnessGoals.goals.join(", ")}\n`;
    context += "\n";

    // Latest wearable metrics with personal baseline comparisons
    if (sessions && sessions.length > 0) {
      const latest = sessions[0];
      context += `## LATEST WEARABLE DATA (${latest.date})\n`;

      if (latest.sleep_score) context += `Sleep Score: ${vsBaseline(latest.sleep_score, 'sleep_score')}\n`;
      if (latest.readiness_score) context += `Readiness Score: ${latest.readiness_score}\n`;
      if (latest.activity_score) context += `Activity Score: ${latest.activity_score}\n`;
      if (latest.hrv_avg) context += `HRV: ${vsBaseline(Math.round(latest.hrv_avg), 'hrv', 'ms')}\n`;
      if (latest.resting_hr) context += `Resting HR: ${latest.resting_hr} bpm\n`;
      if (latest.total_steps) context += `Steps: ${latest.total_steps}\n`;
      if (latest.spo2_avg) context += `SpO2: ${latest.spo2_avg}%\n`;
      if (latest.sleep_duration_hours) context += `Sleep Duration: ${latest.sleep_duration_hours}h\n`;
      if (latest.deep_sleep_minutes) context += `Deep Sleep: ${latest.deep_sleep_minutes} min\n`;

      // 7-day averages
      const withSleep = sessions.filter((s: any) => s.sleep_score);
      const withReadiness = sessions.filter((s: any) => s.readiness_score);
      const withHrv = sessions.filter((s: any) => s.hrv_avg);

      context += "\n## 7-DAY AVERAGES\n";
      if (withSleep.length) context += `Avg Sleep Score: ${(withSleep.reduce((s: number, r: any) => s + r.sleep_score, 0) / withSleep.length).toFixed(1)}\n`;
      if (withReadiness.length) context += `Avg Readiness: ${(withReadiness.reduce((s: number, r: any) => s + r.readiness_score, 0) / withReadiness.length).toFixed(1)}\n`;
      if (withHrv.length) context += `Avg HRV: ${(withHrv.reduce((s: number, r: any) => s + r.hrv_avg, 0) / withHrv.length).toFixed(1)}ms\n`;
      context += "\n";
    }

    // Training load with baseline comparisons
    if (trainingTrends && trainingTrends.length > 0) {
      const latestTrend = trainingTrends[0];
      context += "## TRAINING LOAD\n";

      if (latestTrend.acwr != null) {
        const acwrZone = latestTrend.acwr > 1.5 ? "HIGH RISK ZONE (>1.5)" :
          latestTrend.acwr > 1.3 ? "Elevated (1.3–1.5)" :
          latestTrend.acwr >= 0.8 ? "Optimal (0.8–1.3)" : "Underloading (<0.8)";
        context += `Current ACWR: ${latestTrend.acwr.toFixed(2)} — ${acwrZone}\n`;
        if (baselineMap['acwr']) context += `ACWR Personal Baseline: ${baselineMap['acwr'].toFixed(2)}\n`;
      }
      if (latestTrend.strain != null) context += `Training Strain: ${vsBaseline(Math.round(latestTrend.strain), 'strain')}\n`;
      if (latestTrend.monotony != null) context += `Training Monotony: ${latestTrend.monotony.toFixed(2)} ${latestTrend.monotony > 2.0 ? "(too repetitive)" : "(good variety)"}\n`;
      if (latestTrend.hrv != null) context += `HRV (training trend): ${vsBaseline(Math.round(latestTrend.hrv), 'hrv', 'ms')}\n`;
      if (latestTrend.sleep_score != null) context += `Sleep Score (training trend): ${latestTrend.sleep_score}\n`;
      context += "\n";
    }

    if (recoveryTrend) {
      context += "## RECOVERY METRICS\n";
      if (recoveryTrend.acwr != null) context += `ACWR: ${recoveryTrend.acwr.toFixed(2)} (trend: ${recoveryTrend.acwr_trend || 'stable'})\n`;
      if (recoveryTrend.chronic_load != null) context += `Chronic Load: ${recoveryTrend.chronic_load.toFixed(1)} (baseline: ${baselineMap['chronic_load']?.toFixed(1) || 'building'})\n`;
      if (recoveryTrend.acute_load != null) context += `Acute Load: ${recoveryTrend.acute_load.toFixed(1)} (baseline: ${baselineMap['acute_load']?.toFixed(1) || 'building'})\n`;
      if (recoveryTrend.recovery_score != null) context += `Recovery Score: ${recoveryTrend.recovery_score}\n`;
      context += "\n";
    }

    if (activityTrend) {
      context += "## ACTIVITY TRENDS\n";
      if (activityTrend.steps_avg_7d) context += `7-Day Avg Steps: ${Math.round(activityTrend.steps_avg_7d)}\n`;
      if (activityTrend.steps_baseline && activityTrend.steps_delta != null) {
        context += `Steps vs Personal Baseline: ${activityTrend.steps_delta > 0 ? '+' : ''}${Math.round(activityTrend.steps_delta)} (baseline: ${Math.round(activityTrend.steps_baseline)})\n`;
      }
      context += `Trend Direction: ${activityTrend.trend_direction || 'stable'}\n\n`;
    }

    // Active health anomalies
    if (healthAnomalies && healthAnomalies.length > 0) {
      context += "## ACTIVE HEALTH ALERTS\n";
      for (const anomaly of healthAnomalies) {
        context += `${anomaly.severity.toUpperCase()} — ${anomaly.metric_name}: ${anomaly.anomaly_type}`;
        if (anomaly.deviation_percent != null) context += ` (${anomaly.deviation_percent > 0 ? '+' : ''}${anomaly.deviation_percent.toFixed(1)}% from personal baseline)`;
        if (anomaly.notes) context += ` — ${anomaly.notes}`;
        context += "\n";
      }
      context += "\n";
    }

    // Deviations from personal baseline
    if (userDeviations && userDeviations.length > 0) {
      const flagged = userDeviations.filter((d: any) => d.risk_zone === 'high-risk' || d.risk_zone === 'moderate-risk');
      if (flagged.length > 0) {
        context += "## DEVIATIONS FROM PERSONAL BASELINE\n";
        for (const dev of flagged.slice(0, 4)) {
          context += `${dev.metric}: ${dev.deviation?.toFixed(1)}% deviation [${dev.risk_zone}]`;
          if (dev.baseline_value != null && dev.current_value != null) {
            context += ` — personal baseline: ${dev.baseline_value}, current: ${dev.current_value}`;
          }
          context += "\n";
        }
        context += "\n";
      }
    }

    // Recent symptoms
    if (symptomCheckIns && symptomCheckIns.length > 0) {
      context += "## RECENT SYMPTOMS\n";
      for (const s of symptomCheckIns) {
        const daysAgo = Math.floor((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24));
        context += `${s.symptom_type} (${s.severity})`;
        if (s.body_location) context += ` — ${s.body_location}`;
        context += ` — ${daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`}\n`;
      }
      context += "\n";
    }

    // Uploaded documents
    if (documents && documents.length > 0) {
      context += "## UPLOADED HEALTH DOCUMENTS\n";
      for (const doc of documents) {
        context += `${doc.document_type}: ${doc.ai_summary || 'Document processed'}\n`;
      }
      context += "\n";
    }

    // Long-term memory
    if (memoryBank && memoryBank.length > 0) {
      context += "## LONG-TERM MEMORY\n";
      memoryBank.slice(0, 8).forEach((m: any) => {
        const val = typeof m.memory_value === 'string' ? m.memory_value : JSON.stringify(m.memory_value).slice(0, 120);
        context += `${m.memory_key}: ${val}\n`;
      });
      context += "\n";
    }

    // Training context from enhanced profile
    if (userContext?.training_profile && typeof userContext.training_profile === 'object') {
      const tp = userContext.training_profile as Record<string, unknown>;
      if (Object.keys(tp).length > 0) {
        context += "## ADDITIONAL TRAINING CONTEXT\n";
        context += JSON.stringify(tp, null, 2).slice(0, 400) + "\n\n";
      }
    }

    console.log(`[generate-yves-recommendations] Built context with ${sessions?.length || 0} sessions, ${documents?.length || 0} docs, ${Object.keys(baselineMap).length} baselines`);

    const recommendationSchema = {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              priority: { type: "string", enum: ["high", "medium", "low"] },
              title: { type: "string" },
              message: { type: "string" },
              actionText: { type: "string" },
              category: { type: "string" },
              icon: { type: "string" }
            },
            required: ["priority", "title", "message", "actionText", "category"]
          },
          minItems: 3,
          maxItems: 3
        }
      },
      required: ["recommendations"]
    };

    const ai = getAIProvider();

    const aiResponse = await ai.chat({
      messages: [
        {
          role: 'system',
          content: `You are Yves — a medical-grade sports performance advisor. You combine the clinical precision of a sports medicine physician, the tactical knowledge of an elite S&C coach, and the warmth of a trusted mentor who knows this athlete personally.

PERSONAL BASELINE RULE (NON-NEGOTIABLE):
Never compare metrics to population averages or generic norms. Always compare to THIS athlete's own established baseline.
Correct: "Your HRV of 52ms sits 18% below your personal baseline of 63ms."
Wrong: "Your HRV is on the lower end."
If no long-term baseline exists, use their rolling average and label it clearly.

CONTEXT ANCHORING (NON-NEGOTIABLE):
Every recommendation must anchor to at least one of:
- Their specific sport, activities, or training phase
- A named injury or medical condition they have
- Their event timeline (days to competition, goal date)
- Their current stress level or life context
- Their stated goals

ONE RECOMMENDATION STRUCTURE — follow exactly:
title: Short and specific (e.g., "Hold ACWR below 1.3 this week" — not "Rest more")
message: 2–3 sentences. Lead with their actual number vs their personal baseline. Explain WHY this matters for their specific situation and context. Zero filler.
actionText: One clear, time-bound action (e.g., "Cap tonight's session at 40 min Zone 2")
category: sleep | recovery | training | nutrition | stress | injury
priority: high | medium | low — set honestly based on the data, not generously

HARD TRUTH RULE:
When data reveals risk (high ACWR, declining HRV trend, injury flag), say it clearly. Soften the delivery, never the message.
Lead with empathy, then state the fact, then give the path forward.

ANTI-GENERIC RULE:
Never produce a generic tip. "Get more sleep" is not acceptable. "Your sleep score has dropped 12 points below your baseline across the last 4 nights — here's what to change tonight" is.

ANTI-SURVEILLANCE:
Never say "your data shows" or "we detected". Say "it looks like" or "your [metric] suggests".

SYMPTOMS OVERRIDE METRICS:
If symptoms are present, the highest-priority recommendation must address them, even if other metrics look fine.`
        },
        { role: 'user', content: context }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_recommendations",
            description: "Generate 3 hyper-personalised health recommendations",
            parameters: recommendationSchema
          }
        }
      ],
      toolChoice: { type: "function", function: { name: "generate_recommendations" } }
    });

    let recommendations = [];
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const parsed = JSON.parse(aiResponse.toolCalls[0].arguments);
      recommendations = parsed.recommendations || [];
    }

    // Replace old recommendations with fresh ones
    await supabase.from("yves_recommendations").delete().eq("user_id", userId);

    for (const rec of recommendations) {
      await supabase.from("yves_recommendations").insert({
        user_id: userId,
        recommendation_text: rec.message,
        category: rec.category,
        priority: rec.priority,
        source: "oura_sync",
      });
    }

    console.log(`[generate-yves-recommendations] [SUCCESS] Generated ${recommendations.length} recommendations for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[generate-yves-recommendations] [ERROR]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
