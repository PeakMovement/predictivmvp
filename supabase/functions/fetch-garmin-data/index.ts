import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";

// ── Garmin API response types ────────────────────────────────────────

interface GarminDaily {
  summaryId: string;
  calendarDate: string;
  steps?: number;
  activeKilocalories?: number;
  totalKilocalories?: number;
  restingHeartRateInBeatsPerMinute?: number;
  averageHeartRateInBeatsPerMinute?: number;
  minHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  averageStressLevel?: number;
  stressQualifier?: string;
}

interface GarminSleep {
  summaryId: string;
  calendarDate: string;
  durationInSeconds?: number;
  deepSleepDurationInSeconds?: number;
  lightSleepDurationInSeconds?: number;
  remSleepInSeconds?: number;
  awakeDurationInSeconds?: number;
  overallSleepScoreValue?: number;
  overallSleepScoreQualifierKey?: string;
  validation?: string;
}

interface GarminActivity {
  activityId: string;
  activityName?: string;
  activityType?: string;
  startTimeInSeconds: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  calories?: number;
}

// ── Helper: fetch from Garmin API with error handling ────────────────

async function garminFetch<T>(
  endpoint: string,
  accessToken: string,
  params: Record<string, string>,
): Promise<T[]> {
  const url = new URL(`${GARMIN_API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new Error("GARMIN_TOKEN_EXPIRED");
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") || "60";
    throw new Error(`GARMIN_RATE_LIMITED:${retryAfter}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Garmin API ${res.status}: ${body.substring(0, 200)}`);
  }

  return await res.json();
}

// ── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ── 1. Initialize Supabase ──────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[fetch-garmin-data] [ERROR] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 2. Determine target user(s) ─────────────────────────────────
    // If called with a user_id in body, fetch for that user (cron mode).
    // If called with Authorization header, fetch for authenticated user.
    let targetUserIds: string[] = [];

    let body: { user_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body — will try auth header
    }

    if (body.user_id) {
      targetUserIds = [body.user_id];
    } else {
      // Fetch for ALL users with Garmin tokens (background sync mode)
      const { data: allTokens, error: tokensErr } = await supabase
        .from("wearable_tokens")
        .select("user_id")
        .eq("scope", "garmin");

      if (tokensErr) {
        console.error("[fetch-garmin-data] [ERROR] Failed to list Garmin users:", tokensErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to list users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      targetUserIds = (allTokens || []).map((t) => t.user_id);
    }

    if (targetUserIds.length === 0) {
      console.log("[fetch-garmin-data] No Garmin-connected users found");
      return new Response(
        JSON.stringify({ success: true, message: "No Garmin users", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[fetch-garmin-data] Processing ${targetUserIds.length} user(s)`);

    // ── 3. Process each user ────────────────────────────────────────
    const results: Array<{ user_id: string; success: boolean; records: number; error?: string }> = [];

    for (const userId of targetUserIds) {
      try {
        const userResult = await syncUserGarminData(supabase, userId);
        results.push(userResult);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[fetch-garmin-data] [ERROR] User ${userId}: ${msg}`);
        results.push({ user_id: userId, success: false, records: 0, error: msg });
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + r.records, 0);
    const successCount = results.filter((r) => r.success).length;

    console.log(
      `[fetch-garmin-data] [SUCCESS] Synced ${totalRecords} records for ${successCount}/${targetUserIds.length} users in ${Date.now() - startTime}ms`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalRecords,
        users_processed: targetUserIds.length,
        users_succeeded: successCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fetch-garmin-data] [ERROR] Unexpected: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ── Per-user sync logic ──────────────────────────────────────────────

async function syncUserGarminData(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ user_id: string; success: boolean; records: number; error?: string }> {
  console.log(`[fetch-garmin-data] Syncing Garmin data for user: ${userId}`);

  // ── Get Garmin token ──────────────────────────────────────────────
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("wearable_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("scope", "garmin")
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return { user_id: userId, success: false, records: 0, error: "No Garmin token found" };
  }

  // Check if token expired
  if (new Date(tokenRow.expires_at) < new Date()) {
    // Attempt refresh
    const refreshed = await refreshGarminToken(supabase, userId, tokenRow.refresh_token);
    if (!refreshed.success) {
      return { user_id: userId, success: false, records: 0, error: "Token expired, refresh failed" };
    }
    tokenRow.access_token = refreshed.access_token!;
  }

  const accessToken = tokenRow.access_token;

  // ── Define time range (last 7 days, paginated by day) ─────────────
  // Garmin Wellness API enforces a max range of 86400 seconds (24h) per request.
  // We paginate day-by-day to cover a full 7-day window.
  const DAYS_TO_FETCH = 7;
  const DAY_SECONDS = 86400;

  let dailies: GarminDaily[] = [];
  let sleeps: GarminSleep[] = [];
  let activities: GarminActivity[] = [];

  // Build day boundaries (midnight-to-midnight UTC for each of the last 7 days)
  const nowEpoch = Math.floor(Date.now() / 1000);
  const todayMidnight = nowEpoch - (nowEpoch % DAY_SECONDS);

  for (let d = DAYS_TO_FETCH - 1; d >= 0; d--) {
    const dayStart = todayMidnight - d * DAY_SECONDS;
    const dayEnd = dayStart + DAY_SECONDS;
    const dayDate = new Date(dayStart * 1000).toISOString().split("T")[0];
    const params = {
      uploadStartTimeInSeconds: dayStart.toString(),
      uploadEndTimeInSeconds: dayEnd.toString(),
    };

    console.log(`[fetch-garmin-data] User ${userId} | Day ${dayDate} | range ${dayStart}-${dayEnd}`);

    const [dailiesResult, sleepsResult, activitiesResult] = await Promise.allSettled([
      garminFetch<GarminDaily>("/dailies", accessToken, params),
      garminFetch<GarminSleep>("/sleeps", accessToken, params),
      garminFetch<GarminActivity>("/activities", accessToken, params),
    ]);

    if (dailiesResult.status === "fulfilled") {
      console.log(`[fetch-garmin-data] User ${userId} | ${dayDate} dailies: ${JSON.stringify(dailiesResult.value).substring(0, 500)}`);
      dailies.push(...dailiesResult.value);
    } else {
      console.error(`[fetch-garmin-data] User ${userId} | ${dayDate} dailies FAILED: ${dailiesResult.reason}`);
    }

    if (sleepsResult.status === "fulfilled") {
      console.log(`[fetch-garmin-data] User ${userId} | ${dayDate} sleeps: ${JSON.stringify(sleepsResult.value).substring(0, 500)}`);
      sleeps.push(...sleepsResult.value);
    } else {
      console.error(`[fetch-garmin-data] User ${userId} | ${dayDate} sleeps FAILED: ${sleepsResult.reason}`);
    }

    if (activitiesResult.status === "fulfilled") {
      console.log(`[fetch-garmin-data] User ${userId} | ${dayDate} activities RAW: ${JSON.stringify(activitiesResult.value).substring(0, 1000)}`);
      activities.push(...activitiesResult.value);
    } else {
      console.error(`[fetch-garmin-data] User ${userId} | ${dayDate} activities FAILED: ${activitiesResult.reason}`);
    }
  }

  console.log(`[fetch-garmin-data] User ${userId}: ${dailies.length} dailies, ${sleeps.length} sleeps, ${activities.length} activities`);

  if (dailies.length === 0 && sleeps.length === 0 && activities.length === 0) {
    console.log(`[fetch-garmin-data] User ${userId}: No data returned from Garmin`);
    return { user_id: userId, success: true, records: 0 };
  }

  // ── Merge data by date ────────────────────────────────────────────
  const dateMap = new Map<string, {
    daily?: GarminDaily;
    sleep?: GarminSleep;
    activities: GarminActivity[];
  }>();

  for (const d of dailies) {
    if (!d.calendarDate) continue;
    const existing = dateMap.get(d.calendarDate) || { activities: [] };
    existing.daily = d;
    dateMap.set(d.calendarDate, existing);
  }

  // For sleeps, pick the longest sleep per date (primary sleep)
  for (const s of sleeps) {
    if (!s.calendarDate) continue;
    const existing = dateMap.get(s.calendarDate) || { activities: [] };
    if (
      !existing.sleep ||
      (s.durationInSeconds || 0) > (existing.sleep.durationInSeconds || 0)
    ) {
      existing.sleep = s;
    }
    dateMap.set(s.calendarDate, existing);
  }

  // Group activities by date (convert timestamp to date)
  for (const activity of activities) {
    const activityDate = new Date(activity.startTimeInSeconds * 1000)
      .toISOString()
      .split("T")[0];
    const existing = dateMap.get(activityDate) || { activities: [] };
    existing.activities.push(activity);
    dateMap.set(activityDate, existing);
  }

  // ── Build upsert rows ─────────────────────────────────────────────
  const rows = Array.from(dateMap.entries()).map(([date, data]) => {
    const { daily, sleep } = data;

    return {
      user_id: userId,
      source: "garmin",
      date,
      total_steps: daily?.steps ?? null,
      total_calories: daily?.totalKilocalories ?? null,
      active_calories: daily?.activeKilocalories ?? null,
      activity_score: null as number | null,
      resting_hr: daily?.restingHeartRateInBeatsPerMinute ?? null,
      hrv_avg: null as number | null,
      sleep_score: sleep?.overallSleepScoreValue ?? null,
      total_sleep_duration: sleep?.durationInSeconds
        ? Math.round(sleep.durationInSeconds / 60)
        : null,
      deep_sleep_duration: sleep?.deepSleepDurationInSeconds
        ? Math.round(sleep.deepSleepDurationInSeconds / 60)
        : null,
      rem_sleep_duration: sleep?.remSleepInSeconds
        ? Math.round(sleep.remSleepInSeconds / 60)
        : null,
      light_sleep_duration: sleep?.lightSleepDurationInSeconds
        ? Math.round(sleep.lightSleepDurationInSeconds / 60)
        : null,
      sleep_efficiency: null as number | null,
      readiness_score: null as number | null,
      spo2_avg: null as number | null,
      fetched_at: new Date().toISOString(),
    };
  });

  if (rows.length === 0) {
    return { user_id: userId, success: true, records: 0 };
  }

  // ── Upsert to wearable_sessions ───────────────────────────────────
  const { error: upsertError } = await supabase
    .from("wearable_sessions")
    .upsert(rows, { onConflict: "user_id,source,date" });

  if (upsertError) {
    console.error(`[fetch-garmin-data] [ERROR] User ${userId}: upsert failed: ${upsertError.message}`);
    return { user_id: userId, success: false, records: 0, error: upsertError.message };
  }

  console.log(`[fetch-garmin-data] [SUCCESS] User ${userId}: upserted ${rows.length} records`);
  return { user_id: userId, success: true, records: rows.length };
}

// ── Token refresh ────────────────────────────────────────────────────

async function refreshGarminToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string | null,
): Promise<{ success: boolean; access_token?: string }> {
  if (!refreshToken) {
    console.error(`[fetch-garmin-data] User ${userId}: No refresh token available`);
    return { success: false };
  }

  const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
  const clientSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");

  if (!clientId || !clientSecret) {
    console.error("[fetch-garmin-data] [ERROR] Missing Garmin credentials for refresh");
    return { success: false };
  }

  try {
    const res = await fetch(
      "https://diauth.garmin.com/di-oauth2-service/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[fetch-garmin-data] Token refresh failed (${res.status}): ${errBody.substring(0, 200)}`);
      return { success: false };
    }

    const tokenData = await res.json();

    if (!tokenData.access_token) {
      return { success: false };
    }

    const expiresAt = new Date(
      Date.now() + ((tokenData.expires_in || 86400) - 600) * 1000,
    ).toISOString();

    await supabase
      .from("wearable_tokens")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken,
        expires_at: expiresAt,
      })
      .eq("user_id", userId)
      .eq("scope", "garmin");

    console.log(`[fetch-garmin-data] Token refreshed for user ${userId}`);
    return { success: true, access_token: tokenData.access_token };
  } catch (err) {
    console.error(`[fetch-garmin-data] Token refresh error: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false };
  }
}
