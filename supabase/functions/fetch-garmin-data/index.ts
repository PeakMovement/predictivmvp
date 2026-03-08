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
  maxStressLevel?: number;
  stressQualifier?: string;
  distanceInMeters?: number;
  moderateIntensityDurationInSeconds?: number;
  vigorousIntensityDurationInSeconds?: number;
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
  averageRespirationValue?: number;
  lowestRespirationValue?: number;
  highestRespirationValue?: number;
  avgOvernightHrv?: number;
  spO2AverageSleep?: number;
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
  activeKilocalories?: number;
  averageRunningCadenceInStepsPerMinute?: number;
}

interface GarminBodyBatteryStat {
  timestampInSeconds: number;
  bodyBatteryLevel: number;
}

interface GarminBodyBattery {
  summaryId: string;
  calendarDate: string;
  startTimestampInSeconds?: number;
  endTimestampInSeconds?: number;
  bodyBatteryStatsList?: GarminBodyBatteryStat[];
}

interface GarminPulseOx {
  summaryId?: string;
  calendarDate: string;
  startTimestampInSeconds?: number;
  endTimestampInSeconds?: number;
  spO2Value?: number;
  averageSpo2?: number;
  lowestSpo2?: number;
  onDemand?: boolean;
}

interface GarminRespiration {
  summaryId?: string;
  calendarDate: string;
  startTimestampInSeconds?: number;
  endTimestampInSeconds?: number;
  avgWakingRespirationValue?: number;
  avgSleepRespirationValue?: number;
  avgTwentyFourHourRespirationValue?: number;
  lowestRespirationValue?: number;
  highestRespirationValue?: number;
}

interface GarminUserMetrics {
  summaryId?: string;
  calendarDate: string;
  currentVo2Max?: number;
  fitnessAge?: number;
  trainingStatus?: string;
}

// ── Helper: fetch from Garmin API with error handling ────────────────

