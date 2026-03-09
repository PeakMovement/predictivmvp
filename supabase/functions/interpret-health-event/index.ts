import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthInterpretation {
  symptom_checkin_id: string;
  summary: string;
  flagged_conditions?: string[];
  recommendations?: string[];
  confidence_score: number;
  data_sources_used: string[];
  timestamp: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptom_checkin_id } = await req.json();

    if (!symptom_checkin_id) {
      return new Response(
        JSON.stringify({ error: "symptom_checkin_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("[interpret-health-event] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const dataSources: string[] = [];

    // 1. Fetch the symptom check-in
    const { data: symptom, error: symptomError } = await supabase
      .from("symptom_check_ins")
      .select("*")
      .eq("id", symptom_checkin_id)
      .single();

    if (symptomError || !symptom) {
      console.error("[interpret-health-event] Symptom not found:", symptomError);
      return new Response(
        JSON.stringify({ error: "Symptom check-in not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    dataSources.push("symptom_check_ins");
    const userId = symptom.user_id;

    // 2. Gather all health context in parallel
    const [
      profileResult,
      wearableResult,
      trainingResult,
      recoveryResult,
      anomaliesResult,
      deviationsResult,
      documentsResult,
      recentSymptomsResult,
    ] = await Promise.all([
      supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("wearable_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("training_trends").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("recovery_trends").select("*").eq("user_id", userId).order("period_date", { ascending: false }).limit(1),
      supabase.from("health_anomalies").select("*").eq("user_id", userId).order("detected_at", { ascending: false }).limit(5),
      supabase.from("user_deviations").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(5),
      supabase.from("user_documents").select("id, document_type, ai_summary, tags").eq("user_id", userId).limit(10),
      supabase.from("symptom_check_ins").select("*").eq("user_id", userId).neq("id", symptom_checkin_id).order("created_at", { ascending: false }).limit(5),
    ]);

    // Track which data sources have data
    if (profileResult.data) dataSources.push("user_profile");
    if (wearableResult.data?.length) dataSources.push("wearable_sessions");
    if (trainingResult.data?.length) dataSources.push("training_trends");
    if (recoveryResult.data?.length) dataSources.push("recovery_trends");
    if (anomaliesResult.data?.length) dataSources.push("health_anomalies");
    if (deviationsResult.data?.length) dataSources.push("user_deviations");
    if (documentsResult.data?.length) dataSources.push("user_documents");
    if (recentSymptomsResult.data?.length) dataSources.push("symptom_history");

    // 3. Build comprehensive context
    const context = {
      currentSymptom: {
        type: symptom.symptom_type,
        severity: symptom.severity,
        description: symptom.description,
        bodyLocation: symptom.body_location,
        triggers: symptom.triggers,
        durationHours: symptom.duration_hours,
        onsetTime: symptom.onset_time,
        reportedAt: symptom.created_at,
      },
      userProfile: profileResult.data || null,
      recentWearableData: wearableResult.data?.map((w: any) => ({
        date: w.date,
        sleepScore: w.sleep_score,
        readinessScore: w.readiness_score,
        activityScore: w.activity_score,
        hrvAvg: w.hrv_avg,
        restingHr: w.resting_hr,
        spo2Avg: w.spo2_avg,
        totalSteps: w.total_steps,
      })) || [],
      trainingMetrics: trainingResult.data?.slice(0, 1).map((t: any) => ({
        acwr: t.acwr,
        strain: t.strain,
        monotony: t.monotony,
        acuteLoad: t.acute_load,
        chronicLoad: t.chronic_load,
      }))[0] || null,
      recoveryStatus: recoveryResult.data?.[0] || null,
      recentAnomalies: anomaliesResult.data?.map((a: any) => ({
        metric: a.metric_name,
        severity: a.severity,
        type: a.anomaly_type,
        detectedAt: a.detected_at,
      })) || [],
      recentDeviations: deviationsResult.data?.map((d: any) => ({
        metric: d.metric,
        deviation: d.deviation,
        riskZone: d.risk_zone,
      })) || [],
      medicalDocuments: documentsResult.data?.map((d: any) => ({
        type: d.document_type,
        summary: d.ai_summary,
        tags: d.tags,
      })) || [],
      recentSymptoms: recentSymptomsResult.data?.map((s: any) => ({
        type: s.symptom_type,
        severity: s.severity,
        bodyLocation: s.body_location,
        reportedAt: s.created_at,
      })) || [],
    };


    // 4. Call Lovable AI with tool calling for structured output
    const systemPrompt = `You are a medical interpretation assistant for Predictiv, a health analytics platform. 
Your role is to analyze symptom check-ins alongside wearable data, training metrics, and medical history to provide personalized health interpretations.

Important guidelines:
- Be helpful and informative but NOT alarmist
- Always recommend professional medical consultation for serious concerns
- Consider the full context: recent symptoms, wearable trends, training load, and any documented conditions
- Provide actionable recommendations when appropriate
- Express confidence based on data availability and symptom clarity
- Flag potential conditions only when there's meaningful evidence`;

    const userPrompt = `Analyze this symptom check-in with the user's full health context:

SYMPTOM REPORTED:
${JSON.stringify(context.currentSymptom, null, 2)}

USER PROFILE:
${context.userProfile ? JSON.stringify(context.userProfile, null, 2) : "No profile data available"}

RECENT WEARABLE DATA (last 7 days):
${context.recentWearableData.length > 0 ? JSON.stringify(context.recentWearableData, null, 2) : "No wearable data available"}

TRAINING METRICS:
${context.trainingMetrics ? JSON.stringify(context.trainingMetrics, null, 2) : "No training data available"}

RECOVERY STATUS:
${context.recoveryStatus ? JSON.stringify(context.recoveryStatus, null, 2) : "No recovery data available"}

RECENT HEALTH ANOMALIES:
${context.recentAnomalies.length > 0 ? JSON.stringify(context.recentAnomalies, null, 2) : "No recent anomalies"}

METRIC DEVIATIONS:
${context.recentDeviations.length > 0 ? JSON.stringify(context.recentDeviations, null, 2) : "No significant deviations"}

MEDICAL DOCUMENTS:
${context.medicalDocuments.length > 0 ? JSON.stringify(context.medicalDocuments, null, 2) : "No medical documents uploaded"}

RECENT SYMPTOM HISTORY:
${context.recentSymptoms.length > 0 ? JSON.stringify(context.recentSymptoms, null, 2) : "No recent symptoms"}

Provide a comprehensive interpretation using the interpret_symptom function.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "interpret_symptom",
              description: "Provide a structured interpretation of the symptom check-in with recommendations",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A plain-language interpretation of the symptom in context (2-4 sentences)",
                  },
                  flagged_conditions: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of potential conditions or concerns to be aware of (empty if none)",
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of actionable next steps or recommendations (2-5 items)",
                  },
                  confidence_score: {
                    type: "number",
                    description: "Confidence in this interpretation from 0-100 based on data availability",
                  },
                },
                required: ["summary", "flagged_conditions", "recommendations", "confidence_score"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "interpret_symptom" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[interpret-health-event] AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI interpretation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[interpret-health-event] No tool call in response");
      return new Response(
        JSON.stringify({ error: "AI did not return structured interpretation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const interpretation = JSON.parse(toolCall.function.arguments);

    // 5. Build final response
    const result: HealthInterpretation = {
      symptom_checkin_id,
      summary: interpretation.summary,
      flagged_conditions: interpretation.flagged_conditions || [],
      recommendations: interpretation.recommendations || [],
      confidence_score: Math.min(100, Math.max(0, interpretation.confidence_score)),
      data_sources_used: dataSources,
      timestamp: new Date().toISOString(),
    };


    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[interpret-health-event] ERROR:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
