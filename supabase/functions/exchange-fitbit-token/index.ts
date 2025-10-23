import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { code, user_id } = await req.json();
    if (!code || !user_id) return new Response(JSON.stringify({ error: "Missing code or user_id" }), { status: 400 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${Deno.env.get("FITBIT_CLIENT_ID")!}:${Deno.env.get("FITBIT_CLIENT_SECRET")!}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: Deno.env.get("FITBIT_REDIRECT_URI")!,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("❌ Fitbit token exchange failed:", text);
      return new Response(text, { status: tokenRes.status });
    }

    const tokenData = await tokenRes.json();
    const expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // ✅ Upsert cleanly into fitbit_tokens
    await supabase.from("fitbit_tokens").upsert(
      {
        user_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at,
        fitbit_user_id: tokenData.user_id,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    // Mark user as connected
    await supabase
      .from("users")
      .update({ fitbit_connected: true, fitbit_user_id: tokenData.user_id })
      .eq("id", user_id);

    console.log(`✅ Fitbit tokens saved for user ${user_id}`);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("exchange-fitbit-token error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
