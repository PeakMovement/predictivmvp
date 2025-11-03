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
}

export async function refreshOuraToken(
  supabase: SupabaseClient,
  token: OuraToken
): Promise<RefreshResult> {
  try {
    console.log(`[oura-token-refresh] Refreshing token for user ${token.user_id}`);

    const clientId = Deno.env.get("OURA_CLIENT_ID");
    const clientSecret = Deno.env.get("OURA_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Oura credentials not configured");
    }

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
      const errorData = await refreshRes.json();
      console.error(`[oura-token-refresh] Refresh failed:`, errorData);
      return {
        success: false,
        error: `Token refresh failed: ${errorData.error_description || errorData.error}`,
      };
    }

    const refreshed = await refreshRes.json();

    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

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
      };
    }

    console.log(`[oura-token-refresh] Token refreshed successfully for user ${token.user_id}`);

    return {
      success: true,
      access_token: refreshed.access_token,
    };
  } catch (error) {
    console.error(`[oura-token-refresh] Unexpected error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getValidOuraToken(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; access_token?: string; error?: string }> {
  const { data: token, error: tokenError } = await supabase
    .from("oura_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (tokenError || !token) {
    return {
      success: false,
      error: "No Oura token found. Please connect your Oura Ring first.",
    };
  }

  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  if (expiresAt > now) {
    return {
      success: true,
      access_token: token.access_token,
    };
  }

  return await refreshOuraToken(supabase, token);
}