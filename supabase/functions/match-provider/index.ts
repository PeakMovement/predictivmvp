import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";
import { RateLimiter, RATE_LIMIT_CONFIGS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ProfessionalType =
  | "physiotherapist"
  | "biokineticist"
  | "sports_doctor"
  | "general_practitioner"
  | "dietician"
  | "strength_coach"
  | "run_coach";

interface ParsedIntent {
  professionalTypes: ProfessionalType[];
  severity: number;
  redFlags: boolean;
  urgency: "routine" | "soon" | "urgent" | "emergency";
  budget: number | null;
  location: string | null;
  summary: string;
}

const PARSE_TOOL = {
  type: "function" as const,
  function: {
    name: "parse_symptom_query",
    description: "Parse a symptom or health concern description and return structured triage information for a South African sports health context.",
    parameters: {
      type: "object",
      properties: {
        professionalTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "physiotherapist",
              "biokineticist",
              "sports_doctor",
              "general_practitioner",
              "dietician",
              "strength_coach",
              "run_coach",
            ],
          },
          description: "One or more professional types best suited to the query. Rank most relevant first.",
        },
        severity: {
          type: "number",
          description: "Estimated severity 1-10. 1 = very mild, 10 = potentially life-threatening.",
        },
        redFlags: {
          type: "boolean",
          description: "True if symptoms suggest a potentially serious or urgent medical concern requiring prompt attention.",
        },
        urgency: {
          type: "string",
          enum: ["routine", "soon", "urgent", "emergency"],
          description: "routine = can wait weeks, soon = within days, urgent = within 24h, emergency = immediate care needed.",
        },
        budget: {
          type: "number",
          description: "Budget per consultation in South African Rand if explicitly mentioned. Null if not stated.",
        },
        location: {
          type: "string",
          description: "City or area in South Africa if mentioned by the user. Null if not stated.",
        },
        summary: {
          type: "string",
          description: "A concise 1-2 sentence plain-language summary of what the user is experiencing, written neutrally.",
        },
      },
      required: ["professionalTypes", "severity", "redFlags", "urgency", "summary"],
    },
  },
};

const SYSTEM_PROMPT = `You are a clinical triage assistant for Predictiv, a sports performance and health app for South African athletes and active people. Your role is to analyze symptom or health concern descriptions and recommend the most appropriate healthcare professional type.

Professional type guidance:
- physiotherapist: muscle, joint, tendon, or ligament issues; pain with movement; post-injury rehab; running or cycling injuries
- biokineticist: post-physiotherapy conditioning; chronic musculoskeletal pain; exercise prescription for chronic disease; gym-based rehabilitation
- sports_doctor: sports injuries needing medical assessment; concussion; overtraining syndrome; return-to-sport clearance; female athlete health
- general_practitioner: general illness; infections; fatigue without clear cause; initial assessment before specialist referral
- dietician: weight management; sports nutrition; gut health; eating concerns; poor recovery linked to nutrition
- strength_coach: weakness; strength imbalances; gym programming questions; injury prevention through strength
- run_coach: running technique; training plan questions; pacing; preparing for a race; running-related performance issues

Red flags (set redFlags=true and urgency to urgent or emergency):
- Chest pain or tightness especially during exercise
- Shortness of breath at rest or disproportionate to effort
- Sudden severe headache unlike any before
- Neurological symptoms: numbness, weakness, vision changes, slurred speech
- Significant head or spinal trauma
- Signs of infection with systemic symptoms (high fever, rigors)
- Severe swelling with loss of limb function after acute injury

Set urgency=emergency only when symptoms suggest immediate life threat.
Be conservative and practical — most athletic health concerns are routine or soon.`;

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

    // ─── RATE LIMITING ───────────────────────────────────────────────────────
    const rateLimiter = new RateLimiter();
    const rateLimitResult = await rateLimiter.checkRateLimit(user.id, RATE_LIMIT_CONFIGS.AI_CHAT);
    if (!rateLimitResult.allowed) {
      return rateLimiter.createRateLimitResponse(rateLimitResult);
    }

    // ─── INPUT VALIDATION ────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof body !== "object" || body === null) {
      return new Response(JSON.stringify({ error: "Request body must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = body as { query?: unknown };

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required and must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (query.length > 2000) {
      return new Response(JSON.stringify({ error: "query exceeds maximum length of 2000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[match-provider] Parsing query for user ${user.id}: "${query.slice(0, 100)}..."`);

    // ─── AI PARSING ──────────────────────────────────────────────────────────
    const ai = getAIProvider();

    const aiResponse = await ai.chat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      tools: [PARSE_TOOL],
      toolChoice: { type: "function", function: { name: "parse_symptom_query" } },
      temperature: 0.2,
      maxTokens: 512,
    });

    // Extract the tool call result
    let parsed: ParsedIntent;

    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      try {
        parsed = JSON.parse(aiResponse.toolCalls[0].arguments) as ParsedIntent;
      } catch {
        console.error("[match-provider] Failed to parse AI tool call arguments");
        return new Response(JSON.stringify({ error: "AI returned invalid response. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (aiResponse.content) {
      // Fallback: try to extract JSON from content
      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]) as ParsedIntent;
      } catch {
        console.error("[match-provider] Could not extract JSON from AI content");
        return new Response(JSON.stringify({ error: "Could not understand your description. Please try rephrasing." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "AI returned no response. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitise severity and ensure arrays
    parsed.severity = Math.max(1, Math.min(10, parsed.severity || 5));
    if (!Array.isArray(parsed.professionalTypes) || parsed.professionalTypes.length === 0) {
      parsed.professionalTypes = ["general_practitioner"];
    }

    console.log(`[match-provider] Parsed: severity=${parsed.severity}, urgency=${parsed.urgency}, types=${parsed.professionalTypes.join(",")}`);

    return new Response(
      JSON.stringify({ success: true, parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[match-provider] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
