import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const { code_verifier, user_id } = await req.json();

  if (!code || !code_verifier || !user_id) {
    return new Response("Missing parameters", { status: 400 });
  }

  const clientId = Deno.env.get("FITBIT_CLIENT_ID")!;
  const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET")!;
  const creds = btoa(`${clientId}:${clientSecret}`);

  const tokenResp = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: "https://predictiv.netlify.app/fitbit/callback",
      code,
      code_verifier,
    }),
  });

  const data = await tokenResp.json();
  const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await supabase.from("fitbit_tokens").upsert({
    user_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    scope: data.scope,
    expires_at,
  });

  return new Response("Fitbit connected! You can close this window.", {
    headers: { "Content-Type": "text/html" },
  });
});
