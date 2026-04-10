import { createClient } from "npm:@supabase/supabase-js@2";

// Item 6 — Genesis Onboarding Backend
//
// Receives POST from predictiv.netlify.app/genesis (Justin's signup + onboarding page).
// Two flows supported:
//   A) NEW USER   — body includes { email, password, ...onboarding }
//      → creates Supabase auth user, saves all profile/signal tables, runs Life Formula engine.
//      → returns { session } so the genesis page can auto-login the user to the app.
//
//   B) EXISTING USER — body includes { access_token, ...onboarding }
//      → verifies JWT, updates their onboarding signals, re-runs Life Formula engine.
//
// Onboarding fields accepted (all optional except those noted):
//   firstName     string   — display name
//   dateOfBirth   string   — ISO date "YYYY-MM-DD"
//   gender        string
//   wearable      string   — "oura" | "garmin" | "polar" | "none"
//   sports        string[] — individual sport slugs used to derive training_type
//   training_type string   — override derivation: "endurance"|"strength"|"team"|"mindbody"|"rehab"
//   stress_level  number   — 1-10
//   sleep_quality string   — "solid"|"variable"|"short"|"disrupted"
//   compliance    string   — "high"|"medium"|"low"
//   health_goals  string[] — e.g. ["performance", "injury_prevention"]
//   injury_history string  — "none"|"overuse"|"acute"|"current"|"multiple"
//   preferred_activities  string[]
//   excluded_activities   string[]
//   equipment_access      string[]
//   available_minutes     number

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // ── Admin client (bypasses RLS) ──────────────────────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let userId: string;
    let session: any = null;

    // ── Flow A: new user sign-up ─────────────────────────────────────
    if (body.email && body.password) {
      const { data: signUpData, error: signUpError } =
        await admin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true, // skip confirmation email for genesis flow
        });

      if (signUpError) {
        // If user already exists, fall through to sign-in
        if (signUpError.message?.includes("already registered")) {
          const { data: signInData, error: signInError } =
            await admin.auth.signInWithPassword({
              email: body.email,
              password: body.password,
            });
          if (signInError) return json({ error: signInError.message }, 401);
          userId = signInData.user!.id;
          session = signInData.session;
        } else {
          return json({ error: signUpError.message }, 400);
        }
      } else {
        userId = signUpData.user.id;
        // Create a session for the new user so the app can auto-login
        const { data: sessionData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: body.email,
        });
        // Use signInWithPassword instead for immediate session
        const { data: signInData } = await admin.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        });
        session = signInData?.session ?? null;
      }
    }
    // ── Flow B: existing user updating via access_token ──────────────
    else if (body.access_token) {
      const { data: { user }, error } = await admin.auth.getUser(body.access_token);
      if (error || !user) return json({ error: "Invalid access token" }, 401);
      userId = user.id;
    } else {
      return json({ error: "Must provide (email + password) or access_token" }, 400);
    }

    const now = new Date().toISOString();

    // ── Save profile data ────────────────────────────────────────────
    await saveProfile(admin, userId, body, now);

    // ── Derive training_type from sports if not provided directly ────
    const trainingType = body.training_type || deriveSportCategory(body.sports || []);

    // ── Save onboarding signals ──────────────────────────────────────
    await saveOnboardingSignals(admin, userId, body, trainingType, now);

    // ── Save to yves_memory_bank ──────────────────────────────────────
    await saveMemoryBank(admin, userId, body, now);

    // ── Mark onboarding complete ─────────────────────────────────────
    const complianceDefaults = getComplianceDefaults(body.compliance);
    await admin.from("user_profiles").upsert({
      user_id: userId,
      onboarding_completed: true,
      onboarding_step: 9,
      ...complianceDefaults,
      updated_at: now,
    }, { onConflict: "user_id" });

    // ── Trigger Life Formula engine ───────────────────────────────────
    await triggerLifeFormulas(userId);

    console.log(`[genesis-onboarding] Completed for user ${userId}`);

    return json({
      success: true,
      userId,
      ...(session ? { session } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[genesis-onboarding] Error:", msg);
    return json({ error: msg }, 500);
  }
});

// ── Profile save ──────────────────────────────────────────────────────────

