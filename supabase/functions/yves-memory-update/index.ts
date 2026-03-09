import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── INPUT VALIDATION ────────────────────────────────────────────────────
    const { user_id, memory_key, memory_value, source_timestamp } = await req.json();

    if (!user_id || !memory_key || !memory_value) {
      return new Response(
        JSON.stringify({ error: "user_id, memory_key, and memory_value are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ensure user can only update their own memory
    if (user.id !== user_id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHECK MEMORY_CLEARED_AT SAFEGUARD ───────────────────────────────────
    // If the user has cleared their chat history, ignore auto-captured memories
    // that originated before the clear timestamp
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("memory_cleared_at")
      .eq("id", user_id)
      .maybeSingle();

    if (profileError) {
      console.error("[yves-memory-update] Error fetching profile:", profileError);
      // Continue anyway - don't block on profile fetch failure
    }

    if (profile?.memory_cleared_at && source_timestamp) {
      const clearedAt = new Date(profile.memory_cleared_at).getTime();
      const sourceTime = new Date(source_timestamp).getTime();
      
      if (sourceTime < clearedAt) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Memory ignored - originated before last clear",
            skipped: true 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }


    // ─── UPSERT MEMORY ───────────────────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from("yves_memory_bank")
      .upsert(
        {
          user_id,
          memory_key,
          memory_value,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "user_id,memory_key",
        }
      );

    if (upsertError) {
      console.error("[yves-memory-update] Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to update memory", details: upsertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }


    return new Response(
      JSON.stringify({ success: true, message: "Memory updated" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[yves-memory-update] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
