

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");

    if (!clientId) {
      console.error("FITBIT_CLIENT_ID is not configured");
      return new Response(
        JSON.stringify({ error: "Fitbit OAuth not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const code_verifier = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const code_challenge = await sha256Base64Url(code_verifier);

    const authUrl = new URL("https://www.fitbit.com/oauth2/authorize");
    authUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: "https://predictiv.netlify.app/fitbit/callback",
      scope: "activity heartrate sleep profile",
      code_challenge_method: "S256",
      code_challenge,
      prompt: "login",
      state: user_id,
    }).toString();

    console.log(`[fitbit-auth-initiate] Generated auth URL for user: ${user_id}`);

    return new Response(
      JSON.stringify({
        auth_url: authUrl.href,
        code_verifier,
        success: true
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("[fitbit-auth-initiate] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