async function saveProfile(admin: any, userId: string, body: any, now: string) {
  const { firstName, dateOfBirth, gender } = body;

  // user_profiles (Settings canonical)
  const profileUpdate: Record<string, any> = { user_id: userId, updated_at: now };
  if (firstName)    profileUpdate.full_name = firstName;
  if (dateOfBirth)  profileUpdate.date_of_birth = dateOfBirth;
  if (body.sports?.length) profileUpdate.sport = body.sports[0];
  await admin.from("user_profiles").upsert(profileUpdate, { onConflict: "user_id" });

  // user_profile (AI reads)
  const aiUpdate: Record<string, any> = { user_id: userId, updated_at: now };
  if (firstName)    aiUpdate.name = firstName;
  if (dateOfBirth)  aiUpdate.dob = dateOfBirth;
  if (gender)       aiUpdate.gender = gender;
  if (body.health_goals?.length) aiUpdate.goals = body.health_goals;
  await upsertUserProfile(admin, userId, aiUpdate, now);

  // profiles (auth)
  if (firstName) {
    await admin.from("profiles").upsert({ id: userId, full_name: firstName, updated_at: now }, { onConflict: "id" });
  }

  // user_interests (Stream 3 preferences)
  if (body.preferred_activities || body.excluded_activities || body.equipment_access || body.available_minutes != null) {
    await admin.from("user_interests").upsert({
      user_id: userId,
      preferred_activities: body.preferred_activities || [],
      excluded_activities:  body.excluded_activities  || [],
      equipment_access:     body.equipment_access     || [],
      available_minutes:    body.available_minutes    ?? null,
      collected_at:         now,
      collection_method:    "onboarding",
      updated_at:           now,
    }, { onConflict: "user_id" });
  }

  // user_wellness_goals
  if (body.health_goals?.length) {
    const goalMap: Record<string, string> = {
      injury_prevention: "injury_recovery", injury: "injury_recovery",
      performance: "performance", recovery: "health_fitness",
      stress: "general_wellness", longevity: "general_wellness", rehab: "injury_recovery",
    };
    const primaryGoal = goalMap[body.health_goals[0]] || body.health_goals[0];
    await admin.from("user_profiles").upsert({ user_id: userId, primary_goal: primaryGoal, updated_at: now }, { onConflict: "user_id" });

    const { data: existing } = await admin.from("user_wellness_goals").select("user_id").eq("user_id", userId).maybeSingle();
    if (existing) {
      await admin.from("user_wellness_goals").update({ goals: body.health_goals, updated_at: now }).eq("user_id", userId);
    } else {
      await admin.from("user_wellness_goals").insert({ user_id: userId, goals: body.health_goals, updated_at: now });
    }
  }

  // user_injuries
  if (body.injury_history && body.injury_history !== "none") {
    const injuryLabels: Record<string, string> = {
      overuse:  "Overuse / repetitive strain history",
      acute:    "Previous acute injury (tear, fracture, surgery)",
      current:  "Currently managing an active injury",
      multiple: "Multiple / recurring injuries",
    };
    const label = injuryLabels[body.injury_history] || body.injury_history;
    const fullDescription = body.injury_description ? `${label}: ${body.injury_description}` : label;
    const { data: existingInj } = await admin.from("user_injuries").select("user_id").eq("user_id", userId).maybeSingle();
    const injData = { injuries: [fullDescription], injury_details: { type: body.injury_history, description: body.injury_description || "" }, updated_at: now };
    if (existingInj) {
      await admin.from("user_injuries").update(injData).eq("user_id", userId);
    } else {
      await admin.from("user_injuries").insert({ user_id: userId, ...injData });
    }
  }

  // user_lifestyle
  if (body.stress_level != null) {
    const stressCategory = body.stress_level <= 3 ? "low" : body.stress_level <= 6 ? "medium" : "high";
    const { data: existingLS } = await admin.from("user_lifestyle").select("user_id").eq("user_id", userId).maybeSingle();
    const lsData = { stress_level: stressCategory, updated_at: now };
    if (existingLS) {
      await admin.from("user_lifestyle").update(lsData).eq("user_id", userId);
    } else {
      await admin.from("user_lifestyle").insert({ user_id: userId, ...lsData });
    }
  }

  // user_recovery
  if (body.sleep_quality) {
    const sleepHoursMap: Record<string, number> = { solid: 8, variable: 7, short: 5.5, disrupted: 6 };
    const { data: existingRec } = await admin.from("user_recovery").select("user_id").eq("user_id", userId).maybeSingle();
    const recData = { sleep_quality: body.sleep_quality, sleep_hours: sleepHoursMap[body.sleep_quality] || 7, updated_at: now };
    if (existingRec) {
      await admin.from("user_recovery").update(recData).eq("user_id", userId);
    } else {
      await admin.from("user_recovery").insert({ user_id: userId, ...recData });
    }
  }
}

// ── Onboarding signals ────────────────────────────────────────────────────

async function saveOnboardingSignals(admin: any, userId: string, body: any, trainingType: string | null, now: string) {
  const primaryWearable = Array.isArray(body.wearable)
    ? (body.wearable.includes("none") ? "none" : body.wearable[0] || null)
    : body.wearable || null;

  await admin.from("onboarding_signals").upsert({
    user_id:        userId,
    wearable:       primaryWearable,
    training_type:  trainingType,
    stress_level:   body.stress_level   ?? null,
    sleep_quality:  body.sleep_quality  ?? null,
    compliance:     body.compliance     ?? null,
    health_goals:   body.health_goals   ?? [],
    injury_history: body.injury_history ?? null,
    updated_at:     now,
  }, { onConflict: "user_id" });
}

// ── Memory bank ───────────────────────────────────────────────────────────

