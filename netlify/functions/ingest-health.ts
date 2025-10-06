import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    if (!body.user_id || !body.samples) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("health_data").insert([
      {
        user_id: body.user_id,
        collected_at: body.collected_at || new Date().toISOString(),
        samples: body.samples,
      },
    ]);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Insert error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
