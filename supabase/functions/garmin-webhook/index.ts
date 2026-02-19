import { createClient } from "npm:@supabase/supabase-js@2";

// Garmin Push Notification Webhook
// Receives real-time data pushes from Garmin Health API.
// Must respond HTTP 200 within 30 seconds per Garmin requirements.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Garmin push payload types ────────────────────────────────────────

interface GarminPushDaily {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  calendarDate: string;
  steps?: number;
  activeKilocalories?: number;
  totalKilocalories?: number;
  restingHeartRateInBeatsPerMinute?: number;
  averageHeartRateInBeatsPerMinute?: number;
  distanceInMeters?: number;
  averageStressLevel?: number;
}

interface GarminPushSleep {
  userId: string;
  userAccessToken: string;
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

interface GarminPushActivity {
  userId: string;
  userAccessToken: string;
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

interface GarminPushHRVSummary {
  userId: string;
  userAccessToken: string;
  calendarDate: string;
  startTimeInSeconds?: number;
  lastNightAvg?: number;
  lastNight5MinHigh?: number;
  hrvStatus?: string;
}

interface GarminDeregistration {
  userId: string;
  userAccessToken: string;
}

interface GarminPermissionChange {
  userId: string;
  userAccessToken: string;
}

// ── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Garmin sends GET for endpoint validation
  if (req.method === "GET") {
    console.log("[garmin-webhook] GET validation request received");
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[garmin-webhook] [ERROR] Missing Supabase credentials");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      console.error("[garmin-webhook] [ERROR] Invalid JSON body");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log(`[garmin-webhook] [RECEIVED] Keys: ${Object.keys(payload).join(", ")}`);

    // Process each data type Garmin may push
    const results: string[] = [];
    const affectedUserIds = new Set<string>();

    if (payload.dailies && Array.isArray(payload.dailies)) {
      const { count, userIds } = await processDailies(supabase, payload.dailies as GarminPushDaily[]);
      results.push(`dailies: ${count}`);
      userIds.forEach(id => affectedUserIds.add(id));
    }

    if (payload.sleeps && Array.isArray(payload.sleeps)) {
      const { count, userIds } = await processSleeps(supabase, payload.sleeps as GarminPushSleep[]);
      results.push(`sleeps: ${count}`);
      userIds.forEach(id => affectedUserIds.add(id));
    }

    if (payload.activities && Array.isArray(payload.activities)) {
      const { count, userIds } = await processActivities(supabase, payload.activities as GarminPushActivity[]);
      results.push(`activities: ${count}`);
      userIds.forEach(id => affectedUserIds.add(id));
    }

    if (payload.activityDetails && Array.isArray(payload.activityDetails)) {
      const { count, userIds } = await processActivities(supabase, payload.activityDetails as GarminPushActivity[]);
      results.push(`activityDetails: ${count}`);
      userIds.forEach(id => affectedUserIds.add(id));
    }

    if (payload.hrvSummaries && Array.isArray(payload.hrvSummaries)) {
      const { count, userIds } = await processHRVSummaries(supabase, payload.hrvSummaries as GarminPushHRVSummary[]);
      results.push(`hrvSummaries: ${count}`);
      userIds.forEach(id => affectedUserIds.add(id));
    }

    if (payload.deregistrations && Array.isArray(payload.deregistrations)) {
      await processDeregistrations(supabase, payload.deregistrations as GarminDeregistration[]);
      results.push(`deregistrations: ${(payload.deregistrations as unknown[]).length}`);
    }

    if (payload.userPermissionsChange && Array.isArray(payload.userPermissionsChange)) {
      await processPermissionChanges(supabase, payload.userPermissionsChange as GarminPermissionChange[]);
      results.push(`permissionChanges: ${(payload.userPermissionsChange as unknown[]).length}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[garmin-webhook] [COMPLETE] Processed ${results.join(", ")} in ${duration}ms`);

    // Fire trend recalculation for all affected users asynchronously.
    // This is deliberately fire-and-forget so we respond to Garmin within 30s.
    if (affectedUserIds.size > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      for (const uid of affectedUserIds) {
        fetch(`${supabaseUrl}/functions/v1/calculate-oura-trends`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ user_id: uid }),
        }).then(() => {
          console.log(`[garmin-webhook] [TRENDS] Triggered recalculation for user ${uid}`);
        }).catch((e) => {
          console.error(`[garmin-webhook] [TRENDS] Failed to trigger recalculation for ${uid}: ${e}`);
        });
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[garmin-webhook] [FATAL] ${msg}`);
    // Always return 200 to Garmin to prevent retries that could cause deregistration
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});

// ── Resolve Garmin userAccessToken → internal user_id ────────────────

async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  garminUserAccessToken: string,
): Promise<string | null> {
  // The userAccessToken from Garmin push payloads is the OAuth access token
  // we stored during auth. Look it up in wearable_tokens.
  const { data, error } = await supabase
    .from("wearable_tokens")
    .select("user_id")
    .eq("scope", "garmin")
    .eq("access_token", garminUserAccessToken)
    .maybeSingle();

  if (error || !data) {
    console.warn(`[garmin-webhook] Could not resolve user for token: ${garminUserAccessToken.substring(0, 10)}...`);
    return null;
  }

  return data.user_id;
}

// ── Process Dailies ──────────────────────────────────────────────────

async function processDailies(
  supabase: ReturnType<typeof createClient>,
  dailies: GarminPushDaily[],
): Promise<{ count: number; userIds: string[] }> {
  let count = 0;
  const userIds: string[] = [];

  for (const d of dailies) {
    const userId = await resolveUserId(supabase, d.userAccessToken);
    if (!userId) continue;

    const date = d.calendarDate;
    if (!date) continue;

    const sessionRow = {
      user_id: userId,
      source: "garmin",
      date,
      total_steps: d.steps ?? null,
      total_calories: d.totalKilocalories ?? null,
      active_calories: d.activeKilocalories ?? null,
      resting_hr: d.restingHeartRateInBeatsPerMinute ?? null,
      fetched_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("wearable_sessions")
      .upsert(sessionRow, { onConflict: "user_id,source,date" });

    if (error) {
      console.error(`[garmin-webhook] [ERROR] Daily upsert ${date} user ${userId}: ${error.message}`);
    } else {
      count++;
      userIds.push(userId);
      console.log(`[garmin-webhook] [OK] Daily saved: user=${userId} date=${date} steps=${d.steps}`);
    }

    await upsertSummary(supabase, userId, date);
  }

  return { count, userIds };
}

// ── Process Sleeps ───────────────────────────────────────────────────

async function processSleeps(
  supabase: ReturnType<typeof createClient>,
  sleeps: GarminPushSleep[],
): Promise<{ count: number; userIds: string[] }> {
  let count = 0;
  const userIds: string[] = [];

  for (const s of sleeps) {
    const userId = await resolveUserId(supabase, s.userAccessToken);
    if (!userId) continue;

    const date = s.calendarDate;
    if (!date) continue;

    // Merge sleep data into existing session row (dailies may already exist)
    const updateData: Record<string, unknown> = {
      user_id: userId,
      source: "garmin",
      date,
      sleep_score: s.overallSleepScoreValue ?? null,
      total_sleep_duration: s.durationInSeconds ? Math.round(s.durationInSeconds / 60) : null,
      deep_sleep_duration: s.deepSleepDurationInSeconds ? Math.round(s.deepSleepDurationInSeconds / 60) : null,
      rem_sleep_duration: s.remSleepInSeconds ? Math.round(s.remSleepInSeconds / 60) : null,
      light_sleep_duration: s.lightSleepDurationInSeconds ? Math.round(s.lightSleepDurationInSeconds / 60) : null,
      fetched_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("wearable_sessions")
      .upsert(updateData, { onConflict: "user_id,source,date" });

    if (error) {
      console.error(`[garmin-webhook] [ERROR] Sleep upsert ${date} user ${userId}: ${error.message}`);
    } else {
      count++;
      userIds.push(userId);
      console.log(`[garmin-webhook] [OK] Sleep saved: user=${userId} date=${date} score=${s.overallSleepScoreValue}`);
    }

    await upsertSummary(supabase, userId, date);
  }

  return { count, userIds };
}

// ── Process Activities ───────────────────────────────────────────────

async function processActivities(
  supabase: ReturnType<typeof createClient>,
  activities: GarminPushActivity[],
): Promise<{ count: number; userIds: string[] }> {
  let count = 0;
  const userIds: string[] = [];

  // Group activities by user+date, accumulate distances
  const grouped = new Map<string, {
    userId: string;
    date: string;
    totalDistanceM: number;
    runningDistanceM: number;
    totalCalories: number;
  }>();

  for (const a of activities) {
    const userId = await resolveUserId(supabase, a.userAccessToken);
    if (!userId) continue;

    const date = new Date(a.startTimeInSeconds * 1000).toISOString().split("T")[0];
    const key = `${userId}:${date}`;

    const existing = grouped.get(key) || {
      userId,
      date,
      totalDistanceM: 0,
      runningDistanceM: 0,
      totalCalories: 0,
    };

    existing.totalDistanceM += a.distanceInMeters || 0;
    existing.totalCalories += a.calories || 0;

    const isRunning = (a.activityName || a.activityType || "").toLowerCase().includes("run");
    if (isRunning) {
      existing.runningDistanceM += a.distanceInMeters || 0;
    }

    grouped.set(key, existing);
  }

  for (const [, data] of grouped) {
    const updateData: Record<string, unknown> = {
      user_id: data.userId,
      source: "garmin",
      date: data.date,
      fetched_at: new Date().toISOString(),
    };

    if (data.totalDistanceM > 0) {
      updateData.total_distance_km = Math.round(data.totalDistanceM / 10) / 100;
    }
    if (data.runningDistanceM > 0) {
      updateData.running_distance_km = Math.round(data.runningDistanceM / 10) / 100;
    }

    const { error } = await supabase
      .from("wearable_sessions")
      .upsert(updateData, { onConflict: "user_id,source,date" });

    if (error) {
      console.error(`[garmin-webhook] [ERROR] Activity upsert ${data.date} user ${data.userId}: ${error.message}`);
    } else {
      count++;
      userIds.push(data.userId);
      console.log(`[garmin-webhook] [OK] Activity saved: user=${data.userId} date=${data.date} dist=${data.totalDistanceM}m`);
    }

    await upsertSummary(supabase, data.userId, data.date);
  }

  return { count, userIds };
}

// ── Process HRV Summaries ────────────────────────────────────────────

async function processHRVSummaries(
  supabase: ReturnType<typeof createClient>,
  summaries: GarminPushHRVSummary[],
): Promise<{ count: number; userIds: string[] }> {
  let count = 0;
  const userIds: string[] = [];

  for (const h of summaries) {
    const userId = await resolveUserId(supabase, h.userAccessToken);
    if (!userId) continue;

    const date = h.calendarDate;
    if (!date) continue;

    const updateData: Record<string, unknown> = {
      user_id: userId,
      source: "garmin",
      date,
      hrv_avg: h.lastNightAvg ?? null,
      fetched_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("wearable_sessions")
      .upsert(updateData, { onConflict: "user_id,source,date" });

    if (error) {
      console.error(`[garmin-webhook] [ERROR] HRV upsert ${date} user ${userId}: ${error.message}`);
    } else {
      count++;
      userIds.push(userId);
      console.log(`[garmin-webhook] [OK] HRV saved: user=${userId} date=${date} avg=${h.lastNightAvg}`);
    }

    // Also update training_trends with HRV
    await supabase
      .from("training_trends")
      .upsert({ user_id: userId, date, hrv: h.lastNightAvg ?? null }, { onConflict: "user_id,date" });
  }

  return { count, userIds };
}

// ── Process Deregistrations ──────────────────────────────────────────

async function processDeregistrations(
  supabase: ReturnType<typeof createClient>,
  deregistrations: GarminDeregistration[],
): Promise<void> {
  for (const d of deregistrations) {
    const userId = await resolveUserId(supabase, d.userAccessToken);
    if (!userId) {
      console.warn(`[garmin-webhook] Deregistration: could not resolve user`);
      continue;
    }

    // Remove the Garmin token — user has disconnected from Garmin's side
    const { error } = await supabase
      .from("wearable_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("scope", "garmin");

    if (error) {
      console.error(`[garmin-webhook] [ERROR] Deregistration delete token for ${userId}: ${error.message}`);
    } else {
      console.log(`[garmin-webhook] [OK] User ${userId} deregistered — Garmin token removed`);
    }

    // Log the event
    await supabase.from("oura_logs").insert({
      user_id: userId,
      status: "error",
      error_message: "User deregistered from Garmin",
    }).catch(() => {});
  }
}

// ── Process Permission Changes ───────────────────────────────────────

async function processPermissionChanges(
  supabase: ReturnType<typeof createClient>,
  changes: GarminPermissionChange[],
): Promise<void> {
  for (const c of changes) {
    const userId = await resolveUserId(supabase, c.userAccessToken);
    console.log(`[garmin-webhook] [INFO] Permission change for user ${userId || "unknown"}`);

    if (userId) {
      await supabase.from("oura_logs").insert({
        user_id: userId,
        status: "success",
        error_message: "Garmin permission change notification received",
      }).catch(() => {});
    }
  }
}

// ── Recompute wearable_summary for a user+date ───────────────────────

async function upsertSummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  date: string,
): Promise<void> {
  try {
    // Fetch up to 28 sessions (need at least 1 to write a training_trends row)
    const { data: sessions } = await supabase
      .from("wearable_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .lte("date", date)
      .order("date", { ascending: false })
      .limit(28);

    if (!sessions || sessions.length === 0) return;

    const calculateLoad = (s: Record<string, unknown>) => {
      const activeCal = (s.active_calories as number) || 0;
      const steps = (s.total_steps as number) || 0;
      if (activeCal > 0) return activeCal / 100;
      return steps / 10000;
    };

    // Use up to 7 most recent sessions for acute window
    const acuteSessions = sessions.slice(0, Math.min(7, sessions.length));
    const loads = acuteSessions.map(calculateLoad);
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / loads.length;
    const std = Math.sqrt(variance);

    const strain = Math.min(loads.reduce((a, b) => a + b, 0), 2000);
    const monotony = Math.min(std > 0 ? mean / std : 0, 2.5);
    const avgSleep = acuteSessions.reduce((sum, s) => sum + ((s.sleep_score as number) || 0), 0) / acuteSessions.length;

    // ACWR: acute (7d avg) / chronic (28d avg)
    const chronicLoads = sessions.map(calculateLoad);
    const chronicMean = chronicLoads.reduce((a, b) => a + b, 0) / chronicLoads.length;
    const acwr = chronicMean > 0 ? Math.round((mean / chronicMean) * 100) / 100 : null;

    await supabase.from("wearable_summary").upsert({
      user_id: userId,
      date,
      source: "garmin",
      strain: Math.round(strain * 100) / 100,
      monotony: Math.round(monotony * 100) / 100,
      acwr,
      readiness_index: null,
      avg_sleep_score: Math.round(avgSleep * 100) / 100,
    }, { onConflict: "user_id,source,date" });

    // Upsert training_trends so Today's Activity section shows data immediately
    const todaySession = sessions.find(s => s.date === date);
    const acuteLoad = mean;
    await supabase.from("training_trends").upsert({
      user_id: userId,
      date,
      training_load: todaySession ? Math.round(calculateLoad(todaySession) * 100) / 100 : Math.round(mean * 100) / 100,
      acute_load: Math.round(acuteLoad * 100) / 100,
      chronic_load: Math.round(chronicMean * 100) / 100,
      acwr,
      strain: Math.round(strain * 100) / 100,
      monotony: Math.round(monotony * 100) / 100,
      sleep_score: todaySession ? ((todaySession.sleep_score as number) || null) : null,
    }, { onConflict: "user_id,date" });

    console.log(`[garmin-webhook] [SUMMARY] user=${userId} date=${date} acwr=${acwr} strain=${strain} sessions=${sessions.length}`);
  } catch (err) {
    console.error(`[garmin-webhook] [ERROR] Summary calc for ${userId}/${date}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
