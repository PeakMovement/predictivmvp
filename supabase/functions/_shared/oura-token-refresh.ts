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

// Rate limit configuration: 5000 requests per 5 minutes (Oura's limit)
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 4500; // Stay under 5000 to be safe
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Proactive refresh 5 minutes before expiry
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// Simple AES-like encryption using SubtleCrypto (for application-level encryption)
async function encryptToken(token: string, key: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, cryptoKey, encoder.encode(token)
    );
    
    // Combine IV + encrypted data and base64 encode
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch {
    console.warn("[token-encryption] Encryption failed, using plaintext");
    return token;
  }
}

async function decryptToken(encryptedToken: string, key: string): Promise<string> {
  try {
    const decoder = new TextDecoder();
    const keyData = new TextEncoder().encode(key.padEnd(32, '0').substring(0, 32));
    
    const combined = new Uint8Array(atob(encryptedToken).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv }, cryptoKey, data
    );
    
    return decoder.decode(decrypted);
  } catch {
    console.warn("[token-decryption] Decryption failed, assuming plaintext");
    return encryptedToken;
  }
}

// Rate limiting check and update
async function checkRateLimit(
  supabase: SupabaseClient, 
  userId: string
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const now = new Date();
  
  const { data: state, error } = await supabase
    .from("rate_limit_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    console.error("[rate-limit] Database error:", error);
    return { allowed: true }; // Allow on error to avoid blocking
  }
  
  if (!state) {
    // First request, create state
    await supabase.from("rate_limit_state").insert({
      user_id: userId,
      provider: "oura",
      request_count: 1,
      window_start: now.toISOString(),
      last_request_at: now.toISOString(),
    });
    return { allowed: true };
  }
  
  // Check if currently throttled
  if (state.is_throttled && state.throttle_until) {
    const throttleUntil = new Date(state.throttle_until);
    if (now < throttleUntil) {
      return { 
        allowed: false, 
        retryAfterMs: throttleUntil.getTime() - now.getTime() 
      };
    }
    // Throttle expired, reset
    await supabase.from("rate_limit_state").update({
      is_throttled: false,
      throttle_until: null,
      request_count: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("user_id", userId);
    return { allowed: true };
  }
  
  const windowStart = new Date(state.window_start);
  const windowAge = now.getTime() - windowStart.getTime();
  
  if (windowAge >= RATE_LIMIT_WINDOW_MS) {
    // Window expired, reset
    await supabase.from("rate_limit_state").update({
      request_count: 1,
      window_start: now.toISOString(),
      last_request_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("user_id", userId);
    return { allowed: true };
  }
  
  if (state.request_count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    const throttleUntil = new Date(windowStart.getTime() + RATE_LIMIT_WINDOW_MS);
    await supabase.from("rate_limit_state").update({
      is_throttled: true,
      throttle_until: throttleUntil.toISOString(),
      updated_at: now.toISOString(),
    }).eq("user_id", userId);
    return { 
      allowed: false, 
      retryAfterMs: throttleUntil.getTime() - now.getTime() 
    };
  }
  
  // Increment counter
  await supabase.from("rate_limit_state").update({
    request_count: state.request_count + 1,
    last_request_at: now.toISOString(),
    updated_at: now.toISOString(),
  }).eq("user_id", userId);
  
  return { allowed: true };
}

// Log to sync_health_log
async function logSyncHealth(
  supabase: SupabaseClient,
  userId: string,
  status: "success" | "error" | "retry" | "rate_limited",
  latencyMs: number,
  entriesProcessed: number = 0,
  errorCode?: string,
  errorMessage?: string,
  retryCount: number = 0
): Promise<void> {
  await supabase.from("sync_health_log").insert({
    user_id: userId,
    sync_type: "oura",
    status,
    latency_ms: latencyMs,
    entries_processed: entriesProcessed,
    error_code: errorCode,
    error_message: errorMessage,
    retry_count: retryCount,
  });
}

// Add to retry queue
async function addToRetryQueue(
  supabase: SupabaseClient,
  userId: string,
  operation: string,
  payload: any,
  retryCount: number,
  error: string
): Promise<void> {
  const nextRetryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
  const nextRetryAt = new Date(Date.now() + nextRetryDelay);
  
  await supabase.from("sync_retry_queue").upsert({
    user_id: userId,
    operation,
    payload,
    retry_count: retryCount,
    next_retry_at: nextRetryAt.toISOString(),
    last_error: error,
    status: "pending",
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "user_id,operation",
  });
}

export async function refreshOuraToken(
  supabase: SupabaseClient,
  token: OuraToken
): Promise<RefreshResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[oura-token-refresh] Refreshing token for user ${token.user_id}`);

    // Check rate limit first
    const rateCheck = await checkRateLimit(supabase, token.user_id);
    if (!rateCheck.allowed) {
      console.warn(`[oura-token-refresh] Rate limited for user ${token.user_id}`);
      await logSyncHealth(supabase, token.user_id, "rate_limited", Date.now() - startTime, 0, "RATE_LIMITED");
      return {
        success: false,
        error: `Rate limited. Retry after ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)} seconds.`,
        error_code: "RATE_LIMITED",
      };
    }

    const clientId = Deno.env.get("OURA_CLIENT_ID");
    const clientSecret = Deno.env.get("OURA_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("[oura-token-refresh] Missing Oura credentials");
      await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, "MISSING_CREDENTIALS");
      return {
        success: false,
        error: "Oura credentials not configured. Please contact support.",
        error_code: "MISSING_CREDENTIALS",
      };
    }

    if (!token.refresh_token) {
      console.error(`[oura-token-refresh] No refresh token available for user ${token.user_id}`);
      await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, "NO_REFRESH_TOKEN");
      return {
        success: false,
        error: "No refresh token available. Please reconnect your Oura Ring.",
        error_code: "NO_REFRESH_TOKEN",
      };
    }

    // Retry logic with exponential backoff
    let lastError: string = "";
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`[oura-token-refresh] Attempt ${attempt + 1}/${MAX_RETRIES}...`);

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

        if (refreshRes.status === 429) {
          const retryAfter = parseInt(refreshRes.headers.get("Retry-After") || "60", 10);
          console.warn(`[oura-token-refresh] Rate limited by Oura API, retry after ${retryAfter}s`);
          
          // Set local throttle state
          await supabase.from("rate_limit_state").upsert({
            user_id: token.user_id,
            provider: "oura",
            is_throttled: true,
            throttle_until: new Date(Date.now() + retryAfter * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          
          await logSyncHealth(supabase, token.user_id, "rate_limited", Date.now() - startTime, 0, "OURA_RATE_LIMITED");
          
          return {
            success: false,
            error: `Oura API rate limited. Retry after ${retryAfter} seconds.`,
            error_code: "OURA_RATE_LIMITED",
          };
        }

        if (!refreshRes.ok) {
          let errorData: any = {};
          try {
            errorData = await refreshRes.json();
          } catch {
            errorData = { error: refreshRes.statusText };
          }
          
          console.error(`[oura-token-refresh] Refresh failed (HTTP ${refreshRes.status}):`, errorData);

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

          lastError = errorMessage;
          
          // Don't retry on auth errors
          if (errorCode === "INVALID_GRANT" || errorCode === "INVALID_CLIENT") {
            await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, errorCode, errorMessage);
            return { success: false, error: errorMessage, error_code: errorCode };
          }
          
          // Retry with backoff
          if (attempt < MAX_RETRIES - 1) {
            const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
            console.log(`[oura-token-refresh] Retrying in ${delay}ms...`);
            await logSyncHealth(supabase, token.user_id, "retry", Date.now() - startTime, 0, errorCode, errorMessage, attempt + 1);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          
          await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, errorCode, errorMessage, MAX_RETRIES);
          return { success: false, error: errorMessage, error_code: errorCode };
        }

        const refreshed = await refreshRes.json();

        if (!refreshed.access_token) {
          console.error("[oura-token-refresh] Refresh response missing access_token");
          await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, "INVALID_RESPONSE");
          return {
            success: false,
            error: "Invalid token response from Oura. Please try reconnecting.",
            error_code: "INVALID_RESPONSE",
          };
        }

        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        console.log(`[oura-token-refresh] Token refreshed, new expiry: ${expiresAt}`);

        // Encrypt tokens for storage (application-level encryption)
        const encryptionKey = Deno.env.get("OURA_CLIENT_SECRET") || "default-key";
        const accessTokenEncrypted = await encryptToken(refreshed.access_token, encryptionKey);
        const refreshTokenEncrypted = await encryptToken(refreshed.refresh_token ?? token.refresh_token, encryptionKey);

        // Update tokens (both plain and encrypted for backwards compat)
        const { error: updateError } = await supabase
          .from("wearable_tokens")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? token.refresh_token,
            access_token_encrypted: accessTokenEncrypted,
            refresh_token_encrypted: refreshTokenEncrypted,
            encryption_version: 1,
            expires_at: expiresAt,
          })
          .eq("user_id", token.user_id)
          .ilike("scope", "%extapi%");

        if (updateError) {
          console.error(`[oura-token-refresh] Database update failed:`, updateError);
          await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, "DB_UPDATE_FAILED", updateError.message);
          return {
            success: false,
            error: `Failed to save refreshed token: ${updateError.message}`,
            error_code: "DB_UPDATE_FAILED",
          };
        }

        console.log(`[oura-token-refresh] Token refreshed successfully for user ${token.user_id}`);
        await logSyncHealth(supabase, token.user_id, "success", Date.now() - startTime, 1);

        return {
          success: true,
          access_token: refreshed.access_token,
          refreshed: true,
        };
        
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : "Network error";
        console.error(`[oura-token-refresh] Fetch error on attempt ${attempt + 1}:`, lastError);
        
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await logSyncHealth(supabase, token.user_id, "retry", Date.now() - startTime, 0, "NETWORK_ERROR", lastError, attempt + 1);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
    }
    
    // All retries exhausted
    await addToRetryQueue(supabase, token.user_id, "token_refresh", { user_id: token.user_id }, MAX_RETRIES, lastError);
    await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, "MAX_RETRIES_EXCEEDED", lastError, MAX_RETRIES);
    
    return {
      success: false,
      error: `Token refresh failed after ${MAX_RETRIES} attempts: ${lastError}`,
      error_code: "MAX_RETRIES_EXCEEDED",
    };
    
  } catch (error) {
    console.error(`[oura-token-refresh] Unexpected error:`, error);
    await logSyncHealth(supabase, token.user_id, "error", Date.now() - startTime, 0, "UNEXPECTED_ERROR", 
      error instanceof Error ? error.message : "Unknown error");
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
    .from("wearable_tokens")
    .select("*")
    .eq("user_id", userId)
    .ilike("scope", "%extapi%")
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
    console.log(`[oura-token-refresh] No Oura token found for user ${userId}`);
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

// Export rate limit check for use in other functions
export { checkRateLimit, logSyncHealth, addToRetryQueue };
