import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[fetch-oura-auto] Starting fetch for user_id: ${user_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: token, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (tokenError || !token) {
      console.log(`[fetch-oura-auto] No Oura tokens found for user ${user_id}`);
      return new Response(
        JSON.stringify({ error: "No Oura tokens found", reconnect: true }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Refresh token if expired
    if (new Date(token.expires_at) < new Date()) {
      console.log(`[fetch-oura-auto] Token expired for user ${user_id}, refreshing...`);
      const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: token.refresh_token,
          client_id: Deno.env.get("OURA_CLIENT_ID")!,
          client_secret: Deno.env.get("OURA_CLIENT_SECRET")!,
        }),
      });

      if (!refreshRes.ok) {
        const errorData = await refreshRes.json();
        console.error(`[fetch-oura-auto] Token refresh failed:`, errorData);
        return new Response(
          JSON.stringify({ error: "Token refresh failed", reconnect: true }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const refreshed = await refreshRes.json();
      
      await supabase.from("oura_tokens").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? token.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        fetched_at: new Date().toISOString(),
      }).eq("user_id", user_id);
      
      token.access_token = refreshed.access_token;
      console.log(`[fetch-oura-auto] Token refreshed successfully for user ${user_id}`);
    }

    const dateUsed = new Date().toISOString().slice(0, 10);
    console.log(`[fetch-oura-auto] Fetching data for date: ${dateUsed}`);

    const endpoints = [
      "daily_sleep",
      "daily_readiness",
      "daily_activity",
    ];

    const results: Record<string, any> = {};
    const fetchedEndpoints: string[] = [];

    for (const endpoint of endpoints) {
      const url = `https://api.ouraring.com/v2/usercollection/${endpoint}?start_date=${dateUsed}`;
      console.log(`[fetch-oura-auto] Fetching ${url}`);
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });

      if (!res.ok) {
        console.error(`[fetch-oura-auto] Failed to fetch ${endpoint}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      results[endpoint] = data;
      fetchedEndpoints.push(endpoint);

      const { error: logError } = await supabase.from("oura_sync_log").insert({
        user_id,
        fetched_at: new Date().toISOString(),
        endpoint,
        date_used: dateUsed,
        data,
      });

      if (logError) {
        console.error(`[fetch-oura-auto] Failed to log ${endpoint}:`, logError);
      } else {
        console.log(`[fetch-oura-auto] Successfully logged ${endpoint}`);
      }
    }

    console.log(`[fetch-oura-auto] Completed fetch for user ${user_id}. Endpoints: ${fetchedEndpoints.join(", ")}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        fetched_endpoints: fetchedEndpoints,
        date: dateUsed
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[fetch-oura-auto] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
