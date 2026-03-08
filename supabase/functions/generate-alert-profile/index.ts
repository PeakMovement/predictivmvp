import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a sports science expert. Based on the athlete's description, return ONLY a JSON object with these exact keys and numeric values within these ranges:
hrv_drop_threshold (10-30), rhr_spike_threshold (5-20), sleep_score_threshold (50-75), readiness_threshold (40-65), acwr_critical (1.1-1.8), strain_critical (800-3000), monotony_critical (1.2-3.5).
No explanation, no markdown, just the JSON.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify the requesting user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { context } = await req.json();
    if (!context || typeof context !== "string" || context.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please provide a more detailed description (at least 10 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    let rawJson: string;

    if (anthropicKey) {
      // Use Anthropic API with claude-sonnet-4-6
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: context.trim().slice(0, 1000) }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      rawJson = data.content[0]?.text ?? "";
    } else if (lovableKey) {
      // Fallback: Lovable gateway (Gemini)
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 256,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: context.trim().slice(0, 1000) },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`AI API error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      rawJson = data.choices[0]?.message?.content ?? "";
    } else {
      return new Response(
        JSON.stringify({ error: "No AI API key configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip any markdown code fences before parsing
    const cleaned = rawJson.replace(/```json?/gi, "").replace(/```/g, "").trim();

    let profile: Record<string, number>;
    try {
      profile = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON: " + cleaned.slice(0, 200));
    }

    // Validate and clamp every key
    const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
      const n = Number(v);
      if (isNaN(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };

    const result = {
      hrv_drop_threshold:        clamp(profile.hrv_drop_threshold,  10, 30,   20),
      rhr_spike_threshold:       clamp(profile.rhr_spike_threshold,  5, 20,   10),
      sleep_score_threshold:     clamp(profile.sleep_score_threshold, 50, 75,  60),
      readiness_score_threshold: clamp(profile.readiness_threshold,  40, 65,  50),
      acwr_critical_threshold:   clamp(profile.acwr_critical,        1.1, 1.8, 1.5),
      strain_critical_threshold: clamp(profile.strain_critical,      800, 3000, 1500),
      monotony_critical_threshold: clamp(profile.monotony_critical,  1.2, 3.5, 2.0),
    };

    return new Response(JSON.stringify({ profile: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-alert-profile] Error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