async function saveMemoryBank(admin: any, userId: string, body: any, now: string) {
  const entries: Array<{ key: string; value: any }> = [];

  if (body.firstName) {
    entries.push({ key: "preferred_name", value: body.firstName });
  }
  if (body.wearable) {
    const wearables = Array.isArray(body.wearable) ? body.wearable : [body.wearable];
    entries.push({ key: "wearable_device", value: JSON.stringify(wearables) });
  }
  if (body.sports?.length || body.training_type) {
    entries.push({ key: "preferred_training", value: JSON.stringify({ sports: body.sports || [], training_type: body.training_type }) });
  }
  if (body.health_goals?.length) {
    entries.push({ key: "user_goals", value: JSON.stringify({ goals: body.health_goals }) });
  }
  if (body.stress_level != null || body.sleep_quality || body.compliance) {
    const stressCategory = body.stress_level != null
      ? (body.stress_level <= 3 ? "low" : body.stress_level <= 6 ? "medium" : "high")
      : null;
    entries.push({ key: "lifestyle_signals", value: JSON.stringify({ stressLevel: body.stress_level, stressCategory, sleepQuality: body.sleep_quality, compliance: body.compliance }) });
  }
  if (body.injury_history && body.injury_history !== "none") {
    entries.push({ key: "injury_context", value: JSON.stringify({ type: body.injury_history, description: body.injury_description || "" }) });
  }
  if (body.preferred_activities?.length || body.excluded_activities?.length) {
    entries.push({ key: "activity_preferences", value: JSON.stringify({ preferred_activities: body.preferred_activities || [], excluded_activities: body.excluded_activities || [], equipment_access: body.equipment_access || [], available_minutes: body.available_minutes ?? null }) });
  }

  // Bulk upsert memory bank entries
  for (const entry of entries) {
    await admin.from("yves_memory_bank").upsert({
      user_id:      userId,
      memory_key:   entry.key,
      memory_value: typeof entry.value === "string" && !entry.value.startsWith("{") && !entry.value.startsWith("[") ? entry.value : JSON.stringify(entry.value),
      last_updated: now,
    }, { onConflict: "user_id,memory_key" });
  }

  // Raw onboarding signals snapshot
  await admin.from("yves_memory_bank").upsert({
    user_id:      userId,
    memory_key:   "onboarding_signals",
    memory_value: JSON.stringify({
      source:               "genesis",
      wearable:             body.wearable,
      sports:               body.sports,
      preferredActivities:  body.preferred_activities,
      excludedActivities:   body.excluded_activities,
      equipmentAccess:      body.equipment_access,
      availableMinutes:     body.available_minutes,
      healthGoals:          body.health_goals,
      injuryHistory:        body.injury_history,
      injuryDescription:    body.injury_description,
      stressLevel:          body.stress_level,
      sleepQuality:         body.sleep_quality,
      compliance:           body.compliance,
    }),
    last_updated: now,
  }, { onConflict: "user_id,memory_key" });
}

// ── Trigger Life Formulas ─────────────────────────────────────────────────

async function triggerLifeFormulas(userId: string) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/calculate-life-formulas`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey":        SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!resp.ok) {
      console.warn("[genesis-onboarding] Life Formula trigger returned", resp.status);
    } else {
      console.log("[genesis-onboarding] Life Formulas calculated for", userId);
    }
  } catch (err) {
    // Non-fatal — formulas can be recalculated later
    console.warn("[genesis-onboarding] Life Formula trigger error:", err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function deriveSportCategory(sports: string[]): string | null {
  if (!sports.length) return null;
  const endurance = ["running", "cycling", "swimming", "triathlon", "walking"];
  const strength  = ["gym", "crossfit", "boxing"];
  const team      = ["football", "rugby", "basketball", "tennis", "hockey", "cricket"];
  const mindbody  = ["yoga", "golf", "surfing", "dance"];
  const rehab     = ["physiotherapy"];
  const counts: Record<string, number> = { endurance: 0, strength: 0, team: 0, mindbody: 0, rehab: 0 };
  for (const s of sports) {
    if (endurance.includes(s)) counts.endurance++;
    else if (strength.includes(s))  counts.strength++;
    else if (team.includes(s))      counts.team++;
    else if (mindbody.includes(s))  counts.mindbody++;
    else if (rehab.includes(s))     counts.rehab++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function getComplianceDefaults(compliance: string) {
  return {
    high:   { briefing_enabled: true,  alert_notifications_enabled: true,  weekly_summary_enabled: true  },
    medium: { briefing_enabled: true,  alert_notifications_enabled: true,  weekly_summary_enabled: false },
    low:    { briefing_enabled: false, alert_notifications_enabled: false, weekly_summary_enabled: true  },
  }[compliance as "high" | "medium" | "low"] ?? { briefing_enabled: true, alert_notifications_enabled: true, weekly_summary_enabled: false };
}

async function upsertUserProfile(admin: any, userId: string, fields: Record<string, any>, now: string) {
  const { data: existing } = await admin.from("user_profile").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) {
    await admin.from("user_profile").update(fields).eq("user_id", userId);
  } else {
    await admin.from("user_profile").insert({ user_id: userId, ...fields, updated_at: now });
  }
}

function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
