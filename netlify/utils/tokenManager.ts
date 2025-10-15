import { createClient } from "@supabase/supabase-js";
import { logSync } from "./logger";
import { requireEnv } from "./env";

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  refreshed_at?: string;
}

/**
 * Get a valid Fitbit access token, automatically refreshing if expired
 */
export async function getValidToken(userId: string = "CTBNRR"): Promise<string> {
  const env = requireEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Fetch latest token data from database
  const { data, error } = await supabase
    .from("fitbit_auto_data")
    .select("activity")
    .eq("user_id", userId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    logSync("tokenManager:error", { error: error?.message || "No token data found" });
    throw new Error("No Fitbit token found in database");
  }

  const activity = data.activity as any;
  const tokens = activity?.tokens as TokenData;

  if (!tokens?.access_token) {
    throw new Error("No access token found in database");
  }

  // Check if token is expired (Fitbit tokens expire in 8 hours = 28800 seconds)
  if (tokens.refreshed_at) {
    const refreshedAt = new Date(tokens.refreshed_at).getTime();
    const now = Date.now();
    const expiryTime = tokens.expires_in || 28800; // Default 8 hours
    const isExpired = (now - refreshedAt) / 1000 > expiryTime - 300; // Refresh 5 min before expiry

    if (isExpired) {
      logSync("tokenManager:expired", { message: "Token expired, triggering refresh" });
      
      // Trigger token refresh
      const baseUrl = process.env.URL || 'https://predictiv.netlify.app';
      const refreshResponse = await fetch(`${baseUrl}/.netlify/functions/refresh-fitbit-token`);
      
      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh token");
      }

      // Fetch the newly refreshed token
      const { data: newData, error: newError } = await supabase
        .from("fitbit_auto_data")
        .select("activity")
        .eq("user_id", userId)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();

      if (newError || !newData) {
        throw new Error("Failed to fetch refreshed token");
      }

      const newTokens = (newData.activity as any)?.tokens as TokenData;
      return newTokens.access_token;
    }
  }

  return tokens.access_token;
}
