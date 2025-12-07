import { SupabaseClient } from "npm:@supabase/supabase-js@2";

interface OuraToken {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface RefreshResult {
  success: boolean;
  access_token?: string;
  error?: string;
  error_code?: string;
  refreshed?: boolean;
}

// Proactive refresh buffer: refresh 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function refreshOuraToken(
  supabase: SupabaseClient,
  token: OuraToken
): Promise<RefreshResult> {
  try {
    console.log(`[oura-token-refresh] Refreshing token for user ${token.user_id}`);

    const clientId = Deno.env.get("OURA_CLIENT_ID");
    const clientSecret = Deno.env.get("OURA_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("[oura-token-refresh] Missing Oura credentials");
      return {
        success: false,
        error: "Oura credentials not configured. Please contact support.",
        error_code: "MISSING_CREDENTIALS",
      };
    }

    if (!token.refresh_token) {
      console.error(`[oura-token-refresh] No refresh token available for user ${token.user_id}`);
      return {
        success: false,
        error: "No refresh token available. Please reconnect your Oura Ring.",
        error_code: "NO_REFRESH_TOKEN",
      };
    }

    console.log(`[oura-token-refresh] Making refresh request to Oura API...`);

    const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!refreshRes.ok) {
      let errorData: any = {};
      try {
        errorData = await refreshRes.json();
      } catch {
        errorData = { error: refreshRes.statusText };
      }
      
      console.error(`[oura-token-refresh] Refresh failed (HTTP ${refreshRes.status}):`, errorData);

      // Map Oura API errors to user-friendly messages
      let errorMessage = "Token refresh failed";
      let errorCode = "REFRESH_FAILED";

      if (errorData.error === "invalid_grant") {
        errorMessage = "Your Oura authorization has expired. Please reconnect your Oura Ring.";
        errorCode = "INVALID_GRANT";
      } else if (errorData.error === "invalid_client") {
        errorMessage = "Invalid Oura API credentials. Please contact support.";
        errorCode = "INVALID_CLIENT";
      } else if (errorData.error_description) {
        errorMessage = errorData.error_description;
      }

      return {
        success: false,
        error: errorMessage,
        error_code: errorCode,
      };
    }

    const refreshed = await refreshRes.json();

    if (!refreshed.access_token) {
      console.error("[oura-token-refresh] Refresh response missing access_token");
      return {
        success: false,
        error: "Invalid token response from Oura. Please try reconnecting.",
        error_code: "INVALID_RESPONSE",
      };
    }

    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    console.log(`[oura-token-refresh] Token refreshed, new expiry: ${expiresAt}`);

    const { error: updateError } = await supabase
      .from("oura_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? token.refresh_token,
        expires_at: expiresAt,
      })
      .eq("user_id", token.user_id);

    if (updateError) {
      console.error(`[oura-token-refresh] Database update failed:`, updateError);
      return {
        success: false,
        error: `Failed to save refreshed token: ${updateError.message}`,
        error_code: "DB_UPDATE_FAILED",
      };
    }

    console.log(`[oura-token-refresh] Token refreshed successfully for user ${token.user_id}`);

    return {
      success: true,
      access_token: refreshed.access_token,
      refreshed: true,
    };
  } catch (error) {
    console.error(`[oura-token-refresh] Unexpected error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during token refresh",
      error_code: "UNEXPECTED_ERROR",
    };
  }
}

export async function getValidOuraToken(
  supabase: SupabaseClient,
  userId: string
): Promise<RefreshResult> {
  console.log(`[oura-token-refresh] Getting valid token for user ${userId}`);

  const { data: token, error: tokenError } = await supabase
    .from("oura_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (tokenError) {
    console.error(`[oura-token-refresh] Database error fetching token:`, tokenError);
    return {
      success: false,
      error: `Database error: ${tokenError.message}`,
      error_code: "DB_FETCH_FAILED",
    };
  }

  if (!token) {
    console.log(`[oura-token-refresh] No token found for user ${userId}`);
    return {
      success: false,
      error: "No Oura Ring connected. Please connect your Oura Ring in Settings.",
      error_code: "NO_TOKEN",
    };
  }

  if (!token.access_token) {
    console.log(`[oura-token-refresh] Token exists but access_token is null for user ${userId}`);
    return {
      success: false,
      error: "Oura connection incomplete. Please reconnect your Oura Ring.",
      error_code: "INCOMPLETE_TOKEN",
    };
  }

  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();

  // Proactive refresh: if expiring within 5 minutes, refresh now
  if (timeUntilExpiry <= REFRESH_BUFFER_MS) {
    if (timeUntilExpiry <= 0) {
      console.log(`[oura-token-refresh] Token expired ${Math.abs(timeUntilExpiry / 1000)}s ago, refreshing...`);
    } else {
      console.log(`[oura-token-refresh] Token expires in ${timeUntilExpiry / 1000}s (< 5min buffer), proactively refreshing...`);
    }
    return await refreshOuraToken(supabase, token as OuraToken);
  }

  console.log(`[oura-token-refresh] Token valid for ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
  
  return {
    success: true,
    access_token: token.access_token,
    refreshed: false,
  };
}

// Utility function to validate a token works with Oura API
export async function validateOuraToken(accessToken: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.ouraring.com/v2/usercollection/personal_info", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      return { valid: true };
    }

    if (res.status === 401) {
      return { valid: false, error: "Token is invalid or expired" };
    }

    return { valid: false, error: `Oura API returned status ${res.status}` };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
