import { serve } from "https://deno.land/std/http/server.ts";

async function sha256Base64Url(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return base64;
}

serve(async (req) => {
  const { user_id } = await req.json();
  const code_verifier = crypto.randomUUID().replace(/-/g, "");
  const code_challenge = await sha256Base64Url(code_verifier);
  const authUrl = new URL("https://www.fitbit.com/oauth2/authorize");
  authUrl.search = new URLSearchParams({
    client_id: Deno.env.get("FITBIT_CLIENT_ID")!,
    response_type: "code",
    redirect_uri: "https://predictiv.netlify.app/fitbit/callback",
    scope: "activity heartrate sleep profile",
    code_challenge_method: "S256",
    code_challenge,
    prompt: "login",
    state: user_id,
  }).toString();
  return new Response(
    JSON.stringify({ auth_url: authUrl.href, code_verifier }),
    { headers: { "Content-Type": "application/json" } },
  );
});
