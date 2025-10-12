import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ success: false, message: "Missing code" }), { status: 400 });
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    const redirectUri = Deno.env.get("FITBIT_REDIRECT_URI");

    const credentials = btoa(`${clientId}:${clientSecret}`);

    const params = new URLSearchParams({
      client_id: clientId!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri!,
      code,
    });

    const res = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const text = await res.text();
    console.log("Fitbit response raw:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Fitbit returned HTML (redirect or mismatch)", raw: text }),
        {
          status: 500,
        },
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
});
