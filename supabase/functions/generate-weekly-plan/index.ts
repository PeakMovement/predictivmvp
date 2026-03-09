import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Types ──────────────────────────────────────────────────────────────────

type SessionType = "Rest" | "Easy" | "Moderate" | "Hard";

interface DayPlan {
  date: string;          // YYYY-MM-DD
  dayLabel: string;      // "Mon", "Tue" …
  session: SessionType;
  trainingLoad: number | null;
  advice: string;
}

// ── Classification ─────────────────────────────────────────────────────────

const DEFAULT_PLAN: SessionType[] = ["Hard", "Moderate", "Moderate", "Easy", "Hard", "Moderate", "Rest"];

function classifyDay(
  load: number | null,
  prevDayLoad: number | null,
  sevenDayAvg: number | null,
  lowStreakDays: number,
  hasAnyData: boolean,
): SessionType {
  if (!hasAnyData) return "Moderate"; // placeholder; caller uses DEFAULT_PLAN

  // Rule 1: yesterday was very high → rest today
  if (prevDayLoad !== null && prevDayLoad > 400) return "Rest";

  // Rule 2: 7-day avg high → easy
  if (sevenDayAvg !== null && sevenDayAvg > 300) return "Easy";

  // Rule 3: 2+ consecutive low-load days → hard
  if (lowStreakDays >= 2) return "Hard";

  // Default
  return "Moderate";
}

// ── Main ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch last 14 days of wearable_sessions ─────────────────────────────
    const today = new Date();
    const since = new Date(today);
    since.setDate(since.getDate() - 14);
    const sinceStr = since.toISOString().split("T")[0];

    const { data: sessions } = await supabase
      .from("wearable_sessions")
      .select("date, training_load, sleep_score, resting_hr, hrv_avg")
      .eq("user_id", user.id)
      .gte("date", sinceStr)
      .order("date", { ascending: true });

    // Also fetch user profile for sport context
    const { data: userProfile } = await supabase
      .from("user_profile")
      .select("name, goals, activity_level")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: extProfile } = await supabase
      .from("user_profiles")
      .select("sport, experience_level, weekly_training_hours, primary_goal")
      .eq("user_id", user.id)
      .maybeSingle();

    // ── Build load map ──────────────────────────────────────────────────────
    const loadByDate: Record<string, number | null> = {};
    const sleepByDate: Record<string, number | null> = {};
    (sessions ?? []).forEach((s: any) => {
      loadByDate[s.date] = s.training_load;
      sleepByDate[s.date] = s.sleep_score;
    });

    const hasAnyData = Object.keys(loadByDate).length > 0;

    // 7-day average
    const recentLoads = Object.values(loadByDate).filter((v): v is number => v !== null);
    const sevenDayAvg = recentLoads.length
      ? recentLoads.reduce((a, b) => a + b, 0) / recentLoads.length
      : null;

    // ── Build Mon–Sun for the current week ──────────────────────────────────
    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    // Find this week's Monday
    const todayDay = today.getDay(); // 0=Sun, 1=Mon … 6=Sat
    const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    const weekDates: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    // ── Classify each day ───────────────────────────────────────────────────
    let lowStreakDays = 0;
    const LOW_LOAD_THRESHOLD = 150;

    const dayPlans: Omit<DayPlan, "advice">[] = weekDates.map((date, i) => {
      const dateStr = date.toISOString().split("T")[0];
      const load = loadByDate[dateStr] ?? null;

      // prev day
      const prevDate = new Date(date);
      prevDate.setDate(date.getDate() - 1);
      const prevLoad = loadByDate[prevDate.toISOString().split("T")[0]] ?? null;

      // track low-streak
      if (load !== null && load < LOW_LOAD_THRESHOLD) {
        lowStreakDays++;
      } else {
        lowStreakDays = 0;
      }

      const session: SessionType = !hasAnyData
        ? DEFAULT_PLAN[i % 7]
        : classifyDay(load, prevLoad, sevenDayAvg, lowStreakDays, hasAnyData);

      return { date: dateStr, dayLabel: DAY_LABELS[i], session, trainingLoad: load };
    });

    // ── Generate advice via AI ──────────────────────────────────────────────
    const sportCtx = extProfile?.sport
      ? `Sport: ${extProfile.sport}. Experience: ${extProfile.experience_level ?? "unknown"}. Goal: ${extProfile.primary_goal ?? "general fitness"}.`
      : `Activity level: ${userProfile?.activity_level ?? "moderate"}.`;

    const loadSummary = dayPlans
      .map((d) => `${d.dayLabel} ${d.date}: ${d.session}${d.trainingLoad !== null ? ` (load ${Math.round(d.trainingLoad)})` : " (no data)"}`)
      .join("\n");

    const prompt = `You are Yves, a sports performance coach. Generate exactly 7 lines of advice — one per training day — for this weekly plan:

${loadSummary}

Context: ${sportCtx}
7-day average training load: ${sevenDayAvg !== null ? Math.round(sevenDayAvg) : "no data"}.

Rules:
- Each line = exactly 1-2 sentences of practical, specific advice for that day's session type.
- For REST days: focus on recovery activities (sleep, nutrition, light stretching).
- For EASY days: zone 2 effort, conversational pace, low intensity.
- For MODERATE days: structured effort, ~70-80% max HR.
- For HARD days: high-intensity work, intervals, strength. Only if load data supports it.
- Reference actual load numbers when available.
- Be direct and confident — no hedging.

Output format (exactly 7 lines, no bullet points, no day labels, just the advice):
[advice for Mon]
[advice for Tue]
[advice for Wed]
[advice for Thu]
[advice for Fri]
[advice for Sat]
[advice for Sun]`;

    const ai = getAIProvider();
    let adviceLines: string[] = [];

    try {
      const aiResponse = await ai.chat({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 600,
      });

      adviceLines = aiResponse.content
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      // Ensure exactly 7 lines
      while (adviceLines.length < 7) adviceLines.push("Follow the plan and listen to your body.");
      adviceLines = adviceLines.slice(0, 7);
    } catch (aiErr) {
      console.warn("[generate-weekly-plan] AI failed, using fallbacks:", aiErr);
      adviceLines = dayPlans.map((d) => {
        if (d.session === "Rest") return "Full rest day — prioritise sleep, hydration, and nutrition.";
        if (d.session === "Easy") return "Zone 2 effort. Keep it conversational — you should be able to speak in full sentences throughout.";
        if (d.session === "Moderate") return "Structured moderate effort at 70–80% max HR. Focus on quality over quantity.";
        return "High-intensity session — intervals or strength work. Give it a real effort.";
      });
    }

    // ── Assemble final plan ─────────────────────────────────────────────────
    const plan: DayPlan[] = dayPlans.map((d, i) => ({
      ...d,
      advice: adviceLines[i] ?? "Follow the plan and listen to your body.",
    }));

    console.log(`[generate-weekly-plan] Plan generated for user ${user.id}`);

    return new Response(
      JSON.stringify({ plan, sevenDayAvg, hasData: hasAnyData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-weekly-plan] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