async function garminFetch<T>(
  endpoint: string,
  accessToken: string,
  params: Record<string, string>,
): Promise<{ data: T[]; error?: string }> {
  const url = new URL(`${GARMIN_API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  console.log(`[fetch-garmin-data] Calling Garmin API: ${endpoint} params=${JSON.stringify(params)}`);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    return { data: [], error: "GARMIN_TOKEN_EXPIRED" };
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") || "60";
    return { data: [], error: `GARMIN_RATE_LIMITED:${retryAfter}` };
  }

  if (res.status === 400) {
    const body = await res.text().catch(() => "");
    // Surface the specific Garmin error (e.g. InvalidPullTokenException)
    console.error(`[fetch-garmin-data] [ERROR] Garmin API 400 on ${endpoint}: ${body.substring(0, 500)}`);
    return { data: [], error: `GARMIN_BAD_REQUEST: ${body.substring(0, 200)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[fetch-garmin-data] [ERROR] Garmin API ${res.status} on ${endpoint}: ${body.substring(0, 200)}`);
    return { data: [], error: `Garmin API ${res.status}: ${body.substring(0, 200)}` };
  }

  const data = await res.json();
  // Garmin Wellness API wraps results in a named key matching the endpoint segment
  // e.g. GET /dailies → { "dailies": [...] }, GET /sleeps → { "sleeps": [...] }
  const endpointKey = endpoint.replace(/^\//, ""); // strip leading slash
  let items: T[];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && Array.isArray((data as Record<string, unknown>)[endpointKey])) {
    items = (data as Record<string, unknown>)[endpointKey] as T[];
  } else {
    // Unexpected shape — log the actual response for debugging
    console.warn(`[fetch-garmin-data] Unexpected response shape for ${endpoint}:`, JSON.stringify(data).substring(0, 200));
    items = [];
  }
  console.log(`[fetch-garmin-data] [SUCCESS] ${endpoint}: ${items.length} records returned`);
  return { data: items };
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
    let targetUserIds: string[] = [];

    let body: { user_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body — will fetch all Garmin users
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

    console.log(`[fetch-garmin-data] [START] Processing ${targetUserIds.length} user(s)`);

    // ── 3. Process each user ────────────────────────────────────────
    const results: Array<{ user_id: string; success: boolean; sessions: number; trends: number; summaries: number; error?: string }> = [];

    for (const userId of targetUserIds) {
      try {
        const userResult = await syncUserGarminData(supabase, userId);
        results.push(userResult);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[fetch-garmin-data] [ERROR] User ${userId}: ${msg}`);
        results.push({ user_id: userId, success: false, sessions: 0, trends: 0, summaries: 0, error: msg });

        // Log failure
        try {
          await supabase.from("oura_logs").insert({
            user_id: userId,
            status: "error",
            error_message: `Garmin sync failed: ${msg}`,
          });
        } catch { /* ignore logging errors */ }
      }
    }

    const totalSessions = results.reduce((sum, r) => sum + r.sessions, 0);
    const totalTrends = results.reduce((sum, r) => sum + r.trends, 0);
    const successCount = results.filter((r) => r.success).length;

    console.log(
      `[fetch-garmin-data] [COMPLETE] ${totalSessions} sessions, ${totalTrends} trends for ${successCount}/${targetUserIds.length} users in ${Date.now() - startTime}ms`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSessions,
        trends: totalTrends,
        users_processed: targetUserIds.length,
        users_succeeded: successCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fetch-garmin-data] [FATAL] Unexpected: ${msg}`);
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
): Promise<{ user_id: string; success: boolean; sessions: number; trends: number; summaries: number; error?: string }> {
  console.log(`[fetch-garmin-data] Syncing Garmin data for user: ${userId}`);

  // ── Get Garmin token ──────────────────────────────────────────────
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("wearable_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("scope", "garmin")
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return { user_id: userId, success: false, sessions: 0, trends: 0, summaries: 0, error: "No Garmin token found" };
  }

  let accessToken = tokenRow.access_token;

  // Check if token expired — refresh if needed
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    console.log(`[fetch-garmin-data] Token expired for user ${userId}, attempting refresh`);
    const refreshed = await refreshGarminToken(supabase, userId, tokenRow.refresh_token);
    if (!refreshed.success) {
      return { user_id: userId, success: false, sessions: 0, trends: 0, summaries: 0, error: "Token expired, refresh failed" };
    }
    accessToken = refreshed.access_token!;
  }

  // ── Define time range (last 7 days, paginated by day) ─────────────
  // Garmin Wellness API enforces a max range of 86400 seconds (24h) per request.
  const DAYS_TO_FETCH = 7;
  const DAY_SECONDS = 86400;

  let dailies: GarminDaily[] = [];
  let sleeps: GarminSleep[] = [];
  let activities: GarminActivity[] = [];
  let bodyBatteries: GarminBodyBattery[] = [];
  let pulseOxReadings: GarminPulseOx[] = [];
  let respirationReadings: GarminRespiration[] = [];
  let userMetrics: GarminUserMetrics[] = [];
  const apiErrors: string[] = [];

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

    console.log(`[fetch-garmin-data] User ${userId} | Day ${dayDate}`);

    const [
      dailiesResult, sleepsResult, activitiesResult,
      bodyBatteryResult, pulseOxResult, respirationResult, userMetricsResult,
    ] = await Promise.allSettled([
      garminFetch<GarminDaily>("/dailies", accessToken, params),
      garminFetch<GarminSleep>("/sleeps", accessToken, params),
      garminFetch<GarminActivity>("/activities", accessToken, params),
      garminFetch<GarminBodyBattery>("/bodyBattery", accessToken, params),
      garminFetch<GarminPulseOx>("/pulseOx", accessToken, params),
      garminFetch<GarminRespiration>("/respiration", accessToken, params),
      garminFetch<GarminUserMetrics>("/userMetrics", accessToken, params),
    ]);

    if (dailiesResult.status === "fulfilled") {
      if (dailiesResult.value.error) {
        apiErrors.push(`dailies/${dayDate}: ${dailiesResult.value.error}`);
      } else {
        dailies.push(...dailiesResult.value.data);
      }
    }

    if (sleepsResult.status === "fulfilled") {
      if (sleepsResult.value.error) {
        apiErrors.push(`sleeps/${dayDate}: ${sleepsResult.value.error}`);
      } else {
        sleeps.push(...sleepsResult.value.data);
      }
    }

    if (activitiesResult.status === "fulfilled") {
      if (activitiesResult.value.error) {
        apiErrors.push(`activities/${dayDate}: ${activitiesResult.value.error}`);
      } else {
        activities.push(...activitiesResult.value.data);
      }
    }

    // Non-fatal: body battery, pulse ox, respiration, user metrics may not be available for all devices
    if (bodyBatteryResult.status === "fulfilled" && !bodyBatteryResult.value.error) {
      bodyBatteries.push(...bodyBatteryResult.value.data);
    }
    if (pulseOxResult.status === "fulfilled" && !pulseOxResult.value.error) {
      pulseOxReadings.push(...pulseOxResult.value.data);
    }
    if (respirationResult.status === "fulfilled" && !respirationResult.value.error) {
      respirationReadings.push(...respirationResult.value.data);
    }
    if (userMetricsResult.status === "fulfilled" && !userMetricsResult.value.error) {
      userMetrics.push(...userMetricsResult.value.data);
    }
  }

  // If ALL calls returned errors (e.g. InvalidPullTokenException), report it clearly
  if (apiErrors.length > 0) {
    console.error(`[fetch-garmin-data] [WARNING] API errors for user ${userId}: ${apiErrors.slice(0, 5).join(" | ")}`);
  }

  // ── Detect InvalidPullTokenException / 401 token expiry ───────────
  const isTokenExpired = apiErrors.some(
    (e) =>
      e.includes("InvalidPullTokenException") ||
      e.includes("GARMIN_TOKEN_EXPIRED"),
  );

  if (isTokenExpired) {
    console.error(`[fetch-garmin-data] [TOKEN_EXPIRED] Garmin token invalid for user ${userId} — marking as token_expired`);
    await supabase
      .from("wearable_tokens")
      .update({ status: "token_expired" })
      .eq("user_id", userId)
      .eq("scope", "garmin");

    try {
      await supabase.from("oura_logs").insert({
        user_id: userId,
        status: "error",
        entries_synced: 0,
        error_message: "Garmin token expired (InvalidPullTokenException). User must reconnect.",
      });
    } catch { /* ignore */ }

    return { user_id: userId, success: false, sessions: 0, trends: 0, summaries: 0, error: "Garmin token expired — user must reconnect" };
  }

  if (dailies.length === 0 && sleeps.length === 0 && activities.length === 0) {
    const errorSummary = apiErrors.length > 0
      ? `No data returned. API errors: ${apiErrors[0]}`
      : "No data returned from Garmin (possibly no recent data)";
    console.log(`[fetch-garmin-data] User ${userId}: ${errorSummary}`);

    // Log the result so it shows up in monitoring
    try {
      await supabase.from("oura_logs").insert({
        user_id: userId,
        status: apiErrors.length > 0 ? "error" : "success",
        entries_synced: 0,
        error_message: apiErrors.length > 0 ? apiErrors[0] : null,
      });
    } catch { /* ignore logging errors */ }

    return { user_id: userId, success: apiErrors.length === 0, sessions: 0, trends: 0, summaries: 0, error: apiErrors.length > 0 ? errorSummary : undefined };
  }

  console.log(`[fetch-garmin-data] User ${userId}: ${dailies.length} dailies, ${sleeps.length} sleeps, ${activities.length} activities`);

  // ── Merge data by date ────────────────────────────────────────────
  const dateMap = new Map<string, {
    daily?: GarminDaily;
    sleep?: GarminSleep;
    activities: GarminActivity[];
    bodyBattery?: GarminBodyBattery;
    pulseOx?: GarminPulseOx;
    respiration?: GarminRespiration;
    userMetrics?: GarminUserMetrics;
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

  // Group activities by date
  for (const activity of activities) {
    const activityDate = new Date(activity.startTimeInSeconds * 1000)
      .toISOString()
      .split("T")[0];
    const existing = dateMap.get(activityDate) || { activities: [] };
    existing.activities.push(activity);
    dateMap.set(activityDate, existing);
  }

  // Body battery: keep last reading per date
  for (const bb of bodyBatteries) {
    if (!bb.calendarDate) continue;
    const existing = dateMap.get(bb.calendarDate) || { activities: [] };
    existing.bodyBattery = bb;
    dateMap.set(bb.calendarDate, existing);
  }

  // Pulse Ox: keep most recent per date
  for (const po of pulseOxReadings) {
    if (!po.calendarDate) continue;
    const existing = dateMap.get(po.calendarDate) || { activities: [] };
    existing.pulseOx = po;
    dateMap.set(po.calendarDate, existing);
  }

  // Respiration: keep per date
  for (const r of respirationReadings) {
    if (!r.calendarDate) continue;
    const existing = dateMap.get(r.calendarDate) || { activities: [] };
    existing.respiration = r;
    dateMap.set(r.calendarDate, existing);
  }

  // User metrics (VO2max, training status): keep per date
  for (const um of userMetrics) {
    if (!um.calendarDate) continue;
    const existing = dateMap.get(um.calendarDate) || { activities: [] };
    existing.userMetrics = um;
    dateMap.set(um.calendarDate, existing);
  }

  // ── Build and upsert wearable_sessions rows ───────────────────────
  let sessionsInserted = 0;

  for (const [date, data] of dateMap) {
    const { daily, sleep, bodyBattery, pulseOx, respiration, userMetrics: um } = data;

    // Calculate total distance from activities for the day
    const totalDistanceM = data.activities.reduce((sum, a) => sum + (a.distanceInMeters || 0), 0);
    // Calculate running distance
    const runningDistanceM = data.activities
      .filter(a => (a.activityName || a.activityType || "").toLowerCase().includes("run"))
      .reduce((sum, a) => sum + (a.distanceInMeters || 0), 0);

    // Dominant activity (highest calories burned)
    const dominantActivity = data.activities.length > 0
      ? data.activities.reduce((best, a) =>
          (a.activeKilocalories || a.calories || 0) > (best.activeKilocalories || best.calories || 0) ? a : best
        )
      : null;
    const sessionType = dominantActivity
      ? (dominantActivity.activityType || dominantActivity.activityName || null)
      : null;

    // Aggregate activity metrics for the day
    const totalDurationS = data.activities.reduce((sum, a) => sum + (a.durationInSeconds || 0), 0);
    const activitiesWithHR = data.activities.filter(a => a.averageHeartRateInBeatsPerMinute);
    const avgHR = activitiesWithHR.length > 0
      ? activitiesWithHR.reduce((sum, a) => sum + (a.averageHeartRateInBeatsPerMinute || 0), 0) / activitiesWithHR.length
      : null;
    const maxHR = data.activities.length > 0
      ? Math.max(...data.activities.map(a => a.maxHeartRateInBeatsPerMinute || 0))
      : null;
    const totalActivityCals = data.activities.reduce((sum, a) => sum + (a.activeKilocalories || a.calories || 0), 0);

    // Body battery: compute min/max/start/end from stats list
    let bbStart: number | null = null;
    let bbEnd: number | null = null;
    let bbMin: number | null = null;
    let bbMax: number | null = null;
    if (bodyBattery?.bodyBatteryStatsList && bodyBattery.bodyBatteryStatsList.length > 0) {
      const sorted = [...bodyBattery.bodyBatteryStatsList].sort((a, b) => a.timestampInSeconds - b.timestampInSeconds);
      bbStart = sorted[0].bodyBatteryLevel;
      bbEnd = sorted[sorted.length - 1].bodyBatteryLevel;
      bbMin = Math.min(...sorted.map(s => s.bodyBatteryLevel));
      bbMax = Math.max(...sorted.map(s => s.bodyBatteryLevel));
    }

    // SpO2: prefer explicit field, fall back to sleep-derived
    const spo2 = pulseOx?.spO2Value ?? pulseOx?.averageSpo2 ?? sleep?.spO2AverageSleep ?? null;

    // Respiration rate: prefer waking, fall back to 24h avg
    const respirationRate = respiration?.avgWakingRespirationValue
      ?? respiration?.avgTwentyFourHourRespirationValue
      ?? sleep?.averageRespirationValue
      ?? null;

    // HRV: use sleep-derived if available
    const hrv = sleep?.avgOvernightHrv ?? null;

    // Training load: use active calories as proxy (consistent with trend calculation)
    const activityCalTotal = daily?.activeKilocalories ?? 0;
    const trainingLoad = activityCalTotal > 0 ? Math.round(activityCalTotal / 100 * 100) / 100 : null;

    const sessionRow = {
      user_id: userId,
      source: "garmin",
      date,
      total_steps: daily?.steps ?? null,
      total_calories: daily?.totalKilocalories ?? null,
      active_calories: daily?.activeKilocalories ?? null,
      activity_score: null as number | null,
      resting_hr: daily?.restingHeartRateInBeatsPerMinute ?? null,
      hrv_avg: hrv,
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
      spo2_avg: spo2 ? Math.round(spo2 * 10) / 10 : null,
      total_distance_km: totalDistanceM > 0 ? Math.round(totalDistanceM / 10) / 100 : null,
      running_distance_km: runningDistanceM > 0 ? Math.round(runningDistanceM / 10) / 100 : null,
      // New Garmin-specific fields
      stress_avg: daily?.averageStressLevel ? Math.round(daily.averageStressLevel * 10) / 10 : null,
      stress_max: daily?.maxStressLevel ? Math.round(daily.maxStressLevel * 10) / 10 : null,
      intensity_minutes_moderate: daily?.moderateIntensityDurationInSeconds
        ? Math.round(daily.moderateIntensityDurationInSeconds / 60)
        : null,
      intensity_minutes_vigorous: daily?.vigorousIntensityDurationInSeconds
        ? Math.round(daily.vigorousIntensityDurationInSeconds / 60)
        : null,
      body_battery_start: bbStart,
      body_battery_end: bbEnd,
      body_battery_min: bbMin,
      body_battery_max: bbMax,
      respiration_rate_avg: respirationRate ? Math.round(respirationRate * 100) / 100 : null,
      vo2_max: um?.currentVo2Max ?? null,
      training_status: um?.trainingStatus ?? null,
      session_type: sessionType,
      avg_heart_rate: avgHR ? Math.round(avgHR * 10) / 10 : null,
      max_heart_rate: maxHR && maxHR > 0 ? maxHR : null,
      duration_minutes: totalDurationS > 0 ? Math.round(totalDurationS / 60) : null,
      training_load: trainingLoad,
      fetched_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("wearable_sessions")
      .upsert(sessionRow, { onConflict: "user_id,source,date" });

    if (upsertError) {
      console.error(`[fetch-garmin-data] [ERROR] Session upsert for ${date}: ${upsertError.message}`);
    } else {
      sessionsInserted++;
    }
  }

  console.log(`[fetch-garmin-data] [SUCCESS] User ${userId}: ${sessionsInserted} sessions upserted`);

  // ── Calculate training_trends and wearable_summary ────────────────
  // Fetch historical sessions for trend calculations (need 7+ days)
  const { data: historicalSessions } = await supabase
    .from("wearable_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("source", "garmin")
    .gte("date", new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("date", { ascending: true });

  let trendsInserted = 0;
  let summariesInserted = 0;

  if (historicalSessions && historicalSessions.length >= 7) {
    const sortedDates = Array.from(dateMap.keys()).sort();

    for (const date of sortedDates) {
      const sessionsUpToDate = historicalSessions.filter(s => s.date <= date);
      const last7Days = sessionsUpToDate.slice(-7);
      const last28Days = sessionsUpToDate.slice(-28);

      if (last7Days.length < 7) continue;

      // Calculate training load using steps as proxy (Garmin has no activity_score)
      const calculateLoad = (s: any) => {
        const steps = s.total_steps || 0;
        const activeCal = s.active_calories || 0;
        // Use active calories as primary load metric, fallback to steps
        if (activeCal > 0) return activeCal / 100; // normalize
        return steps / 10000;
      };

      // Acute load (7-day average)
      const acuteLoad = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0) / 7;

      // Chronic load (28-day average)
      let chronicLoad = null;
      let acwr = null;
      if (last28Days.length >= 28) {
        chronicLoad = last28Days.reduce((sum, s) => sum + calculateLoad(s), 0) / 28;
        acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;
      }

      // Strain (7-day total load, capped at 2000)
      const rawStrain = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0);
      const strain = Math.min(rawStrain, 2000);

      // Monotony (mean / std deviation, capped at 2.5)
      const loads = last7Days.map(calculateLoad);
      const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
      const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
      const std = Math.sqrt(variance);
      const monotony = Math.min(std > 0 ? mean / std : 0, 2.5);

      const sleepScore = dateMap.get(date)?.sleep?.overallSleepScoreValue || null;

      // ── training_trends ────────────────────────────────────────────
      const trendData = {
        user_id: userId,
        date,
        training_load: Math.round(calculateLoad(historicalSessions.find(s => s.date === date) || {}) * 100) / 100,
        acute_load: Math.round(acuteLoad * 100) / 100,
        chronic_load: chronicLoad ? Math.round(chronicLoad * 100) / 100 : null,
        acwr: acwr ? Math.round(acwr * 100) / 100 : null,
        strain: Math.round(strain * 100) / 100,
        monotony: Math.round(monotony * 100) / 100,
        hrv: null as number | null,
        sleep_score: sleepScore,
      };

      const { error: trendError } = await supabase
        .from("training_trends")
        .upsert(trendData, { onConflict: "user_id,date" });

      if (trendError) {
        console.error(`[fetch-garmin-data] [ERROR] Trend upsert for ${date}: ${trendError.message}`);
      } else {
        trendsInserted++;
      }

      // ── wearable_summary ───────────────────────────────────────────
      const avgSleep = last7Days.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / last7Days.length;

      const summaryData = {
        user_id: userId,
        date,
        source: "garmin",
        strain: Math.round(strain * 100) / 100,
        monotony: Math.round(monotony * 100) / 100,
        acwr: acwr ? Math.round(acwr * 100) / 100 : null,
        readiness_index: null as number | null, // Garmin doesn't have readiness
        avg_sleep_score: Math.round(avgSleep * 100) / 100,
      };

      const { error: summaryError } = await supabase
        .from("wearable_summary")
        .upsert(summaryData, { onConflict: "user_id,source,date" });

      if (summaryError) {
        console.error(`[fetch-garmin-data] [ERROR] Summary upsert for ${date}: ${summaryError.message}`);
      } else {
        summariesInserted++;
      }
    }
  } else {
    console.log(`[fetch-garmin-data] User ${userId}: Only ${historicalSessions?.length || 0} historical sessions, skipping trend calculations (need 7+)`);
  }

  // Restore token status to active (in case it was previously marked expired)
  await supabase
    .from("wearable_tokens")
    .update({ status: "active" })
    .eq("user_id", userId)
    .eq("scope", "garmin")
    .neq("status", "active"); // avoid unnecessary writes

  // Log success
  try {
    await supabase.from("oura_logs").insert({
      user_id: userId,
      status: "success",
      entries_synced: sessionsInserted,
    });
  } catch { /* ignore logging errors */ }

  console.log(`[fetch-garmin-data] [SUCCESS] User ${userId}: ${sessionsInserted} sessions, ${trendsInserted} trends, ${summariesInserted} summaries`);
  return { user_id: userId, success: true, sessions: sessionsInserted, trends: trendsInserted, summaries: summariesInserted };
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
    console.error("[fetch-garmin-data] [ERROR] Missing GARMIN_CONSUMER_KEY or GARMIN_CONSUMER_SECRET");
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
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          refresh_token: refreshToken,
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[fetch-garmin-data] [ERROR] Token refresh failed (${res.status}): ${errBody.substring(0, 200)}`);
      return { success: false };
    }

    const tokenData = await res.json();

    if (!tokenData.access_token) {
      console.error("[fetch-garmin-data] [ERROR] Token refresh response missing access_token");
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

    console.log(`[fetch-garmin-data] [SUCCESS] Token refreshed for user ${userId}`);
    return { success: true, access_token: tokenData.access_token };
  } catch (err) {
    console.error(`[fetch-garmin-data] [ERROR] Token refresh exception: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false };
  }
}
