import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const { user_id } = await req.json();
  if (!user_id) {
    return new Response("Missing user_id", { status: 400 });
  }
  const clientId = Deno.env.get("FITBIT_CLIENT_ID")!;
  const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET")!;
  const creds = btoa(`${clientId}:${clientSecret}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: tokenRow } = await supabase
    .from("fitbit_tokens")
    .select()
    .eq("user_id", user_id)
    .single();

  if (!tokenRow) {
    return new Response(JSON.stringify({ error: "Token not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resp = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRow.refresh_token,
    }),
  });

  const data = await resp.json();
  const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase
    .from("fitbit_tokens")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      scope: data.scope,
      expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user_id);

  return new Response(JSON.stringify({ refreshed: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
