import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Provider mapping with specialties
const PROVIDER_TYPES = {
  "general_practitioner": {
    name: "General Practitioner (GP)",
    specialties: ["general health", "initial assessment", "referrals", "chronic conditions"],
    urgency_threshold: "moderate"
  },
  "physiotherapist": {
    name: "Physiotherapist",
    specialties: ["musculoskeletal", "rehabilitation", "sports injuries", "mobility", "pain management"],
    urgency_threshold: "mild"
  },
  "sports_medicine": {
    name: "Sports Medicine Specialist",
    specialties: ["athletic performance", "sports injuries", "overtraining", "exercise prescription"],
    urgency_threshold: "moderate"
  },
  "cardiologist": {
    name: "Cardiologist",
    specialties: ["heart", "cardiovascular", "chest pain", "arrhythmia", "HRV abnormalities"],
    urgency_threshold: "severe"
  },
  "sleep_specialist": {
    name: "Sleep Specialist",
    specialties: ["insomnia", "sleep disorders", "fatigue", "sleep apnea"],
    urgency_threshold: "moderate"
  },
  "nutritionist": {
    name: "Nutritionist/Dietitian",
    specialties: ["diet", "nutrition", "weight management", "energy levels"],
    urgency_threshold: "mild"
  },
  "psychologist": {
    name: "Psychologist/Mental Health",
    specialties: ["stress", "anxiety", "mental health", "burnout", "motivation"],
    urgency_threshold: "moderate"
  },
  "orthopedic_surgeon": {
    name: "Orthopedic Surgeon",
    specialties: ["severe injury", "fractures", "joint replacement", "surgical intervention"],
    urgency_threshold: "severe"
  },
  "emergency": {
    name: "Emergency Services",
    specialties: ["acute", "life-threatening", "severe pain", "immediate intervention"],
    urgency_threshold: "critical"
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── AUTH ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── INPUT ───────────────────────────────────────────────────────────────
    const { issue_type, severity, contextual_factors } = await req.json();
    
    if (!issue_type) {
      return new Response(JSON.stringify({ error: "issue_type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // ─── GATHER ALL CONTEXT DATA ─────────────────────────────────────────────
    const dataSources: string[] = [];
    const flags: string[] = [];

    // 1. User Profile
    const { data: userProfile } = await supabase
      .from("user_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (userProfile) dataSources.push("user_profile");

    // 2. Symptom History
    const { data: symptomHistory } = await supabase
      .from("symptom_check_ins")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (symptomHistory?.length) dataSources.push("symptom_check_ins");

    // 3. Wearable Sessions
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: wearableSessions } = await supabase
      .from("wearable_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });
    if (wearableSessions?.length) dataSources.push("wearable_sessions");

    // 4. Training Trends
    const { data: trainingTrends } = await supabase
      .from("training_trends")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7);
    if (trainingTrends?.length) dataSources.push("training_trends");

    // 5. Recovery Trends
    const { data: recoveryTrends } = await supabase
      .from("recovery_trends")
      .select("*")
      .eq("user_id", user.id)
      .order("period_date", { ascending: false })
      .limit(7);
    if (recoveryTrends?.length) dataSources.push("recovery_trends");

    // 6. Health Anomalies
    const { data: healthAnomalies } = await supabase
      .from("health_anomalies")
      .select("*")
      .eq("user_id", user.id)
      .is("acknowledged_at", null)
      .order("detected_at", { ascending: false })
      .limit(10);
    if (healthAnomalies?.length) dataSources.push("health_anomalies");

    // 7. User Deviations
    const { data: userDeviations } = await supabase
      .from("user_deviations")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });
    if (userDeviations?.length) dataSources.push("user_deviations");

    // 8. User Documents
    const { data: userDocuments } = await supabase
      .from("user_documents")
      .select("document_type, ai_summary, tags")
      .eq("user_id", user.id)
      .eq("processing_status", "completed")
      .limit(5);
    if (userDocuments?.length) dataSources.push("user_documents");

    // 9. Memory Bank
    const { data: memoryBank } = await supabase
      .from("yves_memory_bank")
      .select("memory_key, memory_value")
      .eq("user_id", user.id);
    if (memoryBank?.length) dataSources.push("yves_memory_bank");

    // 10. Past Triage Results (for memory)
    const { data: pastTriages } = await supabase
      .from("triage_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (pastTriages?.length) dataSources.push("triage_results");

    // ─── CHECK DATA QUALITY & FLAGS ──────────────────────────────────────────
    if (!wearableSessions?.length) {
      flags.push("NO_WEARABLE_DATA");
    }
    if (!symptomHistory?.length) {
      flags.push("NO_SYMPTOM_HISTORY");
    }
    if (!userProfile) {
      flags.push("NO_USER_PROFILE");
    }
    if (dataSources.length < 3) {
      flags.push("INSUFFICIENT_CONTEXT");
    }

    // ─── BUILD CONTEXT FOR AI ────────────────────────────────────────────────
    let contextText = `
TRIAGE REQUEST:
Issue Type: ${issue_type}
Severity: ${severity || "Not specified"}
Additional Context: ${JSON.stringify(contextual_factors || {})}

USER PROFILE:
Name: ${userProfile?.name || "Unknown"}
Goals: ${userProfile?.goals?.join(", ") || "Not specified"}
Injuries: ${userProfile?.injuries?.join(", ") || "None listed"}
Medical Conditions: ${userProfile?.conditions?.join(", ") || "None listed"}
Activity Level: ${userProfile?.activity_level || "Unknown"}
`;

    if (symptomHistory?.length) {
      contextText += `\nSYMPTOM HISTORY (Last ${symptomHistory.length} entries):`;
      for (const s of symptomHistory.slice(0, 5)) {
        contextText += `\n- ${s.symptom_type} (${s.severity}): ${s.description || "No description"} [${new Date(s.created_at).toLocaleDateString()}]`;
        if (s.body_location) contextText += ` Location: ${s.body_location}`;
      }
    }

    if (healthAnomalies?.length) {
      contextText += `\n\nACTIVE HEALTH ANOMALIES:`;
      for (const a of healthAnomalies) {
        contextText += `\n- ${a.metric_name}: ${a.anomaly_type} (${a.severity})`;
        if (a.deviation_percent) contextText += ` ${a.deviation_percent > 0 ? "+" : ""}${a.deviation_percent.toFixed(1)}%`;
      }
    }

    if (userDeviations?.length) {
      contextText += `\n\nTREND DEVIATIONS:`;
      for (const d of userDeviations.slice(0, 5)) {
        contextText += `\n- ${d.metric}: ${d.deviation?.toFixed(1) || 0}% (${d.risk_zone || "unknown"})`;
      }
    }

    if (trainingTrends?.length) {
      const latest = trainingTrends[0];
      contextText += `\n\nTRAINING METRICS (Latest):`;
      if (latest.acwr) contextText += `\n- ACWR: ${latest.acwr.toFixed(2)}`;
      if (latest.strain) contextText += `\n- Strain: ${latest.strain.toFixed(0)}`;
      if (latest.monotony) contextText += `\n- Monotony: ${latest.monotony.toFixed(2)}`;
    }

    if (wearableSessions?.length) {
      const latest = wearableSessions[0];
      contextText += `\n\nWEARABLE DATA (Latest):`;
      if (latest.sleep_score) contextText += `\n- Sleep Score: ${latest.sleep_score}`;
      if (latest.readiness_score) contextText += `\n- Readiness: ${latest.readiness_score}`;
      if (latest.hrv_avg) contextText += `\n- HRV: ${latest.hrv_avg}ms`;
      if (latest.resting_hr) contextText += `\n- Resting HR: ${latest.resting_hr}bpm`;
    }

    if (userDocuments?.length) {
      contextText += `\n\nUPLOADED DOCUMENTS:`;
      for (const d of userDocuments) {
        contextText += `\n- ${d.document_type}: ${d.ai_summary?.slice(0, 100) || "No summary"}`;
      }
    }

    if (pastTriages?.length) {
      contextText += `\n\nPAST TRIAGE HISTORY:`;
      for (const t of pastTriages.slice(0, 3)) {
        contextText += `\n- ${t.issue_type} → ${t.recommended_provider} (${t.confidence_score}% confidence) [${new Date(t.created_at).toLocaleDateString()}]`;
        if (t.outcome_feedback) contextText += ` Outcome: ${t.outcome_feedback}`;
      }
    }

    if (memoryBank?.length) {
      contextText += `\n\nLONG-TERM MEMORY:`;
      for (const m of memoryBank) {
        contextText += `\n- ${m.memory_key}: ${JSON.stringify(m.memory_value)}`;
      }
    }

    contextText += `\n\nAVAILABLE PROVIDER TYPES:
${Object.entries(PROVIDER_TYPES).map(([key, val]) => `- ${key}: ${val.name} (${val.specialties.join(", ")})`).join("\n")}
`;

    // ─── AI PREDICTION ───────────────────────────────────────────────────────
    const ai = getAIProvider();
    
    const aiResponse = await ai.chat({
      messages: [
        {
          role: "system",
          content: `You are a medical triage AI assistant. Your task is to analyze health data and recommend the most appropriate healthcare provider.

CRITICAL INSTRUCTIONS:
1. Analyze ALL available context: symptoms, wearable data, trends, anomalies, documents, and history.
2. Consider the severity and urgency of the issue.
3. Use past triage history to improve recommendations.
4. Provide a confidence score based on data quality and pattern matching.
5. Generate clear reasoning referencing specific data points.

OUTPUT FORMAT (JSON ONLY):
{
  "recommended_provider": "provider_type_key",
  "confidence_score": 0-100,
  "reasoning": "Detailed explanation referencing specific metrics and patterns",
  "urgency": "routine|soon|urgent|emergency",
  "alternative_providers": ["provider1", "provider2"],
  "action_items": ["item1", "item2"]
}

CONFIDENCE SCORING GUIDELINES:
- 90-100%: Clear pattern match with multiple data sources confirming
- 70-89%: Good pattern match with supporting data
- 50-69%: Moderate confidence, some uncertainty
- Below 50%: Insufficient data, flag for human review`
        },
        { role: "user", content: contextText }
      ],
      temperature: 0.3,
      maxTokens: 1000,
    });

    // ─── PARSE AI RESPONSE ───────────────────────────────────────────────────
    let prediction;
    try {
      const responseText = aiResponse.content || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[predict-provider] Failed to parse AI response:", parseError);
      prediction = {
        recommended_provider: "general_practitioner",
        confidence_score: 40,
        reasoning: "Unable to generate specific recommendation. Defaulting to GP for initial assessment.",
        urgency: "routine",
        alternative_providers: [],
        action_items: ["Consult with a General Practitioner for proper assessment"]
      };
      flags.push("AI_PARSE_ERROR");
    }

    // ─── VALIDATE AND ENHANCE PREDICTION ─────────────────────────────────────
    const providerKey = prediction.recommended_provider || "general_practitioner";
    const providerInfo = PROVIDER_TYPES[providerKey as keyof typeof PROVIDER_TYPES] || PROVIDER_TYPES.general_practitioner;
    
    // Adjust confidence based on data quality
    let adjustedConfidence = prediction.confidence_score || 50;
    if (flags.includes("INSUFFICIENT_CONTEXT")) {
      adjustedConfidence = Math.min(adjustedConfidence, 60);
    }
    if (flags.includes("NO_WEARABLE_DATA") && flags.includes("NO_SYMPTOM_HISTORY")) {
      adjustedConfidence = Math.min(adjustedConfidence, 45);
    }

    // ─── STORE TRIAGE RESULT ─────────────────────────────────────────────────
    const triageResult = {
      user_id: user.id,
      issue_type,
      severity: severity || "moderate",
      recommended_provider: providerKey,
      confidence_score: adjustedConfidence,
      reasoning: prediction.reasoning,
      contextual_factors: {
        ...contextual_factors,
        urgency: prediction.urgency,
        alternative_providers: prediction.alternative_providers,
        action_items: prediction.action_items
      },
      data_sources_used: dataSources,
      flags: flags.length > 0 ? flags : null
    };

    const { data: savedTriage, error: saveError } = await supabase
      .from("triage_results")
      .insert(triageResult)
      .select()
      .single();

    if (saveError) {
      console.error("[predict-provider] Failed to save triage result:", saveError);
    }


    // ─── RETURN RESPONSE ─────────────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      triage_id: savedTriage?.id,
      recommended_provider: {
        key: providerKey,
        name: providerInfo.name,
        specialties: providerInfo.specialties
      },
      confidence_score: adjustedConfidence,
      reasoning: prediction.reasoning,
      urgency: prediction.urgency || "routine",
      alternative_providers: prediction.alternative_providers || [],
      action_items: prediction.action_items || [],
      data_sources_used: dataSources,
      flags: flags.length > 0 ? flags : null,
      find_help_link: `/find-help?provider=${providerKey}&issue=${encodeURIComponent(issue_type)}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[predict-provider] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
