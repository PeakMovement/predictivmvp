import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const SUPABASE_WEBHOOK_URL = process.env.SUPABASE_GARMIN_WEBHOOK_URL;

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (!SUPABASE_WEBHOOK_URL) {
    console.error("[garmin-proxy] SUPABASE_GARMIN_WEBHOOK_URL is not set");
    return { statusCode: 200, body: "OK" };
  }

  try {
    const queryString = event.rawQuery ? `?${event.rawQuery}` : "";
    const targetUrl   = `${SUPABASE_WEBHOOK_URL}${queryString}`;

    console.log(`[garmin-proxy] Forwarding ${event.httpMethod} → ${targetUrl}`);

    const fetchOptions: RequestInit = {
      method: event.httpMethod,
      headers: {
        "Content-Type": event.headers["content-type"] || "application/json",
        "x-garmin-proxy": "netlify",
      },
    };

    if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD" && event.body) {
      fetchOptions.body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf-8")
        : event.body;
    }

    const supabaseResponse = await fetch(targetUrl, fetchOptions);
    const responseText     = await supabaseResponse.text();

    console.log(`[garmin-proxy] Supabase responded: ${supabaseResponse.status} — ${responseText.slice(0, 200)}`);

    return { statusCode: 200, body: "OK" };

  } catch (error) {
    console.error("[garmin-proxy] Error:", error);
    return { statusCode: 200, body: "OK" };
  }
};
