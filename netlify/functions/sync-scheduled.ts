import { Handler } from "@netlify/functions";
import { logSync } from "../utils/logger";

// Schedule configuration - runs every hour on the hour
export const config = {
  schedule: "@hourly",
};

const handler: Handler = async (event) => {
  try {
    logSync("fitbit:scheduled:start", { 
      message: "🔁 Scheduled Fitbit token refresh started",
      timestamp: new Date().toISOString()
    });

    // Call the refresh endpoint (which also triggers sync-auto automatically)
    const baseUrl = process.env.URL || 'https://predictiv.netlify.app';
    const response = await fetch(
      `${baseUrl}/.netlify/functions/refresh-fitbit-token`
    );

    if (!response.ok) {
      const errorText = await response.text();
      logSync("fitbit:scheduled:failed", {
        message: "❌ Scheduled refresh failed",
        status: response.status,
        error: errorText,
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: "Scheduled refresh failed",
          status: response.status,
          details: errorText,
        }),
      };
    }

    const result = await response.json();
    
    logSync("fitbit:scheduled:success", {
      message: "✅ Scheduled refresh complete and auto-sync triggered",
      timestamp: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Scheduled Fitbit refresh executed",
        result,
      }),
    };
  } catch (e: any) {
    logSync("fitbit:scheduled:error", {
      message: "❌ Scheduled refresh failed",
      error: e.message,
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: e.message,
      }),
    };
  }
};

export { handler };
